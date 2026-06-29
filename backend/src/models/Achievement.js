const mongoose = require('mongoose');

const BADGE_LIST = [
  { id: 'first_quiz', name: 'Quiz Creator', desc: 'Created your first quiz', icon: '📝', color: '#6366f1' },
  { id: 'quiz_master', name: 'Quiz Master', desc: 'Created 10 quizzes', icon: '🎓', color: '#8b5cf6' },
  { id: 'first_game', name: 'Game Host', desc: 'Hosted your first game', icon: '🎮', color: '#ec4899' },
  { id: 'popular', name: 'Popular', desc: 'Quiz played 50 times', icon: '⭐', color: '#f59e0b' },
  { id: 'perfect_score', name: 'Perfectionist', desc: 'Got 100% in a homework', icon: '💯', color: '#10b981' },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Answered in under 3 seconds', icon: '⚡', color: '#3b82f6' },
  { id: 'social', name: 'Social Butterfly', desc: 'Played with 20+ players in one game', icon: '🦋', color: '#06b6d4' },
  { id: 'streak_5', name: 'On Fire', desc: '5 correct answers in a row', icon: '🔥', color: '#ef4444' },
  { id: 'ai_user', name: 'AI Pioneer', desc: 'Generated a quiz with AI', icon: '🤖', color: '#7c3aed' },
  { id: 'centurion', name: 'Centurion', desc: 'Scored 1000+ pts in a single game', icon: '🏆', color: '#d97706' },
];

const achievementSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    badgeId: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

achievementSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

const Achievement = mongoose.model('Achievement', achievementSchema);

// Award badge if not already earned
Achievement.award = async (userId, badgeId) => {
  try {
    await Achievement.findOneAndUpdate(
      { userId, badgeId },
      { userId, badgeId },
      { upsert: true, new: true },
    );
  } catch (_) {} // ignore duplicate key
};

Achievement.BADGES = BADGE_LIST;

module.exports = Achievement;
