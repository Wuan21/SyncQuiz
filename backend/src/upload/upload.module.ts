import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Injectable,
  Module,
  Post,
  Body,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class UploadService {
  private s3: S3Client | null = null;
  private readonly bucket: string | undefined;
  private readonly region: string;
  private readonly cloudfrontUrl: string | undefined;

  constructor(private readonly config: ConfigService) {
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.region = config.get<string>('AWS_REGION') || 'ap-southeast-1';
    this.bucket = config.get<string>('AWS_S3_BUCKET');
    this.cloudfrontUrl = config.get<string>('AWS_CLOUDFRONT_URL');

    if (
      accessKeyId &&
      secretAccessKey &&
      this.bucket &&
      !accessKeyId.startsWith('your_') &&
      !secretAccessKey.startsWith('your_')
    ) {
      this.s3 = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  isS3Enabled(): boolean {
    return this.s3 !== null && !!this.bucket;
  }

  async presign(
    fileName: string,
    contentType: string,
    folder: string = 'questions',
  ) {
    if (!fileName || !contentType) {
      throw new BadRequestException({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Thiếu tên tệp hoặc content type',
      });
    }
    if (!/^image\//.test(contentType)) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_TYPE',
        message: 'Chỉ chấp nhận ảnh',
      });
    }

    const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '') || 'questions';
    const ext =
      (fileName.split('.').pop() || 'jpg')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'jpg';
    const key = `${safeFolder}/${randomUUID()}.${ext}`;

    if (this.s3 && this.bucket) {
      const cmd = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });
      const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 600 });
      const publicUrl = this.cloudfrontUrl
        ? `${this.cloudfrontUrl.replace(/\/$/, '')}/${key}`
        : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      return { uploadUrl, publicUrl, backend: 's3' };
    }

    // Local fallback — client uploads via multipart to /upload/local
    return {
      uploadUrl: `/api/upload/local?key=${encodeURIComponent(key)}`,
      publicUrl: `/uploads/${key}`,
      backend: 'local',
    };
  }

  async saveLocal(key: string, buffer: Buffer, contentType: string) {
    if (buffer.length > MAX_BYTES) {
      throw new BadRequestException({
        success: false,
        code: 'FILE_TOO_LARGE',
        message: 'Tệp quá lớn',
      });
    }
    if (!/^image\//.test(contentType)) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_TYPE',
        message: 'Chỉ chấp nhận ảnh',
      });
    }
    return { key, size: buffer.length };
  }
}

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly svc: UploadService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Get presigned upload URL' })
  presign(
    @Body()
    body: {
      fileName: string;
      contentType: string;
      folder?: string;
    },
  ) {
    return this.svc.presign(body.fileName, body.contentType, body.folder);
  }

  @Post('local')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Local upload fallback (no S3 configured)' })
  async localUpload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const key = String(req.query.key || '');
    if (!key) {
      throw new BadRequestException({
        success: false,
        code: 'MISSING_KEY',
        message: 'Thiếu key',
      });
    }
    if (!file) {
      throw new BadRequestException({
        success: false,
        code: 'NO_FILE',
        message: 'Không có tệp',
      });
    }
    await this.svc.saveLocal(key, file.buffer, file.mimetype);
    return { success: true, key, publicUrl: `/uploads/${key}` };
  }
}

@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
