import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignTaskDto {
  @ApiProperty({
    description: 'List of user IDs to assign to this task',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiPropertyOptional({
    description: 'The one user designated as "responsible" (accountable owner). Must be one of the userIds.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  responsibleId?: string;
}
