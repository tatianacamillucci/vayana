import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ProjectStatus,
  ProjectVisibility,
  TaskAssigneeRole,
  WebhookEventType,
  type Prisma,
} from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly notificationsService: NotificationsService,
    private readonly webhooksService: WebhooksService,
  ) {}

  /** Reads the current tenant ID from CLS context. */
  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  /**
   * Create a project within the current tenant.
   * Supports optional inline phases and initial tasks with assignees.
   */
  async create(dto: CreateProjectDto, userId: string) {
    const orgId = this.tenantId;

    if (dto.templateId && dto.phases && dto.phases.length > 0) {
      throw new BadRequestException(
        'Use either templateId or phases, not both in the same request',
      );
    }

    const projectData: Prisma.ProjectCreateInput = {
      name: dto.name,
      description: dto.description,
      color: dto.color,
      icon: dto.icon,
      visibility: dto.visibility ?? ProjectVisibility.PUBLIC,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdBy: { connect: { id: userId } },
      organization: { connect: { id: orgId } },
    };

    const notificationJobs: Array<{ userId: string; taskId: string; taskTitle: string }> = [];

    const project = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        orgId,
      );

      const createdProject = await tx.project.create({
        data: projectData,
      });

      await tx.projectMember.create({
        data: {
          projectId: createdProject.id,
          userId,
          organizationId: orgId,
        },
      });

      const templatePhases = dto.templateId
        ? await this.resolveTemplatePhases(dto.templateId, orgId)
        : [];
      const inlinePhases =
        dto.phases?.map((phase, index) => ({
          name: phase.name,
          description: phase.description,
          position: index + 1,
        })) ?? [];
      const phasesToCreate = templatePhases.length > 0 ? templatePhases : inlinePhases;

      const phaseNameToId = new Map<string, string>();

      for (let i = 0; i < phasesToCreate.length; i++) {
        const phase = phasesToCreate[i];
        const createdPhase = await tx.phase.create({
          data: {
            projectId: createdProject.id,
            organizationId: orgId,
            name: phase.name,
            description: phase.description,
            position: phase.position ?? i + 1,
          },
        });
        phaseNameToId.set(phase.name.trim().toLowerCase(), createdPhase.id);
      }

      if (dto.initialTasks && dto.initialTasks.length > 0) {
        const allOrgMembers = await tx.organizationMember.findMany({
          where: { organizationId: orgId },
          select: { userId: true },
        });
        const allOrgMemberIds = new Set(allOrgMembers.map((m) => m.userId));

        for (let i = 0; i < dto.initialTasks.length; i++) {
          const taskDto = dto.initialTasks[i];
          const phaseId = taskDto.phaseName
            ? phaseNameToId.get(taskDto.phaseName.trim().toLowerCase()) ?? null
            : null;

          if (taskDto.phaseName && !phaseId) {
            throw new BadRequestException(
              `Phase "${taskDto.phaseName}" not found for initial task "${taskDto.title}"`,
            );
          }

          const task = await tx.task.create({
            data: {
              organizationId: orgId,
              projectId: createdProject.id,
              phaseId,
              title: taskDto.title,
              description: taskDto.description,
              status: taskDto.status,
              priority: taskDto.priority,
              startDate: taskDto.startDate ? new Date(taskDto.startDate) : undefined,
              dueDate: taskDto.dueDate ? new Date(taskDto.dueDate) : undefined,
              position: i + 1,
              createdById: userId,
            },
          });

          const assigneeIds = new Set(taskDto.assigneeUserIds ?? []);
          if (taskDto.assignToAllTeamMembers) {
            for (const member of allOrgMembers) {
              assigneeIds.add(member.userId);
            }
          }

          if (
            taskDto.responsibleId &&
            !assigneeIds.has(taskDto.responsibleId)
          ) {
            throw new BadRequestException(
              `responsibleId must be included in assigneeUserIds for task "${taskDto.title}"`,
            );
          }

          if (assigneeIds.size > 0) {
            const invalidAssignees = Array.from(assigneeIds).filter(
              (assigneeId) => !allOrgMemberIds.has(assigneeId),
            );
            if (invalidAssignees.length > 0) {
              throw new BadRequestException(
                `Users not in organization for task "${taskDto.title}": ${invalidAssignees.join(', ')}`,
              );
            }

            await tx.taskAssignment.createMany({
              data: Array.from(assigneeIds).map((assigneeId) => ({
                taskId: task.id,
                userId: assigneeId,
                role:
                  assigneeId === taskDto.responsibleId
                    ? TaskAssigneeRole.RESPONSIBLE
                    : TaskAssigneeRole.ASSIGNEE,
              })),
            });

            for (const assigneeId of assigneeIds) {
              notificationJobs.push({
                userId: assigneeId,
                taskId: task.id,
                taskTitle: task.title,
              });
            }
          }
        }
      }

      return tx.project.findUnique({
        where: { id: createdProject.id },
        include: {
          phases: {
            where: { deletedAt: null },
            orderBy: { position: 'asc' },
          },
          projectMembers: true,
          tasks: {
            where: { deletedAt: null },
            include: { assignments: true },
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    if (project && notificationJobs.length > 0) {
      await this.notificationsService.createTaskAssignedBulk({
        organizationId: orgId,
        assignedById: userId,
        projectId: project.id,
        projectName: project.name,
        jobs: notificationJobs,
      });
    }

    if (project) {
      this.webhooksService
        .emitEvent(WebhookEventType.PROJECT_CREATED, {
          projectId: project.id,
          name: project.name,
        })
        .catch((err) =>
          console.warn('Failed to emit project-created webhook event:', err),
        );
    }

    return project;
  }

  private async resolveTemplatePhases(
    templateId: string,
    orgId: string,
  ): Promise<Array<{ name: string; description?: string; position?: number }>> {
    let template = await this.prisma.projectTemplate.findFirst({
      where: { id: templateId, organizationId: orgId },
    });

    if (!template) {
      template = await this.prisma.projectTemplate.findFirst({
        where: { id: templateId, isSystem: true },
      });
    }

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const config = template.config as {
      phases?: Array<{ name: string; description?: string; position?: number }>;
    };

    return config?.phases ?? [];
  }

  /**
   * List projects with pagination, filtering, and visibility checks.
   * Private projects are only visible to project members.
   */
  async findAll(query: QueryProjectsDto, userId: string) {
    const db = this.prisma.forTenant();

    const where: any = {
      deletedAt: null,
    };

    // Exclude archived unless explicitly requested
    if (!query.includeArchived) {
      where.archivedAt = null;
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // Visibility filter (user-requested filter, not access control)
    if (query.visibility) {
      where.visibility = query.visibility;
    }

    // Search by name
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    // Visibility access control: show PUBLIC projects + PRIVATE projects where user is member
    where.OR = [
      { visibility: ProjectVisibility.PUBLIC },
      {
        visibility: ProjectVisibility.PRIVATE,
        projectMembers: { some: { userId } },
      },
    ];

    const [data, total] = await Promise.all([
      db.project.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { phases: true, tasks: true } },
        },
      }),
      db.project.count({ where }),
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

  /**
   * Get a single project by ID with phases and task counts.
   * Enforces visibility: private projects only visible to members.
   */
  async findOne(id: string, userId: string) {
    const db = this.prisma.forTenant();

    const project = await db.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        phases: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
        projectMembers: { select: { userId: true } },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Visibility check: private projects only visible to members
    if (project.visibility === ProjectVisibility.PRIVATE) {
      const isMember = project.projectMembers.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    return project;
  }

  /**
   * Update project fields.
   */
  async update(id: string, dto: UpdateProjectDto) {
    const db = this.prisma.forTenant();

    const project = await db.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.progress !== undefined) data.progress = dto.progress;
    if (dto.thumbnail !== undefined) data.thumbnail = dto.thumbnail;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.dueDate !== undefined) data.dueDate = new Date(dto.dueDate);

    const updated = await db.project.update({
      where: { id },
      data,
    });

    this.webhooksService
      .emitEvent(WebhookEventType.PROJECT_UPDATED, {
        projectId: updated.id,
        name: updated.name,
        status: updated.status,
      })
      .catch((err) =>
        console.warn('Failed to emit project-updated webhook event:', err),
      );

    return updated;
  }

  /**
   * Archive a project (separate from trash).
   * Sets archivedAt and status to ARCHIVED.
   */
  async archive(id: string) {
    const db = this.prisma.forTenant();

    const project = await db.project.findFirst({
      where: { id, deletedAt: null, archivedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found or already archived');
    }

    return db.project.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        status: ProjectStatus.ARCHIVED,
      },
    });
  }

  /**
   * Unarchive a project. Restores to ACTIVE status.
   */
  async unarchive(id: string) {
    const db = this.prisma.forTenant();

    const project = await db.project.findFirst({
      where: { id, deletedAt: null, archivedAt: { not: null } },
    });

    if (!project) {
      throw new NotFoundException('Project not found or not archived');
    }

    return db.project.update({
      where: { id },
      data: {
        archivedAt: null,
        status: ProjectStatus.ACTIVE,
      },
    });
  }

  /**
   * Move a project to trash (soft delete).
   * Cascades to phases and tasks that aren't linked to other projects.
   */
  async trash(id: string) {
    const db = this.prisma.forTenant();
    const orgId = this.tenantId;

    const project = await db.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        phases: { where: { deletedAt: null }, select: { id: true } },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            linkedProjects: { select: { projectId: true } },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        orgId,
      );

      // Soft-delete the project
      await tx.project.update({
        where: { id },
        data: { deletedAt: now },
      });

      // Soft-delete all phases (phases belong to one project only)
      if (project.phases.length > 0) {
        await tx.phase.updateMany({
          where: {
            projectId: id,
            deletedAt: null,
          },
          data: { deletedAt: now },
        });
      }

      // Soft-delete tasks only if they're not linked to other projects
      for (const task of project.tasks) {
        const otherLinks = task.linkedProjects.filter(
          (link) => link.projectId !== id,
        );
        if (otherLinks.length === 0) {
          await tx.task.update({
            where: { id: task.id },
            data: { deletedAt: now },
          });
        }
      }
    });

    return { message: 'Project moved to trash' };
  }

  /**
   * Restore a project from trash.
   * Also restores phases and tasks that were trashed with it.
   */
  async restore(id: string) {
    const db = this.prisma.forTenant();
    const orgId = this.tenantId;

    const project = await db.project.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!project) {
      throw new NotFoundException('Project not found in trash');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        orgId,
      );

      // Restore project
      await tx.project.update({
        where: { id },
        data: { deletedAt: null },
      });

      // Restore phases that belong to this project
      await tx.phase.updateMany({
        where: {
          projectId: id,
          deletedAt: { not: null },
        },
        data: { deletedAt: null },
      });

      // Restore tasks that belong to this project (primary)
      await tx.task.updateMany({
        where: {
          projectId: id,
          deletedAt: { not: null },
        },
        data: { deletedAt: null },
      });
    });

    return this.prisma.project.findUnique({
      where: { id },
      include: {
        phases: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
      },
    });
  }
}
