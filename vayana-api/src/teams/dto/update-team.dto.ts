import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTeamDto {
  @ApiPropertyOptional({ example: 'Engineering v2', description: 'Team name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated team description',
    description: 'Team description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 'OWNER_ONLY',
    description: 'Who can invite new members',
    enum: ['OWNER_ONLY', 'OWNER_AND_LEADERS', 'ALL_MEMBERS'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['OWNER_ONLY', 'OWNER_AND_LEADERS', 'ALL_MEMBERS'])
  invitePolicy?: string;
}
