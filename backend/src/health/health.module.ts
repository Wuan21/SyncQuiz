import { Controller, Get, Module, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  async check() {
    const start = Date.now();
    let dbOk = false;
    let dbPingMs = 0;

    try {
      const pingStart = Date.now();
      await this.connection.db.command({ ping: 1 });
      dbPingMs = Date.now() - pingStart;
      dbOk = true;
    } catch (_) {
      dbOk = this.connection.readyState === 1;
    }

    const totalMs = Date.now() - start;
    const dbState = this.connection?.readyState ?? 0;
    const dbConnected = dbState === 1;

    return {
      status: dbOk ? 'ok' : 'degraded',
      service: 'syncquiz-backend',
      database: dbConnected ? 'connected' : 'connecting',
      socket: 'enabled',
      uptime: Math.floor(process.uptime()),
      latency: totalMs,
      dbPingMs,
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
