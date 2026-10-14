import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MoveTaskDto {
  @ApiPropertyOptional({
    description: 'Move to a different project (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Move to a different phase (UUID). Pass null to remove from phase.',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  phaseId?: string | null;

  @ApiPropertyOptional({
    description: 'Insert after this task (for fractional positioning)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  afterTaskId?: string;

  @ApiPropertyOptional({
    description: 'Insert before this task (for fractional positioning)',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsOptional()
  @IsUUID()
  beforeTaskId?: string;
}
