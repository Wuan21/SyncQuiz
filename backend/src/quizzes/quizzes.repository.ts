import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

type FilterQuery<T> = Record<string, any>;
import { Quiz, QuizDocument, QuizVisibility } from './schemas/quiz.schema';
import { SearchQuizDto } from './dto/quiz.dto';

@Injectable()
export class QuizzesRepository {
  constructor(@InjectModel(Quiz.name) private quizModel: Model<QuizDocument>) {}

  async findById(id: string): Promise<QuizDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.quizModel.findById(id).where({ isDeleted: false }).exec();
  }

  async findPublic(dto: SearchQuizDto) {
    const { categoryId, page = 1, limit = 20 } = dto;
    const q = dto.search || dto.q;
    const filter: FilterQuery<QuizDocument> = {
      visibility: QuizVisibility.PUBLIC,
      isDeleted: false,
    };
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = new Types.ObjectId(categoryId);
    }

    const [data, total] = await Promise.all([
      this.quizModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('ownerId', 'fullName avatarUrl')
        .exec(),
      this.quizModel.countDocuments(filter),
    ]);
    return {
      success: true,
      quizzes: data,
      data: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByOwner(ownerId: string, dto: SearchQuizDto) {
    const { page = 1, limit = 20 } = dto;
    const q = dto.search || dto.q;

    const ownerFilter = Types.ObjectId.isValid(ownerId)
      ? {
          $or: [
            { ownerId: new Types.ObjectId(ownerId) },
            { ownerId: ownerId },
            { userId: ownerId },
            { createdBy: ownerId },
          ],
        }
      : {
          $or: [
            { ownerId: ownerId },
            { userId: ownerId },
            { createdBy: ownerId },
          ],
        };

    const filter: FilterQuery<QuizDocument> = {
      ...ownerFilter,
      isDeleted: false,
    };
    if (q) filter.title = { $regex: q, $options: 'i' };

    const [data, total] = await Promise.all([
      this.quizModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.quizModel.countDocuments(filter),
    ]);

    return {
      success: true,
      quizzes: data,
      data: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(
    data: Partial<Quiz> & { ownerId: string },
  ): Promise<QuizDocument> {
    if (!data.ownerId) {
      throw new Error('ownerId is required to create a quiz');
    }
    const ownerId = Types.ObjectId.isValid(data.ownerId)
      ? new Types.ObjectId(data.ownerId)
      : data.ownerId;

    const quiz = new this.quizModel({
      ...data,
      ownerId,
    });
    return quiz.save();
  }

  async updateById(
    id: string,
    ownerId: string,
    data: Partial<Quiz>,
  ): Promise<QuizDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const ownerFilter = Types.ObjectId.isValid(ownerId)
      ? {
          $or: [{ ownerId: new Types.ObjectId(ownerId) }, { ownerId: ownerId }],
        }
      : { ownerId: ownerId };

    return (this.quizModel as any)
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          ...ownerFilter,
          isDeleted: false,
        },
        { $set: data },
        { new: true },
      )
      .exec();
  }

  async softDelete(id: string, ownerId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;

    const ownerFilter = Types.ObjectId.isValid(ownerId)
      ? {
          $or: [{ ownerId: new Types.ObjectId(ownerId) }, { ownerId: ownerId }],
        }
      : { ownerId: ownerId };

    const result = await (this.quizModel as any).updateOne(
      { _id: new Types.ObjectId(id), ...ownerFilter },
      { isDeleted: true, deletedAt: new Date() },
    );
    return result.modifiedCount > 0;
  }

  async incrementPlays(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await this.quizModel.updateOne({ _id: id }, { $inc: { totalPlays: 1 } });
  }

  async incrementQuestionCount(id: string, amount: number): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await this.quizModel.updateOne(
      { _id: id },
      { $inc: { questionCount: amount } },
    );
  }
}
