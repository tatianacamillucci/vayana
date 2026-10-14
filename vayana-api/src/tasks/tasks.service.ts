import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { StoriesService } from '../stories/stories.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { TasksGateway } from './tasks.gateway';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { SearchTasksDto } from './dto/search-tasks.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { TaskAssigneeRole, WebhookEventType } from '@prisma/client';
import {
  calculatePosition,
  needsRebalance,
  rebalancePositions,
} from '../common/helpers/fractional-position';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly storiesService: StoriesService,
    private readonly notificationsService: NotificationsService,
    private readonly webhooksService: WebhooksService,
    @Optional() private readonly tasksGateway: TasksGateway,
  ) {}

  /** Reads the current tenant ID from CLS context. */
  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  /**
   * Create a new task.
   * If parentTaskId is provided, the task is a subtask and inherits its
   * projectId from the parent (dto.projectId is ignored for subtasks).
   */
  async create(dto: CreateTaskDto, userId: string) {
    const db = this.prisma.forTenant();

    // Resolve projectId ? subtasks inherit from parent
    let resolvedProjectId: string | null | undefined = dto.projectId ?? null;
    let resolvedPhaseId: string | null | undefined = dto.phaseId ?? null;

    if (dto.parentTaskId) {
      const parent = await db.task.findFirst({
        where: { id: dto.parentTaskId, deletedAt: null },
        select: { id: true, projectId: true, phaseId: true },
      });
      if (!parent) {
        throw new NotFoundException('Parent task not found');
      }
      resolvedProjectId = parent.projectId ?? null;
      resolvedPhaseId = parent.phaseId ?? null;
    } else {
      if (resolvedProjectId) {
        // Verify project exists and is not deleted
        const project = await db.project.findFirst({
          where: { id: resolvedProjectId, deletedAt: null },
        });
        if (!project) {
          throw new NotFoundException('Project not found');
        }

        // If phaseId provided, verify it belongs to this project
        if (resolvedPhaseId) {
          const phase = await db.phase.findFirst({
            where: { id: resolvedPhaseId, projectId: resolvedProjectId, deletedAt: null },
          });
          if (!phase) {
            throw new NotFoundException('Phase not found in project');
          }
        }
      } else if (resolvedPhaseId) {
        throw new BadRequestException('Cannot set phase without a project');
      }
    }

    // Calculate position: find last task in same context
    const lastTask = await db.task.findFirst({
      where: {
        projectId: resolvedProjectId,
        phaseId: resolvedPhaseId ?? null,
        parentTaskId: dto.parentTaskId ?? null,
        deletedAt: null,
      },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = lastTask ? lastTask.position + 1.0 : 1.0;

    const created = await db.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        projectId: resolvedProjectId,
        phaseId: resolvedPhaseId ?? null,
        parentTaskId: dto.parentTaskId ?? null,
        status: dto.status,
        priority: dto.priority,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedTime: dto.estimatedTime,
        position,
        organizationId: this.tenantId,
        createdById: userId,
      },
    });

    this.webhooksService
      .emitEvent(WebhookEventType.TASK_CREATED, {
        taskId: created.id,
        projectId: created.projectId,
        title: created.title,
      })
      .catch((err) => console.warn('Failed to emit task-created webhook event:', err));

    if (created.projectId) {
      this.tasksGateway?.emitTaskCreated(created.projectId, created as unknown as Record<string, unknown>);
    }

    return created;
  }

  /**
   * List tasks with filtering, sorting, and pagination.
   */
  async findAll(query: QueryTasksDto) {
    const db = this.prisma.forTenant();

    // Build where clause
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    // Top-level tasks by default unless parentTaskId filter is applied
    if (query.parentTaskId !== undefined) {
      where.parentTaskId = query.parentTaskId;
    } else {
      where.parentTaskId = null;
    }

    if (query.phaseId !== undefined) {
      where.phaseId = query.phaseId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    // Build include clause
    const include: Record<string, unknown> = {
      assignments: {
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
    };

    if (query.includeSubtasks) {
      include.subtasks = {
        where: { deletedAt: null },
        orderBy: { position: 'asc' },
        include: {
          assignments: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
        },
      };
    }

    const sortBy = query.sortBy ?? 'position';
    const sortOrder = (query.sortOrder ?? 'asc') as 'asc' | 'desc';

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include,
        orderBy: { [sortBy]: sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      db.task.count({ where }),
    ]);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Advanced search across tasks with optional cross-project scope.
   */
  async searchAdvanced(query: SearchTasksDto, currentUserId: string) {
    const db = this.prisma.forTenant();

    const andFilters: Record<string, unknown>[] = [{ deletedAt: null }];

    if (query.projectId) andFilters.push({ projectId: query.projectId });
    if (query.phaseId) andFilters.push({ phaseId: query.phaseId });

    if (!query.includeSubtasks) {
      andFilters.push({ parentTaskId: null });
    }

    if (query.statuses && query.statuses.length > 0) {
      andFilters.push({ status: { in: query.statuses } });
    }

    if (query.priorities && query.priorities.length > 0) {
      andFilters.push({ priority: { in: query.priorities } });
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      andFilters.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    const assigneeFilter = query.assignedToMe ? currentUserId : query.assigneeId;
    if (assigneeFilter) {
      andFilters.push({
        assignments: {
          some: { userId: assigneeFilter },
        },
      });
    }

    if (query.dueFrom || query.dueTo) {
      andFilters.push({
        dueDate: {
          ...(query.dueFrom ? { gte: new Date(query.dueFrom) } : {}),
          ...(query.dueTo ? { lte: new Date(query.dueTo) } : {}),
        },
      });
    }

    const where = { AND: andFilters };
    const sortBy = query.sortBy ?? 'dueDate';
    const sortOrder = (query.sortOrder ?? 'asc') as 'asc' | 'desc';

    const [data, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          phase: { select: { id: true, name: true } },
          assignments: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      db.task.count({ where }),
    ]);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

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
   * Get a single task with subtasks, assignments, phase, project, parentTask, and linked projects.
   * Computes calculatedProgress from subtask completion.
   */
  async findOne(id: string) {
    const db = this.prisma.forTenant();

    const task = await db.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        subtasks: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          include: {
            assignments: {
              include: {
                user: {
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        phase: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        parentTask: { select: { id: true, title: true } },
        linkedProjects: {
          include: { project: { select: { id: true, name: true } } },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Auto-calculated progress from subtask completion
    let calculatedProgress: number | null = null;
    if (task.subtasks.length > 0) {
      const completedSubtasks = task.subtasks.filter(
        (s) => s.status === 'DONE' || s.status === 'CANCELLED',
      ).length;
      calculatedProgress = Math.round((completedSubtasks / task.subtasks.length) * 100);
    }

    return { ...task, calculatedProgress };
  }

  /**
   * Update a task's fields.
   */
  async update(id: string, dto: UpdateTaskDto) {
    const db = this.prisma.forTenant();

    const task = await db.task.findFirst({
      where: { id, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.phaseId !== undefined) data.phaseId = dto.phaseId;
    if (dto.parentTaskId !== undefined) data.parentTaskId = dto.parentTaskId;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.dueDate !== undefined) data.dueDate = new Date(dto.dueDate);
    if (dto.estimatedTime !== undefined) data.estimatedTime = dto.estimatedTime;
    if (dto.actualTime !== undefined) data.actualTime = dto.actualTime;
    if (dto.progress !== undefined) data.progress = dto.progress;

    const updated = await db.task.update({
      where: { id },
      data,
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        subtasks: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
      },
    });

    // Emit activity stories for changed fields (fire-and-forget)
    const organizationId = task.organizationId;
    const activities: string[] = [];

    if (dto.status !== undefined && dto.status !== task.status) {
      activities.push(`Status changed from ${task.status} to ${dto.status}`);
    }
    if (dto.priority !== undefined && dto.priority !== task.priority) {
      activities.push(`Priority changed from ${task.priority} to ${dto.priority}`);
    }
    if (dto.title !== undefined && dto.title !== task.title) {
      activities.push('Title changed');
    }
    if (dto.dueDate !== undefined) {
      const newDate = dto.dueDate ? new Date(dto.dueDate).toISOString().split('T')[0] : null;
      const oldDate = task.dueDate ? task.dueDate.toISOString().split('T')[0] : null;
      if (newDate !== oldDate) {
        if (newDate) {
          activities.push(`Due date set to ${newDate}`);
        } else {
          activities.push('Due date removed');
        }
      }
    }

    for (const content of activities) {
      this.storiesService.createActivity(id, organizationId, content).catch((err) => {
        console.warn('Failed to create activity story:', err);
      });
    }

    this.webhooksService
      .emitEvent(WebhookEventType.TASK_UPDATED, {
        taskId: updated.id,
        projectId: updated.projectId,
        status: updated.status,
        priority: updated.priority,
      })
      .catch((err) => console.warn('Failed to emit task-updated webhook event:', err));

    if (updated.projectId) {
      this.tasksGateway?.emitTaskUpdated(updated.projectId, updated as unknown as Record<string, unknown>);
    }

    return updated;
  }

  /**
   * Soft-delete a task and all its descendants recursively.
   */
  async delete(id: string) {
    const db = this.prisma.forTenant();

    const task = await db.task.findFirst({
      where: { id, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Collect all descendant IDs recursively
    const allIds = await this.collectDescendantIds(id, db);
    allIds.push(id);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Set RLS context for the transaction
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        task.organizationId,
      );

      // Batch soft-delete all descendants + the task itself
      await tx.task.updateMany({
        where: { id: { in: allIds } },
        data: { deletedAt: now },
      });
    });

    this.webhooksService
      .emitEvent(WebhookEventType.TASK_DELETED, {
        taskId: id,
        deletedAt: now.toISOString(),
      })
      .catch((err) => console.warn('Failed to emit task-deleted webhook event:', err));

    if (task.projectId) {
      this.tasksGateway?.emitTaskDeleted(task.projectId, id);
    }

    return { message: 'Task deleted successfully' };
  }

  /**
   * Recursively collect all descendant task IDs (not including the root task).
   */
  private async collectDescendantIds(
    parentId: string,
    db: ReturnType<PrismaService['forTenant']>,
  ): Promise<string[]> {
    const children = await db.task.findMany({
      where: { parentTaskId: parentId, deletedAt: null },
      select: { id: true },
    });

    const ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      const grandchildren = await this.collectDescendantIds(child.id, db);
      ids.push(...grandchildren);
    }

    return ids;
  }

  /**
   * Set task assignees (full replacement strategy).
   * Validates all userIds are members of the task's organization.
   */
  async assign(taskId: string, dto: AssignTaskDto, assignedByUserId?: string) {
    const db = this.prisma.forTenant();

    const task = await db.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        title: true,
        projectId: true,
        project: { select: { name: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify all users are members of the task's organization
    if (dto.userIds.length > 0) {
      const members = await this.prisma.organizationMember.findMany({
        where: {
          organizationId: task.organizationId,
          userId: { in: dto.userIds },
        },
        select: { userId: true },
      });

      const memberIds = new Set(members.map((m) => m.userId));
      const nonMembers = dto.userIds.filter((uid) => !memberIds.has(uid));

      if (nonMembers.length > 0) {
        throw new BadRequestException(
          `Users not in organization: ${nonMembers.join(', ')}`,
        );
      }

      // Validate responsibleId is in userIds
      if (dto.responsibleId && !dto.userIds.includes(dto.responsibleId)) {
        throw new BadRequestException(
          'responsibleId must be one of the provided userIds',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Set RLS context for the transaction
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        task.organizationId,
      );

      // Delete existing assignments (full replacement)
      await tx.taskAssignment.deleteMany({ where: { taskId } });

      // Create new assignments
      if (dto.userIds.length > 0) {
        await tx.taskAssignment.createMany({
          data: dto.userIds.map((userId) => ({
            taskId,
            userId,
            role:
              userId === dto.responsibleId
                ? TaskAssigneeRole.RESPONSIBLE
                : TaskAssigneeRole.ASSIGNEE,
          })),
        });
      }
    });

    const result = await db.task.findFirst({
      where: { id: taskId },
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Emit activity for assignee change (fire-and-forget)
    this.storiesService
      .createActivity(taskId, task.organizationId, 'Assignees updated')
      .catch((err) => {
        console.warn('Failed to create activity story:', err);
      });

    if (assignedByUserId && dto.userIds.length > 0) {
      await this.notificationsService.createTaskAssignedBulk({
        organizationId: task.organizationId,
        assignedById: assignedByUserId,
        projectId: task.projectId ?? undefined,
        projectName: task.project?.name,
        jobs: dto.userIds.map((userId) => ({
          userId,
          taskId,
          taskTitle: task.title,
        })),
      });
    }

    return result;
  }

  /**
   * Unassign a single user from a task.
   */
  async unassign(taskId: string, userId: string) {
    const db = this.prisma.forTenant();

    const assignment = await db.taskAssignment.findFirst({
      where: { taskId, userId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.taskAssignment.delete({
      where: { taskId_userId: { taskId, userId } },
    });

    return { message: 'User unassigned successfully' };
  }

  /**
   * Move a task to a different phase, project, or position.
   * If moving to a different project, all subtasks move too.
   */
  async move(taskId: string, dto: MoveTaskDto) {
    const db = this.prisma.forTenant();

    const task = await db.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true, phaseId: true, organizationId: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const targetProjectId = dto.projectId ?? task.projectId;
    let targetPhaseId: string | null | undefined = undefined;

    if (!targetProjectId) {
      throw new BadRequestException('Task has no project; provide projectId to move');
    }

    // Determine target phase
    if ('phaseId' in dto) {
      // phaseId key is present (even if null)
      targetPhaseId = dto.phaseId ?? null;
    } else {
      targetPhaseId = task.phaseId;
    }

    // Verify target project exists
    if (dto.projectId) {
      const project = await db.project.findFirst({
        where: { id: dto.projectId, deletedAt: null },
      });
      if (!project) {
        throw new NotFoundException('Target project not found');
      }
    }

    // Verify target phase belongs to the target project (if provided and not null)
    if (targetPhaseId) {
      const phase = await db.phase.findFirst({
        where: { id: targetPhaseId, projectId: targetProjectId, deletedAt: null },
      });
      if (!phase) {
        throw new NotFoundException('Target phase not found in project');
      }
    }

    // Calculate new position
    let newPosition: number;

    if (dto.afterTaskId || dto.beforeTaskId) {
      let prevPosition: number | undefined;
      let nextPosition: number | undefined;

      if (dto.afterTaskId) {
        const afterTask = await db.task.findFirst({
          where: { id: dto.afterTaskId, projectId: targetProjectId, deletedAt: null },
          select: { position: true },
        });
        if (!afterTask) throw new NotFoundException('Reference task (afterTaskId) not found');
        prevPosition = afterTask.position;

        // Find next task after it
        const nextTask = await db.task.findFirst({
          where: {
            projectId: targetProjectId,
            phaseId: targetPhaseId ?? null,
            deletedAt: null,
            position: { gt: afterTask.position },
            id: { not: taskId },
          },
          orderBy: { position: 'asc' },
          select: { position: true },
        });
        nextPosition = nextTask?.position;
      } else if (dto.beforeTaskId) {
        const beforeTask = await db.task.findFirst({
          where: { id: dto.beforeTaskId, projectId: targetProjectId, deletedAt: null },
          select: { position: true },
        });
        if (!beforeTask) throw new NotFoundException('Reference task (beforeTaskId) not found');
        nextPosition = beforeTask.position;

        // Find prev task before it
        const prevTask = await db.task.findFirst({
          where: {
            projectId: targetProjectId,
            phaseId: targetPhaseId ?? null,
            deletedAt: null,
            position: { lt: beforeTask.position },
            id: { not: taskId },
          },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        prevPosition = prevTask?.position;
      }

      newPosition = calculatePosition(prevPosition, nextPosition);
    } else {
      // Append to end of target context
      const lastTask = await db.task.findFirst({
        where: {
          projectId: targetProjectId,
          phaseId: targetPhaseId ?? null,
          deletedAt: null,
          id: { not: taskId },
        },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      newPosition = lastTask ? lastTask.position + 1.0 : 1.0;
    }

    await this.prisma.$transaction(async (tx) => {
      // Set RLS context for the transaction
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        task.organizationId,
      );

      // Update the task
      const updateData: Record<string, unknown> = { position: newPosition };
      if (dto.projectId) updateData.projectId = targetProjectId;
      if (targetPhaseId !== undefined) updateData.phaseId = targetPhaseId;

      await tx.task.update({ where: { id: taskId }, data: updateData });

      // If moving to different project, move all subtasks too (recursively)
      if (dto.projectId && dto.projectId !== task.projectId) {
        await this.moveSubtasksToProject(taskId, dto.projectId, tx);
      }
    });

    // Check if rebalancing is needed for the target context
    const contextTasks = await db.task.findMany({
      where: {
        projectId: targetProjectId,
        phaseId: targetPhaseId ?? null,
        parentTaskId: null,
        deletedAt: null,
      },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });

    if (needsRebalance(contextTasks.map((t) => t.position))) {
      const newPositions = rebalancePositions(contextTasks.length);
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_tenant_id', $1, false)`,
          task.organizationId,
        );
        for (let i = 0; i < contextTasks.length; i++) {
          await tx.task.update({
            where: { id: contextTasks[i].id },
            data: { position: newPositions[i] },
          });
        }
      });
    }

    return db.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        phase: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Recursively move all subtasks of a task to a new project.
   */
  private async moveSubtasksToProject(
    parentId: string,
    newProjectId: string,
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ) {
    const children = await tx.task.findMany({
      where: { parentTaskId: parentId, deletedAt: null },
      select: { id: true },
    });

    for (const child of children) {
      await tx.task.update({
        where: { id: child.id },
        data: { projectId: newProjectId },
      });
      await this.moveSubtasksToProject(child.id, newProjectId, tx);
    }
  }

  /**
   * Link a task to an additional project (multi-homing).
   */
  async linkToProject(taskId: string, projectId: string) {
    const db = this.prisma.forTenant();

    const task = await db.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify project exists
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Can't link to the primary project
    if (task.projectId === projectId) {
      throw new BadRequestException(
        'Cannot link task to its primary project',
      );
    }

    // Check if link already exists
    const existing = await db.taskProjectLink.findFirst({
      where: { taskId, projectId },
    });

    if (existing) {
      throw new BadRequestException('Task already linked to this project');
    }

    await db.taskProjectLink.create({
      data: { taskId, projectId },
    });

    return { message: 'Task linked to project successfully' };
  }

  /**
   * Remove a task's link to an additional project.
   */
  async unlinkFromProject(taskId: string, projectId: string) {
    const db = this.prisma.forTenant();

    const link = await db.taskProjectLink.findFirst({
      where: { taskId, projectId },
    });

    if (!link) {
      throw new NotFoundException('Task project link not found');
    }

    await db.taskProjectLink.delete({
      where: { taskId_projectId: { taskId, projectId } },
    });

    return { message: 'Task unlinked from project successfully' };
  }
}
