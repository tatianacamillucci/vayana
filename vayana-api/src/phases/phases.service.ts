import { Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { ReorderPhaseDto } from './dto/reorder-phase.dto';
import {
  calculatePosition,
  needsRebalance,
  rebalancePositions,
} from '../common/helpers/fractional-position';

@Injectable()
export class PhasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  /** Reads the current tenant ID from CLS context. */
  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  /**
   * Create a new phase within a project.
   * Position is auto-calculated as lastPhase.position + 1.0
   */
  async create(projectId: string, dto: CreatePhaseDto) {
    const db = this.prisma.forTenant();

    // Verify project exists and is not deleted
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Find last phase position for this project
    const lastPhase = await db.phase.findFirst({
      where: { projectId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastPhase ? lastPhase.position + 1.0 : 1.0;

    return db.phase.create({
      data: {
        name: dto.name,
        description: dto.description,
        position,
        projectId,
        organizationId: this.tenantId,
      },
    });
  }

  /**
   * List all phases for a project, ordered by position.
   * Includes task count for each phase.
   */
  async findAll(projectId: string) {
    const db = this.prisma.forTenant();

    // Verify project exists
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return db.phase.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
    });
  }

  /**
   * Get a single phase by ID with task count.
   */
  async findOne(id: string) {
    const db = this.prisma.forTenant();

    const phase = await db.phase.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
    });

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    return phase;
  }

  /**
   * Update phase name and/or description.
   */
  async update(id: string, dto: UpdatePhaseDto) {
    const db = this.prisma.forTenant();

    const phase = await db.phase.findFirst({
      where: { id, deletedAt: null },
    });

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;

    return db.phase.update({
      where: { id },
      data,
    });
  }

  /**
   * Reorder a phase using fractional positioning.
   * Triggers auto-rebalancing when gaps become too small.
   */
  async reorder(id: string, dto: ReorderPhaseDto) {
    const db = this.prisma.forTenant();

    // Find the target phase to get projectId
    const targetPhase = await db.phase.findFirst({
      where: { id, deletedAt: null },
    });

    if (!targetPhase) {
      throw new NotFoundException('Phase not found');
    }

    const projectId = targetPhase.projectId;

    let prev: number | undefined;
    let next: number | undefined;

    if (dto.afterId && dto.beforeId) {
      // Both provided: insert between afterId and beforeId
      const afterPhase = await db.phase.findFirst({
        where: { id: dto.afterId, projectId, deletedAt: null },
        select: { position: true },
      });
      const beforePhase = await db.phase.findFirst({
        where: { id: dto.beforeId, projectId, deletedAt: null },
        select: { position: true },
      });

      if (!afterPhase || !beforePhase) {
        throw new NotFoundException('Reference phase not found');
      }

      prev = afterPhase.position;
      next = beforePhase.position;
    } else if (dto.afterId) {
      // Only afterId: insert after it
      const afterPhase = await db.phase.findFirst({
        where: { id: dto.afterId, projectId, deletedAt: null },
        select: { position: true },
      });

      if (!afterPhase) {
        throw new NotFoundException('Reference phase not found');
      }

      prev = afterPhase.position;

      // Find the next phase after afterId to get upper bound
      const nextPhase = await db.phase.findFirst({
        where: {
          projectId,
          deletedAt: null,
          position: { gt: afterPhase.position },
          id: { not: id },
        },
        orderBy: { position: 'asc' },
        select: { position: true },
      });

      next = nextPhase?.position;
    } else if (dto.beforeId) {
      // Only beforeId: insert before it
      const beforePhase = await db.phase.findFirst({
        where: { id: dto.beforeId, projectId, deletedAt: null },
        select: { position: true },
      });

      if (!beforePhase) {
        throw new NotFoundException('Reference phase not found');
      }

      next = beforePhase.position;

      // Find the phase before beforeId to get lower bound
      const prevPhase = await db.phase.findFirst({
        where: {
          projectId,
          deletedAt: null,
          position: { lt: beforePhase.position },
          id: { not: id },
        },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      prev = prevPhase?.position;
    } else {
      // Neither provided: move to beginning
      const firstPhase = await db.phase.findFirst({
        where: {
          projectId,
          deletedAt: null,
          id: { not: id },
        },
        orderBy: { position: 'asc' },
        select: { position: true },
      });

      next = firstPhase?.position;
    }

    const newPosition = calculatePosition(prev, next);

    // Update the phase position
    await db.phase.update({
      where: { id },
      data: { position: newPosition },
    });

    // Check if rebalancing is needed
    const allPhases = await db.phase.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });

    const positions = allPhases.map((p) => p.position);

    if (needsRebalance(positions)) {
      const newPositions = rebalancePositions(allPhases.length);

      await this.prisma.$transaction(async (tx) => {
        // Set RLS context for the transaction
        const tenantId = allPhases.length > 0 ? targetPhase.organizationId : '';
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_tenant_id', $1, false)`,
          tenantId,
        );

        for (let i = 0; i < allPhases.length; i++) {
          await tx.phase.update({
            where: { id: allPhases[i].id },
            data: { position: newPositions[i] },
          });
        }
      });
    }

    // Return the updated phase with task count
    return db.phase.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
    });
  }

  /**
   * Soft delete a phase.
   * Tasks in this phase are reassigned to "no phase" (phaseId = null).
   */
  async delete(id: string) {
    const db = this.prisma.forTenant();

    const phase = await db.phase.findFirst({
      where: { id, deletedAt: null },
    });

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Set RLS context for the transaction
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        phase.organizationId,
      );

      // Soft delete the phase
      await tx.phase.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Reassign tasks to "no phase" (phaseId = null)
      await tx.task.updateMany({
        where: { phaseId: id, deletedAt: null },
        data: { phaseId: null },
      });
    });

    return { message: 'Phase deleted successfully' };
  }
}
