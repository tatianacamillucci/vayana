import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'backend', description: 'Tag name (unique per project)' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Tag color (hex or color name)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}
