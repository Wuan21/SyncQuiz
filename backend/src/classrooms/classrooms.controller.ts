import {
  Body,
  Controller,
  Delete,
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
import { ClassroomsService } from './classrooms.service';

@ApiTags('Classrooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly svc: ClassroomsService) {}

  @Get()
  @ApiOperation({ summary: 'List classrooms I teach or joined' })
  list(@Req() req: any) {
    return this.svc.listForUser(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create classroom' })
  create(@Req() req: any, @Body() dto: { name: string; description?: string }) {
    return this.svc.create(req.user.id, dto);
  }

  @Post('join/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join classroom by code' })
  join(@Req() req: any, @Param('code') code: string) {
    return this.svc.join(req.user.id, code);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete classroom (teacher only)' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(id, req.user.id);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get students in classroom' })
  students(@Req() req: any, @Param('id') id: string) {
    return this.svc.getStudents(id, req.user.id);
  }
}
