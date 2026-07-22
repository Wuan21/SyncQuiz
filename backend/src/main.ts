import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RolesGuard } from './auth/guards/roles.guard';
import { createServer } from 'http';

/* ── Standalone health-only HTTP server (starts before NestJS init) ─── */
function startHealthServer(port: number): ReturnType<typeof createServer> {
  const http = require('http');
  return http
    .createServer((req: any, res: any) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'syncquiz-backend',
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        }),
      );
    })
    .listen(port, '0.0.0.0');
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT) || 10000;

  /* ── Create health server FIRST so Render health check can succeed ─── */
  const healthServer = startHealthServer(port);
  healthServer.on('error', () => {
    // Port may already be in use by another process — that's fine
  });
  logger.log(`[Health] HTTP server ready on port ${port}`);

  /* ── Patch Mongoose: prevent infinite retry loops during startup ─── */
  try {
    const mongoose = require('mongoose');
    const origConnect = mongoose.connect.bind(mongoose);
    mongoose.connect = (uri: string, opts: any) =>
      origConnect(uri, {
        ...opts,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
  } catch (_) {}

  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
    abortOnError: false,
  });

  /* ── Security ──────────────────────────────────────────────────── */
  app.use(helmet({ crossOriginResourcePolicy: false }));

  /* ── CORS — unified allowed origins ───────────────────────────── */
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
      if (isAllowed) return callback(null, true);
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  /* ── Global prefix ────────────────────────────────────────────── */
  app.setGlobalPrefix('api');

  /* ── Global validation ────────────────────────────────────────── */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  /* ── Global exception filter ──────────────────────────────────── */
  app.useGlobalFilters(new AllExceptionsFilter());

  /* ── Global role guard ────────────────────────────────────────── */
  app.useGlobalGuards(new RolesGuard(new Reflector()));

  /* ── Swagger docs (opt-in via ENABLE_SWAGGER=true) ────────────── */
  if (process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('SyncQuiz API')
      .setDescription('SyncQuiz REST API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log('📖 Swagger docs enabled at /docs');
  }

  /* ── Attach NestJS to existing health server ──────────────────── */
  const httpServer = createServer(app.getHttpAdapter().getInstance());
  const { initSocket, setModels } = require('./socket/gameHandler');
  const { getModelToken } = require('@nestjs/mongoose');

  try {
    const sessionModel = app.get(getModelToken('GameSession'));
    const questionModel = app.get(getModelToken('Question'));
    const achievementModel = (() => {
      try {
        return app.get(getModelToken('Achievement'));
      } catch {
        return null;
      }
    })();
    setModels(sessionModel, questionModel, achievementModel);
  } catch (e: any) {
    logger.warn(`Could not inject models into socket: ${e.message}`);
  }

  /* ── Socket.IO init ───────────────────────────────────────────── */
  initSocket(httpServer);

  /* ── Replace health server with full NestJS server ──────────────── */
  httpServer.on('error', () => {});
  httpServer.listen(port, '0.0.0.0', () => {
    logger.log(`🚀 SyncQuiz API running on http://0.0.0.0:${port}/api`);
    logger.log(`📖 Swagger docs at http://0.0.0.0:${port}/docs`);
  });

  /* Graceful shutdown */
  const shutdown = (signal: string) => {
    logger.log(`Received ${signal}. Closing...`);
    httpServer.close(() => healthServer.close(() => process.exit(0)));
    setTimeout(() => process.exit(1), 5000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

void bootstrap();
