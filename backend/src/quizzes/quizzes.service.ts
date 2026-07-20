import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { QuizzesRepository } from './quizzes.repository';
import { CreateQuizDto, UpdateQuizDto, SearchQuizDto } from './dto/quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(private readonly quizzesRepo: QuizzesRepository) {}

  findPublic(dto: SearchQuizDto) {
    return this.quizzesRepo.findPublic(dto);
  }

  findMyQuizzes(userId: string, dto: SearchQuizDto) {
    return this.quizzesRepo.findByOwner(userId, dto);
  }

  async findById(id: string, userId?: string) {
    const quiz = await this.quizzesRepo.findById(id);
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.visibility === 'private' && quiz.ownerId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return quiz;
  }

  create(userId: string, dto: CreateQuizDto) {
    return this.quizzesRepo.create({ ...dto, ownerId: userId });
  }

  async update(id: string, userId: string, dto: UpdateQuizDto) {
    const quiz = await this.quizzesRepo.updateById(id, userId, dto);
    if (!quiz) throw new NotFoundException('Quiz not found or unauthorized');
    return quiz;
  }

  async delete(id: string, userId: string) {
    const deleted = await this.quizzesRepo.softDelete(id, userId);
    if (!deleted) throw new NotFoundException('Quiz not found or unauthorized');
  }

  async clone(id: string, userId: string) {
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
}
