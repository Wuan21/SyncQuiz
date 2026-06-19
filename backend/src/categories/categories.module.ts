import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, unique: true }) name: string;
  @Prop({ required: true, unique: true }) slug: string;
}
export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);

@Injectable()
class CategoriesService {
  constructor(@InjectModel(Category.name) private model: Model<CategoryDocument>) {}
  findAll() { return this.model.find().exec(); }
}

@ApiTags('Categories')
@Controller('categories')
class CategoriesController {
  constructor(private svc: CategoriesService) {}
  @Get() findAll() { return this.svc.findAll(); }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
