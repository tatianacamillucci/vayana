import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSectionDto {
  @ApiProperty({ example: 'To Do', description: 'Section name' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'uuid-of-section',
    description: 'Insert after this section ID (omit to append at end)',
  })
  @IsOptional()
  @IsUUID()
  afterSectionId?: string;
}
