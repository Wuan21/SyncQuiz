import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GameResult, GameResultDocument } from './schemas/game-result.schema';
import {
  Achievement,
  AchievementDocument,
  BADGE_DEFINITIONS,
} from './schemas/achievement.schema';
import { Quiz, QuizDocument } from '../quizzes/schemas/quiz.schema';
import {
  GameSession,
  GameSessionDocument,
} from '../live/schemas/game-session.schema';
import { ClassroomDocument } from '../classrooms/schemas/classroom.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(GameResult.name)
    private readonly resultModel: Model<GameResultDocument>,
    @InjectModel(Achievement.name)
    private readonly achievementModel: Model<AchievementDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
    @InjectModel(GameSession.name)
    private readonly sessionModel: Model<GameSessionDocument>,
    @InjectModel('Classroom')
    private readonly classroomModel: Model<ClassroomDocument>,
  ) {}

  async getDashboard(userId: string) {
    const userObjectId = Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : userId;

    // Run in parallel — avoid fetching 50 full session documents
    const [
      quizCount,
      totalSessions,
      totalPlayersResult,
      myResults,
      achievements,
    ] = await Promise.all([
      this.quizModel.countDocuments({
        ownerId: userObjectId,
        isDeleted: false,
      }),

      // Count total sessions without fetching documents
      this.sessionModel.countDocuments({ hostId: userId.toString() }),

      // Aggregate to compute total players in one DB round-trip (no full doc fetch)
      (this.sessionModel as any)
        .aggregate([
          { $match: { hostId: userId.toString() } },
          {
            $group: {
              _id: null,
              total: { $sum: { $size: { $ifNull: ['$players', []] } } },
            },
          },
        ])
        .exec(),

      this.resultModel
        .find({ hostId: userId.toString() })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),

      this.achievementModel.find({ userId: userObjectId }).lean(),
    ]);

    const stats = totalPlayersResult[0] || { total: 0 };
    const totalPlayers = stats.total;
    const avgPlayers = totalSessions
      ? Math.round(totalPlayers / totalSessions)
      : 0;

    const recentSessions = (myResults.length ? myResults : []).slice(0, 10);

    return {
      quizCount,
      totalSessions: totalSessions,
      totalPlayers,
      avgPlayers,
      achievementsCount: achievements.length,
      recentSessions: recentSessions.map((s: any) => ({
        id: s._id?.toString?.() || s.id,
        quizId: s.quizId?.toString?.() || s.quizId,
        quizTitle: s.quizTitle || s.quizId?.title || 'Quiz',
        playerCount: s.players?.length || 0,
        avgScore: this.computeAvgScore(s.players),
        date: s.startedAt || s.createdAt,
      })),
    };
  }

  private computeAvgScore(players: any[]): number {
    if (!Array.isArray(players) || players.length === 0) return 0;
    const total = players.reduce((acc, p) => acc + (p.totalScore || 0), 0);
    return Math.round(total / players.length);
  }

  async getMyAchievements(userId: string) {
    const userObjectId = Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : userId;
    const earned = await this.achievementModel
      .find({ userId: userObjectId })
      .lean();

    const earnedMap = new Map(earned.map((e: any) => [e.badgeId, e]));
    return BADGE_DEFINITIONS.map((b) => {
      const e: any = earnedMap.get(b.id);
      return {
        id: b.id,
        name: b.name,
        icon: b.icon,
        desc: b.desc,
        earned: !!e,
        earnedAt: e?.earnedAt || null,
      };
    });
  }

  async getQuizStats(quizId: string, ownerId: string) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new NotFoundException('Quiz not found');
    }
    const quiz = await this.quizModel.findById(quizId).lean();
    if (!quiz || quiz.isDeleted) {
      throw new NotFoundException('Quiz not found');
    }
    if (quiz.ownerId?.toString() !== ownerId) {
      throw new NotFoundException('Quiz not found');
    }

    const sessions = await this.sessionModel
      .find({ quizId: new Types.ObjectId(quizId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const totalPlays = sessions.length;
    const totalPlayers = sessions.reduce(
      (acc: number, s: any) => acc + (s.players?.length || 0),
      0,
    );

    return {
      quiz: {
        id: quizId,
        title: quiz.title,
        totalPlays: quiz.totalPlays || totalPlays,
      },
      totalPlays,
      totalPlayers,
      averagePlayersPerGame: totalPlays
        ? Math.round(totalPlayers / totalPlays)
        : 0,
      recentSessions: sessions.slice(0, 10).map((s: any) => ({
        id: s._id?.toString?.() || s.id,
        pin: s.pin,
        status: s.status,
        playerCount: s.players?.length || 0,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
      })),
    };
  }
}
