import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { Quiz, QuizDocument } from '../quizzes/schemas/quiz.schema';
import {
  GameSession,
  GameSessionDocument,
} from '../live/schemas/game-session.schema';
import {
  Homework,
  HomeworkDocument,
} from '../homework/schemas/homework.schema';
import {
  ListUsersDto,
  ListQuizzesDto,
  UpdateUserRoleDto,
  ToggleUserStatusDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Quiz.name) private quizModel: Model<QuizDocument>,
    @InjectModel(GameSession.name)
    private sessionModel: Model<GameSessionDocument>,
    @InjectModel(Homework.name) private hwModel: Model<HomeworkDocument>,
  ) {}

  /* ── Stats ─────────────────────────────────────────────────── */
  async getStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalActiveUsers,
      totalLockedUsers,
      totalQuizzes,
      totalPublishedQuizzes,
      totalDraftQuizzes,
      totalSessions,
      totalFinishedSessions,
      activeSessions,
      totalPlayers,
      recentUsers,
      recentQuizzes,
      recentSessions,
    ] = await Promise.all([
      this.userModel.countDocuments({ deletedAt: null }),
      this.userModel.countDocuments({ deletedAt: null, isActive: true }),
      this.userModel.countDocuments({ deletedAt: null, isActive: false }),
      this.quizModel.countDocuments({ isDeleted: false }),
      this.quizModel.countDocuments({ isDeleted: false, visibility: 'public' }),
      this.quizModel.countDocuments({
        isDeleted: false,
        visibility: 'private',
      }),
      this.sessionModel.countDocuments(),
      this.sessionModel.countDocuments({
        status: { $in: ['finished', 'ended'] },
      }),
      this.sessionModel.countDocuments({
        status: { $in: ['waiting', 'active', 'paused'] },
      }),
      // Sum players across all sessions
      this.sessionModel.aggregate([
        { $group: { _id: null, total: { $sum: { $size: '$players' } } } },
      ]),
      this.userModel.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
        deletedAt: null,
      }),
      this.quizModel.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
        isDeleted: false,
      }),
      this.sessionModel.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    return {
      userCount: totalUsers,
      activeUsers: totalActiveUsers,
      lockedUsers: totalLockedUsers,
      quizCount: totalQuizzes,
      publishedQuizzes: totalPublishedQuizzes,
      draftQuizzes: totalDraftQuizzes,
      sessionCount: totalSessions,
      finishedSessions: totalFinishedSessions,
      activeSessions,
      totalPlayers: totalPlayers[0]?.total || 0,
      newUsersLast30Days: recentUsers,
      newQuizzesLast30Days: recentQuizzes,
      newSessionsLast30Days: recentSessions,
    };
  }

  /* ── Users ──────────────────────────────────────────────────── */
  async listUsers(dto: ListUsersDto) {
    const {
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
      isActive,
    } = dto;
    const filter: Record<string, any> = { deletedAt: null };

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean() as any,
      this.userModel.countDocuments(filter),
    ]);

    return {
      data: users.map((u: any) => ({
        id: u._id?.toString(),
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        isActive: u.isActive,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUser(userId: string) {
    if (!Types.ObjectId.isValid(userId))
      throw new NotFoundException('User not found');
    const user: any = await this.userModel
      .findOne({ _id: userId, deletedAt: null })
      .lean();
    if (!user) throw new NotFoundException('User not found');
    const sessionCount = await this.sessionModel.countDocuments({
      hostId: userId,
    });
    const quizCount = await this.quizModel.countDocuments({
      ownerId: new Types.ObjectId(userId),
      isDeleted: false,
    });
    return {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stats: { sessionCount, quizCount },
    };
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto) {
    if (!Types.ObjectId.isValid(userId))
      throw new NotFoundException('User not found');
    // Validate role value
    if (!Object.values(UserRole).includes(dto.role as UserRole)) {
      throw new NotFoundException('Invalid role');
    }
    const user = await this.userModel.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { role: dto.role },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return { id: user._id.toString(), role: user.role };
  }

  async toggleUserStatus(userId: string, dto: ToggleUserStatusDto) {
    if (!Types.ObjectId.isValid(userId))
      throw new NotFoundException('User not found');
    const user = await this.userModel.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { isActive: dto.isActive },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return { id: user._id.toString(), isActive: user.isActive };
  }

  async deleteUser(userId: string) {
    if (!Types.ObjectId.isValid(userId))
      throw new NotFoundException('User not found');
    // Soft delete
    const result = await this.userModel.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { deletedAt: new Date() },
    );
    if (!result) throw new NotFoundException('User not found');
    return { success: true };
  }

  async restoreUser(userId: string) {
    if (!Types.ObjectId.isValid(userId))
      throw new NotFoundException('User not found');
    const result = await this.userModel.findOneAndUpdate(
      { _id: userId, deletedAt: { $ne: null } },
      { deletedAt: null },
      { new: true },
    );
    if (!result) throw new NotFoundException('User not found or not deleted');
    return { success: true };
  }

  /* ── Quizzes ───────────────────────────────────────────────── */
  async listQuizzes(dto: ListQuizzesDto) {
    const { search, page = 1, limit = 20, visibility, isDeleted } = dto;
    const filter: Record<string, any> = {};

    if (isDeleted === 'true') {
      filter.isDeleted = true;
    } else {
      filter.isDeleted = false;
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }
    if (visibility) filter.visibility = visibility;

    const skip = (page - 1) * limit;

    const quizzes = await this.quizModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ownerId', 'fullName email')
      .lean();

    const total = await this.quizModel.countDocuments(filter);

    return {
      data: quizzes.map((q: any) => ({
        id: q._id?.toString(),
        title: q.title,
        visibility: q.visibility,
        totalPlays: q.totalPlays,
        questionCount: q.questionCount,
        ownerId: q.ownerId?._id?.toString(),
        ownerName: q.ownerId?.fullName,
        ownerEmail: q.ownerId?.email,
        isDeleted: q.isDeleted,
        deletedAt: q.deletedAt,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getQuizStats(quizId: string) {
    if (!Types.ObjectId.isValid(quizId))
      throw new NotFoundException('Quiz not found');
    const quiz: any = await this.quizModel.findById(quizId).lean();
    if (!quiz) throw new NotFoundException('Quiz not found');

    const [sessionCount, avgScore] = await Promise.all([
      this.sessionModel.countDocuments({
        quizId: new Types.ObjectId(quizId),
      }),
      this.sessionModel.aggregate([
        { $match: { quizId: new Types.ObjectId(quizId) } },
        { $unwind: { path: '$players', preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, avgScore: { $avg: '$players.totalScore' } } },
      ]),
    ]);

    return {
      id: quiz._id.toString(),
      title: quiz.title,
      visibility: quiz.visibility,
      totalPlays: quiz.totalPlays,
      sessionCount,
      avgScore: avgScore[0]?.avgScore ? Math.round(avgScore[0].avgScore) : 0,
      ownerId: quiz.ownerId?.toString(),
      isDeleted: quiz.isDeleted,
      createdAt: quiz.createdAt,
    };
  }

  async deleteQuiz(quizId: string) {
    if (!Types.ObjectId.isValid(quizId))
      throw new NotFoundException('Quiz not found');
    const result = await this.quizModel.findByIdAndUpdate(quizId, {
      isDeleted: true,
      deletedAt: new Date(),
    });
    if (!result) throw new NotFoundException('Quiz not found');
    return { success: true };
  }

  async restoreQuiz(quizId: string) {
    if (!Types.ObjectId.isValid(quizId))
      throw new NotFoundException('Quiz not found');
    const result = await this.quizModel.findByIdAndUpdate(quizId, {
      isDeleted: false,
      deletedAt: null,
    });
    if (!result) throw new NotFoundException('Quiz not found');
    return { success: true };
  }

  /* ── Sessions ──────────────────────────────────────────────── */
  async listSessions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('hostId', 'fullName email')
        .lean(),
      this.sessionModel.countDocuments(),
    ]);

    return {
      data: sessions.map((s: any) => ({
        id: s._id?.toString(),
        pin: s.pin,
        status: s.status,
        playerCount: s.players?.length || 0,
        hostId: s.hostId?._id?.toString(),
        hostName: s.hostId?.fullName,
        hostEmail: s.hostId?.email,
        createdAt: s.createdAt,
        endedAt: s.endedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async endSession(sessionId: string) {
    if (!Types.ObjectId.isValid(sessionId))
      throw new NotFoundException('Session not found');
    const result = await this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        status: 'ended',
        endedAt: new Date(),
      },
      { new: true },
    );
    if (!result) throw new NotFoundException('Session not found');
    return { success: true };
  }

  /* ── Homework ─────────────────────────────────────────────── */
  async listHomework(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.hwModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('teacherId', 'fullName email')
        .lean(),
      this.hwModel.countDocuments(),
    ]);

    return {
      data: items.map((h: any) => ({
        id: h._id?.toString(),
        title: h.title,
        status: h.status,
        dueDate: h.dueDate,
        teacherId: h.teacherId?._id?.toString(),
        teacherName: h.teacherId?.fullName,
        teacherEmail: h.teacherId?.email,
        createdAt: h.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
