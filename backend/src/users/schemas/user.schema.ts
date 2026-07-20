import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'admin',
  HOST = 'host',
  PLAYER = 'player',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false, select: false })
  passwordHash?: string;

  @Prop({ default: null })
  cognitoId?: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  fullName: string;

  @Prop({ default: null })
  avatarUrl: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.PLAYER })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  deletedAt: Date;

  @Prop({ type: [String], default: [] })
  favoriteQuizIds: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual id
UserSchema.set('toJSON', {
  virtuals: true,

  transform: (_doc: any, ret: any) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    delete ret['passwordHash'];
    return ret;
  },
});
