import {
  Body,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTaskViewDto } from './dto/create-task-view.dto';
import { TaskViewsService } from './task-views.service';

@ApiTags('task-views')
@ApiBearerAuth()
@Controller('task-views')
export class TaskViewsController {
  constructor(private readonly taskViewsService: TaskViewsService) {}

  @Post()
  @ApiOperation({ summary: 'Save an advanced task search view' })
  @ApiResponse({ status: 201, description: 'Saved view created' })
  create(
    @Body() dto: CreateTaskViewDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.taskViewsService.create(dto, userId);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List saved task views of current user' })
  listMine(@CurrentUser('userId') userId: string) {
    return this.taskViewsService.listMine(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one saved task view' })
  @ApiResponse({ status: 200, description: 'Saved view deleted' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.taskViewsService.remove(id, userId);
  }
}

