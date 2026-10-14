import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskViewDto } from './dto/create-task-view.dto';

@Injectable()
export class TaskViewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  async create(dto: CreateTaskViewDto, userId: string) {
    return this.prisma.taskSearchView.create({
      data: {
        organizationId: this.tenantId,
        userId,
        name: dto.name,
        filters: dto.filters as Prisma.InputJsonValue,
      },
    });
  }

  async listMine(userId: string) {
    return this.prisma.taskSearchView.findMany({
      where: { organizationId: this.tenantId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, userId: string) {
    const view = await this.prisma.taskSearchView.findFirst({
      where: { id, organizationId: this.tenantId, userId },
      select: { id: true },
    });
    if (!view) throw new NotFoundException('Saved view not found');

    await this.prisma.taskSearchView.delete({ where: { id } });
    return { message: 'Saved view deleted' };
  }
}
