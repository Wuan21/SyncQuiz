const GameSession = require('../models/GameSession');
const Quiz = require('../models/Quiz');
const { v4: uuidv4 } = require('uuid');

const AVATARS = ['😀', '🐶', '🦊', '🐱', '🐸', '🦄', '🐙', '🦋', '🎃', '🚀'];

function normalizePin(value) {
  return String(value ?? '').replace(/\s+/g, '').trim();
}

async function generateUniquePin() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const exists = await GameSession.exists({
      pin,
      status: { $ne: 'ended' },
      expiresAt: { $gt: new Date() },
    });
    if (!exists) return pin;
  }
  throw new Error('PIN_GENERATION_FAILED');
}

exports.create = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.body.quizId).lean();
    if (!quiz || quiz.isDeleted) return res.status(404).json({ success: false, code: 'QUIZ_NOT_FOUND', message: 'Quiz not found' });
    if (quiz.ownerId.toString() !== req.user.id && quiz.isPublic !== true)
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only the quiz owner can start a game' });

    const pin = await generateUniquePin();
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const session = await GameSession.create({
      pin,
      quizId: quiz._id,
      hostId: req.user.id,
      totalQuestions: quiz.questionCount || 0,
      expiresAt,
      settings: {
        shuffleQuestions: req.body.shuffleQuestions ?? quiz.shuffleQuestions ?? false,
        shuffleAnswers: req.body.shuffleAnswers ?? quiz.shuffleAnswers ?? false,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        gameId: session._id.toString(),
        pin: session.pin,
        status: session.status,
        expiresAt: session.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.joinByPin = async (req, res, next) => {
  try {
    const pin = normalizePin(req.body.pin);
    const nickname = String(req.body.nickname ?? '').trim();
    const teamName = String(req.body.teamName ?? '').trim();
    const avatar = String(req.body.avatar ?? '😀').trim();

    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ success: false, code: 'INVALID_PIN', message: 'Mã PIN phải gồm 6 chữ số' });
    }
    if (!nickname) {
      return res.status(400).json({ success: false, code: 'NICKNAME_REQUIRED', message: 'Vui lòng nhập nickname' });
    }

    const game = await GameSession.findOne({ pin });

    if (!game) {
      return res.status(404).json({ success: false, code: 'GAME_NOT_FOUND', message: 'Không tìm thấy phòng chơi với mã PIN này' });
    }
    if (game.expiresAt && game.expiresAt.getTime() <= Date.now()) {
      return res.status(410).json({ success: false, code: 'GAME_EXPIRED', message: 'Phòng chơi đã hết hạn' });
    }
    if (game.status === 'ended' || game.status === 'finished') {
      return res.status(410).json({ success: false, code: 'GAME_ENDED', message: 'Phòng chơi đã kết thúc' });
    }
    if (game.status !== 'waiting') {
      return res.status(409).json({ success: false, code: 'GAME_ALREADY_STARTED', message: 'Game đã bắt đầu' });
    }

    const nickTaken = game.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase());
    if (nickTaken) {
      return res.status(409).json({ success: false, code: 'NICKNAME_TAKEN', message: 'Nickname này đã có người sử dụng' });
    }

    const avatarIndex = AVATARS.indexOf(avatar);
    const playerId = uuidv4();

    game.players.push({
      playerId,
      nickname,
      teamName,
      avatar,
      avatarIndex: avatarIndex >= 0 ? avatarIndex : 0,
      socketId: null,
      connected: false,
      joinedAt: new Date(),
    });
    await game.save();

    res.status(200).json({
      success: true,
      data: {
        gameId: game._id.toString(),
        playerId,
        pin: game.pin,
        status: game.status,
      },
    });
  } catch (err) {
    console.error('[sessions.controller] joinByPin error:', err.message);
    res.status(500).json({ success: false, code: 'JOIN_GAME_FAILED', message: 'Không thể tham gia phòng chơi' });
  }
};

exports.getByPin = async (req, res, next) => {
  try {
    const pin = normalizePin(req.params.pin);
    const session = await GameSession.findOne({ pin })
      .populate('quizId', 'title coverImageUrl')
      .lean();
    if (!session) return res.status(404).json({ success: false, code: 'GAME_NOT_FOUND', message: 'Game not found' });
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
