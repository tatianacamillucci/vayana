import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Per-endpoint guard that checks if the authenticated user has the required
 * membership role in the current organization.
 *
 * Usage: @UseGuards(RolesGuard) + @Roles(MemberRole.OWNER, MemberRole.TEAM_LEADER)
 *
 * Not registered as a global guard — only applied where role checks are needed.
 * Uses raw PrismaService (not forTenant()) because membership lookup is global.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator — no role restriction
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.userId || !user?.organizationId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.userId,
          organizationId: user.organizationId,
        },
      },
      select: { role: true },
    });

    if (!membership || !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
