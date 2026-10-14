import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook endpoint created' })
  create(
    @Body() dto: CreateWebhookDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.webhooksService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List webhook endpoints' })
  findAll() {
    return this.webhooksService.findAll();
  }

  @Get('events')
  @ApiOperation({ summary: 'List webhook delivery events' })
  events(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    return this.webhooksService.listEvents(Number.isFinite(parsed) ? parsed : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook endpoint detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.webhooksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update webhook endpoint' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webhook endpoint' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.webhooksService.delete(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a manual test webhook event' })
  test(@Param('id', ParseUUIDPipe) id: string) {
    return this.webhooksService.test(id);
  }
}

