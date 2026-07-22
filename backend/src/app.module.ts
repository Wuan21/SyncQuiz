import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

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
import { AdminModule } from './admin/admin.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '..', '..', '.env'),
      ],
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI') || '';
        const retryWrites = uri.includes('retryWrites')
          ? ''
          : '?retryWrites=true&w=majority';
        return {
          uri: uri + retryWrites,
          dbName: config.get<string>('MONGODB_DB_NAME') || 'syncquiz',
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
        };
      },
      inject: [ConfigService],
    }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60_000, limit: 100 },
      { name: 'long', ttl: 60_000, limit: 20 },
    ]),

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
    AdminModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
