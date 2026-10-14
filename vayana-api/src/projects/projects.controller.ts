import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.projectsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List projects with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated project list' })
  async findAll(
    @Query() query: QueryProjectsDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.projectsService.findAll(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied (private project)' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.projectsService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto);
  }

  @Post(':id/archive')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a project' })
  @ApiResponse({ status: 200, description: 'Project archived' })
  @ApiResponse({ status: 404, description: 'Project not found or already archived' })
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.archive(id);
  }

  @Post(':id/unarchive')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unarchive a project' })
  @ApiResponse({ status: 200, description: 'Project unarchived' })
  @ApiResponse({ status: 404, description: 'Project not found or not archived' })
  async unarchive(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.unarchive(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @ApiOperation({ summary: 'Move a project to trash (soft delete)' })
  @ApiResponse({ status: 200, description: 'Project moved to trash' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async trash(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.trash(id);
  }

  @Post(':id/restore')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a project from trash' })
  @ApiResponse({ status: 200, description: 'Project restored' })
  @ApiResponse({ status: 404, description: 'Project not found in trash' })
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.restore(id);
  }
}
