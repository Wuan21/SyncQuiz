import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuestionDocument = Question & Document;

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_BLANK = 'fill_blank',
  POLL = 'poll',
}

@Schema({ _id: false })
export class AnswerOption {
  @Prop({ required: true })
  text: string;

  @Prop({ default: null })
  imageUrl: string;

  @Prop({ default: false })
  isCorrect: boolean;
}
export const AnswerOptionSchema = SchemaFactory.createForClass(AnswerOption);

@Schema({ timestamps: true, collection: 'questions' })
export class Question {
  @Prop({ type: Types.ObjectId, ref: 'Quiz', required: true, index: true })
  quizId: Types.ObjectId;

  @Prop({ type: String, enum: QuestionType, default: QuestionType.MULTIPLE_CHOICE })
  type: QuestionType;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  content: string;

  @Prop({ default: null })
  imageUrl: string;

  @Prop({ default: null })
  audioUrl: string;

  @Prop({ default: 30, min: 5, max: 300 })
  timeLimit: number;

  @Prop({ default: 1000, min: 0 })
  points: number;

  @Prop({ default: false })
  doublePoints: boolean;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: [AnswerOptionSchema], default: [] })
  options: AnswerOption[];

  @Prop({ default: null })
  explanation: string;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
QuestionSchema.index({ quizId: 1, order: 1 });
QuestionSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: any, ret: any) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    return ret;
  },
});
