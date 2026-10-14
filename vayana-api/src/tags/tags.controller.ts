import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
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
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';

@ApiTags('tags')
@ApiBearerAuth()
@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post('projects/:projectId/tags')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a tag for a project' })
  @ApiResponse({ status: 201, description: 'Tag created' })
  @ApiResponse({ status: 409, description: 'Tag name already exists in project' })
  async createTag(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTagDto,
  ) {
    return this.tagsService.createTag(projectId, dto);
  }

  @Get('projects/:projectId/tags')
  @ApiOperation({ summary: 'List all tags for a project' })
  @ApiResponse({ status: 200, description: 'List of tags with usage counts' })
  async listTags(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.tagsService.listTags(projectId);
  }

  @Delete('projects/:projectId/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag from a project' })
  @ApiResponse({ status: 204, description: 'Tag deleted' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async deleteTag(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.tagsService.deleteTag(tagId);
  }

  @Post('tasks/:taskId/tags/:tagId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a tag to a task' })
  @ApiResponse({ status: 201, description: 'Tag assigned' })
  @ApiResponse({ status: 404, description: 'Task or tag not found' })
  @ApiResponse({ status: 409, description: 'Tag already assigned to task' })
  async assignTag(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.tagsService.assignTagToTask(taskId, tagId);
  }

  @Delete('tasks/:taskId/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a tag from a task' })
  @ApiResponse({ status: 204, description: 'Tag removed from task' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeTag(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.tagsService.removeTagFromTask(taskId, tagId);
  }
}
