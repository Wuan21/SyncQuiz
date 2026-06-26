const mongoose = require('mongoose');

const answerOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 500 },
    imageUrl: { type: String, default: null },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    type: {
      type: String,
      enum: ['multiple_choice', 'true_false', 'fill_blank', 'poll'],
      default: 'multiple_choice',
    },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    imageUrl: { type: String, default: null },
    audioUrl: { type: String, default: null },
    timeLimit: { type: Number, default: 30, min: 5, max: 300 },
    points: { type: Number, default: 1000, min: 0 },
    doublePoints: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    options: { type: [answerOptionSchema], default: [] },
    explanation: { type: String, default: null, maxlength: 1000 },
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

questionSchema.index({ quizId: 1, order: 1 });

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;
