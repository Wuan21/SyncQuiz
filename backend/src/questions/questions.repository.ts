import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Question, QuestionDocument } from './schemas/question.schema';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@Injectable()
export class QuestionsRepository {
  constructor(
    @InjectModel(Question.name) private readonly model: Model<QuestionDocument>,
  ) {}

  findByQuizId(quizId: string) {
    return this.model
      .find({ quizId: new Types.ObjectId(quizId) })
      .sort({ order: 1 })
      .lean()
      .exec();
  }

  findById(id: string) {
    return this.model.findById(id).lean().exec();
  }

  async create(quizId: string, dto: CreateQuestionDto) {
    const count = await this.model.countDocuments({
      quizId: new Types.ObjectId(quizId),
    });
    return this.model.create({
      ...dto,
      quizId: new Types.ObjectId(quizId),
      order: dto.order ?? count,
    });
  }

  updateById(id: string, quizId: string, dto: UpdateQuestionDto) {
    return this.model
      .findOneAndUpdate(
        { _id: id, quizId: new Types.ObjectId(quizId) },
        { $set: dto },
        { new: true },
      )
      .lean()
      .exec();
  }

  deleteById(id: string, quizId: string) {
    return this.model
      .findOneAndDelete({ _id: id, quizId: new Types.ObjectId(quizId) })
      .lean()
      .exec();
  }

  deleteByQuizId(quizId: string) {
    return this.model.deleteMany({ quizId: new Types.ObjectId(quizId) }).exec();
  }

  async reorder(quizId: string, ids: string[]) {
    const ops = ids.map((id, index) => ({
      updateOne: {
        filter: { _id: id, quizId: new Types.ObjectId(quizId) },
        update: { $set: { order: index } },
      },
    }));
    return this.model.bulkWrite(ops);
  }

  countByQuizId(quizId: string) {
    return this.model.countDocuments({ quizId: new Types.ObjectId(quizId) });
  }
}
