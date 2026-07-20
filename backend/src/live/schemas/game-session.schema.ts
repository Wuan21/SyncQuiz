import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type GameSessionDocument = GameSession & Document;

@Schema({ _id: false })
export class PlayerAnswer {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Question' })
  questionId: MongooseSchema.Types.ObjectId;

  @Prop({ default: null })
  selectedOption: number;

  @Prop({ default: null })
  answerText: string;

  @Prop({ default: false })
  isCorrect: boolean;

  @Prop({ default: 0 })
  pointsEarned: number;

  @Prop({ default: 0 })
  timeSpent: number;
}

export const PlayerAnswerSchema = SchemaFactory.createForClass(PlayerAnswer);

@Schema({ _id: false })
export class Player {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, maxlength: 30 })
  nickname: string;

  @Prop({ default: 0 })
  avatarIndex: number;

  @Prop({ default: 0 })
  totalScore: number;

  @Prop({ default: 0 })
  rank: number;

  @Prop({ default: 0 })
  streak: number;

  @Prop({ type: [PlayerAnswerSchema], default: [] })
  answers: PlayerAnswer[];
}

export const PlayerSchema = SchemaFactory.createForClass(Player);

@Schema({ timestamps: true, collection: 'gamesessions' })
export class GameSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Quiz', required: true })
  quizId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  hostId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  pin: string;

  @Prop({
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting',
  })
  status: string;

  @Prop({ default: -1 })
  currentQuestionIndex: number;

  @Prop({ type: [PlayerSchema], default: [] })
  players: Player[];

  @Prop({ default: 0 })
  totalQuestions: number;

  @Prop({ default: null })
  startedAt: Date;

  @Prop({ default: null })
  endedAt: Date;

  @Prop({
    type: Object,
    default: {
      showLeaderboard: true,
      shuffleQuestions: false,
      shuffleAnswers: false,
    },
  })
  settings: Record<string, any>;
}

export const GameSessionSchema = SchemaFactory.createForClass(GameSession);

GameSessionSchema.index({ hostId: 1 });
GameSessionSchema.index({ quizId: 1 });

GameSessionSchema.set('toJSON', {
  virtuals: true,
  transform(_doc: any, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
