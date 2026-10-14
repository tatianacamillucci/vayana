import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TaskDependenciesService } from './task-dependencies.service';

@ApiTags('task-dependencies')
@ApiBearerAuth()
@Controller('tasks')
export class TaskDependenciesController {
  constructor(private readonly taskDependenciesService: TaskDependenciesService) {}

  @Get(':id/dependencies')
  @ApiOperation({ summary: 'List dependencies for a task' })
  @ApiResponse({ status: 200, description: 'Dependencies listed' })
  list(@Param('id', ParseUUIDPipe) taskId: string) {
    return this.taskDependenciesService.list(taskId);
  }

  @Post(':id/dependencies/:dependsOnTaskId')
  @ApiOperation({ summary: 'Create a BLOCKS dependency: task depends on dependsOnTaskId' })
  @ApiResponse({ status: 201, description: 'Dependency created' })
  add(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Param('dependsOnTaskId', ParseUUIDPipe) dependsOnTaskId: string,
  ) {
    return this.taskDependenciesService.add(taskId, dependsOnTaskId);
  }

  @Delete(':id/dependencies/:dependsOnTaskId')
  @ApiOperation({ summary: 'Remove a dependency from a task' })
  @ApiResponse({ status: 200, description: 'Dependency removed' })
  remove(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Param('dependsOnTaskId', ParseUUIDPipe) dependsOnTaskId: string,
  ) {
    return this.taskDependenciesService.remove(taskId, dependsOnTaskId);
  }
}

