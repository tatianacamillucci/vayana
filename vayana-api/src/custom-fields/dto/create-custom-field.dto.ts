import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { CustomFieldType } from '@prisma/client';

export class CreateCustomFieldDto {
  @ApiProperty({ example: 'Sprint', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: CustomFieldType, example: CustomFieldType.TEXT })
  @IsEnum(CustomFieldType)
  type: CustomFieldType;

  @ApiPropertyOptional({
    type: [String],
    example: ['Option A', 'Option B'],
    description: 'For SELECT and MULTI_SELECT types',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}
