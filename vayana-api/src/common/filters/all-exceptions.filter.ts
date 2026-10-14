import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string) ?? 'Error';
        if (Array.isArray(resObj.message)) {
          // ValidationPipe returns message as array of validation errors
          errors = resObj.message;
          message = 'Validation failed';
        }
        if (Array.isArray(resObj.errors)) {
          errors = resObj.errors;
        }
      }
    }

    response.status(status).json({
      status,
      message,
      errors,
    });
  }
}
