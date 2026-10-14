import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List current user notifications' })
  @ApiResponse({ status: 200, description: 'Paginated notification list' })
  list(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.listForUser(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for bell badge' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  unreadCount(@CurrentUser('userId') userId: string) {
    return this.notificationsService.unreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'Unread notifications marked as read' })
  markAllAsRead(@CurrentUser('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}

