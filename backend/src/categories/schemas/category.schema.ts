import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, trim: true, maxlength: 80 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

export const SEED_CATEGORIES = [
  { name: 'Toán học', slug: 'math' },
  { name: 'Lịch sử', slug: 'history' },
  { name: 'Khoa học', slug: 'science' },
  { name: 'Ngôn ngữ', slug: 'language' },
  { name: 'Địa lý', slug: 'geography' },
  { name: 'Lập trình', slug: 'programming' },
  { name: 'Âm nhạc', slug: 'music' },
  { name: 'Thể thao', slug: 'sports' },
  { name: 'Giải trí', slug: 'entertainment' },
  { name: 'Khác', slug: 'other' },
];
