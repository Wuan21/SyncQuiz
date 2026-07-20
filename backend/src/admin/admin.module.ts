import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Quiz, QuizSchema } from '../quizzes/schemas/quiz.schema';
import {
  GameSession,
  GameSessionSchema,
} from '../live/schemas/game-session.schema';
import { Homework, HomeworkSchema } from '../homework/schemas/homework.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Quiz.name, schema: QuizSchema },
      { name: GameSession.name, schema: GameSessionSchema },
      { name: Homework.name, schema: HomeworkSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
