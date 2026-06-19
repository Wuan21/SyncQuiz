import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto, UpdateQuizDto, SearchQuizDto } from './dto/quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Quizzes')
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

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
    return this.quizzesService.findMyQuizzes(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by ID' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.quizzesService.findById(id, req.user?.id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create quiz' })
  create(@Req() req: any, @Body() dto: CreateQuizDto) {
    return this.quizzesService.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update quiz' })
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateQuizDto) {
    return this.quizzesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete quiz' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.quizzesService.delete(id, req.user.id);
  }

  @Post(':id/clone')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clone quiz' })
  clone(@Param('id') id: string, @Req() req: any) {
    return this.quizzesService.clone(id, req.user.id);
  }
}
