import { Server } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import * as mongoose from 'mongoose';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { awardAchievement } from '../analytics/schemas/achievement.schema';

// In-memory store for active games (PIN → game state)
const activeGames = new Map<string, any>();

const ANSWER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825'];

// Power-ups available per player per game
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
    .map((s) => s.trim());

  io = new Server(server, {
    cors: {
      origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  });

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

  // ── Auth middleware ────────────────────────────────────────────────────────
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
    next();
  });

  // Helper to ensure game exists in RAM or restore from MongoDB
  async function ensureGameLoaded(pin: string) {
    const normalizedPin = String(pin || '').trim();
    if (!normalizedPin) return null;

    let game = activeGames.get(normalizedPin);
    if (game) return game;

    try {
      const SessionModel =
        mongoose.models.GameSession || mongoose.model('GameSession');
      const QuestionModel =
        mongoose.models.Question || mongoose.model('Question');

      const numericPin = Number(normalizedPin);
      const pinFilter = !isNaN(numericPin)
        ? { $or: [{ pin: normalizedPin }, { pin: numericPin }] }
        : { pin: normalizedPin };

      const session: any = await SessionModel.findOne({
        ...pinFilter,
        status: { $nin: ['finished', 'ended'] },
      }).lean();

      if (!session) {
        console.log('[SOCKET] Session not found in DB for PIN:', normalizedPin);
        return null;
      }

      const questions = await QuestionModel.find({ quizId: session.quizId })
        .sort({ order: 1 })
        .lean();

      game = {
        sessionId: session._id.toString(),
        pin: normalizedPin,
        hostId: session.hostId?.toString(),
        hostSocketId: null,
        questions,
        currentIdx: session.currentQuestionIndex ?? -1,
        players: {}, // socketId → player
        answers: {}, // questionIdx → { socketId: answer }
        status: session.status === 'active' ? 'active' : 'lobby',
        questionTimer: null,
      };

      activeGames.set(normalizedPin, game);
      console.log(
        '[SOCKET] Restored active game from DB for PIN:',
        normalizedPin,
      );
      return game;
    } catch (err: any) {
      console.error('[SOCKET] Error restoring game:', err.message);
      return null;
    }
  }

  io.on('connection', (socket: any) => {
    // ── HOST: create/start game ───────────────────────────────────────────────
    socket.on(
      'host:join',
      async ({ sessionId, pin }: { sessionId?: string; pin?: string }) => {
        try {
          const userId =
            socket.user?.id || socket.user?.sub || socket.user?._id;
          if (!userId)
            return socket.emit('error', {
              code: 'UNAUTHENTICATED',
              message: 'Unauthenticated',
            });

          const SessionModel =
            mongoose.models.GameSession || mongoose.model('GameSession');

          let session: any = null;
          if (sessionId) {
            session = await SessionModel.findById(sessionId).lean();
          } else if (pin) {
            const normalizedPin = String(pin).trim();
            const numericPin = Number(normalizedPin);
            const pinFilter = !isNaN(numericPin)
              ? { $or: [{ pin: normalizedPin }, { pin: numericPin }] }
              : { pin: normalizedPin };
            session = await SessionModel.findOne(pinFilter).lean();
          }

          if (!session)
            return socket.emit('error', {
              code: 'GAME_NOT_FOUND',
              message: 'Session not found',
            });

          if (session.hostId?.toString() !== userId.toString()) {
            return socket.emit('error', {
              code: 'FORBIDDEN',
              message: 'Forbidden',
            });
          }

          const normalizedPin = String(session.pin).trim();
          socket.join(normalizedPin);
          socket.join(`game:${normalizedPin}`);
          socket.pin = normalizedPin;
          socket.role = 'host';

          let game = activeGames.get(normalizedPin);
          if (!game) {
            game = await ensureGameLoaded(normalizedPin);
          }

          if (game) {
            game.hostSocketId = socket.id;
          }

          socket.emit('host:joined', {
            pin: normalizedPin,
            playerCount: game ? Object.keys(game.players).length : 0,
            players: game
              ? Object.values(game.players).map((p: any) => ({
                  nickname: p.nickname,
                  avatarIndex: p.avatarIndex,
                }))
              : [],
          });
        } catch (err: any) {
          socket.emit('error', {
            code: 'INTERNAL_ERROR',
            message: err.message,
          });
        }
      },
    );

    // ── PLAYER: join lobby ────────────────────────────────────────────────────
    socket.on(
      'player:join',
      async (
        {
          pin,
          nickname,
          avatarIndex = 0,
          teamName = null,
        }: {
          pin: string;
          nickname: string;
          avatarIndex?: number;
          teamName?: string;
        },
        callback?: (res: any) => void,
      ) => {
        const normalizedPin = String(pin || '').trim();
        const nickClean = String(nickname || '').trim();

        if (!normalizedPin || !nickClean) {
          const errRes = {
            success: false,
            code: 'INVALID_INPUT',
            message: 'Mã PIN và Nickname không được để trống',
          };
          if (callback) callback(errRes);
          return socket.emit('error', errRes);
        }

        const game = await ensureGameLoaded(normalizedPin);

        if (!game) {
          console.log('[JOIN GAME] Not found', {
            pin: normalizedPin,
            collection: 'GameSession',
          });
          const errRes = {
            success: false,
            code: 'GAME_NOT_FOUND',
            message: 'Không tìm thấy phòng chơi với mã PIN này',
          };
          if (callback) callback(errRes);
          return socket.emit('error', errRes);
        }

        if (game.status === 'finished' || game.status === 'ended') {
          const errRes = {
            success: false,
            code: 'GAME_ENDED',
            message: 'Phòng chơi đã kết thúc',
          };
          if (callback) callback(errRes);
          return socket.emit('error', errRes);
        }

        const nickTaken = Object.values(game.players).some(
          (p: any) => p.nickname.toLowerCase() === nickClean.toLowerCase(),
        );
        if (nickTaken) {
          const errRes = {
            success: false,
            code: 'NICKNAME_TAKEN',
            message: 'Nickname này đã có người sử dụng',
          };
          if (callback) callback(errRes);
          return socket.emit('error', errRes);
        }

        game.players[socket.id] = {
          socketId: socket.id,
          userId: socket.user?.id || socket.user?.sub || null,
          nickname: nickClean,
          avatarIndex,
          totalScore: 0,
          streak: 0,
          answers: [],
          powerUps: { ...DEFAULT_POWERUPS },
          activePowerUp: null,
          teamName: teamName?.trim() || null,
        };

        socket.join(normalizedPin);
        socket.join(`game:${normalizedPin}`);
        socket.pin = normalizedPin;
        socket.role = 'player';

        const successRes = {
          success: true,
          nickname: nickClean,
          pin: normalizedPin,
        };
        if (callback) callback(successRes);
        socket.emit('player:joined', successRes);

        if (game.hostSocketId) {
          io.to(game.hostSocketId).emit('host:player_joined', {
            nickname: nickClean,
            playerCount: Object.keys(game.players).length,
          });
          io.to(game.hostSocketId).emit('host:lobby_update', {
            players: Object.values(game.players).map((p: any) => ({
              nickname: p.nickname,
              avatarIndex: p.avatarIndex,
            })),
          });
        }
      },
    );

    // ── HOST: start game ──────────────────────────────────────────────────────
    socket.on('host:start', async () => {
      const pin = socket.pin;
      const game = activeGames.get(pin);
      if (!game || game.hostSocketId !== socket.id) return;

      game.status = 'active';
      const SessionModel =
        mongoose.models.GameSession || mongoose.model('GameSession');

      const numericPin = Number(pin);
      const pinFilter = !isNaN(numericPin)
        ? { $or: [{ pin }, { pin: numericPin }] }
        : { pin };

      await SessionModel.findOneAndUpdate(pinFilter, {
        status: 'active',
        startedAt: new Date(),
      });

      io.to(pin).to(`game:${pin}`).emit('game:started');
      sendNextQuestion(pin);
    });

    // ── HOST: next question manually ──────────────────────────────────────────
    socket.on('host:next', () => {
      const pin = socket.pin;
      const game = activeGames.get(pin);
      if (!game || game.hostSocketId !== socket.id) return;
      clearTimeout(game.questionTimer);
      endQuestion(pin);
    });

    // ── PLAYER: submit answer ─────────────────────────────────────────────────
    socket.on(
      'player:answer',
      ({
        optionIndex,
        timeSpent,
      }: {
        optionIndex: number;
        timeSpent: number;
      }) => {
        const pin = socket.pin;
        const game = activeGames.get(pin);
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
        player.activePowerUp = null; // consume

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
          endQuestion(pin);
        }
      },
    );

    // ── PLAYER: use power-up ──────────────────────────────────────────────────
    socket.on('player:powerup', ({ type }: { type: string }) => {
      const pin = socket.pin;
      const game = activeGames.get(pin);
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
          endQuestion(pin);
        }, newRemainingMs + 2000);

        io.to(pin).to(`game:${pin}`).emit('game:extra_time', {
          nickname: player.nickname,
          seconds: 15,
        });
        socket.emit('powerup:activated', {
          type,
          message: '+15 seconds added!',
        });
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const pin = socket.pin;
      const game = activeGames.get(pin);
      if (!game) return;

      if (socket.role === 'player') {
        const player = game.players[socket.id];
        if (player) {
          delete game.players[socket.id];
          if (game.hostSocketId) {
            io.to(game.hostSocketId).emit('host:player_left', {
              nickname: player.nickname,
              playerCount: Object.keys(game.players).length,
            });
          }
        }
      }

      if (socket.role === 'host') {
        io.to(pin).to(`game:${pin}`).emit('game:host_left');
        clearTimeout(game.questionTimer);
        activeGames.delete(pin);
      }
    });
  });

  return io;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function sendNextQuestion(pin: string) {
  const game = activeGames.get(pin);
  if (!game) return;

  game.currentIdx++;
  if (game.currentIdx >= game.questions.length) {
    return endGame(pin);
  }

  const q = game.questions[game.currentIdx];
  const total = game.questions.length;

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

  io.to(pin).to(`game:${pin}`).emit('game:question', playerQuestion);

  game.questionStartTs = Date.now();
  game.questionDurationMs = q.timeLimit * 1000;

  // Auto-advance after timeLimit + 2s buffer
  game.questionTimer = setTimeout(() => {
    endQuestion(pin);
  }, game.questionDurationMs + 2000);
}

function endQuestion(pin: string) {
  const game = activeGames.get(pin);
  if (!game) return;

  const idx = game.currentIdx;
  const q = game.questions[idx];

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

  io.to(pin)
    .to(`game:${pin}`)
    .emit('game:question_end', {
      correctOptions,
      explanation: q.explanation,
      leaderboard,
      answerCount: Object.keys(game.answers[idx] || {}).length,
    });

  // Next question after 5s
  setTimeout(() => sendNextQuestion(pin), 5000);
}

async function endGame(pin: string) {
  const game = activeGames.get(pin);
  if (!game) return;

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

  io.to(pin).to(`game:${pin}`).emit('game:ended', {
    leaderboard: finalLeaderboard,
    teamLeaderboard,
  });

  // Persist to DB + award achievements
  try {
    const SessionModel =
      mongoose.models.GameSession || mongoose.model('GameSession');
    const AchievementModel =
      mongoose.models.Achievement || mongoose.model('Achievement');

    const numericPin = Number(pin);
    const pinFilter = !isNaN(numericPin)
      ? { $or: [{ pin }, { pin: numericPin }] }
      : { pin };

    await SessionModel.findOneAndUpdate(pinFilter, {
      status: 'finished',
      endedAt: new Date(),
      currentQuestionIndex: game.currentIdx,
      players: finalLeaderboard.map((p: any) => ({
        userId: p.userId,
        nickname: p.nickname,
        avatarIndex: p.avatarIndex,
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
      // speed demon: answered in under 3s on any question
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

  activeGames.delete(pin);
}
