import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned-url')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get presigned URL for file upload to S3' })
  getPresignedUrl(
    @Body() body: { fileName: string; fileType: string },
    @Req() req: any,
  ) {
    return this.uploadService.getPresignedUrl(body.fileName, body.fileType, req.user.id);
  }
}
