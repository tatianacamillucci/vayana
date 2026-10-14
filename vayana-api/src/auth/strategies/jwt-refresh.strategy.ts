import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('jwt.refreshSecret');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] ?? null,
      ]),
      secretOrKey: secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    };
    super(options);
  }

  validate(req: Request, payload: { sub: string; email: string; orgId: string }) {
    return {
      userId: payload.sub,
      email: payload.email,
      organizationId: payload.orgId,
      refreshToken: req.cookies?.['refresh_token'],
    };
  }
}
