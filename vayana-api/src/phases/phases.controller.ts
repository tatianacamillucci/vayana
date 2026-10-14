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
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { PhasesService } from './phases.service';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { ReorderPhaseDto } from './dto/reorder-phase.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('phases')
@ApiBearerAuth()
@Controller()
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Post('projects/:projectId/phases')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new phase in a project' })
  @ApiResponse({ status: 201, description: 'Phase created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreatePhaseDto,
  ) {
    return this.phasesService.create(projectId, dto);
  }

  @Get('projects/:projectId/phases')
  @ApiOperation({ summary: 'List phases for a project ordered by position' })
  @ApiResponse({ status: 200, description: 'List of phases with task counts' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.phasesService.findAll(projectId);
  }

  @Get('phases/:id')
  @ApiOperation({ summary: 'Get phase details' })
  @ApiResponse({ status: 200, description: 'Phase details with task count' })
  @ApiResponse({ status: 404, description: 'Phase not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.phasesService.findOne(id);
  }

  @Patch('phases/:id')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @ApiOperation({ summary: 'Update a phase' })
  @ApiResponse({ status: 200, description: 'Phase updated' })
  @ApiResponse({ status: 404, description: 'Phase not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePhaseDto,
  ) {
    return this.phasesService.update(id, dto);
  }

  @Patch('phases/:id/reorder')
  @ApiOperation({ summary: 'Reorder a phase using fractional positioning' })
  @ApiResponse({ status: 200, description: 'Phase reordered' })
  @ApiResponse({ status: 404, description: 'Phase or reference phase not found' })
  async reorder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderPhaseDto,
  ) {
    return this.phasesService.reorder(id, dto);
  }

  @Delete('phases/:id')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @ApiOperation({ summary: 'Soft delete a phase (tasks move to no phase)' })
  @ApiResponse({ status: 200, description: 'Phase deleted' })
  @ApiResponse({ status: 404, description: 'Phase not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.phasesService.delete(id);
  }
}
