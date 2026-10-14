import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoryDto {
  @ApiProperty({
    example: 'Looking good! Let me review.',
    description: 'Comment content',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}
