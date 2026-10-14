import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskDependenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(taskId: string) {
    const db = this.prisma.forTenant();
    const task = await db.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const [blocking, blockedBy] = await Promise.all([
      db.taskDependency.findMany({
        where: { taskId },
        include: { dependsOnTask: { select: { id: true, title: true, status: true } } },
      }),
      db.taskDependency.findMany({
        where: { dependsOnTaskId: taskId },
        include: { task: { select: { id: true, title: true, status: true } } },
      }),
    ]);

    return { blocking, blockedBy };
  }

  async add(taskId: string, dependsOnTaskId: string) {
    const db = this.prisma.forTenant();

    if (taskId === dependsOnTaskId) {
      throw new BadRequestException('Task cannot depend on itself');
    }

    const [task, dependsOnTask] = await Promise.all([
      db.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true, projectId: true, organizationId: true },
      }),
      db.task.findFirst({
        where: { id: dependsOnTaskId, deletedAt: null },
        select: { id: true, projectId: true },
      }),
    ]);

    if (!task || !dependsOnTask) {
      throw new NotFoundException('Task not found');
    }

    if (task.projectId !== dependsOnTask.projectId) {
      throw new BadRequestException('Dependencies are allowed only within the same project');
    }

    const wouldCreateCycle = await this.checkCycle(dependsOnTaskId, taskId);
    if (wouldCreateCycle) {
      throw new BadRequestException('This dependency would create a cycle');
    }

    try {
      return await db.taskDependency.create({
        data: { organizationId: task.organizationId, taskId, dependsOnTaskId },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('Dependency already exists');
      }
      throw err;
    }
  }

  async remove(taskId: string, dependsOnTaskId: string) {
    const db = this.prisma.forTenant();
    const existing = await db.taskDependency.findFirst({
      where: { taskId, dependsOnTaskId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Dependency not found');

    await db.taskDependency.delete({
      where: { taskId_dependsOnTaskId: { taskId, dependsOnTaskId } },
    });

    return { message: 'Dependency removed' };
  }

  private async checkCycle(startTaskId: string, targetTaskId: string) {
    const db = this.prisma.forTenant();
    const visited = new Set<string>();
    const queue: string[] = [startTaskId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetTaskId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const next = await db.taskDependency.findMany({
        where: { taskId: current },
        select: { dependsOnTaskId: true },
      });
      for (const edge of next) queue.push(edge.dependsOnTaskId);
    }

    return false;
  }
}
