import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { SKIP_TENANT_CHECK } from '../common/decorators/skip-tenant-check.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly cls: ClsService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check @SkipTenantCheck() metadata
    const skipTenantCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_CHECK,
      [context.getHandler(), context.getClass()],
    );
    if (skipTenantCheck) {
      return true;
    }

    // Check @Public() metadata — public routes don't need tenant context
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Extract user from request (set by JwtAuthGuard before this guard runs)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.organizationId) {
      throw new ForbiddenException('No tenant context');
    }

    // Store tenant ID in CLS for downstream services
    this.cls.set('tenantId', user.organizationId);
    return true;
  }
}
