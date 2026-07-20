import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Model } from 'mongoose';

export type AchievementDocument = Achievement & Document;

@Schema({ timestamps: false, collection: 'achievements' })
export class Achievement {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
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
  try {
    await model.findOneAndUpdate(
      { userId, badgeId },
      { userId, badgeId },
      { upsert: true, new: true },
    );
  } catch (_) {}
}
