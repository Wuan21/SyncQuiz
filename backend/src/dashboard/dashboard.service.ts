import { Injectable } from '@nestjs/common';
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
import { Question, QuestionDocument } from '../questions/schemas/question.schema';

@Injectable()
export class DashboardService {
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
    const userObjectId = Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : userId;

    // Run all queries in parallel for maximum performance
    const [
      quizCount,
      sessionCount,
      playersAggregation,
      recentResults,
      achievements,
      recentQuizzes,
    ] = await Promise.all([
      // Count quizzes owned by user
      this.quizModel.countDocuments({
        ownerId: userObjectId,
        isDeleted: false,
      }),

      // Count game sessions hosted by user
      this.sessionModel.countDocuments({ hostId: userId.toString() }),

      // Aggregate total players across all sessions (no full doc fetch)
      this.sessionModel.aggregate([
        { $match: { hostId: userId.toString() } },
        {
          $group: {
            _id: null,
            total: { $sum: { $size: { $ifNull: ['$players', []] } } },
          },
        },
      ]).exec(),

      // Recent game results with player count and avg score
      this.resultModel
        .find({ hostId: userId.toString() })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // User achievements count
      this.achievementModel.countDocuments({ userId: userObjectId }),

      // Recent quizzes with question count
      this.quizModel
        .find({ ownerId: userObjectId, isDeleted: false })
        .sort({ updatedAt: -1 })
        .limit(6)
        .select('id title coverImageUrl visibility updatedAt')
        .lean(),
    ]);

    const totalPlayers = playersAggregation[0]?.total || 0;
    const avgPlayers = sessionCount ? Math.round(totalPlayers / sessionCount) : 0;

    // Get question counts for recent quizzes in parallel
    const quizIds = recentQuizzes.map((q: any) => q._id);
    const questionCounts = quizIds.length
      ? await this.questionModel.aggregate([
          { $match: { quizId: { $in: quizIds } } },
          { $group: { _id: '$quizId', count: { $sum: 1 } } },
        ]).exec()
      : [];

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
          achievementsCount: achievements,
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
