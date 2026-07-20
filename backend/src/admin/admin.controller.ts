import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ListUsersDto,
  ListQuizzesDto,
  UpdateUserRoleDto,
  ToggleUserStatusDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  /* ── Stats ─────────────────────────────────────────────────── */
  @Get('stats')
  @ApiOperation({ summary: 'System-wide statistics (admin only)' })
  stats() {
    return this.svc.getStats();
  }

  /* ── Users ────────────────────────────────────────────────── */
  @Get('users')
  @ApiOperation({ summary: 'List all users (admin only)' })
  listUsers(@Query() dto: ListUsersDto) {
    return this.svc.listUsers(dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details (admin only)' })
  getUser(@Param('id') id: string) {
    return this.svc.getUser(id);
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user role (admin only)' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.svc.updateUserRole(id, dto);
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable/disable user (admin only)' })
  toggleStatus(@Param('id') id: string, @Body() dto: ToggleUserStatusDto) {
    return this.svc.toggleUserStatus(id, dto);
  }

  @Post('users/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore soft-deleted user (admin only)' })
  restoreUser(@Param('id') id: string) {
    return this.svc.restoreUser(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete user (admin only)' })
  deleteUser(@Param('id') id: string) {
    return this.svc.deleteUser(id);
  }

  /* ── Quizzes ─────────────────────────────────────────────── */
  @Get('quizzes')
  @ApiOperation({ summary: 'List all quizzes (admin only)' })
  listQuizzes(@Query() dto: ListQuizzesDto) {
    return this.svc.listQuizzes(dto);
  }

  @Get('quizzes/:id')
  @ApiOperation({ summary: 'Get quiz stats (admin only)' })
  getQuizStats(@Param('id') id: string) {
    return this.svc.getQuizStats(id);
  }

  @Delete('quizzes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete quiz (admin only)' })
  deleteQuiz(@Param('id') id: string) {
    return this.svc.deleteQuiz(id);
  }

  @Post('quizzes/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore soft-deleted quiz (admin only)' })
  restoreQuiz(@Param('id') id: string) {
    return this.svc.restoreQuiz(id);
  }

  /* ── Sessions ─────────────────────────────────────────────── */
  @Get('sessions')
  @ApiOperation({ summary: 'List all game sessions (admin only)' })
  listSessions(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.listSessions(
      parseInt(String(page), 10) || 1,
      parseInt(String(limit), 10) || 20,
    );
  }

  @Post('sessions/:id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force-end a game session (admin only)' })
  endSession(@Param('id') id: string) {
    return this.svc.endSession(id);
  }

  /* ── Homework ────────────────────────────────────────────── */
  @Get('homework')
  @ApiOperation({ summary: 'List all homework (admin only)' })
  listHomework(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.listHomework(
      parseInt(String(page), 10) || 1,
      parseInt(String(limit), 10) || 20,
    );
  }
}
