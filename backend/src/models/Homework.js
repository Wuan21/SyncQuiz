const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    title: { type: String, required: true, maxlength: 200 },
    instructions: { type: String, default: null },
    dueDate: { type: Date, required: true },
    allowedAttempts: { type: Number, default: 1, min: 1, max: 10 },
    showCorrectAnswers: { type: Boolean, default: true },
    shuffleQuestions: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    // submissions
    submissions: [
      {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, default: 0 },
        maxScore: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        submittedAt: { type: Date, default: Date.now },
        attempt: { type: Number, default: 1 },
        answers: [
          {
            questionId: mongoose.Schema.Types.ObjectId,
            selectedOption: Number,
            isCorrect: Boolean,
            pointsEarned: Number,
          },
        ],
      },
    ],
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

homeworkSchema.index({ teacherId: 1 });
homeworkSchema.index({ classroomId: 1 });

const Homework = mongoose.model('Homework', homeworkSchema);
module.exports = Homework;
