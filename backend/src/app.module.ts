import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { CategoriesModule } from './categories/categories.module';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { HomeworkModule } from './homework/homework.module';
import { LiveModule } from './live/live.module';
import { UploadModule } from './upload/upload.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';

import { AiModule } from './ai/ai.module';
import { QuestionsModule } from './questions/questions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, '..', '.env'),
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    ThrottlerModule.forRoot([{ name: 'short', ttl: 60000, limit: 100 }]),

    AuthModule,
    UsersModule,
    QuizzesModule,
    QuestionsModule,
    CategoriesModule,
    ClassroomsModule,
    HomeworkModule,
    LiveModule,
    UploadModule,
    AnalyticsModule,
    HealthModule,
    AiModule,
  ],
})
export class AppModule {}
