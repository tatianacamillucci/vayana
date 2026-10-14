import { IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({
    example: 'jane@example.com',
    description: 'Email address to invite',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'MEMBER',
    description: 'Role to assign when invitation is accepted (defaults to MEMBER)',
    enum: MemberRole,
  })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}
