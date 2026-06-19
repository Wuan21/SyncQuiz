import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuizDocument = Quiz & Document;

export enum QuizVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Schema({ timestamps: true, collection: 'quizzes' })
export class Quiz {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  categoryId: string;

  @Prop({ required: true, trim: true, maxlength: 255 })
  title: string;

  @Prop({ default: null })
  description: string;

  @Prop({ default: null })
  coverImageUrl: string;

  @Prop({ type: String, enum: QuizVisibility, default: QuizVisibility.PRIVATE })
  visibility: QuizVisibility;

  @Prop({ default: false })
  shuffleQuestions: boolean;

  @Prop({ default: false })
  shuffleAnswers: boolean;

  @Prop({ default: 30, min: 5, max: 120 })
  defaultTimeLimit: number;

  @Prop({ default: 0 })
  totalPlays: number;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  deletedAt: Date;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);
QuizSchema.index({ ownerId: 1 });
QuizSchema.index({ visibility: 1, isDeleted: 1 });
QuizSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    return ret;
  },
});
