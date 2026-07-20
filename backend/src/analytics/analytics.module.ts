import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { GameResult, GameResultSchema } from './schemas/game-result.schema';
import { Achievement, AchievementSchema } from './schemas/achievement.schema';
import { Quiz, QuizSchema } from '../quizzes/schemas/quiz.schema';
import {
  GameSession,
  GameSessionSchema,
} from '../live/schemas/game-session.schema';
import {
  Classroom,
  ClassroomSchema,
} from '../classrooms/schemas/classroom.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameResult.name, schema: GameResultSchema },
      { name: Achievement.name, schema: AchievementSchema },
      { name: Quiz.name, schema: QuizSchema },
      { name: GameSession.name, schema: GameSessionSchema },
      { name: Classroom.name, schema: ClassroomSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
