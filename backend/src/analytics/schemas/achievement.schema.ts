import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Model } from 'mongoose';

export type AchievementDocument = Achievement & Document;

@Schema({ timestamps: false, collection: 'achievements' })
export class Achievement {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  badgeId: string;

  @Prop({ default: Date.now })
  earnedAt: Date;
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);
AchievementSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

export async function awardAchievement(
  model: Model<any>,
  userId: string,
  badgeId: string,
) {
  if (!userId) return;
  try {
    await model.findOneAndUpdate(
      { userId, badgeId },
      { userId, badgeId, earnedAt: new Date() },
      { upsert: true, new: true },
    );
  } catch (_) {
    // ignore duplicate key
  }
}

export const BADGE_DEFINITIONS = [
  {
    id: 'centurion',
    name: 'Centurion',
    icon: '🏆',
    desc: 'Win 1st place in a game',
  },
  {
    id: 'streak_5',
    name: 'On Fire',
    icon: '🔥',
    desc: 'Answer 5 in a row correctly',
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    icon: '⚡',
    desc: 'Answer correctly in under 3s',
  },
  {
    id: 'social',
    name: 'Social Butterfly',
    icon: '🦋',
    desc: 'Play in a 20+ player game',
  },
];
