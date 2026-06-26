const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const GameSession = require('../models/GameSession');
const Question = require('../models/Question');

// In-memory store for active games (PIN → game state)
const activeGames = new Map();

const ANSWER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825']; // red, blue, green, yellow

function calculateScore(isCorrect, timeSpent, timeLimit, points, streak) {
  if (!isCorrect) return 0;
  const ratio = Math.max(0, 1 - timeSpent / (timeLimit * 1000));
  const base = Math.round(points * (0.5 + 0.5 * ratio));
  const bonus = streak >= 3 ? Math.round(base * 0.1 * Math.min(streak, 5)) : 0;
  return base + bonus;
}

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
      credentials: true,
    },
  });

  // ── Auth middleware (optional — hosts must be authenticated) ────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      } catch (_) {}
    }
    next();
  });

  io.on('connection', (socket) => {
    // ── HOST: create/start game ───────────────────────────────────────────────
    socket.on('host:join', async ({ sessionId }) => {
      try {
        if (!socket.user) return socket.emit('error', { message: 'Unauthenticated' });
        const session = await GameSession.findById(sessionId).lean();
        if (!session) return socket.emit('error', { message: 'Session not found' });
        if (session.hostId.toString() !== socket.user.sub)
          return socket.emit('error', { message: 'Forbidden' });

        socket.join(session.pin);
        socket.pin = session.pin;
        socket.role = 'host';

        if (!activeGames.has(session.pin)) {
          const questions = await Question.find({ quizId: session.quizId })
            .sort({ order: 1 })
            .lean();
          activeGames.set(session.pin, {
            sessionId: session._id.toString(),
            pin: session.pin,
            hostSocketId: socket.id,
            questions,
            currentIdx: -1,
            players: {},     // socketId → player
            answers: {},     // questionIdx → { socketId: answer }
            status: 'lobby',
            questionTimer: null,
          });
        }

        const game = activeGames.get(session.pin);
        socket.emit('host:joined', {
          pin: session.pin,
          playerCount: Object.keys(game.players).length,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── PLAYER: join lobby ────────────────────────────────────────────────────
    socket.on('player:join', async ({ pin, nickname, avatarIndex = 0 }) => {
      const game = activeGames.get(pin);
      if (!game) return socket.emit('error', { message: 'Game not found' });
      if (game.status !== 'lobby') return socket.emit('error', { message: 'Game already started' });

      const nickTaken = Object.values(game.players).some(
        (p) => p.nickname.toLowerCase() === nickname.toLowerCase(),
      );
      if (nickTaken) return socket.emit('error', { message: 'Nickname already taken' });

      game.players[socket.id] = {
        socketId: socket.id,
        userId: socket.user?.sub || null,
        nickname,
        avatarIndex,
        totalScore: 0,
        streak: 0,
        answers: [],
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
        players: Object.values(game.players).map((p) => ({
          nickname: p.nickname,
          avatarIndex: p.avatarIndex,
        })),
      });
    });

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
    socket.on('player:answer', ({ optionIndex, timeSpent }) => {
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
      const earned = calculateScore(correct, timeSpent, q.timeLimit, q.points, player.streak);

      if (correct) {
        player.streak++;
      } else {
        player.streak = 0;
      }
      player.totalScore += earned;
      player.answers.push({ questionId: q._id, selectedOption: optionIndex, isCorrect: correct, pointsEarned: earned, timeSpent });

      socket.emit('player:answer_ack', { isCorrect: correct, pointsEarned: earned, totalScore: player.totalScore });

      // Notify host of answer count
      const answered = Object.keys(game.answers[idx]).length;
      const total = Object.keys(game.players).length;
      io.to(game.hostSocketId).emit('host:answer_count', { answered, total });

      // Auto-advance if everyone answered
      if (answered >= total) {
        clearTimeout(game.questionTimer);
        endQuestion(socket.pin);
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
function sendNextQuestion(pin) {
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
    options: q.options.map((o, i) => ({ text: o.text, imageUrl: o.imageUrl, index: i, color: ANSWER_COLORS[i] })),
  };

  io.to(pin).emit('game:question', playerQuestion);

  // Auto-advance after timeLimit + 2s buffer
  game.questionTimer = setTimeout(() => {
    endQuestion(pin);
  }, (q.timeLimit + 2) * 1000);
}

function endQuestion(pin) {
  const game = activeGames.get(pin);
  if (!game) return;

  const idx = game.currentIdx;
  const q = game.questions[idx];

  // Build leaderboard
  const leaderboard = Object.values(game.players)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10)
    .map((p, i) => ({ rank: i + 1, nickname: p.nickname, totalScore: p.totalScore, avatarIndex: p.avatarIndex }));

  const correctOptions = q.options
    .map((o, i) => (o.isCorrect ? i : null))
    .filter((i) => i !== null);

  io.to(pin).emit('game:question_end', {
    correctOptions,
    explanation: q.explanation,
    leaderboard,
    answerCount: Object.keys(game.answers[idx] || {}).length,
  });

  // Next question after 5s
  setTimeout(() => sendNextQuestion(pin), 5000);
}

async function endGame(pin) {
  const game = activeGames.get(pin);
  if (!game) return;

  const finalLeaderboard = Object.values(game.players)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  io.to(pin).emit('game:ended', { leaderboard: finalLeaderboard });

  // Persist to DB
  try {
    await GameSession.findByIdAndUpdate(game.sessionId, {
      status: 'finished',
      endedAt: new Date(),
      currentQuestionIndex: game.currentIdx,
      players: finalLeaderboard.map((p) => ({
        userId: p.userId,
        nickname: p.nickname,
        avatarIndex: p.avatarIndex,
        totalScore: p.totalScore,
        rank: p.rank,
        streak: p.streak,
        answers: p.answers,
      })),
    });
  } catch (err) {
    console.error('[Socket] Failed to persist game session:', err.message);
  }

  activeGames.delete(pin);
}

module.exports = { initSocket };
