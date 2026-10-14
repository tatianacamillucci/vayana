import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiProduces,
} from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const storage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomUUID()}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@ApiTags('attachments')
@ApiBearerAuth()
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('tasks/:taskId/attachments')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file attachment to a task' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async upload(
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.attachmentsService.upload(taskId, file, userId);
  }

  @Get('tasks/:taskId/attachments')
  @ApiOperation({ summary: 'List all attachments for a task' })
  @ApiResponse({ status: 200, description: 'List of attachments' })
  listForTask(@Param('taskId') taskId: string) {
    return this.attachmentsService.listForTask(taskId);
  }

  @Get('tasks/:taskId/attachments/:attachmentId/download')
  @ApiProduces('application/octet-stream')
  @ApiOperation({ summary: 'Download a task attachment by ID' })
  @ApiResponse({ status: 200, description: 'File stream' })
  async download(
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.attachmentsService.findOne(attachmentId);

    // Verify attachment belongs to this task (prevents cross-task path access)
    if (attachment.taskId !== taskId) {
      throw new ForbiddenException('Attachment does not belong to this task');
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${attachment.originalName}"`,
    );
    res.sendFile(resolve(attachment.storagePath));
  }

  @Delete('tasks/:taskId/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task attachment' })
  @ApiResponse({ status: 204, description: 'Attachment deleted' })
  async deleteAttachment(
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    // Verify ownership before deletion
    const attachment = await this.attachmentsService.findOne(attachmentId);
    if (attachment.taskId !== taskId) {
      throw new ForbiddenException('Attachment does not belong to this task');
    }
    await this.attachmentsService.delete(attachmentId);
  }
}
