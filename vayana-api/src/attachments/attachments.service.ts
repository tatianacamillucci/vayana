import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  async upload(
    taskId: string,
    file: Express.Multer.File,
    uploadedById: string,
  ) {
    const db = this.prisma.forTenant();

    const task = await db.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) {
      // Clean up uploaded file since task doesn't exist
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore
      }
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const attachment = await (db as any).attachment.create({
      data: {
        organizationId: this.tenantId,
        taskId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath: file.path,
        uploadedById,
      },
    });

    // Return without storagePath
    const { storagePath: _storagePath, ...publicAttachment } = attachment;
    return publicAttachment;
  }

  async findOne(attachmentId: string) {
    const db = this.prisma.forTenant();

    const attachment = await (db as any).attachment.findFirst({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }
    return attachment;
  }

  async listForTask(taskId: string) {
    const db = this.prisma.forTenant();

    const attachments = await (db as any).attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    // Strip storagePath from public response
    return attachments.map(
      ({ storagePath: _storagePath, ...rest }: any) => rest,
    );
  }

  async delete(attachmentId: string) {
    const db = this.prisma.forTenant();

    const attachment = await (db as any).attachment.findFirst({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    // Remove file from disk (best effort)
    try {
      fs.unlinkSync(attachment.storagePath);
    } catch (err) {
      this.logger.warn(
        `Could not delete file at ${attachment.storagePath}: ${(err as Error).message}`,
      );
    }

    await (db as any).attachment.delete({ where: { id: attachmentId } });
  }
}
