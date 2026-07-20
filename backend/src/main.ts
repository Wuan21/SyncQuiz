import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());

  // CORS — reads CORS_ORIGINS from .env (comma-separated list supported)
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      const isAllowed = corsOrigins.some(
        (co) => co === '*' || co.replace(/\/$/, '') === cleanOrigin,
      );
      if (isAllowed || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true); // Allow for live game (mobile browsers)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('SyncQuiz API')
    .setDescription('SyncQuiz REST API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Initialize Socket.IO BEFORE listening so upgrade listeners are bound
  const { initSocket, setModels } = require('./socket/gameHandler');
  const { getModelToken } = require('@nestjs/mongoose');

  try {
    const sessionModel = app.get(getModelToken('GameSession'));
    const questionModel = app.get(getModelToken('Question'));
    setModels(sessionModel, questionModel);
  } catch (e) {
    console.warn(
      'Could not inject Mongoose models into socket handler',
      e.message,
    );
  }

  initSocket(app.getHttpServer());

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 SyncQuiz API running on http://localhost:${port}/api`);
  console.log(`📖 Swagger docs at http://localhost:${port}/docs`);
}
void bootstrap();
