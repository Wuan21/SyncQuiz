import { Server } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import * as mongoose from 'mongoose';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { awardAchievement } from '../analytics/schemas/achievement.schema';
import { GameSessionSchema } from '../live/schemas/game-session.schema';
import { QuestionSchema } from '../questions/schemas/question.schema';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function normalizePin(value: any): string {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .trim();
}

function getGameRoom(gameId: string): string {
  return `game:${gameId}`;
}

let sessionModelInstance: mongoose.Model<any> | null = null;
let questionModelInstance: mongoose.Model<any> | null = null;

export const setModels = (session: any, question: any) => {
  sessionModelInstance = session;
  questionModelInstance = question;
};

// Safe model getters
function getSessionModel(): mongoose.Model<any> {
  if (sessionModelInstance) return sessionModelInstance;
  return (
    mongoose.models.GameSession ||
    mongoose.model('GameSession', GameSessionSchema)
  );
}

function getQuestionModel(): mongoose.Model<any> {
  if (questionModelInstance) return questionModelInstance;
  return mongoose.models.Question || mongoose.model('Question', QuestionSchema);
}

/* ── In-memory game state for active play (scoring, timers) ──────────────── */
const activeGames = new Map<string, any>();

const ANSWER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825'];
const DEFAULT_POWERUPS = { double_points: 1, fifty_fifty: 1, extra_time: 1 };

function calculateScore(
  isCorrect: boolean,
  timeSpent: number,
  timeLimit: number,
  points: number,
  streak: number,
  doublePoints = false,
) {
  if (!isCorrect) return 0;
  const ratio = Math.max(0, 1 - timeSpent / (timeLimit * 1000));
  const base = Math.round(points * (0.5 + 0.5 * ratio));
  const bonus = streak >= 3 ? Math.round(base * 0.1 * Math.min(streak, 5)) : 0;
  const total = base + bonus;
  return doublePoints ? total * 2 : total;
}

let io: Server;

export const initSocket = (server: any) => {
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: (origin: any, cb: any) => {
        if (!origin) return cb(null, true);
        const cleanOrigin = String(origin).replace(/\/$/, '');
        const isAllowed = allowedOrigins.some(
          (co) => co === '*' || co.replace(/\/$/, '') === cleanOrigin,
        );
        if (isAllowed || process.env.NODE_ENV !== 'production') {
          return cb(null, true);
        }
        return cb(null, true); // Allow for live game (mobile browsers)
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  /* ── Cognito verifier ────────────────────────────────────────────────── */
  let cognitoVerifier: any = null;
  if (
    process.env.AWS_COGNITO_USER_POOL_ID &&
    process.env.AWS_COGNITO_CLIENT_ID
  ) {
    try {
      cognitoVerifier = CognitoJwtVerifier.create({
        userPoolId: process.env.AWS_COGNITO_USER_POOL_ID,
        tokenUse: (process.env.AWS_COGNITO_TOKEN_USE as any) || 'id',
        clientId: process.env.AWS_COGNITO_CLIENT_ID,
      });
    } catch (e: any) {
      console.error('[Socket] Failed to init Cognito verifier:', e.message);
    }
  }

  /* ── Auth middleware (optional — players don't need auth) ─────────────── */
  io.use(async (socket: any, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      if (cognitoVerifier) {
        try {
          const payload = await cognitoVerifier.verify(token);
          const email = (payload.email || '').toLowerCase();
          const UserModel = mongoose.models.User || mongoose.model('User');
          const user = await UserModel.findOne({
            $or: [{ cognitoId: payload.sub }, { email }],
          });
          if (user) {
            socket.user = {
              id: user._id.toString(),
              sub: user._id.toString(),
              email: user.email,
              role: user.role,
            };
            return next();
          }
        } catch (_) {}
      }

      try {
        const decoded: any = jwt.verify(
          token,
          process.env.JWT_ACCESS_SECRET || 'secret',
        );
        socket.user = {
          id: decoded.id || decoded.sub,
          sub: decoded.sub || decoded.id,
          email: decoded.email,
          role: decoded.role,
        };
      } catch (_) {}
    }
    next(); // Allow unauthenticated connections (players)
  });

  /* ══════════════════════════════════════════════════════════════════════ */
  /*  CONNECTION HANDLER                                                   */
  /* ══════════════════════════════════════════════════════════════════════ */
  io.on('connection', (socket: any) => {
    console.log('[SOCKET] New connection:', socket.id);

    /* ── HOST: attach to game ──────────────────────────────────────────── */
    socket.on(
      'host:attach-game',
      async (
        payload: { gameId: string; pin: string },
        callback?: (res: any) => void,
      ) => {
        const cb = typeof callback === 'function' ? callback : () => {};
        try {
          const SessionModel = getSessionModel();
          const game = await SessionModel.findById(payload.gameId);

          if (!game) {
            cb({
              success: false,
              code: 'GAME_NOT_FOUND',
              message: 'Không tìm thấy phòng',
            });
            return;
          }

          if (game.pin !== normalizePin(payload.pin)) {
            cb({
              success: false,
              code: 'INVALID_PIN',
              message: 'Mã PIN không hợp lệ',
            });
            return;
          }

          const gameId = game._id.toString();
          const room = getGameRoom(gameId);

          await socket.join(room);
          socket.data.role = 'host';
          socket.data.gameId = gameId;
          socket.data.pin = game.pin;

          // Build current player list for Host
          const players = game.players.map((p: any) => ({
            playerId: p.playerId,
            nickname: p.nickname,
            teamName: p.teamName,
            avatar: p.avatar,
            avatarIndex: p.avatarIndex,
            connected: p.connected,
          }));

          console.log('[SOCKET] Host attached to game:', gameId, 'room:', room);
          
          const activeGame = activeGames.get(gameId);
          if (activeGame) {
            activeGame.hostSocketId = socket.id;
            let timeLeft = 0;
            if (activeGame.questionStartTs && activeGame.questionDurationMs) {
              timeLeft = Math.max(0, Math.floor((activeGame.questionDurationMs - (Date.now() - activeGame.questionStartTs)) / 1000));
            }
            cb({ 
              success: true, 
              gameId, 
              players,
              gameState: 'running',
              currentIdx: activeGame.currentIdx,
              totalQuestions: activeGame.questions.length,
              question: activeGame.questions[activeGame.currentIdx],
              timeLimit: activeGame.questions[activeGame.currentIdx]?.timeLimit || 0,
              timeLeft,
              answerCount: {
                answered: Object.keys(activeGame.answers[activeGame.currentIdx] || {}).length,
                total: Object.keys(activeGame.players).length,
              }
            });
          } else {
            cb({ success: true, gameId, players });
          }
        } catch (error: any) {
          console.error('[HOST ATTACH ERROR]', error.message);
          cb({
            success: false,
            code: 'HOST_ATTACH_FAILED',
            message: 'Không thể kết nối Host',
          });
        }
      },
    );

    /* ── PLAYER: attach to game ────────────────────────────────────────── */
    socket.on(
      'player:attach-game',
      async (
        payload: { gameId: string; playerId: string; pin: string },
        callback?: (res: any) => void,
      ) => {
        const cb = typeof callback === 'function' ? callback : () => {};
        try {
          const SessionModel = getSessionModel();
          const game = await SessionModel.findById(payload.gameId);

          if (!game) {
            cb({
              success: false,
              code: 'GAME_NOT_FOUND',
              message: 'Không tìm thấy phòng',
            });
            return;
          }

          if (game.pin !== normalizePin(payload.pin)) {
            cb({
              success: false,
              code: 'INVALID_PIN',
              message: 'Mã PIN không hợp lệ',
            });
            return;
          }

          if (game.status === 'ended' || game.status === 'finished') {
            cb({
              success: false,
              code: 'GAME_ENDED',
              message: 'Phòng chơi đã kết thúc',
            });
            return;
          }

          const player = game.players.find(
            (item: any) => item.playerId === payload.playerId,
          );

          if (!player) {
            cb({
              success: false,
              code: 'PLAYER_NOT_FOUND',
              message: 'Không tìm thấy người chơi',
            });
            return;
          }

          // Update socket info
          player.socketId = socket.id;
          player.connected = true;
          await game.save();

          const gameId = game._id.toString();
          const room = getGameRoom(gameId);

          await socket.join(room);
          socket.data.role = 'player';
          socket.data.gameId = gameId;
          socket.data.playerId = player.playerId;
          socket.data.pin = game.pin;

          // Build updated player list and broadcast to room
          const players = game.players.map((item: any) => ({
            playerId: item.playerId,
            nickname: item.nickname,
            teamName: item.teamName,
            avatar: item.avatar,
            avatarIndex: item.avatarIndex,
            connected: item.connected,
          }));

          io.to(room).emit('player-list:updated', players);

          console.log(
            '[SOCKET] Player attached:',
            player.playerId,
            'to game:',
            gameId,
          );
          cb({ success: true, gameId, playerId: player.playerId });
        } catch (error: any) {
          console.error('[PLAYER ATTACH ERROR]', error.message);
          cb({
            success: false,
            code: 'PLAYER_ATTACH_FAILED',
            message: 'Không thể kết nối người chơi với phòng',
          });
        }
      },
    );

    /* ── HOST: start game ──────────────────────────────────────────────── */
    socket.on('host:start', async () => {
      const gameId = socket.data.gameId;
      if (!gameId || socket.data.role !== 'host') return;

      try {
        const SessionModel = getSessionModel();
        const QuestionModel = getQuestionModel();

        const session = await SessionModel.findById(gameId);
        if (!session) return;

        session.status = 'active';
        session.startedAt = new Date();
        await session.save();

        // Load questions
        const questions = await QuestionModel.find({ quizId: session.quizId })
          .sort({ order: 1 })
          .lean();

        // Build in-memory game state for scoring
        const playerMap: Record<string, any> = {};
        for (const p of session.players) {
          if (p.socketId) {
            playerMap[p.socketId] = {
              socketId: p.socketId,
              playerId: p.playerId,
              userId: null,
              nickname: p.nickname,
              avatarIndex: p.avatarIndex ?? 0,
              totalScore: 0,
              streak: 0,
              answers: [],
              powerUps: { ...DEFAULT_POWERUPS },
              activePowerUp: null,
              teamName: p.teamName || null,
            };
          }
        }

        const game = {
          sessionId: gameId,
          pin: session.pin,
          hostId: session.hostId,
          hostSocketId: socket.id,
          questions,
          currentIdx: -1,
          players: playerMap,
          answers: {} as Record<number, Record<string, any>>,
          status: 'active' as string,
          questionTimer: null as any,
          questionStartTs: 0,
          questionDurationMs: 0,
        };

        activeGames.set(gameId, game);

        const room = getGameRoom(gameId);
        io.to(room).emit('game:started');
        sendNextQuestion(gameId);
      } catch (err: any) {
        console.error('[HOST START ERROR]', err.message);
      }
    });

    /* ── HOST: next question manually ──────────────────────────────────── */
    socket.on('host:skip_time', () => {
      const gameId = socket.data.gameId;
      const game = activeGames.get(gameId);
      if (!game || game.hostSocketId !== socket.id) return;
      clearTimeout(game.questionTimer);
      endQuestion(gameId);
    });

    socket.on('host:next_question', () => {
      const gameId = socket.data.gameId;
      const game = activeGames.get(gameId);
      if (!game || game.hostSocketId !== socket.id) return;
      sendNextQuestion(gameId);
    });

    /* ── HOST: end game early ──────────────────────────────────────────── */
    socket.on('host:end_game', () => {
      const gameId = socket.data.gameId;
      const game = activeGames.get(gameId);
      if (!game || game.hostSocketId !== socket.id) return;
      clearTimeout(game.questionTimer);
      endGame(gameId);
    });

    /* ── PLAYER: submit answer ─────────────────────────────────────────── */
    socket.on(
      'player:answer',
      ({
        optionIndex,
        timeSpent,
      }: {
        optionIndex: number;
        timeSpent: number;
      }) => {
        const gameId = socket.data.gameId;
        const game = activeGames.get(gameId);
        if (!game || game.status !== 'active') return;

        const player = game.players[socket.id];
        if (!player) return;

        const idx = game.currentIdx;
        if (!game.answers[idx]) game.answers[idx] = {};
        if (game.answers[idx][socket.id] !== undefined) return; // already answered

        game.answers[idx][socket.id] = { optionIndex, timeSpent };

        const q = game.questions[idx];
        const correct = q.options[optionIndex]?.isCorrect || false;
        const useDouble = player.activePowerUp === 'double_points';
        const earned = calculateScore(
          correct,
          timeSpent,
          q.timeLimit,
          q.points,
          player.streak,
          useDouble,
        );
        player.activePowerUp = null;

        if (correct) {
          player.streak++;
        } else {
          player.streak = 0;
        }
        player.totalScore += earned;
        player.answers.push({
          questionId: q._id,
          selectedOption: optionIndex,
          isCorrect: correct,
          pointsEarned: earned,
          timeSpent,
        });

        socket.emit('player:answer_ack', {
          isCorrect: correct,
          pointsEarned: earned,
          totalScore: player.totalScore,
        });

        // Notify host of answer count
        const answered = Object.keys(game.answers[idx]).length;
        const total = Object.keys(game.players).length;
        if (game.hostSocketId) {
          io.to(game.hostSocketId).emit('host:answer_count', {
            answered,
            total,
          });
        }

        // Auto-advance if everyone answered
        if (answered >= total) {
          clearTimeout(game.questionTimer);
          endQuestion(gameId);
        }
      },
    );

    /* ── PLAYER: use power-up ──────────────────────────────────────────── */
    socket.on('player:powerup', ({ type }: { type: string }) => {
      const gameId = socket.data.gameId;
      const game = activeGames.get(gameId);
      if (!game || game.status !== 'active') return;
      const player = game.players[socket.id];
      if (!player || !player.powerUps[type] || player.powerUps[type] <= 0)
        return;

      player.powerUps[type]--;
      const idx = game.currentIdx;
      const q = game.questions[idx];

      if (type === 'double_points') {
        player.activePowerUp = 'double_points';
        socket.emit('powerup:activated', {
          type,
          message: '2x points this question!',
        });
      }

      if (type === 'fifty_fifty') {
        const wrongIndices = q.options
          .map((o: any, i: number) => (!o.isCorrect ? i : null))
          .filter((i: any) => i !== null);
        const toRemove = wrongIndices
          .sort(() => Math.random() - 0.5)
          .slice(0, 2);
        socket.emit('powerup:activated', { type, removedOptions: toRemove });
      }

      if (type === 'extra_time') {
        const elapsedMs = Date.now() - game.questionStartTs;
        const remainingMs = game.questionDurationMs - elapsedMs;
        const newRemainingMs = remainingMs + 15000;
        game.questionDurationMs += 15000;

        clearTimeout(game.questionTimer);
        game.questionTimer = setTimeout(() => {
          endQuestion(gameId);
        }, newRemainingMs + 2000);

        const room = getGameRoom(gameId);
        io.to(room).emit('game:extra_time', {
          nickname: player.nickname,
          seconds: 15,
        });
        socket.emit('powerup:activated', {
          type,
          message: '+15 seconds added!',
        });
      }
    });

    /* ── Disconnect ────────────────────────────────────────────────────── */
    socket.on('disconnect', async () => {
      const { gameId, playerId, role } = socket.data;
      console.log('[SOCKET] Disconnected:', socket.id, 'role:', role);

      if (!gameId) return;

      if (role === 'player' && playerId) {
        // Mark player as disconnected in MongoDB (don't delete)
        try {
          const SessionModel = getSessionModel();
          await SessionModel.updateOne(
            { _id: gameId, 'players.playerId': playerId },
            {
              $set: {
                'players.$.connected': false,
                'players.$.socketId': null,
              },
            },
          );

          // Also update in-memory if game is active
          const game = activeGames.get(gameId);
          if (game && game.players[socket.id]) {
            const p = game.players[socket.id];
            delete game.players[socket.id];
            // Keep player data accessible by playerId for reconnection
          }

          // Emit updated player list
          const room = getGameRoom(gameId);
          const session = await SessionModel.findById(gameId).lean();
          if (session) {
            const players = (session as any).players.map((item: any) => ({
              playerId: item.playerId,
              nickname: item.nickname,
              teamName: item.teamName,
              avatar: item.avatar,
              avatarIndex: item.avatarIndex,
              connected: item.connected,
            }));
            io.to(room).emit('player-list:updated', players);
          }
        } catch (err: any) {
          console.error('[DISCONNECT] Error updating player:', err.message);
        }
      }

      if (role === 'host') {
        const game = activeGames.get(gameId);
        if (game) {
          game.hostSocketId = ''; // Mark host as disconnected but keep game alive
          console.log('[SOCKET] Host disconnected but game is kept alive:', gameId);
        }
      }
    });
  });

  return io;
};

/* ══════════════════════════════════════════════════════════════════════════ */
/*  GAME PLAY HELPERS                                                       */
/* ══════════════════════════════════════════════════════════════════════════ */

function sendNextQuestion(gameId: string) {
  const game = activeGames.get(gameId);
  if (!game) return;

  game.currentIdx++;
  if (game.currentIdx >= game.questions.length) {
    return endGame(gameId);
  }

  const q = game.questions[game.currentIdx];
  const total = game.questions.length;
  const room = getGameRoom(gameId);

  // Send to host (includes correct answers)
  if (game.hostSocketId) {
    io.to(game.hostSocketId).emit('host:question', {
      index: game.currentIdx,
      total,
      question: q,
      timeLimit: q.timeLimit,
    });
  }

  // Send to players (NO isCorrect field)
  const playerQuestion = {
    index: game.currentIdx,
    total,
    content: q.content,
    imageUrl: q.imageUrl,
    type: q.type,
    timeLimit: q.timeLimit,
    points: q.points,
    options: q.options.map((o: any, i: number) => ({
      text: o.text,
      imageUrl: o.imageUrl,
      index: i,
      color: ANSWER_COLORS[i],
    })),
  };

  io.to(room).emit('game:question', playerQuestion);

  game.questionStartTs = Date.now();
  game.questionDurationMs = q.timeLimit * 1000;

  // Auto-advance after timeLimit + 2s buffer
  game.questionTimer = setTimeout(() => {
    endQuestion(gameId);
  }, game.questionDurationMs + 2000);

  // Update DB
  void (async () => {
    try {
      const SessionModel = getSessionModel();
      await SessionModel.findByIdAndUpdate(gameId, {
        currentQuestionIndex: game.currentIdx,
      });
    } catch (_) {}
  })();
}

function endQuestion(gameId: string) {
  const game = activeGames.get(gameId);
  if (!game) return;

  const idx = game.currentIdx;
  const q = game.questions[idx];
  const room = getGameRoom(gameId);

  // Build leaderboard
  const leaderboard = Object.values(game.players)
    .sort((a: any, b: any) => b.totalScore - a.totalScore)
    .slice(0, 10)
    .map((p: any, i: number) => ({
      rank: i + 1,
      nickname: p.nickname,
      totalScore: p.totalScore,
      avatarIndex: p.avatarIndex,
    }));

  const correctOptions = q.options
    .map((o: any, i: number) => (o.isCorrect ? i : null))
    .filter((i: any) => i !== null);

  io.to(room).emit('game:question_end', {
    correctOptions,
    explanation: q.explanation,
    leaderboard,
    answerCount: Object.keys(game.answers[idx] || {}).length,
  });
}

async function endGame(gameId: string) {
  const game = activeGames.get(gameId);
  if (!game) return;

  const room = getGameRoom(gameId);

  const finalLeaderboard = Object.values(game.players)
    .sort((a: any, b: any) => b.totalScore - a.totalScore)
    .map((p: any, i: number) => ({ ...p, rank: i + 1 }));

  // Team leaderboard
  const teamMap: Record<string, any> = {};
  for (const p of finalLeaderboard) {
    if (!p.teamName) continue;
    if (!teamMap[p.teamName])
      teamMap[p.teamName] = {
        teamName: p.teamName,
        totalScore: 0,
        members: 0,
      };
    teamMap[p.teamName].totalScore += p.totalScore;
    teamMap[p.teamName].members++;
  }
  const teamLeaderboard = Object.values(teamMap)
    .sort((a: any, b: any) => b.totalScore - a.totalScore)
    .map((t: any, i: number) => ({ ...t, rank: i + 1 }));

  io.to(room).emit('game:ended', {
    leaderboard: finalLeaderboard,
    teamLeaderboard,
  });

  // Persist to DB + award achievements
  try {
    const SessionModel = getSessionModel();
    const AchievementModel =
      mongoose.models.Achievement || mongoose.model('Achievement');

    await SessionModel.findByIdAndUpdate(gameId, {
      status: 'finished',
      endedAt: new Date(),
      currentQuestionIndex: game.currentIdx,
      players: finalLeaderboard.map((p: any) => ({
        playerId: p.playerId,
        socketId: p.socketId,
        nickname: p.nickname,
        avatarIndex: p.avatarIndex,
        avatar: p.avatar || '😀',
        teamName: p.teamName || '',
        connected: false,
        totalScore: p.totalScore,
        rank: p.rank,
        streak: p.streak,
        answers: p.answers,
      })),
    });

    // Award achievements
    for (const p of finalLeaderboard) {
      if (!p.userId) continue;
      if (p.rank === 1)
        await awardAchievement(AchievementModel, p.userId, 'centurion');
      if (p.streak >= 5)
        await awardAchievement(AchievementModel, p.userId, 'streak_5');
      const fast = p.answers.some(
        (a: any) => a.timeSpent < 3000 && a.isCorrect,
      );
      if (fast)
        await awardAchievement(AchievementModel, p.userId, 'speed_demon');
    }
    if (finalLeaderboard.length >= 20) {
      for (const p of finalLeaderboard) {
        if (p.userId)
          await awardAchievement(AchievementModel, p.userId, 'social');
      }
    }
  } catch (err: any) {
    console.error('[Socket] Failed to persist game session:', err.message);
  }

  activeGames.delete(gameId);
}
