import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuizzesRepository } from './quizzes.repository';
import { CreateQuizDto, UpdateQuizDto, SearchQuizDto } from './dto/quiz.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly quizzesRepo: QuizzesRepository,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  findPublic(dto: SearchQuizDto) {
    return this.quizzesRepo.findPublic(dto);
  }

  findMyQuizzes(userId: string, dto: SearchQuizDto) {
    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng từ token',
      );
    }
    return this.quizzesRepo.findByOwner(userId, dto);
  }

  async findById(id: string, userId?: string) {
    const quiz = await this.quizzesRepo.findById(id);
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.visibility === 'private' && quiz.ownerId?.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return quiz;
  }

  create(userId: string, dto: CreateQuizDto) {
    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng từ token',
      );
    }
    return this.quizzesRepo.create({ ...dto, ownerId: userId });
  }

  async update(id: string, userId: string, dto: UpdateQuizDto) {
    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng từ token',
      );
    }
    const quiz = await this.quizzesRepo.updateById(id, userId, dto);
    if (!quiz) throw new NotFoundException('Quiz not found or unauthorized');
    return quiz;
  }

  async delete(id: string, userId: string) {
    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng từ token',
      );
    }
    const deleted = await this.quizzesRepo.softDelete(id, userId);
    if (!deleted) throw new NotFoundException('Quiz not found or unauthorized');
  }

  async clone(id: string, userId: string) {
    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng từ token',
      );
    }
    const original = await this.findById(id, userId);
    const { _id, createdAt, updatedAt, totalPlays, ...rest } = (
      original as any
    ).toObject();
    return this.quizzesRepo.create({
      ...rest,
      ownerId: userId,
      title: `${rest.title} (Copy)`,
      visibility: 'private',
      totalPlays: 0,
      isDeleted: false,
      deletedAt: null,
    });
  }

  async findFavorites(userId: string) {
    const user: any = await this.userModel.findById(userId).exec();
    const ids: string[] = user?.favoriteQuizIds || [];
    if (ids.length === 0)
      return { success: true, quizzes: [], data: [], total: 0 };

    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const [quizzes, total] = await Promise.all([
      this.quizzesRepo.model
        .find({ _id: { $in: objectIds }, isDeleted: false })
        .populate('ownerId', 'fullName avatarUrl')
        .lean(),
      this.quizzesRepo.model.countDocuments({
        _id: { $in: objectIds },
        isDeleted: false,
      }),
    ]);

    return {
      success: true,
      quizzes,
      data: quizzes,
      total,
    };
  }

  async toggleFavorite(userId: string, quizId: string) {
    const user: any = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    const favorites: string[] = user.favoriteQuizIds || [];
    const idx = favorites.indexOf(quizId);
    if (idx >= 0) {
      favorites.splice(idx, 1);
    } else {
      favorites.push(quizId);
    }

    await this.userModel.findByIdAndUpdate(userId, {
      favoriteQuizIds: favorites,
    });

    return { success: true, isFavorite: idx < 0 };
  }
}
