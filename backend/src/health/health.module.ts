import { Controller, Get, Res, Logger, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Response } from 'express';
import { Connection } from 'mongoose';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check(@Res() res: Response) {
    const start = Date.now();
    const dbState = this.connection?.readyState ?? 0;
    const dbConnected = dbState === 1;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : dbState === 3 ? 'disconnecting' : 'disconnected';
    const durationMs = Date.now() - start;

    if (dbConnected) {
      this.logger.debug(`[HEALTH] OK (${durationMs}ms)`);
      return res.status(200).json({
        status: 'ok',
        service: 'syncquiz-backend',
        database: dbStatus,
        socket: 'enabled',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.warn(`[HEALTH] DEGRADED — database: ${dbStatus}`);
    return res.status(503).json({
      status: 'degraded',
      service: 'syncquiz-backend',
      database: dbStatus,
      socket: 'enabled',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
