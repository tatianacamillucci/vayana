import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Updated task title', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated description',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Phase ID',
  })
  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Parent task ID',
  })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-03-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 8, description: 'Estimated time in hours', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedTime?: number;

  @ApiPropertyOptional({ example: 4.5, description: 'Actual time spent in hours', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualTime?: number;

  @ApiPropertyOptional({
    example: 75,
    description: 'Manual progress percentage (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;
}
