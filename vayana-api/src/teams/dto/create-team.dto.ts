import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'Engineering', description: 'Team name' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'The engineering team handles all development work',
    description: 'Team description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
