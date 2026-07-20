import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard analytics for host' })
  dashboard(@Req() req: any) {
    return this.svc.getDashboard(req.user.id);
  }

  @Get('achievements/my')
  @ApiOperation({ summary: 'My achievements' })
  achievements(@Req() req: any) {
    return this.svc.getMyAchievements(req.user.id);
  }

  @Get('quiz/:quizId')
  @ApiOperation({ summary: 'Per-quiz analytics' })
  quizStats(@Req() req: any, @Param('quizId') quizId: string) {
    return this.svc.getQuizStats(quizId, req.user.id);
  }
}
