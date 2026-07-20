import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HomeworkController } from './homework.controller';
import { HomeworkService } from './homework.service';
import {
  Homework,
  HomeworkSchema,
  HomeworkSubmission,
  HomeworkSubmissionSchema,
} from './schemas/homework.schema';
import {
  Classroom,
  ClassroomSchema,
} from '../classrooms/schemas/classroom.schema';
import { Quiz, QuizSchema } from '../quizzes/schemas/quiz.schema';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Homework.name, schema: HomeworkSchema },
      { name: HomeworkSubmission.name, schema: HomeworkSubmissionSchema },
      { name: Classroom.name, schema: ClassroomSchema },
      { name: Quiz.name, schema: QuizSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [HomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
