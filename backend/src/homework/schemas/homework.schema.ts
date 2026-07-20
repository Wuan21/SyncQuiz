import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HomeworkDocument = Homework & Document;

export enum HomeworkStatus {
  ASSIGNED = 'assigned',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Schema({ timestamps: true, collection: 'homeworks' })
export class Homework {
  @Prop({ type: String, required: true, index: true })
  teacherId: string;

  @Prop({ type: String, required: true, index: true })
  classroomId: string;

  @Prop({ type: String, required: true, index: true })
  quizId: string;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ default: '', maxlength: 2000 })
  instructions: string;

  @Prop({ type: Date, required: true })
  dueDate: Date;

  @Prop({ default: 1, min: 1, max: 100 })
  allowedAttempts: number;

  @Prop({ default: false })
  shuffleQuestions: boolean;

  @Prop({ default: true })
  showCorrectAnswers: boolean;

  @Prop({
    type: String,
    enum: HomeworkStatus,
    default: HomeworkStatus.ASSIGNED,
  })
  status: HomeworkStatus;

  @Prop({ type: Date, default: null })
  closedAt: Date;
}

export const HomeworkSchema = SchemaFactory.createForClass(Homework);
HomeworkSchema.index({ classroomId: 1 });
HomeworkSchema.index({ teacherId: 1, createdAt: -1 });

export type HomeworkSubmissionDocument = HomeworkSubmission & Document;

@Schema({ _id: false })
export class HomeworkSubmissionAnswer {
  @Prop({ required: true }) questionId: string;
  @Prop({ default: null }) selectedOption: number;
  @Prop({ default: null }) answerText: string;
  @Prop({ default: false }) isCorrect: boolean;
  @Prop({ default: 0 }) pointsEarned: number;
}
export const HomeworkSubmissionAnswerSchema = SchemaFactory.createForClass(
  HomeworkSubmissionAnswer,
);

@Schema({ timestamps: true, collection: 'homeworksubmissions' })
export class HomeworkSubmission {
  @Prop({ type: String, required: true, index: true })
  homeworkId: string;

  @Prop({ type: String, required: true, index: true })
  studentId: string;

  @Prop({ type: [HomeworkSubmissionAnswerSchema], default: [] })
  answers: HomeworkSubmissionAnswer[];

  @Prop({ default: 0 }) score: number;
  @Prop({ default: 0 }) totalPoints: number;
  @Prop({ default: 0 }) percentage: number;
  @Prop({ default: 0 }) correct: number;
  @Prop({ default: 0 }) total: number;

  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;
}
export const HomeworkSubmissionSchema =
  SchemaFactory.createForClass(HomeworkSubmission);
HomeworkSubmissionSchema.index({ homeworkId: 1, studentId: 1 });
