import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTaskViewDto {
  @ApiProperty({ example: 'Task urgenti del team' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ description: 'Saved search filters', type: Object })
  @IsObject()
  filters: Record<string, unknown>;
}

