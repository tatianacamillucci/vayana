import { BadRequestException, Injectable } from '@nestjs/common';
import { AssignTaskDto } from '../tasks/dto/assign-task.dto';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../tasks/dto/update-task.dto';
import { TasksService } from '../tasks/tasks.service';
import { CreateProjectDto } from '../projects/dto/create-project.dto';
import { UpdateProjectDto } from '../projects/dto/update-project.dto';
import { ProjectsService } from '../projects/projects.service';
import { ExecuteBatchDto } from './dto/execute-batch.dto';

@Injectable()
export class BatchService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
  ) {}

  async execute(dto: ExecuteBatchDto, userId: string) {
    if (!dto.operations?.length) {
      throw new BadRequestException('operations cannot be empty');
    }

    if (dto.operations.length > 20) {
      throw new BadRequestException('Maximum 20 operations per batch request');
    }

    const results: Array<Record<string, unknown>> = [];

    for (let i = 0; i < dto.operations.length; i++) {
      const op = dto.operations[i];
      try {
        const data = await this.runOperation(op.action, op.payload, userId);
        results.push({
          index: i,
          id: op.id ?? null,
          action: op.action,
          success: true,
          data,
        });
      } catch (err: any) {
        results.push({
          index: i,
          id: op.id ?? null,
          action: op.action,
          success: false,
          error: err?.message ?? 'Operation failed',
        });
        if (!dto.continueOnError) break;
      }
    }

    return {
      data: results,
      meta: {
        total: dto.operations.length,
        success: results.filter((r) => r.success === true).length,
        failed: results.filter((r) => r.success === false).length,
      },
    };
  }

  private runOperation(action: string, payload: Record<string, unknown>, userId: string) {
    switch (action) {
      case 'projects.create':
        return this.projectsService.create(payload as unknown as CreateProjectDto, userId);
      case 'projects.update': {
        const id = payload.id as string | undefined;
        if (!id) throw new BadRequestException('projects.update requires payload.id');
        const { id: _, ...rest } = payload;
        return this.projectsService.update(id, rest as unknown as UpdateProjectDto);
      }
      case 'tasks.create':
        return this.tasksService.create(payload as unknown as CreateTaskDto, userId);
      case 'tasks.update': {
        const id = payload.id as string | undefined;
        if (!id) throw new BadRequestException('tasks.update requires payload.id');
        const { id: _, ...rest } = payload;
        return this.tasksService.update(id, rest as unknown as UpdateTaskDto);
      }
      case 'tasks.assign': {
        const id = payload.id as string | undefined;
        if (!id) throw new BadRequestException('tasks.assign requires payload.id');
        const { id: _, ...rest } = payload;
        return this.tasksService.assign(id, rest as unknown as AssignTaskDto, userId);
      }
      default:
        throw new BadRequestException(`Unsupported batch action: ${action}`);
    }
  }
}

