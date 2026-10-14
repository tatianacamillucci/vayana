import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { SearchTasksDto } from './dto/search-tasks.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task (or subtask via parentTaskId)' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Project, phase, or parent task not found' })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tasksService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks with filtering, sorting, and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks' })
  async findAll(@Query() query: QueryTasksDto) {
    return this.tasksService.findAll(query);
  }

  @Get('search/advanced')
  @ApiOperation({ summary: 'Advanced task search across one or multiple projects' })
  @ApiResponse({ status: 200, description: 'Paginated advanced search results' })
  async searchAdvanced(
    @Query() query: SearchTasksDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tasksService.searchAdvanced(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details with subtasks, assignments, and linked projects' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task fields' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a task and all its subtasks (cascade)' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.delete(id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Set task assignees (full replacement — replaces all existing assignees)' })
  @ApiResponse({ status: 201, description: 'Task assignees updated' })
  @ApiResponse({ status: 400, description: 'Invalid userIds or responsibleId not in userIds' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @HttpCode(HttpStatus.CREATED)
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tasksService.assign(id, dto, userId);
  }

  @Delete(':id/assign/:userId')
  @ApiOperation({ summary: 'Unassign a single user from a task' })
  @ApiResponse({ status: 200, description: 'User unassigned' })
  @ApiResponse({ status: 404, description: 'Task or assignment not found' })
  async unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.tasksService.unassign(id, userId);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move task between phases or projects with fractional positioning' })
  @ApiResponse({ status: 201, description: 'Task moved successfully' })
  @ApiResponse({ status: 404, description: 'Task, project, or phase not found' })
  @HttpCode(HttpStatus.CREATED)
  async move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasksService.move(id, dto);
  }

  @Post(':id/link/:projectId')
  @ApiOperation({ summary: 'Link task to an additional project (multi-homing)' })
  @ApiResponse({ status: 201, description: 'Task linked to project' })
  @ApiResponse({ status: 400, description: 'Cannot link to primary project or link already exists' })
  @ApiResponse({ status: 404, description: 'Task or project not found' })
  @HttpCode(HttpStatus.CREATED)
  async linkToProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.tasksService.linkToProject(id, projectId);
  }

  @Delete(':id/link/:projectId')
  @ApiOperation({ summary: 'Remove task link from an additional project' })
  @ApiResponse({ status: 200, description: 'Task unlinked from project' })
  @ApiResponse({ status: 404, description: 'Task or link not found' })
  async unlinkFromProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.tasksService.unlinkFromProject(id, projectId);
  }
}
