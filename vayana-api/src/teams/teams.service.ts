import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { MemberRole } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Create a new team (organization) and make the creator its OWNER.
   */
  async create(dto: CreateTeamDto, userId: string) {
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        description: dto.description,
        members: {
          create: {
            userId,
            role: MemberRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  /**
   * List all teams the user belongs to (cross-tenant query).
   */
  async findAllForUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  }

  /**
   * Get team details by ID (tenant-scoped).
   */
  async findOne(id: string) {
    const db = this.prisma.forTenant();
    const organization = await db.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Team not found');
    }

    return organization;
  }

  /**
   * Update team details (tenant-scoped).
   */
  async update(id: string, dto: UpdateTeamDto) {
    const db = this.prisma.forTenant();

    try {
      return await db.organization.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.invitePolicy !== undefined && { invitePolicy: dto.invitePolicy }),
        },
      });
    } catch {
      throw new NotFoundException('Team not found');
    }
  }

  /**
   * Delete a team. Only OWNER can delete.
   */
  async delete(id: string, userId: string) {
    // Verify user is OWNER
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: id,
        },
      },
    });

    if (!membership || membership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only team owners can delete teams');
    }

    await this.prisma.organization.delete({
      where: { id },
    });
  }

  /**
   * List members of a team (tenant-scoped).
   */
  async listMembers(teamId: string) {
    const db = this.prisma.forTenant();
    return db.organizationMember.findMany({
      where: { organizationId: teamId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Add a member to a team directly.
   */
  async addMember(teamId: string, dto: AddMemberDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existing = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: dto.userId,
          organizationId: teamId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this team');
    }

    return this.prisma.organizationMember.create({
      data: {
        userId: dto.userId,
        organizationId: teamId,
        role: dto.role ?? MemberRole.MEMBER,
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Update a member's role with owner protection.
   * Uses a transaction to ensure atomicity of owner count check + role update.
   */
  async updateMemberRole(
    teamId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId: teamId,
          },
        },
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      // Owner protection: if changing FROM OWNER, check remaining owners
      if (
        member.role === MemberRole.OWNER &&
        dto.role !== MemberRole.OWNER
      ) {
        const ownerCount = await tx.organizationMember.count({
          where: {
            organizationId: teamId,
            role: MemberRole.OWNER,
          },
        });

        if (ownerCount <= 1) {
          throw new BadRequestException({
            statusCode: 400,
            message: 'Cannot change role of the last team owner',
            error: 'OWNER_REQUIRED',
          });
        }
      }

      return tx.organizationMember.update({
        where: { id: member.id },
        data: { role: dto.role },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });
    });
  }

  /**
   * Remove a member from a team with owner protection.
   * Unassigns tasks and uses a transaction for atomicity.
   */
  async removeMember(teamId: string, targetUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId: teamId,
          },
        },
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      // Owner protection
      if (member.role === MemberRole.OWNER) {
        const ownerCount = await tx.organizationMember.count({
          where: {
            organizationId: teamId,
            role: MemberRole.OWNER,
          },
        });

        if (ownerCount <= 1) {
          throw new BadRequestException({
            statusCode: 400,
            message: 'Cannot remove the last team owner',
            error: 'OWNER_REQUIRED',
          });
        }
      }

      // Unassign tasks: delete TaskAssignment records for this user in this org
      await tx.taskAssignment.deleteMany({
        where: {
          userId: targetUserId,
          task: {
            organizationId: teamId,
          },
        },
      });

      // Delete membership
      await tx.organizationMember.delete({
        where: { id: member.id },
      });
    });
  }

  /**
   * Leave a team (user removes themselves). Same owner protection applies.
   */
  async leaveTeam(teamId: string, userId: string) {
    return this.removeMember(teamId, userId);
  }

  // ── Invitation Methods ────────────────────────────────────────────

  /**
   * Create an invitation to join a team via email.
   * Enforces the team's invitePolicy and hashes token before storage.
   */
  async createInvitation(
    teamId: string,
    dto: CreateInvitationDto,
    invitedById: string,
  ) {
    // Get team details and inviter's role
    const team = await this.prisma.organization.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const inviterMembership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: invitedById,
          organizationId: teamId,
        },
      },
    });

    if (!inviterMembership) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Enforce invite policy
    this.enforceInvitePolicy(team.invitePolicy, inviterMembership.role);

    // Check if email already has a PENDING invitation for this team
    const existingInvitation = await this.prisma.teamInvitation.findUnique({
      where: {
        organizationId_email: {
          organizationId: teamId,
          email: dto.email,
        },
      },
    });

    if (existingInvitation && existingInvitation.status === 'PENDING') {
      throw new ConflictException('Invitation already sent to this email');
    }

    // Check if email already belongs to a team member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      const existingMember = await this.prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: teamId,
          },
        },
      });

      if (existingMember) {
        throw new ConflictException('User is already a member of this team');
      }
    }

    // Generate and hash invitation token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(rawToken);

    // If there was a previous non-pending invitation, delete it first
    if (existingInvitation) {
      await this.prisma.teamInvitation.delete({
        where: { id: existingInvitation.id },
      });
    }

    // Create invitation record
    const invitation = await this.prisma.teamInvitation.create({
      data: {
        organizationId: teamId,
        email: dto.email,
        token: hashedToken,
        role: dto.role ?? MemberRole.MEMBER,
        invitedById,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send invitation email
    const frontendUrl = this.configService.get<string>('frontend.url');
    const inviteLink = `${frontendUrl}/invitations/${rawToken}`;

    try {
      await this.mailerService.sendMail({
        to: dto.email,
        subject: `You've been invited to join ${team.name} on Vayana`,
        html: `
          <h1>Team Invitation</h1>
          <p>You've been invited to join <strong>${team.name}</strong> on Vayana.</p>
          <p><a href="${inviteLink}">Accept Invitation</a></p>
          <p>This invitation expires in 7 days.</p>
          <p>If you did not expect this invitation, you can safely ignore this email.</p>
        `,
      });
    } catch {
      // Log error but don't expose to user — invitation is still created
    }

    // Return invitation without token hash
    const { token: _, ...result } = invitation;
    return result;
  }

  /**
   * Get invitation details by raw token (public endpoint).
   */
  async getInvitationByToken(rawToken: string) {
    const hashedToken = this.hashToken(rawToken);

    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { token: hashedToken },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (
      !invitation ||
      invitation.status !== 'PENDING' ||
      invitation.expiresAt < new Date()
    ) {
      throw new NotFoundException('Invitation not found or expired');
    }

    // Return invitation details without token hash
    const { token: _, ...result } = invitation;
    return result;
  }

  /**
   * Accept an invitation (authenticated user). Token is the authorization.
   */
  async acceptInvitation(rawToken: string, userId: string) {
    const hashedToken = this.hashToken(rawToken);

    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.teamInvitation.findUnique({
        where: { token: hashedToken },
      });

      if (
        !invitation ||
        invitation.status !== 'PENDING' ||
        invitation.expiresAt < new Date()
      ) {
        throw new NotFoundException('Invitation not found or expired');
      }

      // Check if user is already a member
      const existingMember = await tx.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMember) {
        // Mark invitation as accepted even if already a member
        await tx.teamInvitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        });
        throw new ConflictException('You are already a member of this team');
      }

      // Create membership
      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      // Update invitation status
      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      return { message: 'Invitation accepted successfully' };
    });
  }

  /**
   * Decline an invitation. Token is sufficient authorization (no auth required).
   */
  async declineInvitation(rawToken: string) {
    const hashedToken = this.hashToken(rawToken);

    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { token: hashedToken },
    });

    if (
      !invitation ||
      invitation.status !== 'PENDING' ||
      invitation.expiresAt < new Date()
    ) {
      throw new NotFoundException('Invitation not found or expired');
    }

    await this.prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'DECLINED' },
    });

    return { message: 'Invitation declined' };
  }

  /**
   * List pending invitations for a team.
   */
  async listInvitations(teamId: string) {
    return this.prisma.teamInvitation.findMany({
      where: {
        organizationId: teamId,
        status: 'PENDING',
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Cancel (delete) a pending invitation.
   */
  async cancelInvitation(teamId: string, invitationId: string) {
    const invitation = await this.prisma.teamInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId: teamId,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.teamInvitation.delete({
      where: { id: invitation.id },
    });

    return { message: 'Invitation cancelled' };
  }

  // ── Private Helpers ──────────────────────────────────────────────

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private enforceInvitePolicy(policy: string, inviterRole: MemberRole): void {
    switch (policy) {
      case 'OWNER_ONLY':
        if (inviterRole !== MemberRole.OWNER) {
          throw new ForbiddenException(
            'Only team owners can invite members with current team policy',
          );
        }
        break;
      case 'OWNER_AND_LEADERS':
        if (
          inviterRole !== MemberRole.OWNER &&
          inviterRole !== MemberRole.TEAM_LEADER
        ) {
          throw new ForbiddenException(
            'Only team owners and leaders can invite members with current team policy',
          );
        }
        break;
      case 'ALL_MEMBERS':
        // Any member can invite — no restriction
        break;
      default:
        // Default to OWNER_ONLY for safety
        if (inviterRole !== MemberRole.OWNER) {
          throw new ForbiddenException(
            'Only team owners can invite members',
          );
        }
    }
  }
}
