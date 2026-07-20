import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HomeworkService } from './homework.service';

@ApiTags('Homework')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('homework')
export class HomeworkController {
  constructor(private readonly svc: HomeworkService) {}

  @Post()
  @ApiOperation({ summary: 'Assign homework' })
  create(@Req() req: any, @Body() dto: any) {
    return this.svc.create(req.user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Homework I assigned' })
  myTeacher(@Req() req: any) {
    return this.svc.listMine(req.user.id);
  }

  @Get('student')
  @ApiOperation({ summary: 'Homework assigned to me as student' })
  student(@Req() req: any) {
    return this.svc.listForStudent(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Homework detail with questions' })
  detail(@Req() req: any, @Param('id') id: string) {
    return this.svc.getDetail(id, req.user.id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit homework answers' })
  submit(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: { answers: Array<{ questionId: string; selectedOption: number }> },
  ) {
    return this.svc.submit(id, req.user.id, body);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Teacher view of submissions' })
  results(@Req() req: any, @Param('id') id: string) {
    return this.svc.getResults(req.user.id, id);
  }
}
