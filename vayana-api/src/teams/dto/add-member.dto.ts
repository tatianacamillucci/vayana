import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';

export class AddMemberDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID to add as member',
  })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    example: 'MEMBER',
    description: 'Role to assign (defaults to MEMBER)',
    enum: MemberRole,
  })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}
