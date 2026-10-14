import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  async createComment(taskId: string, content: string, authorId: string) {
    const db = this.prisma.forTenant();

    const task = await db.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return db.story.create({
      data: {
        organizationId: this.tenantId,
        taskId,
        authorId,
        type: 'COMMENT',
        content,
      },
      include: {
        author: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async updateComment(
    storyId: string,
    content: string,
    requestingUserId: string,
  ) {
    const db = this.prisma.forTenant();

    const story = await db.story.findFirst({
      where: { id: storyId, deletedAt: null },
    });
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    if (story.authorId !== requestingUserId) {
      throw new ForbiddenException('You can only edit your own comments');
    }
    if (story.type !== 'COMMENT') {
      throw new BadRequestException('Activity entries cannot be edited');
    }

    return db.story.update({
      where: { id: storyId },
      data: { content, editedAt: new Date() },
      include: {
        author: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async deleteComment(storyId: string, requestingUserId: string) {
    const db = this.prisma.forTenant();

    const story = await db.story.findFirst({
      where: { id: storyId, deletedAt: null },
    });
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    if (story.authorId !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    if (story.type !== 'COMMENT') {
      throw new BadRequestException('Activity entries cannot be deleted');
    }

    await db.story.update({
      where: { id: storyId },
      data: { deletedAt: new Date(), content: '[deleted]' },
    });
  }

  async listStories(taskId: string) {
    const db = this.prisma.forTenant();

    return db.story.findMany({
      where: { taskId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Create an activity entry. Called internally by TasksService.
   * Uses raw prisma (not forTenant) because organizationId is passed explicitly.
   */
  async createActivity(
    taskId: string,
    organizationId: string,
    content: string,
  ) {
    await this.prisma.story.create({
      data: {
        organizationId,
        taskId,
        authorId: null,
        type: 'ACTIVITY',
        content,
      },
    });
  }
}
