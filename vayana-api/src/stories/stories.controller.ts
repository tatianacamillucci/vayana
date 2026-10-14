import {
  Controller,
  Get,
  Post,
  Patch,
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
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('stories')
@ApiBearerAuth()
@Controller()
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post('tasks/:taskId/stories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async createComment(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateStoryDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.storiesService.createComment(taskId, dto.content, userId);
  }

  @Patch('tasks/:taskId/stories/:storyId')
  @ApiOperation({ summary: 'Edit own comment' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  @ApiResponse({ status: 403, description: 'Cannot edit another user\'s comment' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async updateComment(
    @Param('taskId', ParseUUIDPipe) _taskId: string,
    @Param('storyId', ParseUUIDPipe) storyId: string,
    @Body() dto: UpdateStoryDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.storiesService.updateComment(storyId, dto.content, userId);
  }

  @Delete('tasks/:taskId/stories/:storyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete own comment' })
  @ApiResponse({ status: 204, description: 'Comment deleted' })
  @ApiResponse({ status: 403, description: 'Cannot delete another user\'s comment' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async deleteComment(
    @Param('taskId', ParseUUIDPipe) _taskId: string,
    @Param('storyId', ParseUUIDPipe) storyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.storiesService.deleteComment(storyId, userId);
  }

  @Get('tasks/:taskId/stories')
  @ApiOperation({ summary: 'List all stories (comments + activity) for a task' })
  @ApiResponse({ status: 200, description: 'Stories list in chronological order' })
  async listStories(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.storiesService.listStories(taskId);
  }
}
