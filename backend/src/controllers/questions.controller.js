const Question = require('../models/Question');
const Quiz = require('../models/Quiz');

const assertOwner = async (quizId, userId, res) => {
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz || quiz.isDeleted) { res.status(404).json({ message: 'Quiz not found' }); return null; }
  if (quiz.ownerId.toString() !== userId) { res.status(403).json({ message: 'Forbidden' }); return null; }
  return quiz;
};

exports.list = async (req, res, next) => {
  try {
    const questions = await Question.find({ quizId: req.params.quizId }).sort({ order: 1 }).lean();
    res.json(questions);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const quiz = await assertOwner(req.params.quizId, req.user.id, res);
    if (!quiz) return;

    const count = await Question.countDocuments({ quizId: quiz._id });
    const question = await Question.create({
      ...req.body,
      quizId: quiz._id,
      order: req.body.order ?? count,
    });
    await Quiz.findByIdAndUpdate(quiz._id, { $inc: { questionCount: 1 } });
    res.status(201).json(question);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const quiz = await assertOwner(req.params.quizId, req.user.id, res);
    if (!quiz) return;

    const question = await Question.findOneAndUpdate(
      { _id: req.params.id, quizId: quiz._id },
      { $set: req.body },
      { new: true },
    );
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const quiz = await assertOwner(req.params.quizId, req.user.id, res);
    if (!quiz) return;

    const deleted = await Question.findOneAndDelete({ _id: req.params.id, quizId: quiz._id });
    if (!deleted) return res.status(404).json({ message: 'Question not found' });

    await Quiz.findByIdAndUpdate(quiz._id, { $inc: { questionCount: -1 } });
    res.status(204).send();
  } catch (err) { next(err); }
};

exports.reorder = async (req, res, next) => {
  try {
    const quiz = await assertOwner(req.params.quizId, req.user.id, res);
    if (!quiz) return;

    const { ids } = req.body; // array of question IDs in new order
    const ops = ids.map((id, index) => ({
      updateOne: { filter: { _id: id, quizId: quiz._id }, update: { $set: { order: index } } },
    }));
    await Question.bulkWrite(ops);
    res.json({ message: 'Reordered' });
  } catch (err) { next(err); }
};
