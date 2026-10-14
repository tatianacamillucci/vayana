import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldValueDto } from './dto/update-custom-field-value.dto';

@ApiTags('custom-fields')
@ApiBearerAuth()
@Controller()
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post('projects/:projectId/custom-fields')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom field definition for a project' })
  @ApiResponse({ status: 201, description: 'Custom field created' })
  createField(
    @Param('projectId') projectId: string,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.customFieldsService.createField(projectId, dto);
  }

  @Get('projects/:projectId/custom-fields')
  @ApiOperation({ summary: 'List all custom field definitions for a project' })
  @ApiResponse({ status: 200, description: 'List of custom fields' })
  listFields(@Param('projectId') projectId: string) {
    return this.customFieldsService.listFields(projectId);
  }

  @Delete('projects/:projectId/custom-fields/:fieldId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom field definition' })
  @ApiResponse({ status: 204, description: 'Custom field deleted' })
  deleteField(
    @Param('projectId') _projectId: string,
    @Param('fieldId') fieldId: string,
  ) {
    return this.customFieldsService.deleteField(fieldId);
  }

  @Put('tasks/:taskId/custom-fields/:fieldId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set or update a custom field value on a task' })
  @ApiResponse({ status: 200, description: 'Field value upserted' })
  setFieldValue(
    @Param('taskId') taskId: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateCustomFieldValueDto,
  ) {
    return this.customFieldsService.setFieldValue(taskId, fieldId, dto);
  }

  @Get('tasks/:taskId/custom-fields')
  @ApiOperation({ summary: 'List all custom field values for a task' })
  @ApiResponse({ status: 200, description: 'List of field values with definitions' })
  listFieldValues(@Param('taskId') taskId: string) {
    return this.customFieldsService.listFieldValues(taskId);
  }
}
