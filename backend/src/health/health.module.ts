import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  async check() {
    const dbState = this.connection?.readyState ?? 0;
    const dbStatus =
      dbState === 1
        ? 'connected'
        : dbState === 2
          ? 'connecting'
          : dbState === 3
            ? 'disconnecting'
            : 'disconnected';

    return {
      status: dbState === 1 ? 'ok' : 'degraded',
      database: dbStatus,
      socket: 'enabled',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
