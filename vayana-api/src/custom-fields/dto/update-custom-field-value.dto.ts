import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomFieldValueDto {
  @ApiPropertyOptional({
    example: 'Sprint 3',
    nullable: true,
    description: 'Set to null to clear the value',
  })
  @IsOptional()
  @IsString()
  value?: string | null;
}
