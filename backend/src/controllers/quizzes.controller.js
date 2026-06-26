const Quiz = require('../models/Quiz');
const Question = require('../models/Question');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, search, category, sort = '-createdAt' } = req.query;
    const filter = { isDeleted: false, visibility: 'public' };
    if (category) filter.categoryId = category;
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [quizzes, total] = await Promise.all([
      Quiz.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Quiz.countDocuments(filter),
    ]);

    res.json({ quizzes, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
};

exports.myQuizzes = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, search, sort = '-createdAt' } = req.query;
    const filter = { ownerId: req.user.id, isDeleted: false };
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [quizzes, total] = await Promise.all([
      Quiz.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Quiz.countDocuments(filter),
    ]);

    res.json({ quizzes, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz || quiz.isDeleted) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.visibility === 'private' && quiz.ownerId.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(quiz);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const quiz = await Quiz.create({ ...req.body, ownerId: req.user.id });
    res.status(201).json(quiz);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id, isDeleted: false },
      { $set: req.body },
      { new: true },
    );
    if (!quiz) return res.status(404).json({ message: 'Quiz not found or unauthorized' });
    res.json(quiz);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    if (!quiz) return res.status(404).json({ message: 'Quiz not found or unauthorized' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.clone = async (req, res, next) => {
  try {
    const original = await Quiz.findById(req.params.id).lean();
    if (!original || original.isDeleted) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    if (original.visibility === 'private' && original.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { _id, createdAt, updatedAt, totalPlays, ...data } = original;
    const cloned = await Quiz.create({
      ...data,
      ownerId: req.user.id,
      title: `${data.title} (Copy)`,
      visibility: 'private',
      totalPlays: 0,
    });

    // Clone questions
    const questions = await Question.find({ quizId: original._id }).lean();
    if (questions.length) {
      await Question.insertMany(
        questions.map(({ _id: qid, ...q }) => ({ ...q, quizId: cloned._id })),
      );
    }

    res.status(201).json(cloned);
  } catch (err) {
    next(err);
  }
};

exports.getWithQuestions = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz || quiz.isDeleted) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.visibility === 'private' && quiz.ownerId.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const questions = await Question.find({ quizId: quiz._id }).sort({ order: 1 }).lean();
    res.json({ ...quiz, questions });
  } catch (err) {
    next(err);
  }
};
