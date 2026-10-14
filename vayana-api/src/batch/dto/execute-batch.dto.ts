import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const ACTIONS = [
  'projects.create',
  'projects.update',
  'tasks.create',
  'tasks.update',
  'tasks.assign',
] as const;

export type BatchAction = (typeof ACTIONS)[number];

class BatchOperationDto {
  @ApiProperty({ enum: ACTIONS })
  @IsIn(ACTIONS)
  action: BatchAction;

  @ApiPropertyOptional({ description: 'Client-provided id to map response entries' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'Action payload. For update/assign it must include the target id.',
    type: Object,
  })
  @IsObject()
  payload: Record<string, unknown>;
}

export class ExecuteBatchDto {
  @ApiProperty({ type: [BatchOperationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchOperationDto)
  operations: BatchOperationDto[];

  @ApiPropertyOptional({
    default: true,
    description: 'If false, execution stops at the first failed operation',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  continueOnError?: boolean = true;
}

