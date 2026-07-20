import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClassroomDocument = Classroom & Document;

@Schema({ timestamps: true, collection: 'classrooms' })
export class Classroom {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ default: '', maxlength: 500 })
  description: string;

  @Prop({ type: String, required: true, index: true })
  teacherId: string;

  @Prop({ type: [String], default: [] })
  studentIds: string[];

  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  code: string;
}

export const ClassroomSchema = SchemaFactory.createForClass(Classroom);
ClassroomSchema.index({ teacherId: 1 });
