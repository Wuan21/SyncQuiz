import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz, QuizDocument } from '../quizzes/schemas/quiz.schema';
import {
  GameSession,
  GameSessionDocument,
} from '../live/schemas/game-session.schema';
import {
  GameResult,
  GameResultDocument,
} from '../analytics/schemas/game-result.schema';
import {
  Achievement,
  AchievementDocument,
} from '../analytics/schemas/achievement.schema';
import {
  Question,
  QuestionDocument,
} from '../questions/schemas/question.schema';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
    @InjectModel(GameSession.name)
    private readonly sessionModel: Model<GameSessionDocument>,
    @InjectModel(GameResult.name)
    private readonly resultModel: Model<GameResultDocument>,
    @InjectModel(Achievement.name)
    private readonly achievementModel: Model<AchievementDocument>,
    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
  ) {}

  async getOverview(userId: string) {
    // CRITICAL FIX: Always use string ID for hostId queries
    // and try both ObjectId and string for ownerId queries
    const userIdStr = userId?.toString();

    if (!userIdStr) {
      throw new Error('User ID is required');
    }

    // Check if userId is a valid ObjectId
    const isObjectId =
      Types.ObjectId.isValid(userIdStr) &&
      new Types.ObjectId(userIdStr).toString() === userIdStr;

    // Build ownerId query to match both string and ObjectId formats
    const ownerIdFilter = isObjectId
      ? {
          $or: [
            { ownerId: userIdStr },
            { ownerId: new Types.ObjectId(userIdStr) },
          ],
        }
      : { ownerId: userIdStr };

    const ownerIdCountFilter = {
      ...ownerIdFilter,
      isDeleted: false,
    };

    // Run all queries in parallel for maximum performance
    let quizCount = 0;
    let sessionCount = 0;
    let playersAggregation: any[] = [];
    let recentResults: any[] = [];
    let achievementsCount = 0;
    let recentQuizzes: any[] = [];

    try {
      // Run all queries in parallel
      const [
        quizCountResult,
        sessionCountResult,
        playersResult,
        resultsResult,
        achievementsResult,
        quizzesResult,
      ] = await Promise.all([
        // Count quizzes owned by user - try both formats
        this.quizModel
          .countDocuments({
            ...ownerIdCountFilter,
          })
          .catch((err) => {
            this.logger.warn('Quiz count query failed:', err.message);
            return 0;
          }),

        // Count game sessions hosted by user
        this.sessionModel.countDocuments({ hostId: userIdStr }).catch((err) => {
          this.logger.warn('Session count query failed:', err.message);
          return 0;
        }),

        // Aggregate total players across all sessions
        this.sessionModel
          .aggregate([
            { $match: { hostId: userIdStr } },
            {
              $group: {
                _id: null,
                total: { $sum: { $size: { $ifNull: ['$players', []] } } },
              },
            },
          ])
          .catch((err) => {
            this.logger.warn('Players aggregation failed:', err.message);
            return [];
          }),

        // Recent game results
        this.resultModel
          .find({ hostId: userIdStr })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .catch((err) => {
            this.logger.warn('Results query failed:', err.message);
            return [];
          }),

        // User achievements count
        this.achievementModel
          .countDocuments({
            userId: isObjectId ? new Types.ObjectId(userIdStr) : userIdStr,
          })
          .catch((err) => {
            this.logger.warn('Achievements count failed:', err.message);
            return 0;
          }),

        // Recent quizzes with question count
        this.quizModel
          .find({ ...ownerIdFilter, isDeleted: false })
          .sort({ updatedAt: -1 })
          .limit(6)
          .select('_id title coverImageUrl visibility updatedAt')
          .lean()
          .catch((err) => {
            this.logger.warn('Recent quizzes query failed:', err.message);
            return [];
          }),
      ]);

      quizCount = quizCountResult || 0;
      sessionCount = sessionCountResult || 0;
      playersAggregation = playersResult || [];
      recentResults = resultsResult || [];
      achievementsCount = achievementsResult || 0;
      recentQuizzes = quizzesResult || [];
    } catch (error) {
      this.logger.error('Dashboard overview query error:', error);
      // Return empty data instead of throwing - frontend can show empty state
    }

    const totalPlayers = playersAggregation[0]?.total || 0;
    const avgPlayers = sessionCount
      ? Math.round(totalPlayers / sessionCount)
      : 0;

    // Get question counts for recent quizzes
    const quizIds = recentQuizzes.map((q: any) => q._id).filter(Boolean);

    let questionCounts: any[] = [];
    if (quizIds.length > 0) {
      try {
        questionCounts = await this.questionModel.aggregate([
          { $match: { quizId: { $in: quizIds } } },
          { $group: { _id: '$quizId', count: { $sum: 1 } } },
        ]);
      } catch (err) {
        this.logger.warn('Question counts aggregation failed:', err.message);
      }
    }

    const questionCountMap = new Map(
      questionCounts.map((qc: any) => [qc._id.toString(), qc.count]),
    );

    const quizzesWithCount = recentQuizzes.map((q: any) => ({
      id: q._id?.toString(),
      title: q.title,
      coverImageUrl: q.coverImageUrl,
      visibility: q.visibility,
      updatedAt: q.updatedAt,
      questionCount: questionCountMap.get(q._id.toString()) || 0,
    }));

    return {
      success: true,
      data: {
        statistics: {
          totalQuizzes: quizCount,
          totalGames: sessionCount,
          totalPlayers,
          averagePlayers: avgPlayers,
          achievementsCount,
        },
        recentQuizzes: quizzesWithCount,
        recentActivities: recentResults.map((r: any) => ({
          id: r._id?.toString(),
          quizId: r.quizId,
          quizTitle: r.quizTitle || 'Quiz',
          playerCount: r.players?.length || 0,
          avgScore: this.computeAvgScore(r.players),
          date: r.startedAt || r.createdAt,
        })),
      },
    };
  }

  private computeAvgScore(players: any[]): number {
    if (!Array.isArray(players) || players.length === 0) return 0;
    const total = players.reduce((acc, p) => acc + (p.totalScore || 0), 0);
    return Math.round(total / players.length);
  }
}
