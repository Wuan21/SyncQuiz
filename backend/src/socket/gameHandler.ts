import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import * as mongoose from 'mongoose';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {
  GameSessionSchema,
  GameSessionStatus,
} from '../live/schemas/game-session.schema';
import { QuestionSchema } from '../questions/schemas/question.schema';
import { calculateScore, normalizePin } from '../live/live.service';
import { awardAchievement } from '../analytics/schemas/achievement.schema';

const ANSWER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825'];
const DEFAULT_POWERUPS = {
  double_points: 1,
  fifty_fifty: 1,
  extra_time: 1,
};

type PlayerState = {
  socketId: string | null;
  playerId: string;
  userId: string | null;
  nickname: string;
  avatarIndex: number;
  teamName: string | null;
  totalScore: number;
  streak: number;
  answers: Array<{
    questionId: any;
    selectedOption: number;
    isCorrect: boolean;
    pointsEarned: number;
    timeSpent: number;
  }>;
  powerUps: { double_points: number; fifty_fifty: number; extra_time: number };
  activePowerUp: string | null;
};

type GameState = {
  sessionId: string;
  pin: string;
  hostId: string;
  hostSocketId: string;
  questions: any[];
  currentIdx: number;
  players: Record<string, PlayerState>; // keyed by socket.id
  playerByPlayerId: Record<string, PlayerState>;
  answers: Record<number, Record<string, any>>; // [idx][socketId] -> {optionIndex,timeSpent}
  status: string;
  questionTimer: NodeJS.Timeout | null;
  questionStartTs: number;
  questionDurationMs: number;
  paused: boolean;
  /** When reloaded from DB, skip emitting question in sendNextQuestion (already emitted in callback) */
  skipNextQuestion?: boolean;
};

let io: Server;

const activeGames = new Map<string, GameState>();

let sessionModelInstance: mongoose.Model<any> | null = null;
let questionModelInstance: mongoose.Model<any> | null = null;
let achievementModelInstance: mongoose.Model<any> | null = null;

export const setModels = (session: any, question: any, achievement: any) => {
  sessionModelInstance = session;
  questionModelInstance = question;
  if (achievement) achievementModelInstance = achievement;
};

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

function getAchievementModel(): mongoose.Model<any> {
  if (achievementModelInstance) return achievementModelInstance;
  return mongoose.models.Achievement || null;
}

function getGameRoom(gameId: string): string {
  return `game:${gameId}`;
}

/* ── Persist game state to MongoDB ──────────────────────────────── */
async function persistGameState(gameId: string, game: GameState) {
  try {
    const SessionModel = getSessionModel();
    const playerUpdates = Object.values(game.players).map((p) => ({
      playerId: p.playerId,
      socketId: p.socketId,
      totalScore: p.totalScore,
      streak: p.streak,
      connected: !!p.socketId,
      answers: p.answers,
    }));
    await SessionModel.updateOne(
      { _id: gameId },
      {
        $set: {
          status: game.status,
          currentQuestionIndex: game.currentIdx,
          activeQuestion:
            game.currentIdx >= 0 && game.currentIdx < game.questions.length
              ? {
                  questionId:
                    game.questions[game.currentIdx]._id?.toString?.() ||
                    game.questions[game.currentIdx].id,
                  questionIndex: game.currentIdx,
                  startTime: game.questionStartTs,
                  durationMs: game.questionDurationMs,
                  removedOptions: [],
                }
              : null,
          players: playerUpdates,
        },
      },
    );
  } catch (err: any) {
    console.error('[PERSIST ERROR]', err.message);
  }
}

/* ── Reload active game from MongoDB (server restart recovery) ── */
async function reloadFromDB(
  gameId: string,
  socketId: string,
  isHost: boolean,
): Promise<{ success: boolean; gameState?: any; error?: any }> {
  try {
    const SessionModel = getSessionModel();
    const QuestionModel = getQuestionModel();

    const session: any = await SessionModel.findById(gameId).lean();
    if (!session) {
      return {
        success: false,
        error: { code: 'GAME_NOT_FOUND', message: 'Không tìm thấy phòng' },
      };
    }

    if (
      session.status === GameSessionStatus.ENDED ||
      session.status === GameSessionStatus.FINISHED
    ) {
      return {
        success: false,
        error: { code: 'GAME_ENDED', message: 'Phòng chơi đã kết thúc' },
      };
    }

    if (!session.activeQuestion) {
      // Game was started but no active question yet (edge case)
      return {
        success: true,
        gameState: {
          players: (session.players || []).map((p: any) => ({
            playerId: p.playerId,
            nickname: p.nickname,
            teamName: p.teamName,
            avatar: p.avatar,
            avatarIndex: p.avatarIndex,
            connected: p.connected,
          })),
          gameState: 'waiting',
        },
      };
    }

    // Load questions from DB
    const questions = await QuestionModel.find({ quizId: session.quizId })
      .sort({ order: 1 })
      .lean();

    const activeQ = questions[session.activeQuestion.questionIndex];
    if (!activeQ) {
      return {
        success: false,
        error: { code: 'GAME_ERROR', message: 'Không tìm thấy câu hỏi' },
      };
    }

    // Reconstruct in-memory state
    const playerMap: Record<string, PlayerState> = {};
    const byPlayerId: Record<string, PlayerState> = {};
    for (const p of session.players || []) {
      const state: PlayerState = {
        socketId: isHost ? null : socketId,
        playerId: p.playerId,
        userId: null,
        nickname: p.nickname,
        avatarIndex: p.avatarIndex ?? 0,
        teamName: p.teamName || null,
        totalScore: p.totalScore || 0,
        streak: p.streak || 0,
        answers: p.answers || [],
        powerUps: { ...DEFAULT_POWERUPS },
        activePowerUp: null,
      };
      const sockId = isHost ? null : socketId;
      if (sockId) playerMap[sockId] = state;
      byPlayerId[p.playerId] = state;
    }

    // Restore removed options from activeAnswers (fifty_fifty)
    const removedByPlayer: Record<string, number[]> = {};
    for (const ans of session.activeAnswers || []) {
      // We can't fully restore powerup state, but we track which options were removed
    }

    const game: GameState = {
      sessionId: gameId,
      pin: session.pin,
      hostId: session.hostId,
      hostSocketId: isHost ? socketId : '',
      questions,
      currentIdx: session.activeQuestion.questionIndex,
      players: playerMap,
      playerByPlayerId: byPlayerId,
      answers: {},
      status: session.status,
      questionTimer: null,
      questionStartTs: session.activeQuestion.startTime || Date.now(),
      questionDurationMs: session.activeQuestion.durationMs || 30000,
      paused: session.status === GameSessionStatus.PAUSED,
      // Tell sendNextQuestion not to re-emit the current question
      skipNextQuestion: true,
    };
    activeGames.set(gameId, game);

    const total = questions.length;
    const timeLeft = session.activeQuestion.durationMs
      ? Math.max(
          0,
          Math.floor(
            (session.activeQuestion.durationMs -
              (Date.now() - (session.activeQuestion.startTime || Date.now()))) /
              1000,
          ),
        )
      : 0;

    return {
      success: true,
      gameState: {
        players: (session.players || []).map((p: any) => ({
          playerId: p.playerId,
          nickname: p.nickname,
          teamName: p.teamName,
          avatar: p.avatar,
          avatarIndex: p.avatarIndex,
          connected: p.connected,
        })),
        gameState: 'running',
        currentIdx: session.activeQuestion.questionIndex,
        totalQuestions: total,
        question: activeQ,
        timeLimit: Math.ceil(
          (session.activeQuestion.durationMs || 30000) / 1000,
        ),
        timeLeft,
        answerCount: {
          answered: session.activeAnswers?.length || 0,
          total: (session.players || []).length,
        },
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'RELOAD_ERROR', message: err.message },
    };
  }
}

function snapshotPlayers(game: GameState) {
  return Object.values(game.players).map((p) => ({
    playerId: p.playerId,
    nickname: p.nickname,
    teamName: p.teamName || '',
    avatarIndex: p.avatarIndex,
    connected: !!p.socketId,
    totalScore: p.totalScore,
    rank: 0,
  }));
}

function sortLeaderboard(game: GameState) {
  return Object.values(game.players)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((p, i) => ({
      rank: i + 1,
      playerId: p.playerId,
      nickname: p.nickname,
      totalScore: p.totalScore,
      avatarIndex: p.avatarIndex,
    }));
}

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
        if (isAllowed) return cb(null, true);
        // Allow all in dev / mobile clients
        if (process.env.NODE_ENV !== 'production') return cb(null, true);
        return cb(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  /* ── Cognito verifier (optional) ───────────────────────────────────── */
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

  /* ── Auth middleware (optional — players don't need auth) ─────────── */
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();

    try {
      if (cognitoVerifier) {
        try {
          const payload: any = await cognitoVerifier.verify(token);
          const UserModel = mongoose.models.User || mongoose.model('User');
          const user = await UserModel.findOne({
            $or: [{ cognitoId: payload.sub }, { email: payload.email }],
          });
          if (user) {
            (socket as any).user = {
              id: user._id.toString(),
              email: user.email,
              role: user.role,
            };
          }
          return next();
        } catch (_) {
          // fall through to jwt
        }
      }
      const decoded: any = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || 'secret',
      );
      (socket as any).user = {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (_) {
      // ignore — allow anonymous
    }
    return next();
  });

  io.on('connection', (socket: any) => {
    // Only log in non-production — Socket.IO heartbeat floods logs in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SOCKET] New connection:', socket.id);
    }

    /* ── HOST: attach to game ────────────────────────────────────────── */
    socket.on(
      'host:attach-game',
      async (
        payload: { gameId: string; pin: string },
        callback?: (res: any) => void,
      ) => {
        const cb = typeof callback === 'function' ? callback : () => {};
        try {
          const SessionModel = getSessionModel();
          const game: any = await SessionModel.findById(payload.gameId).lean();
          if (!game) {
            return cb({
              success: false,
              code: 'GAME_NOT_FOUND',
              message: 'Không tìm thấy phòng',
            });
          }
          if (game.pin !== normalizePin(payload.pin)) {
            return cb({
              success: false,
              code: 'INVALID_PIN',
              message: 'Mã PIN không hợp lệ',
            });
          }
          if (
            game.status === GameSessionStatus.ENDED ||
            game.status === GameSessionStatus.FINISHED
          ) {
            return cb({
              success: false,
              code: 'GAME_ENDED',
              message: 'Phòng chơi đã kết thúc',
            });
          }

          const gameId = game._id.toString();
          const room = getGameRoom(gameId);
          await socket.join(room);

          socket.data.role = 'host';
          socket.data.gameId = gameId;
          socket.data.pin = game.pin;

          // Try in-memory first, then reload from DB if server restarted
          const existing = activeGames.get(gameId);
          if (existing) {
            existing.hostSocketId = socket.id;
            const elapsedMs = Date.now() - existing.questionStartTs;
            const remainingMs = Math.max(
              0,
              Math.floor((existing.questionDurationMs - elapsedMs) / 1000),
            );
            return cb({
              success: true,
              gameId,
              players: snapshotPlayers(existing),
              gameState: 'running',
              currentIdx: existing.currentIdx,
              totalQuestions: existing.questions.length,
              question: existing.questions[existing.currentIdx],
              timeLimit:
                existing.questions[existing.currentIdx]?.timeLimit || 0,
              timeLeft: remainingMs,
              answerCount: {
                answered: Object.keys(
                  existing.answers[existing.currentIdx] || {},
                ).length,
                total: Object.keys(existing.players).length,
              },
            });
          }

          // Server restarted — try to reload from DB
          const dbReload = await reloadFromDB(gameId, socket.id, true);
          if (dbReload.success) {
            if (dbReload.gameState?.gameState === 'running') {
              // Restore host socket ID in game state
              const restoredGame = activeGames.get(gameId);
              if (restoredGame) restoredGame.hostSocketId = socket.id;
              return cb({
                success: true,
                gameId,
                players: dbReload.gameState.players,
                gameState: 'running',
                currentIdx: dbReload.gameState.currentIdx,
                totalQuestions: dbReload.gameState.totalQuestions,
                question: dbReload.gameState.question,
                timeLimit: dbReload.gameState.timeLimit,
                timeLeft: dbReload.gameState.timeLeft,
                answerCount: dbReload.gameState.answerCount,
                // DO NOT call sendNextQuestion here — question already sent in callback
                skipNextQuestion: true,
              });
            }
          }

          return cb({
            success: true,
            gameId,
            players: (game.players || []).map((p: any) => ({
              playerId: p.playerId,
              nickname: p.nickname,
              teamName: p.teamName,
              avatar: p.avatar,
              avatarIndex: p.avatarIndex,
              connected: p.connected,
            })),
          });
        } catch (error: any) {
          console.error('[HOST ATTACH ERROR]', error.message);
          return cb({
            success: false,
            code: 'HOST_ATTACH_FAILED',
            message: 'Không thể kết nối Host',
          });
        }
      },
    );

    /* ── PLAYER: attach (also used for reconnect) ───────────────────── */
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
            return cb({
              success: false,
              code: 'GAME_NOT_FOUND',
              message: 'Không tìm thấy phòng',
            });
          }
          if (game.pin !== normalizePin(payload.pin)) {
            return cb({
              success: false,
              code: 'INVALID_PIN',
              message: 'Mã PIN không hợp lệ',
            });
          }
          if (
            game.status === GameSessionStatus.ENDED ||
            game.status === GameSessionStatus.FINISHED
          ) {
            return cb({
              success: false,
              code: 'GAME_ENDED',
              message: 'Phòng chơi đã kết thúc',
            });
          }

          const player = (game.players || []).find(
            (item: any) => item.playerId === payload.playerId,
          );
          if (!player) {
            return cb({
              success: false,
              code: 'PLAYER_NOT_FOUND',
              message: 'Không tìm thấy người chơi',
            });
          }

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

          const players = (game.players || []).map((item: any) => ({
            playerId: item.playerId,
            nickname: item.nickname,
            teamName: item.teamName,
            avatar: item.avatar,
            avatarIndex: item.avatarIndex,
            connected: item.connected,
          }));
          io.to(room).emit('player-list:updated', players);

          // Re-attach in-memory state if game is active
          const gameState = activeGames.get(gameId);
          if (gameState && !gameState.players[socket.id]) {
            const restored: PlayerState = {
              socketId: socket.id,
              playerId: player.playerId,
              userId: null,
              nickname: player.nickname,
              avatarIndex: player.avatarIndex ?? 0,
              teamName: player.teamName || null,
              totalScore: player.totalScore || 0,
              streak: player.streak || 0,
              answers: (player.answers || []).map((a: any) => ({
                questionId: a.questionId,
                selectedOption: a.selectedOption,
                isCorrect: a.isCorrect,
                pointsEarned: a.pointsEarned,
                timeSpent: a.timeSpent,
              })),
              powerUps: { ...DEFAULT_POWERUPS },
              activePowerUp: null,
            };
            gameState.players[socket.id] = restored;
            gameState.playerByPlayerId[player.playerId] = restored;
          }

          // If no in-memory state, try to reload from DB (server restarted)
          if (
            !gameState &&
            (game.status === GameSessionStatus.ACTIVE ||
              game.status === GameSessionStatus.PAUSED)
          ) {
            const dbReload = await reloadFromDB(gameId, socket.id, false);
            if (
              dbReload.success &&
              dbReload.gameState?.gameState === 'running'
            ) {
              const restoredGame = activeGames.get(gameId);
              if (restoredGame && !restoredGame.players[socket.id]) {
                const restored: PlayerState = {
                  socketId: socket.id,
                  playerId: player.playerId,
                  userId: null,
                  nickname: player.nickname,
                  avatarIndex: player.avatarIndex ?? 0,
                  teamName: player.teamName || null,
                  totalScore: player.totalScore || 0,
                  streak: player.streak || 0,
                  answers: (player.answers || []).map((a: any) => ({
                    questionId: a.questionId,
                    selectedOption: a.selectedOption,
                    isCorrect: a.isCorrect,
                    pointsEarned: a.pointsEarned,
                    timeSpent: a.timeSpent,
                  })),
                  powerUps: { ...DEFAULT_POWERUPS },
                  activePowerUp: null,
                };
                restoredGame.players[socket.id] = restored;
                restoredGame.playerByPlayerId[player.playerId] = restored;
              }
            }
          }

          // Send current question to player if game is active
          const restoredGame2 = activeGames.get(gameId);
          if (
            restoredGame2 &&
            (game.status === GameSessionStatus.ACTIVE ||
              game.status === GameSessionStatus.PAUSED) &&
            restoredGame2.currentIdx >= 0 &&
            restoredGame2.currentIdx < restoredGame2.questions.length
          ) {
            const q = restoredGame2.questions[restoredGame2.currentIdx];
            const playerQ = {
              index: restoredGame2.currentIdx,
              total: restoredGame2.questions.length,
              questionId: q._id?.toString?.() || q.id,
              content: q.content,
              options: q.options,
              timeLimit: q.timeLimit,
              type: q.type,
            };
            socket.emit('game:question', playerQ);
          }

          return cb({ success: true, gameId, playerId: player.playerId });
        } catch (error: any) {
          console.error('[PLAYER ATTACH ERROR]', error.message);
          return cb({
            success: false,
            code: 'PLAYER_ATTACH_FAILED',
            message: 'Không thể kết nối người chơi',
          });
        }
      },
    );

    /* ── HOST: start ────────────────────────────────────────────────── */
    socket.on('host:start', async () => {
      const gameId = socket.data.gameId;
      if (!gameId || socket.data.role !== 'host') return;

      try {
        const SessionModel = getSessionModel();
        const QuestionModel = getQuestionModel();

        const session = await SessionModel.findById(gameId);
        if (!session) return;

        session.status = GameSessionStatus.ACTIVE;
        session.startedAt = new Date();
        await session.save();

        const questions = await QuestionModel.find({
          quizId: session.quizId,
        })
          .sort({ order: 1 })
          .lean();

        const playerMap: Record<string, PlayerState> = {};
        const byPlayerId: Record<string, PlayerState> = {};
        for (const p of session.players || []) {
          // Bind by current socket.id if attached, else leave socketId null
          let socketId: string | null = p.socketId || null;
          if (!socketId) {
            const sockets = Array.from(io.sockets.sockets.values()) as any[];
            const match = sockets.find(
              (s) =>
                s.data?.role === 'player' &&
                s.data?.playerId === p.playerId &&
                s.data?.gameId === gameId,
            );
            socketId = match?.id || null;
          }

          const state: PlayerState = {
            socketId,
            playerId: p.playerId,
            userId: null,
            nickname: p.nickname,
            avatarIndex: p.avatarIndex ?? 0,
            teamName: p.teamName || null,
            totalScore: p.totalScore || 0,
            streak: p.streak || 0,
            answers: [],
            powerUps: { ...DEFAULT_POWERUPS },
            activePowerUp: null,
          };
          if (socketId) {
            playerMap[socketId] = state;
            byPlayerId[p.playerId] = state;
          }
        }

        const game: GameState = {
          sessionId: gameId,
          pin: session.pin,
          hostId: session.hostId,
          hostSocketId: socket.id,
          questions,
          currentIdx: -1,
          players: playerMap,
          playerByPlayerId: byPlayerId,
          answers: {},
          status: GameSessionStatus.ACTIVE,
          questionTimer: null,
          questionStartTs: 0,
          questionDurationMs: 0,
          paused: false,
        };
        activeGames.set(gameId, game);

        // Update totalQuestions
        session.totalQuestions = questions.length;
        await session.save();

        const room = getGameRoom(gameId);
        io.to(room).emit('game:started', {
          gameId,
          totalQuestions: questions.length,
        });
        void sendNextQuestion(gameId);
      } catch (err: any) {
        console.error('[HOST START ERROR]', err.message);
      }
    });

    /* ── HOST: pause / resume ───────────────────────────────────────── */
    socket.on('host:pause', async () => {
      const gameId = socket.data.gameId;
      const game = activeGames.get(gameId);
      if (!game || game.hostSocketId !== socket.id) return;
      if (game.status !== GameSessionStatus.ACTIVE) return;
      clearTimeout(game.questionTimer);
      game.status = GameSessionStatus.PAUSED;
      game.paused = true;
      io.to(getGameRoom(gameId)).emit('game:paused');
      await persistGameState(gameId, game);
    });

    socket.on('host:resume', async () => {
      const gameId = socket.data.gameId;
      const game = activeGames.get(gameId);
      if (!game || game.hostSocketId !== socket.id) return;
      if (game.status !== GameSessionStatus.PAUSED) return;
      game.paused = false;
      game.status = GameSessionStatus.ACTIVE;
      // Resume timer
      const elapsedMs = Date.now() - game.questionStartTs;
      const remainingMs = Math.max(0, game.questionDurationMs - elapsedMs);
      game.questionTimer = setTimeout(
        () => endQuestion(gameId),
        remainingMs + 1000,
      );
      io.to(getGameRoom(gameId)).emit('game:resumed');
      await persistGameState(gameId, game);
    });

    /* ── HOST: skip time / next / end ───────────────────────────────── */
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
      void sendNextQuestion(gameId);
    });

    socket.on('host:end_game', () => {
      const gameId = socket.data.gameId;
      const game = activeGames.get(gameId);
      if (!game || game.hostSocketId !== socket.id) return;
      clearTimeout(game.questionTimer);
      void endGame(gameId);
    });

    /* ── PLAYER: submit answer ───────────────────────────────────────── */
    socket.on(
      'player:answer',
      async ({
        optionIndex,
        timeSpent,
      }: {
        optionIndex: number;
        timeSpent: number;
      }) => {
        const gameId = socket.data.gameId;
        const game = activeGames.get(gameId);
        if (!game || game.status !== GameSessionStatus.ACTIVE) return;

        const player = game.players[socket.id];
        if (!player) return;

        const idx = game.currentIdx;
        if (!game.answers[idx]) game.answers[idx] = {};
        if (game.answers[idx][socket.id] !== undefined) return; // already answered

        game.answers[idx][socket.id] = { optionIndex, timeSpent };

        const q = game.questions[idx];
        const opts: any[] = q.options || [];
        const isCorrect = !!opts[optionIndex]?.isCorrect;

        const useDouble = player.activePowerUp === 'double_points';
        const earned = calculateScore(
          isCorrect,
          Number(timeSpent) || 0,
          q.timeLimit || 30,
          q.points || 1000,
          player.streak,
          useDouble,
        );
        player.activePowerUp = null;
        if (isCorrect) {
          player.streak++;
        } else {
          player.streak = 0;
        }
        player.totalScore += earned;
        player.answers.push({
          questionId: q._id,
          selectedOption: optionIndex,
          isCorrect,
          pointsEarned: earned,
          timeSpent: Number(timeSpent) || 0,
        });

        socket.emit('player:answer_ack', {
          isCorrect,
          pointsEarned: earned,
          totalScore: player.totalScore,
        });

        // Tell host about answer count
        const answered = Object.keys(game.answers[idx]).length;
        const total = Object.keys(game.players).length;
        if (game.hostSocketId) {
          io.to(game.hostSocketId).emit('host:answer_count', {
            answered,
            total,
          });
        }

        // Persist score to MongoDB after each answer
        await persistGameState(gameId, game);

        if (total > 0 && answered >= total) {
          clearTimeout(game.questionTimer);
          void endQuestion(gameId);
        }
      },
    );

    /* ── PLAYER: power-ups ───────────────────────────────────────────── */
    socket.on('player:powerup', ({ type }: { type: string }) => {
      const gameId = socket.data.gameId;
      const game = activeGames.get(gameId);
      if (!game || game.status !== GameSessionStatus.ACTIVE) return;
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
        const wrongIndices = (q.options || [])
          .map((o: any, i: number) => (!o.isCorrect ? i : null))
          .filter((i: any) => i !== null);
        const toRemove = wrongIndices
          .sort(() => Math.random() - 0.5)
          .slice(0, 2);
        socket.emit('powerup:activated', { type, removedOptions: toRemove });
      }

      if (type === 'extra_time') {
        const remainingMs = Math.max(
          0,
          game.questionDurationMs - (Date.now() - game.questionStartTs),
        );
        const newRemainingMs = remainingMs + 15000;
        game.questionDurationMs += 15000;

        clearTimeout(game.questionTimer);
        game.questionTimer = setTimeout(
          () => endQuestion(gameId),
          newRemainingMs + 1000,
        );

        io.to(getGameRoom(gameId)).emit('game:extra_time', {
          nickname: player.nickname,
          seconds: 15,
        });
        socket.emit('powerup:activated', {
          type,
          message: '+15 seconds added!',
        });
      }
    });

    /* ── Disconnect ─────────────────────────────────────────────────── */
    socket.on('disconnect', async () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          '[SOCKET] Disconnect:',
          socket.id,
          'role:',
          socket.data?.role,
        );
      }

      const gameId = socket.data?.gameId;
      if (!gameId) return;

      const role = socket.data?.role;
      const playerId = socket.data?.playerId;

      try {
        const SessionModel = getSessionModel();
        if (role === 'player' && playerId) {
          await SessionModel.updateOne(
            { _id: gameId, 'players.playerId': playerId },
            {
              $set: {
                'players.$.connected': false,
                'players.$.socketId': null,
              },
            },
          );
          const game = activeGames.get(gameId);
          if (game) {
            delete game.players[socket.id];
            // Emit updated list from in-memory state — no extra DB query
            const players = Object.values(game.players).map((p) => ({
              playerId: p.playerId,
              nickname: p.nickname,
              teamName: p.teamName || '',
              avatar: '😀',
              avatarIndex: p.avatarIndex,
              connected: !!p.socketId,
            }));
            io.to(getGameRoom(gameId)).emit('player-list:updated', players);
          }
        }

        if (role === 'host') {
          const game = activeGames.get(gameId);
          if (game) {
            game.hostSocketId = '';
            // Grace period: emit host_left only if host hasn't reconnected after 60s
            setTimeout(() => {
              const currentGame = activeGames.get(gameId);
              if (currentGame && currentGame.hostSocketId === '') {
                io.to(getGameRoom(gameId)).emit('game:host_left');
              }
            }, 60_000);
          }
        }
      } catch (err: any) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[DISCONNECT]', err.message);
        }
      }
    });
  });

  return io;
};

/* ═════════════════════════════════════════════════════════════════════════
   GAME PLAY HELPERS
   ═════════════════════════════════════════════════════════════════════════ */

function sendNextQuestion(gameId: string) {
  const game = activeGames.get(gameId);
  if (!game) return;

  let q: any;

  // On first call after reload-from-DB, skipNextQuestion is set → do NOT increment idx
  if (game.skipNextQuestion) {
    game.skipNextQuestion = false;
    q = game.questions[game.currentIdx];
    // Emit question at currentIdx (already correct from DB) to host
    if (game.hostSocketId) {
      io.to(game.hostSocketId).emit('host:question', {
        index: game.currentIdx,
        total: game.questions.length,
        question: q,
        timeLimit: q.timeLimit,
      });
    }
    // Start timer
    game.questionTimer = setTimeout(
      () => endQuestion(gameId),
      (game.questionDurationMs || 30000) + 1500,
    );
    const playerQuestion = {
      index: game.currentIdx,
      total: game.questions.length,
      questionId: q._id?.toString?.() || q.id,
      content: q.content,
      options: q.options,
      timeLimit: q.timeLimit,
      type: q.type,
    };
    io.to(getGameRoom(gameId)).emit('game:question', playerQuestion);
    return;
  }

  game.currentIdx++;
  if (game.currentIdx >= game.questions.length) {
    return endGame(gameId);
  }

  q = game.questions[game.currentIdx];
  const total = game.questions.length;
  const room = getGameRoom(gameId);

  if (game.hostSocketId) {
    io.to(game.hostSocketId).emit('host:question', {
      index: game.currentIdx,
      total,
      question: q,
      timeLimit: q.timeLimit,
    });
  }

  const playerQuestion = {
    index: game.currentIdx,
    total,
    questionId: q._id?.toString?.() || q.id,
    content: q.content,
    imageUrl: q.imageUrl,
    type: q.type,
    timeLimit: q.timeLimit,
    points: q.points,
    options: (q.options || []).map((o: any, i: number) => ({
      text: o.text,
      imageUrl: o.imageUrl,
      index: i,
      color: ANSWER_COLORS[i] || '#999',
    })),
  };

  io.to(room).emit('game:question', playerQuestion);

  game.questionStartTs = Date.now();
  game.questionDurationMs = (q.timeLimit || 30) * 1000;

  game.questionTimer = setTimeout(
    () => endQuestion(gameId),
    game.questionDurationMs + 1500,
  );

  // Persist active question state to MongoDB
  void persistGameState(gameId, game);

  void (async () => {
    try {
      const SessionModel = getSessionModel();
      await SessionModel.findByIdAndUpdate(gameId, {
        currentQuestionIndex: game.currentIdx,
        activeQuestion: {
          questionId: q._id?.toString?.() || q.id,
          questionIndex: game.currentIdx,
          startTime: game.questionStartTs,
          durationMs: game.questionDurationMs,
          removedOptions: [],
        },
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

  const leaderboard = sortLeaderboard(game).slice(0, 10);
  const correctOptions = (q.options || [])
    .map((o: any, i: number) => (o.isCorrect ? i : null))
    .filter((i: any) => i !== null);

  io.to(room).emit('game:question_end', {
    correctOptions,
    explanation: q.explanation,
    leaderboard,
    answerCount: Object.keys(game.answers[idx] || {}).length,
  });

  // Clear activeQuestion in DB (question ended, showing leaderboard)
  void (async () => {
    try {
      const SessionModel = getSessionModel();
      await SessionModel.updateOne(
        { _id: gameId },
        {
          $set: {
            activeQuestion: null,
            activeAnswers: [],
          },
        },
      );
    } catch (_) {}
  })();
}

async function endGame(gameId: string) {
  const game = activeGames.get(gameId);
  if (!game) return;

  const room = getGameRoom(gameId);
  const finalLeaderboard = Object.values(game.players)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((p, i) => ({
      rank: i + 1,
      playerId: p.playerId,
      nickname: p.nickname,
      teamName: p.teamName,
      avatarIndex: p.avatarIndex,
      totalScore: p.totalScore,
      streak: p.streak,
      answers: p.answers,
    }));

  const teamMap: Record<string, any> = {};
  for (const p of finalLeaderboard) {
    if (!p.teamName) continue;
    if (!teamMap[p.teamName]) {
      teamMap[p.teamName] = {
        teamName: p.teamName,
        totalScore: 0,
        members: 0,
      };
    }
    teamMap[p.teamName].totalScore += p.totalScore;
    teamMap[p.teamName].members++;
  }
  const teamLeaderboard = Object.values(teamMap)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((t, i) => ({ ...t, rank: i + 1 }));

  io.to(room).emit('game:ended', {
    leaderboard: finalLeaderboard,
    teamLeaderboard,
  });

  try {
    const SessionModel = getSessionModel();
    const session = await SessionModel.findById(gameId);
    if (session) {
      session.status = GameSessionStatus.FINISHED;
      session.endedAt = new Date();
      session.currentQuestionIndex = game.currentIdx;
      session.players = finalLeaderboard.map((p) => ({
        playerId: p.playerId,
        socketId: null,
        nickname: p.nickname,
        avatarIndex: p.avatarIndex,
        avatar: '😀',
        teamName: p.teamName || '',
        connected: false,
        totalScore: p.totalScore,
        rank: p.rank,
        streak: p.streak,
        answers: p.answers,
      }));
      await session.save();
    }

    const AchievementModel = getAchievementModel();
    if (AchievementModel) {
      for (const p of finalLeaderboard) {
        if (!p.playerId) continue;
        if (p.rank === 1)
          await awardAchievement(AchievementModel, p.playerId, 'centurion');
        if (p.streak >= 5)
          await awardAchievement(AchievementModel, p.playerId, 'streak_5');
        const fast = p.answers.some(
          (a: any) => a.timeSpent < 3000 && a.isCorrect,
        );
        if (fast)
          await awardAchievement(AchievementModel, p.playerId, 'speed_demon');
      }
      if (finalLeaderboard.length >= 20) {
        for (const p of finalLeaderboard) {
          if (p.playerId)
            await awardAchievement(AchievementModel, p.playerId, 'social');
        }
      }
    }
  } catch (err: any) {
    console.error('[Socket] persist final game failed:', err.message);
  }

  activeGames.delete(gameId);
}

export { activeGames, endGame };
