import { IsOptional, IsUUID, IsEnum, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryTasksDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Project ID (optional - omit for cross-project list)',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Filter by phase ID',
  })
  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @ApiPropertyOptional({ enum: TaskStatus, description: 'Filter by task status' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, description: 'Filter by task priority' })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Filter subtasks of a specific parent task',
  })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Include one level of subtasks in the response',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeSubtasks?: boolean;

  @ApiPropertyOptional({
    default: 'position',
    enum: ['position', 'priority', 'dueDate', 'createdAt'],
    description: 'Sort field',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    default: 'asc',
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: string;

  @ApiPropertyOptional({
    example: 'homepage',
    description: 'Search by title (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
