import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { parse as parseCookie } from 'cookie';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();

    // Extract cookie from the handshake headers
    const rawCookie =
      (client.handshake.headers.cookie as string | undefined) ?? '';
    const cookies = parseCookie(rawCookie);
    const token = cookies['access_token'];

    if (!token) return false;

    try {
      const secret = this.configService.get<string>('jwt.accessSecret');
      const payload = this.jwtService.verify(token, { secret });
      // Attach user to socket data so downstream handlers can access it
      client.data.user = {
        userId: payload.sub as string,
        email: payload.email as string,
        organizationId: payload.orgId as string,
      };
      return true;
    } catch {
      return false;
    }
  }
}
