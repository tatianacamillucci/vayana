import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsArray,
  IsBoolean,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectVisibility, TaskPriority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';

class CreateProjectPhaseDto {
  @ApiProperty({ example: 'Backlog', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Attivita da pianificare', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

class CreateProjectTaskDto {
  @ApiProperty({ example: 'Definire scope MVP', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Allineamento requisiti e priorita', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    example: 'Backlog',
    description: 'Nome fase in cui inserire il task (deve esistere nel progetto appena creato)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  phaseName?: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.NONE })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-03-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Utenti da assegnare direttamente al task',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440001'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeUserIds?: string[];

  @ApiPropertyOptional({
    description: 'Assegna automaticamente il task a tutti i membri del team (organization)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  assignToAllTeamMembers?: boolean;

  @ApiPropertyOptional({
    description: 'Utente responsabile (deve essere incluso negli assegnatari)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  responsibleId?: string;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'My Project', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'A project description', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '#FF5733', maxLength: 7 })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional({ example: 'rocket', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    enum: ProjectVisibility,
    default: ProjectVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(ProjectVisibility)
  visibility?: ProjectVisibility;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '2026-05-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Template ID to seed phases from',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    type: [CreateProjectPhaseDto],
    description: 'Fasi da creare durante la creazione progetto (alternativa a templateId)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectPhaseDto)
  phases?: CreateProjectPhaseDto[];

  @ApiPropertyOptional({
    type: [CreateProjectTaskDto],
    description: 'Task iniziali da creare insieme al progetto',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectTaskDto)
  initialTasks?: CreateProjectTaskDto[];
}
