import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReorderPhaseDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Phase to insert after (null or omitted = move to beginning)',
  })
  @IsOptional()
  @IsUUID()
  afterId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Phase to insert before (null or omitted = move to end)',
  })
  @IsOptional()
  @IsUUID()
  beforeId?: string;
}
