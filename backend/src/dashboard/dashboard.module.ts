import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Quiz, QuizSchema } from '../quizzes/schemas/quiz.schema';
import {
  GameSession,
  GameSessionSchema,
} from '../live/schemas/game-session.schema';
import {
  GameResult,
  GameResultSchema,
} from '../analytics/schemas/game-result.schema';
import {
  Achievement,
  AchievementSchema,
} from '../analytics/schemas/achievement.schema';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: GameSession.name, schema: GameSessionSchema },
      { name: GameResult.name, schema: GameResultSchema },
      { name: Achievement.name, schema: AchievementSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
