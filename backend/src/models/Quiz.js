const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, default: null, maxlength: 1000 },
    coverImageUrl: { type: String, default: null },
    visibility: { type: String, enum: ['public', 'private'], default: 'private' },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleAnswers: { type: Boolean, default: false },
    defaultTimeLimit: { type: Number, default: 30, min: 5, max: 120 },
    defaultPoints: { type: Number, default: 1000 },
    totalPlays: { type: Number, default: 0 },
    questionCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
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

quizSchema.index({ ownerId: 1 });
quizSchema.index({ visibility: 1, isDeleted: 1 });
quizSchema.index({ title: 'text', description: 'text' });

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
