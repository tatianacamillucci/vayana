import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  async listForUser(userId: string, query: QueryNotificationsDto) {
    const db = this.prisma.forTenant();
    const where: Record<string, unknown> = { userId };

    if (query.unreadOnly) {
      where.readAt = null;
    }

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where }),
    ]);

    const limit = query.take;
    const page = query.page ?? 1;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async unreadCount(userId: string) {
    const db = this.prisma.forTenant();
    const count = await db.notification.count({
      where: { userId, readAt: null },
    });
    return { unread: count };
  }

  async markAsRead(id: string, userId: string) {
    const db = this.prisma.forTenant();
    const notification = await db.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return db.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const db = this.prisma.forTenant();
    const result = await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async createTaskAssignedBulk(params: {
    organizationId: string;
    assignedById: string;
    projectId?: string;
    projectName?: string;
    jobs: Array<{ userId: string; taskId: string; taskTitle: string }>;
  }) {
    const recipients = params.jobs.filter(
      (job) => job.userId !== params.assignedById,
    );
    if (recipients.length === 0) return;

    await this.prisma.notification.createMany({
      data: recipients.map((job) => ({
        organizationId: params.organizationId,
        userId: job.userId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Nuovo task assegnato',
        body: params.projectName
          ? `Ti e stato assegnato "${job.taskTitle}" nel progetto "${params.projectName}"`
          : `Ti e stato assegnato "${job.taskTitle}"`,
        taskId: job.taskId,
        projectId: params.projectId ?? null,
      })),
    });
  }
}

