import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStoryDto {
  @ApiProperty({
    example: 'Updated comment content.',
    description: 'New comment content',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}
