import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { QuizzesRepository } from './quizzes.repository';
import { Quiz, QuizSchema } from './schemas/quiz.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AiModule,
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService, QuizzesRepository],
  exports: [QuizzesService, QuizzesRepository],
})
export class QuizzesModule {}
