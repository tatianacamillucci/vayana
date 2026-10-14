import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReorderSectionDto {
  @ApiPropertyOptional({
    example: 'uuid-of-section',
    description: 'Move after this section ID. Omit or null to move to beginning.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  afterSectionId?: string | null;
}
