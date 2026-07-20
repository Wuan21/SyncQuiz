import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameResultDocument = GameResult & Document;

@Schema({ _id: false })
export class GameResultPlayer {
  @Prop({ required: true }) playerId: string;
  @Prop({ required: true }) nickname: string;
  @Prop({ default: '' }) teamName: string;
  @Prop({ default: 0 }) avatarIndex: number;
  @Prop({ default: '😀' }) avatar: string;
  @Prop({ default: 0 }) totalScore: number;
  @Prop({ default: 0 }) rank: number;
  @Prop({ default: 0 }) correctCount: number;
  @Prop({ default: 0 }) wrongCount: number;
  @Prop({ default: 0 }) accuracy: number;
  @Prop({ default: 0 }) averageResponseTime: number;
  @Prop({ default: 0 }) streak: number;
  @Prop({ type: Array, default: [] }) answers: any[];
}
export const GameResultPlayerSchema =
  SchemaFactory.createForClass(GameResultPlayer);

@Schema({ timestamps: true, collection: 'gameresults' })
export class GameResult {
  @Prop({ type: String, required: true, index: true })
  gameId: string;

  @Prop({ type: String, required: true, index: true })
  quizId: string;

  @Prop({ type: String, required: true, index: true })
  hostId: string;

  @Prop({ default: '' }) quizTitle: string;

  @Prop({ type: Number, default: 0 })
  totalQuestions: number;

  @Prop({ type: Date, default: null })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  endedAt: Date;

  @Prop({ type: [GameResultPlayerSchema], default: [] })
  players: GameResultPlayer[];

  @Prop({ type: Array, default: [] })
  teamLeaderboard: any[];

  @Prop({ type: Object, default: {} })
  statistics: Record<string, any>;
}

export const GameResultSchema = SchemaFactory.createForClass(GameResult);
GameResultSchema.index({ hostId: 1, createdAt: -1 });
GameResultSchema.index({ quizId: 1 });
