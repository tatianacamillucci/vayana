import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({
    example: 'TEAM_LEADER',
    description: 'New role to assign',
    enum: MemberRole,
  })
  @IsEnum(MemberRole)
  role: MemberRole;
}
