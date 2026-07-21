import {
  Controller,
  Get,
  Injectable,
  Module,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Category,
  CategoryDocument,
  CategorySchema,
  SEED_CATEGORIES,
} from './schemas/category.schema';

@Injectable()
class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name)
    private readonly model: Model<CategoryDocument>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.model.countDocuments();
      if (count === 0) {
        await this.model.insertMany(SEED_CATEGORIES, { ordered: false });
        this.logger.log(`Seeded ${SEED_CATEGORIES.length} categories`);
      }
    } catch (e: any) {
      this.logger.warn(`Category seed skipped: ${e.message}`);
    }
  }

  findAll() {
    return this.model.find().sort({ name: 1 }).lean();
  }
}

@ApiTags('Categories')
@Controller('categories')
class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
