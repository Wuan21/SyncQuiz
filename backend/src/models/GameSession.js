const mongoose = require('mongoose');

// ── Sub-schemas ────────────────────────────────────────────────────────────────
const playerAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOption: { type: Number, default: null }, // index of option
    answerText: { type: String, default: null },     // for fill_blank
    isCorrect: { type: Boolean, default: false },
    pointsEarned: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 }, // ms
  },
  { _id: false },
);

const playerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    nickname: { type: String, required: true, maxlength: 30 },
    avatarIndex: { type: Number, default: 0 },
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
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pin: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['waiting', 'active', 'finished'],
      default: 'waiting',
    },
    currentQuestionIndex: { type: Number, default: -1 },
    players: { type: [playerSchema], default: [] },
    totalQuestions: { type: Number, default: 0 },
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

const GameSession = mongoose.model('GameSession', gameSessionSchema);
module.exports = GameSession;
