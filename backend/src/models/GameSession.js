const mongoose = require('mongoose');

// ── Sub-schemas ────────────────────────────────────────────────────────────────
const playerAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOption: { type: Number, default: null },
    answerText: { type: String, default: null },
    isCorrect: { type: Boolean, default: false },
    pointsEarned: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 },
  },
  { _id: false },
);

const gamePlayerSchema = new mongoose.Schema(
  {
    playerId: { type: String, required: true },
    socketId: { type: String, default: null },
    nickname: { type: String, required: true, trim: true, maxlength: 30 },
    teamName: { type: String, default: '', trim: true },
    avatar: { type: String, default: '😀' },
    avatarIndex: { type: Number, default: 0 },
    connected: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
    totalScore: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    answers: { type: [playerAnswerSchema], default: [] },
  },
  { _id: false },
);

// ── Main session schema ────────────────────────────────────────────────────────
const gameSessionSchema = new mongoose.Schema(
  {
    pin: { type: String, required: true, unique: true, index: true, trim: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    hostId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['waiting', 'active', 'finished', 'ended'],
      default: 'waiting',
      index: true,
    },
    players: { type: [gamePlayerSchema], default: [] },
    currentQuestionIndex: { type: Number, default: -1 },
    totalQuestions: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    settings: {
      showLeaderboard: { type: Boolean, default: true },
      shuffleQuestions: { type: Boolean, default: false },
      shuffleAnswers: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    collection: 'gamesessions',
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

gameSessionSchema.index({ hostId: 1 });
gameSessionSchema.index({ quizId: 1 });
gameSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const GameSession =
  mongoose.models.GameSession || mongoose.model('GameSession', gameSessionSchema);
module.exports = GameSession;
