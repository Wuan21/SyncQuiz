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
    return this.quizModel.findById(id).where({ isDeleted: false }).exec();
  }

  async findPublic(dto: SearchQuizDto) {
    const { q, categoryId, page = 1, limit = 20 } = dto;
    const filter: FilterQuery<QuizDocument> = {
      visibility: QuizVisibility.PUBLIC,
      isDeleted: false,
    };
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (categoryId) filter.categoryId = new Types.ObjectId(categoryId);

    const [data, total] = await Promise.all([
      this.quizModel
        .find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('ownerId', 'fullName avatarUrl')
        .exec(),
      this.quizModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByOwner(ownerId: string, dto: SearchQuizDto) {
    const { q, page = 1, limit = 20 } = dto;
    const filter: FilterQuery<QuizDocument> = {
      ownerId: new Types.ObjectId(ownerId),
      isDeleted: false,
    };
    if (q) filter.title = { $regex: q, $options: 'i' };

    const [data, total] = await Promise.all([
      this.quizModel
        .find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.quizModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(
    data: Partial<Quiz> & { ownerId: string },
  ): Promise<QuizDocument> {
    const quiz = new this.quizModel({
      ...data,
      ownerId: new Types.ObjectId(data.ownerId),
    });
    return quiz.save();
  }

  async updateById(
    id: string,
    ownerId: string,
    data: Partial<Quiz>,
  ): Promise<QuizDocument | null> {
    return (this.quizModel as any)
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          ownerId: new Types.ObjectId(ownerId),
          isDeleted: false,
        },
        { $set: data },
        { new: true },
      )
      .exec();
  }

  async softDelete(id: string, ownerId: string): Promise<boolean> {
    const result = await (this.quizModel as any).updateOne(
      { _id: new Types.ObjectId(id), ownerId: new Types.ObjectId(ownerId) },
      { isDeleted: true, deletedAt: new Date() },
    );
    return result.modifiedCount > 0;
  }

  async incrementPlays(id: string): Promise<void> {
    await this.quizModel.updateOne({ _id: id }, { $inc: { totalPlays: 1 } });
  }

  async incrementQuestionCount(id: string, amount: number): Promise<void> {
    await this.quizModel.updateOne(
      { _id: id },
      { $inc: { questionCount: amount } },
    );
  }
}
