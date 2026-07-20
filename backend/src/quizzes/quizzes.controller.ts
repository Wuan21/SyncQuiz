import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto, UpdateQuizDto, SearchQuizDto } from './dto/quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AiService } from '../ai/ai.service';

@ApiTags('Quizzes')
@Controller('quizzes')
export class QuizzesController {
  constructor(
    private readonly quizzesService: QuizzesService,
    private readonly aiService: AiService,
  ) {}

  private getUserId(req: any): string {
    const id = req.user?.id || req.user?.sub || req.user?._id;
    if (!id) {
      throw new UnauthorizedException(
        'Không xác định được người dùng từ token',
      );
    }
    return id.toString();
  }

  @Get()
  @ApiOperation({ summary: 'Search public quizzes' })
  findPublic(@Query() dto: SearchQuizDto) {
    return this.quizzesService.findPublic(dto);
  }

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my quizzes' })
  findMine(@Req() req: any, @Query() dto: SearchQuizDto) {
    const userId = this.getUserId(req);
    return this.quizzesService.findMyQuizzes(userId, dto);
  }

  @Get('favorites')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get favorite quizzes' })
  findFavorites(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.quizzesService.findFavorites(userId);
  }

  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Toggle favorite on a quiz' })
  toggleFavorite(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.quizzesService.toggleFavorite(userId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by ID' })
  findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub || req.user?._id;
    return this.quizzesService.findById(
      id,
      userId ? userId.toString() : undefined,
    );
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create quiz' })
  create(@Req() req: any, @Body() dto: CreateQuizDto) {
    const userId = this.getUserId(req);
    return this.quizzesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update quiz' })
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateQuizDto) {
    const userId = this.getUserId(req);
    return this.quizzesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete quiz' })
  delete(@Param('id') id: string, @Req() req: any) {
    const userId = this.getUserId(req);
    return this.quizzesService.delete(id, userId);
  }

  @Post(':id/clone')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clone quiz' })
  clone(@Param('id') id: string, @Req() req: any) {
    const userId = this.getUserId(req);
    return this.quizzesService.clone(id, userId);
  }

  @Post('ai-generate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate quiz questions with AI' })
  aiGenerate(@Body() dto: any) {
    return this.aiService.generateQuiz(dto);
  }
}
