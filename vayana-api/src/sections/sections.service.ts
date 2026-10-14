import { Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ReorderSectionDto } from './dto/reorder-section.dto';
import {
  calculatePosition,
  needsRebalance,
  rebalancePositions,
} from '../common/helpers/fractional-position';

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  async create(projectId: string, dto: CreateSectionDto) {
    const db = this.prisma.forTenant();

    // Verify project exists and is not deleted
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    let position: number;

    if (dto.afterSectionId) {
      const afterSection = await db.section.findFirst({
        where: { id: dto.afterSectionId, projectId },
        select: { position: true },
      });
      if (!afterSection) {
        throw new NotFoundException('Reference section not found');
      }

      const nextSection = await db.section.findFirst({
        where: { projectId, position: { gt: afterSection.position } },
        orderBy: { position: 'asc' },
        select: { position: true },
      });

      position = calculatePosition(afterSection.position, nextSection?.position);
    } else {
      const lastSection = await db.section.findFirst({
        where: { projectId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      position = calculatePosition(lastSection?.position, undefined);
    }

    return db.section.create({
      data: {
        organizationId: this.tenantId,
        projectId,
        name: dto.name,
        position,
      },
    });
  }

  async findAll(projectId: string) {
    const db = this.prisma.forTenant();

    return db.section.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  async findOne(sectionId: string) {
    const db = this.prisma.forTenant();

    const section = await db.section.findFirst({ where: { id: sectionId } });
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return section;
  }

  async update(sectionId: string, dto: UpdateSectionDto) {
    const db = this.prisma.forTenant();

    const section = await db.section.findFirst({ where: { id: sectionId } });
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return db.section.update({
      where: { id: sectionId },
      data: { name: dto.name },
    });
  }

  async reorder(sectionId: string, dto: ReorderSectionDto) {
    const db = this.prisma.forTenant();

    const targetSection = await db.section.findFirst({
      where: { id: sectionId },
    });
    if (!targetSection) {
      throw new NotFoundException('Section not found');
    }

    const projectId = targetSection.projectId;

    let prev: number | undefined;
    let next: number | undefined;

    if (dto.afterSectionId == null) {
      // Move to beginning
      const firstSection = await db.section.findFirst({
        where: { projectId, id: { not: sectionId } },
        orderBy: { position: 'asc' },
        select: { position: true },
      });
      next = firstSection?.position;
    } else {
      // Move after afterSectionId
      const afterSection = await db.section.findFirst({
        where: { id: dto.afterSectionId, projectId },
        select: { position: true },
      });
      if (!afterSection) {
        throw new NotFoundException('Reference section not found');
      }

      prev = afterSection.position;

      const nextSection = await db.section.findFirst({
        where: {
          projectId,
          position: { gt: afterSection.position },
          id: { not: sectionId },
        },
        orderBy: { position: 'asc' },
        select: { position: true },
      });

      next = nextSection?.position;
    }

    const newPosition = calculatePosition(prev, next);

    await db.section.update({
      where: { id: sectionId },
      data: { position: newPosition },
    });

    // Check if rebalancing is needed
    const allSections = await db.section.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });

    const positions = allSections.map((s) => s.position);

    if (needsRebalance(positions)) {
      const newPositions = rebalancePositions(allSections.length);

      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_tenant_id', $1, false)`,
          this.tenantId,
        );

        for (let i = 0; i < allSections.length; i++) {
          await tx.section.update({
            where: { id: allSections[i].id },
            data: { position: newPositions[i] },
          });
        }
      });
    }

    return db.section.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });
  }

  async delete(sectionId: string) {
    const db = this.prisma.forTenant();

    const section = await db.section.findFirst({ where: { id: sectionId } });
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        section.organizationId,
      );

      // Null out sectionId on all tasks in this section
      await tx.task.updateMany({
        where: { sectionId },
        data: { sectionId: null },
      });

      await tx.section.delete({ where: { id: sectionId } });
    });
  }

  async moveTaskToSection(taskId: string, sectionId: string | null) {
    const db = this.prisma.forTenant();

    const task = await db.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (sectionId !== null) {
      const section = await db.section.findFirst({
        where: { id: sectionId, projectId: task.projectId },
      });
      if (!section) {
        throw new NotFoundException('Section not found in task\'s project');
      }
    }

    return db.task.update({
      where: { id: taskId },
      data: { sectionId },
    });
  }
}
