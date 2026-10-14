import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  async createTag(projectId: string, dto: CreateTagDto) {
    const db = this.prisma.forTenant();

    try {
      return await db.tag.create({
        data: {
          organizationId: this.tenantId,
          projectId,
          name: dto.name,
          color: dto.color,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Tag "${dto.name}" already exists in this project`,
        );
      }
      throw err;
    }
  }

  async listTags(projectId: string) {
    const db = this.prisma.forTenant();

    return db.tag.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  async deleteTag(tagId: string) {
    const db = this.prisma.forTenant();

    const tag = await db.tag.findFirst({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await db.tag.delete({ where: { id: tagId } });
    return { message: 'Tag deleted successfully' };
  }

  async assignTagToTask(taskId: string, tagId: string) {
    const db = this.prisma.forTenant();

    // Verify task exists and not deleted
    const task = await db.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify tag exists in same project as task
    const tag = await db.tag.findFirst({
      where: { id: tagId, projectId: task.projectId },
    });
    if (!tag) {
      throw new NotFoundException('Tag not found in task\'s project');
    }

    try {
      return await db.taskTag.create({
        data: { taskId, tagId },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('Tag is already assigned to this task');
      }
      throw err;
    }
  }

  async removeTagFromTask(taskId: string, tagId: string) {
    const db = this.prisma.forTenant();

    const taskTag = await db.taskTag.findFirst({
      where: { taskId, tagId },
    });
    if (!taskTag) {
      throw new NotFoundException('Tag assignment not found');
    }

    await db.taskTag.delete({
      where: { taskId_tagId: { taskId, tagId } },
    });

    return { message: 'Tag removed from task' };
  }
}
