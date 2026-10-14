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
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ReorderSectionDto } from './dto/reorder-section.dto';

class MoveTaskToSectionDto {
  sectionId: string | null;
}

@ApiTags('sections')
@ApiBearerAuth()
@Controller()
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post('projects/:projectId/sections')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a section within a project' })
  @ApiResponse({ status: 201, description: 'Section created' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.sectionsService.create(projectId, dto);
  }

  @Get('projects/:projectId/sections')
  @ApiOperation({ summary: 'List all sections for a project' })
  @ApiResponse({ status: 200, description: 'List of sections with task counts' })
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.sectionsService.findAll(projectId);
  }

  @Patch('projects/:projectId/sections/:sectionId')
  @ApiOperation({ summary: 'Update section name' })
  @ApiResponse({ status: 200, description: 'Section updated' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async update(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(sectionId, dto);
  }

  @Patch('projects/:projectId/sections/:sectionId/reorder')
  @ApiOperation({ summary: 'Reorder a section using fractional positioning' })
  @ApiResponse({ status: 200, description: 'Sections reordered' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async reorder(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: ReorderSectionDto,
  ) {
    return this.sectionsService.reorder(sectionId, dto);
  }

  @Delete('projects/:projectId/sections/:sectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a section (tasks remain, sectionId is nulled)' })
  @ApiResponse({ status: 204, description: 'Section deleted' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async delete(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return this.sectionsService.delete(sectionId);
  }

  @Patch('tasks/:taskId/section')
  @ApiOperation({ summary: 'Move a task to a section (or remove from section with null)' })
  @ApiResponse({ status: 200, description: 'Task moved to section' })
  @ApiResponse({ status: 404, description: 'Task or section not found' })
  async moveTaskToSection(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: MoveTaskToSectionDto,
  ) {
    return this.sectionsService.moveTaskToSection(taskId, body.sectionId);
  }
}
