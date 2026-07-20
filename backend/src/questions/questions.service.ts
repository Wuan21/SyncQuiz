import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { QuestionsRepository } from './questions.repository';
import { QuizzesRepository } from '../quizzes/quizzes.repository';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly questionsRepo: QuestionsRepository,
    private readonly quizzesRepo: QuizzesRepository,
  ) {}

  private async assertOwner(quizId: string, userId: string) {
    const quiz = await this.quizzesRepo.findById(quizId);
    if (!quiz || quiz.isDeleted) throw new NotFoundException('Quiz not found');
    if (quiz.ownerId?.toString() !== userId)
      throw new ForbiddenException('Forbidden');
    return quiz;
  }

  async list(quizId: string) {
    return this.questionsRepo.findByQuizId(quizId);
  }

  async create(quizId: string, userId: string, dto: CreateQuestionDto) {
    await this.assertOwner(quizId, userId);
    const question = await this.questionsRepo.create(quizId, dto);
    await this.quizzesRepo.incrementQuestionCount(quizId, 1);
    return question;
  }

  async update(
    quizId: string,
    id: string,
    userId: string,
    dto: UpdateQuestionDto,
  ) {
    await this.assertOwner(quizId, userId);
    const updated = await this.questionsRepo.updateById(id, quizId, dto);
    if (!updated) throw new NotFoundException('Question not found');
    return updated;
  }

  async remove(quizId: string, id: string, userId: string) {
    await this.assertOwner(quizId, userId);
    const deleted = await this.questionsRepo.deleteById(id, quizId);
    if (!deleted) throw new NotFoundException('Question not found');
    await this.quizzesRepo.incrementQuestionCount(quizId, -1);
  }

  async reorder(quizId: string, userId: string, ids: string[]) {
    await this.assertOwner(quizId, userId);
    await this.questionsRepo.reorder(quizId, ids);
    return { message: 'Reordered' };
  }
}
