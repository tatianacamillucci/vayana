import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExecuteBatchDto } from './dto/execute-batch.dto';
import { BatchService } from './batch.service';

@ApiTags('batch')
@ApiBearerAuth()
@Controller('batch')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  @ApiOperation({ summary: 'Execute multiple operations in one request' })
  @ApiResponse({ status: 201, description: 'Batch executed' })
  execute(
    @Body() dto: ExecuteBatchDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.batchService.execute(dto, userId);
  }
}

