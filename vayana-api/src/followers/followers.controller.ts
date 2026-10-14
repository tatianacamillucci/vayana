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
  ApiProperty,
} from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { FollowersService } from './followers.service';

class AddFollowerDto {
  @ApiProperty({ example: 'uuid-of-user', description: 'User ID to add as follower' })
  @IsUUID()
  userId: string;
}

@ApiTags('followers')
@ApiBearerAuth()
@Controller()
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Post('tasks/:taskId/followers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a follower to a task' })
  @ApiResponse({ status: 201, description: 'Follower added' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 409, description: 'User is already following this task' })
  async addFollower(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: AddFollowerDto,
  ) {
    return this.followersService.addFollower(taskId, body.userId);
  }

  @Delete('tasks/:taskId/followers/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a follower from a task' })
  @ApiResponse({ status: 204, description: 'Follower removed' })
  @ApiResponse({ status: 404, description: 'Follower not found' })
  async removeFollower(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.followersService.removeFollower(taskId, userId);
  }

  @Get('tasks/:taskId/followers')
  @ApiOperation({ summary: 'List all followers for a task' })
  @ApiResponse({ status: 200, description: 'List of followers with user info' })
  async listFollowers(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.followersService.listFollowers(taskId);
  }
}
