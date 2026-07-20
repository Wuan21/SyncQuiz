import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type GameSessionDocument = GameSession & Document;

export enum GameSessionStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  FINISHED = 'finished',
  ENDED = 'ended',
}

@Schema({ _id: false })
export class PlayerAnswer {
  @Prop({ type: MongooseSchema.Types.Mixed })
  questionId: any;

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
export class GamePlayer {
  @Prop({ required: true })
  playerId: string;

  @Prop({ default: null })
  socketId: string | null;

  @Prop({ required: true, trim: true, maxlength: 30 })
  nickname: string;

  @Prop({ default: '', trim: true })
  teamName: string;

  @Prop({ default: '😀' })
  avatar: string;

  @Prop({ default: 0 })
  avatarIndex: number;

  @Prop({ default: false })
  connected: boolean;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop({ default: 0 })
  totalScore: number;

  @Prop({ default: 0 })
  rank: number;

  @Prop({ default: 0 })
  streak: number;

  @Prop({ type: [PlayerAnswerSchema], default: [] })
  answers: PlayerAnswer[];
}
export const GamePlayerSchema = SchemaFactory.createForClass(GamePlayer);

@Schema({ _id: false })
export class ActiveQuestion {
  @Prop({ default: null })
  questionId: string;

  @Prop({ default: null })
  questionIndex: number;

  @Prop({ default: null })
  startTime: number;

  @Prop({ default: 30000 })
  durationMs: number;

  @Prop({ default: null })
  removedOptions: number[];
}
export const ActiveQuestionSchema =
  SchemaFactory.createForClass(ActiveQuestion);

@Schema({ _id: false })
export class PlayerActiveAnswer {
  @Prop({ required: true })
  playerId: string;

  @Prop({ required: true })
  socketId: string;

  @Prop({ default: null })
  selectedOption: number;

  @Prop({ default: null })
  answerText: string;

  @Prop({ default: 0 })
  timeSpent: number;

  @Prop({ default: false })
  isCorrect: boolean;

  @Prop({ default: 0 })
  pointsEarned: number;
}
export const PlayerActiveAnswerSchema =
  SchemaFactory.createForClass(PlayerActiveAnswer);

@Schema({ timestamps: true, collection: 'gamesessions' })
export class GameSession {
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    minlength: 6,
    maxlength: 6,
  })
  pin: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true,
  })
  quizId: any;

  @Prop({ type: String, required: true, index: true })
  hostId: string;

  @Prop({
    type: String,
    enum: Object.values(GameSessionStatus),
    default: GameSessionStatus.WAITING,
    index: true,
  })
  status: string;

  @Prop({ type: [GamePlayerSchema], default: [] })
  players: GamePlayer[];

  @Prop({ default: -1 })
  currentQuestionIndex: number;

  @Prop({ type: ActiveQuestionSchema, default: null })
  activeQuestion: ActiveQuestion | null;

  @Prop({ type: [PlayerActiveAnswerSchema], default: [] })
  activeAnswers: PlayerActiveAnswer[];

  @Prop({ default: 0 })
  totalQuestions: number;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

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

GameSessionSchema.index({ hostId: 1, createdAt: -1 });
GameSessionSchema.index({ status: 1 });
GameSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

GameSessionSchema.set('toJSON', {
  virtuals: true,
  transform(_doc: any, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
