import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreatePortfolioDto {
  @ApiProperty({ example: 'Q1 2026', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'All projects for Q1 2026',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '#4F46E5', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({
    description: 'Custom fields object for portfolio-level metadata',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}
