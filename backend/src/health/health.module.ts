import { Controller, Get, Module, OnModuleInit } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@ApiTags('Health')
@Controller('health')
export class HealthController implements OnModuleInit {
  private readonly logger = console;

  onModuleInit() {
    this.logger.log('[Health] Server module initialized — health OK');
  }

  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check() {
    const dbState = this.connection?.readyState ?? 0;
    const dbConnected = dbState === 1;
    return {
      status: dbConnected ? 'ok' : 'degraded',
      service: 'syncquiz-backend',
      database: dbConnected ? 'connected' : 'connecting',
      socket: 'enabled',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
