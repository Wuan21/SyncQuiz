const GameSession = require('../models/GameSession');
const Quiz = require('../models/Quiz');

exports.dashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [totalSessions, recentSessions, quizCount] = await Promise.all([
      GameSession.countDocuments({ hostId: userId, status: 'finished' }),
      GameSession.find({ hostId: userId, status: 'finished' })
        .sort('-endedAt')
        .limit(5)
        .populate('quizId', 'title')
        .lean(),
      Quiz.countDocuments({ ownerId: userId, isDeleted: false }),
    ]);

    const avgPlayers =
      recentSessions.length
        ? recentSessions.reduce((s, g) => s + g.players.length, 0) / recentSessions.length
        : 0;

    res.json({ totalSessions, quizCount, avgPlayers: Math.round(avgPlayers), recentSessions });
  } catch (err) {
    next(err);
  }
};

exports.quizStats = async (req, res, next) => {
  try {
    const sessions = await GameSession.find({
      quizId: req.params.quizId,
      hostId: req.user.id,
      status: 'finished',
    })
      .sort('-createdAt')
      .limit(20)
      .lean();

    const stats = sessions.map((s) => ({
      id: s._id,
      date: s.endedAt,
      playerCount: s.players.length,
      avgScore:
        s.players.length
          ? Math.round(s.players.reduce((acc, p) => acc + p.totalScore, 0) / s.players.length)
          : 0,
    }));

    res.json(stats);
  } catch (err) {
    next(err);
  }
};
