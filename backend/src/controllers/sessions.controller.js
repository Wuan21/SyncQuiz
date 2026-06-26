const GameSession = require('../models/GameSession');
const Quiz = require('../models/Quiz');
const { v4: uuidv4 } = require('uuid');

const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.create = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.body.quizId).lean();
    if (!quiz || quiz.isDeleted) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.ownerId.toString() !== req.user.id)
      return res.status(403).json({ message: 'Only the quiz owner can start a game' });

    let pin;
    let attempts = 0;
    do {
      pin = generatePin();
      attempts++;
    } while ((await GameSession.exists({ pin, status: { $ne: 'finished' } })) && attempts < 10);

    const session = await GameSession.create({
      quizId: quiz._id,
      hostId: req.user.id,
      pin,
      totalQuestions: quiz.questionCount,
      settings: {
        shuffleQuestions: req.body.shuffleQuestions ?? quiz.shuffleQuestions,
        shuffleAnswers: req.body.shuffleAnswers ?? quiz.shuffleAnswers,
      },
    });

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
};

exports.getByPin = async (req, res, next) => {
  try {
    const session = await GameSession.findOne({ pin: req.params.pin })
      .populate('quizId', 'title coverImageUrl')
      .lean();
    if (!session) return res.status(404).json({ message: 'Game not found' });
    res.json(session);
  } catch (err) {
    next(err);
  }
};

exports.myHistory = async (req, res, next) => {
  try {
    const sessions = await GameSession.find({ hostId: req.user.id })
      .sort('-createdAt')
      .limit(20)
      .populate('quizId', 'title coverImageUrl')
      .lean();
    res.json(sessions);
  } catch (err) {
    next(err);
  }
};

exports.getResult = async (req, res, next) => {
  try {
    const session = await GameSession.findById(req.params.id)
      .populate('quizId', 'title coverImageUrl')
      .lean();
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.hostId.toString() !== req.user.id && session.status !== 'finished') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(session);
  } catch (err) {
    next(err);
  }
};
