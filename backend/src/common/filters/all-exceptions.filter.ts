import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: any = {
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Lỗi máy chủ nội bộ',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        body = {
          success: false,
          code: mapStatusToCode(status),
          message: resp,
        };
      } else if (typeof resp === 'object' && resp !== null) {
        const r = resp as Record<string, any>;
        body = {
          success: false,
          code: r.code || mapStatusToCode(status),
          message: r.message || r.error || 'Lỗi máy chủ',
          ...(r.data ? { data: r.data } : {}),
        };
      }
    } else if (exception instanceof Error) {
      // Don't leak stack in production
      if (process.env.NODE_ENV !== 'production') {
        body.message = exception.message;
        body.stack = exception.stack;
      }
      this.logger.error(
        `[${request.method} ${request.url}] ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json(body);
  }
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 410:
      return 'GONE';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'RATE_LIMIT';
    default:
      return 'INTERNAL_ERROR';
  }
}
