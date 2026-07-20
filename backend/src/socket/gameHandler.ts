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
  io = new Server(server, {
    cors: {
      origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
      credentials: true,
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

  // ── Auth middleware (hosts must be authenticated) ──────────────────────────
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
              sub: user._id.toString(),
              email: user.email,
              role: user.role,
            };
            return next();
          }
        } catch (_) {}
      }

      try {
        socket.user = jwt.verify(
          token,
          process.env.JWT_ACCESS_SECRET || 'secret',
        );
      } catch (_) {}
    }
    next();
  });

  io.on('connection', (socket: any) => {
    // ── HOST: create/start game ───────────────────────────────────────────────
    socket.on('host:join', async ({ sessionId }: { sessionId: string }) => {
      try {
        if (!socket.user)
          return socket.emit('error', { message: 'Unauthenticated' });
        const SessionModel =
          mongoose.models.GameSession || mongoose.model('GameSession');
        const QuestionModel =
          mongoose.models.Question || mongoose.model('Question');

        const session = await SessionModel.findById(sessionId).lean();
        if (!session)
          return socket.emit('error', { message: 'Session not found' });
        if (session.hostId.toString() !== socket.user.sub)
          return socket.emit('error', { message: 'Forbidden' });

        socket.join(session.pin);
        socket.pin = session.pin;
        socket.role = 'host';

        if (!activeGames.has(session.pin)) {
          const questions = await QuestionModel.find({ quizId: session.quizId })
            .sort({ order: 1 })
            .lean();
          activeGames.set(session.pin, {
            sessionId: session._id.toString(),
            pin: session.pin,
            hostSocketId: socket.id,
            questions,
            currentIdx: -1,
            players: {}, // socketId → player
            answers: {}, // questionIdx → { socketId: answer }
            status: 'lobby',
            questionTimer: null,
          });
        }

        const game = activeGames.get(session.pin);
        socket.emit('host:joined', {
          pin: session.pin,
          playerCount: Object.keys(game.players).length,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── PLAYER: join lobby ────────────────────────────────────────────────────
    socket.on(
      'player:join',
      async ({
        pin,
        nickname,
        avatarIndex = 0,
        teamName = null,
      }: {
        pin: string;
        nickname: string;
        avatarIndex?: number;
        teamName?: string;
      }) => {
        const game = activeGames.get(pin);
        if (!game) return socket.emit('error', { message: 'Game not found' });
        if (game.status !== 'lobby')
          return socket.emit('error', { message: 'Game already started' });

        const nickTaken = Object.values(game.players).some(
          (p: any) => p.nickname.toLowerCase() === nickname.toLowerCase(),
        );
        if (nickTaken)
          return socket.emit('error', { message: 'Nickname already taken' });

        game.players[socket.id] = {
          socketId: socket.id,
          userId: socket.user?.sub || null,
          nickname,
          avatarIndex,
          totalScore: 0,
          streak: 0,
          answers: [],
          powerUps: { ...DEFAULT_POWERUPS },
          activePowerUp: null,
          teamName: teamName || null,
        };

        socket.join(pin);
        socket.pin = pin;
        socket.role = 'player';

        socket.emit('player:joined', { nickname, pin });
        io.to(game.hostSocketId).emit('host:player_joined', {
          nickname,
          playerCount: Object.keys(game.players).length,
        });
        // Broadcast updated player list to host
        io.to(game.hostSocketId).emit('host:lobby_update', {
          players: Object.values(game.players).map((p: any) => ({
            nickname: p.nickname,
            avatarIndex: p.avatarIndex,
          })),
        });
      },
    );

    // ── HOST: start game ──────────────────────────────────────────────────────
    socket.on('host:start', () => {
      const game = activeGames.get(socket.pin);
      if (!game || game.hostSocketId !== socket.id) return;
      game.status = 'active';
      io.to(socket.pin).emit('game:started');
      sendNextQuestion(socket.pin);
    });

    // ── HOST: next question manually (optional) ───────────────────────────────
    socket.on('host:next', () => {
      const game = activeGames.get(socket.pin);
      if (!game || game.hostSocketId !== socket.id) return;
      clearTimeout(game.questionTimer);
      endQuestion(socket.pin);
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
        const game = activeGames.get(socket.pin);
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
        io.to(game.hostSocketId).emit('host:answer_count', { answered, total });

        // Auto-advance if everyone answered
        if (answered >= total) {
          clearTimeout(game.questionTimer);
          endQuestion(socket.pin);
        }
      },
    );

    // ── PLAYER: use power-up ──────────────────────────────────────────────────
    socket.on('player:powerup', ({ type }: { type: string }) => {
      const game = activeGames.get(socket.pin);
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
          endQuestion(socket.pin);
        }, newRemainingMs + 2000);

        io.to(socket.pin).emit('game:extra_time', {
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
      const game = activeGames.get(socket.pin);
      if (!game) return;

      if (socket.role === 'player') {
        const player = game.players[socket.id];
        if (player) {
          delete game.players[socket.id];
          io.to(game.hostSocketId).emit('host:player_left', {
            nickname: player.nickname,
            playerCount: Object.keys(game.players).length,
          });
        }
      }

      if (socket.role === 'host') {
        io.to(socket.pin).emit('game:host_left');
        clearTimeout(game.questionTimer);
        activeGames.delete(socket.pin);
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
  io.to(game.hostSocketId).emit('host:question', {
    index: game.currentIdx,
    total,
    question: q,
    timeLimit: q.timeLimit,
  });

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

  io.to(pin).emit('game:question', playerQuestion);

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

  io.to(pin).emit('game:question_end', {
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

  io.to(pin).emit('game:ended', {
    leaderboard: finalLeaderboard,
    teamLeaderboard,
  });

  // Persist to DB + award achievements
  try {
    const SessionModel =
      mongoose.models.GameSession || mongoose.model('GameSession');
    const AchievementModel =
      mongoose.models.Achievement || mongoose.model('Achievement');

    await SessionModel.findByIdAndUpdate(game.sessionId, {
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
