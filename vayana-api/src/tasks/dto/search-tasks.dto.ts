import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SearchTasksDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by one project' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by one phase' })
  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @ApiPropertyOptional({ enum: TaskStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
    return undefined;
  })
  @IsArray()
  @IsEnum(TaskStatus, { each: true })
  statuses?: TaskStatus[];

  @ApiPropertyOptional({ enum: TaskPriority, isArray: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
    return undefined;
  })
  @IsArray()
  @IsEnum(TaskPriority, { each: true })
  priorities?: TaskPriority[];

  @ApiPropertyOptional({ description: 'Free text search on title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter tasks assigned to this user' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Only tasks assigned to current user', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  assignedToMe?: boolean = false;

  @ApiPropertyOptional({ description: 'Due date from (inclusive)' })
  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @ApiPropertyOptional({ description: 'Due date to (inclusive)' })
  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @ApiPropertyOptional({ description: 'Include subtasks in search result', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeSubtasks?: boolean = false;

  @ApiPropertyOptional({
    default: 'dueDate',
    enum: ['position', 'priority', 'dueDate', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ default: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}

