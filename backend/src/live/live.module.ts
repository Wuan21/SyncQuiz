import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';
import { GameSession, GameSessionSchema } from './schemas/game-session.schema';
import { Quiz, QuizSchema } from '../quizzes/schemas/quiz.schema';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameSession.name, schema: GameSessionSchema },
      { name: Quiz.name, schema: QuizSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [LiveController],
  providers: [LiveService],
  exports: [LiveService, MongooseModule],
})
export class LiveModule {}
