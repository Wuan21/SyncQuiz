import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get(':quizId/questions')
  @ApiOperation({ summary: 'List questions for a quiz' })
  list(@Param('quizId') quizId: string) {
    return this.questionsService.list(quizId);
  }

  @Post(':quizId/questions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a question in a quiz' })
  create(
    @Param('quizId') quizId: string,
    @Req() req: any,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questionsService.create(quizId, req.user.id, dto);
  }

  @Patch(':quizId/questions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a question in a quiz' })
  update(
    @Param('quizId') quizId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(quizId, id, req.user.id, dto);
  }

  @Delete(':quizId/questions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question from a quiz' })
  remove(
    @Param('quizId') quizId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.questionsService.remove(quizId, id, req.user.id);
  }

  @Put(':quizId/questions/reorder')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reorder questions in a quiz' })
  reorder(
    @Param('quizId') quizId: string,
    @Req() req: any,
    @Body('ids') ids: string[],
  ) {
    return this.questionsService.reorder(quizId, req.user.id, ids);
  }
}
