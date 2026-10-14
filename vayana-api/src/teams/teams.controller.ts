import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipTenantCheck } from '../common/decorators/skip-tenant-check.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @SkipTenantCheck()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  async create(
    @Body() dto: CreateTeamDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.teamsService.create(dto, userId);
  }

  @Get()
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all teams the user belongs to' })
  @ApiResponse({ status: 200, description: 'List of user teams' })
  async findAll(@CurrentUser('userId') userId: string) {
    return this.teamsService.findAllForUser(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get team details' })
  @ApiResponse({ status: 200, description: 'Team details' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update team details' })
  @ApiResponse({ status: 200, description: 'Team updated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a team' })
  @ApiResponse({ status: 200, description: 'Team deleted' })
  @ApiResponse({ status: 403, description: 'Only team owners can delete teams' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.teamsService.delete(id, userId);
    return { message: 'Team deleted successfully' };
  }

  @Get(':teamId/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List team members' })
  @ApiResponse({ status: 200, description: 'List of team members' })
  async listMembers(@Param('teamId') teamId: string) {
    return this.teamsService.listMembers(teamId);
  }

  @Post(':teamId/members')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a member to the team' })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async addMember(
    @Param('teamId') teamId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.teamsService.addMember(teamId, dto);
  }

  @Patch(':teamId/members/:userId')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  @ApiResponse({ status: 400, description: 'Cannot change role of the last team owner' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async updateMemberRole(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamsService.updateMemberRole(teamId, userId, dto);
  }

  @Delete(':teamId/members/:userId')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the team' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 400, description: 'Cannot remove the last team owner' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    await this.teamsService.removeMember(teamId, userId);
    return { message: 'Member removed successfully' };
  }

  @Post(':teamId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a team' })
  @ApiResponse({ status: 200, description: 'Left the team' })
  @ApiResponse({ status: 400, description: 'Cannot leave as the last team owner' })
  async leaveTeam(
    @Param('teamId') teamId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.teamsService.leaveTeam(teamId, userId);
    return { message: 'Successfully left the team' };
  }

  // ── Invitation Endpoints ────────────────────────────────────────

  @Post(':teamId/invitations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send an invitation to join the team' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  @ApiResponse({ status: 403, description: 'Not allowed by team invite policy' })
  @ApiResponse({ status: 409, description: 'Invitation already sent or user already member' })
  async createInvitation(
    @Param('teamId') teamId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.teamsService.createInvitation(teamId, dto, userId);
  }

  @Get(':teamId/invitations')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List pending invitations for a team' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  async listInvitations(@Param('teamId') teamId: string) {
    return this.teamsService.listInvitations(teamId);
  }

  @Delete(':teamId/invitations/:id')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async cancelInvitation(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.teamsService.cancelInvitation(teamId, id);
  }
}

/**
 * Separate controller for public/cross-tenant invitation endpoints.
 * Token-based endpoints live outside the /teams/:teamId scope.
 */
@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get(':token')
  @Public()
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get invitation details by token (public)' })
  @ApiResponse({ status: 200, description: 'Invitation details' })
  @ApiResponse({ status: 404, description: 'Invitation not found or expired' })
  async getInvitation(@Param('token') token: string) {
    return this.teamsService.getInvitationByToken(token);
  }

  @Post(':token/accept')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation (requires authentication)' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  @ApiResponse({ status: 404, description: 'Invitation not found or expired' })
  @ApiResponse({ status: 409, description: 'Already a member of this team' })
  async acceptInvitation(
    @Param('token') token: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.teamsService.acceptInvitation(token, userId);
  }

  @Post(':token/decline')
  @Public()
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline an invitation (public, token is authorization)' })
  @ApiResponse({ status: 200, description: 'Invitation declined' })
  @ApiResponse({ status: 404, description: 'Invitation not found or expired' })
  async declineInvitation(@Param('token') token: string) {
    return this.teamsService.declineInvitation(token);
  }
}
