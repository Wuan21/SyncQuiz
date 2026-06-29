const router = require('express').Router();
const Achievement = require('../models/Achievement');
const { authenticate } = require('../middleware/auth.middleware');

// GET /api/achievements/my — my earned badges
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const earned = await Achievement.find({ userId: req.user.id }).lean();
    const earnedIds = new Set(earned.map((e) => e.badgeId));

    const badges = Achievement.BADGES.map((b) => ({
      ...b,
      earned: earnedIds.has(b.id),
      earnedAt: earned.find((e) => e.badgeId === b.id)?.earnedAt || null,
    }));

    res.json(badges);
  } catch (err) {
    next(err);
  }
});

// GET /api/achievements/badges — full badge list
router.get('/badges', (_req, res) => res.json(Achievement.BADGES));

module.exports = router;
