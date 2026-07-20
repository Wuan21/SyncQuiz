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

@ApiTags('Live Sessions')
@Controller('game-sessions')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Host creates a live game session & 6-digit PIN' })
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

  @Post('join')
  @ApiOperation({ summary: 'Player joins a game by PIN (no auth)' })
  joinSession(
    @Body()
    dto: {
      pin: string;
      nickname: string;
      teamName?: string;
      avatar?: string;
    },
  ) {
    return this.liveService.joinSession(dto);
  }

  @Get('pin/:pin')
  @ApiOperation({ summary: 'Lookup game by PIN (for client validation)' })
  getByPin(@Param('pin') pin: string) {
    return this.liveService.getByPin(pin);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Host game history' })
  getMyHistory(@Req() req: any) {
    return this.liveService.getMyHistory(req.user.id);
  }

  @Get(':id/result')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get final game result & leaderboard' })
  getResult(@Req() req: any, @Param('id') id: string) {
    return this.liveService.getResult(id, req.user.id);
  }
}
