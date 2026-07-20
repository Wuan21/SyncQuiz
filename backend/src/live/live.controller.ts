import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LiveService } from './live.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Sessions')
@Controller('sessions')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new live game session & 6-digit PIN' })
  createSession(
    @Req() req: any,
    @Body()
    dto: {
      quizId: string;
      shuffleQuestions?: boolean;
      shuffleAnswers?: boolean;
    },
  ) {
    return this.liveService.createSession(req.user.id, dto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get host game session history' })
  getMyHistory(@Req() req: any) {
    return this.liveService.getMyHistory(req.user.id);
  }

  @Get('pin/:pin')
  @ApiOperation({ summary: 'Validate 6-digit game PIN for player join' })
  getByPin(@Param('pin') pin: string) {
    return this.liveService.getByPin(pin);
  }

  @Get(':id/result')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get game session results and podium leaderboard' })
  getResult(@Req() req: any, @Param('id') id: string) {
    return this.liveService.getResult(id, req.user.id);
  }
}
