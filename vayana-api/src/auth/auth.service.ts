import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private static readonly PERSONAL_ORG_NAME = 'Personal';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
  ) {}

  private async ensureOrganizationMembership(userId: string): Promise<string> {
    const existing = await this.prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { organizationId: true },
    });

    if (existing) return existing.organizationId;

    const createdOrg = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: AuthService.PERSONAL_ORG_NAME },
      });

      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        organization.id,
      );

      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: organization.id,
          role: 'OWNER',
        },
      });

      return organization;
    });

    return createdOrg.id;
  }

  async register(dto: RegisterDto) {
    // Check email uniqueness
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    // Create default Organization and link user as OWNER
    const organization = await this.prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: { name: 'Personal' },
      });

      // Ensure RLS policies allow inserting the membership for the new org
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        createdOrg.id,
      );

      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: createdOrg.id,
          role: 'OWNER',
        },
      });

      return createdOrg;
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      organization.id,
    );

    return tokens;
  }

  async login(dto: LoginDto) {
    // Find user by email
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare password
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find user's first organization membership (oldest = primary org)
    const organizationId = await this.ensureOrganizationMembership(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      organizationId,
    );

    return tokens;
  }

  async refreshTokens(userId: string, oldRefreshToken: string) {
    // Hash the incoming refresh token
    const tokenHash = this.hashToken(oldRefreshToken);

    // Find in DB
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });

    if (
      !storedToken ||
      storedToken.revoked ||
      storedToken.expiresAt < new Date()
    ) {
      // Token reuse detected or expired - revoke entire family
      if (storedToken?.familyId) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: storedToken.familyId },
          data: { revoked: true },
        });
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify the token belongs to the user
    if (storedToken.userId !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Find user to get email and org
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const organizationId = await this.ensureOrganizationMembership(userId);

    // Generate new tokens (same family)
    const tokens = await this.generateTokens(
      userId,
      user.email,
      organizationId,
      storedToken.familyId,
    );

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });

    if (storedToken && storedToken.userId === userId) {
      // Revoke entire family on logout
      await this.prisma.refreshToken.updateMany({
        where: { familyId: storedToken.familyId },
        data: { revoked: true },
      });
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (user) {
      // Generate crypto random token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);

      // Store in PasswordReset table with 1-hour expiry
      await this.prisma.passwordReset.create({
        data: {
          token: tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Send email with reset link
      const frontendUrl = this.configService.get<string>('frontend.url');
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

      try {
        await this.mailerService.sendMail({
          to: user.email,
          subject: 'Reset your password',
          html: `
            <h1>Password Reset</h1>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <p><a href="${resetLink}">Reset Password</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
          `,
        });
      } catch {
        // Log error but don't expose to user
        // In production, use a proper logger
      }
    }

    // Always return success to prevent email enumeration
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);

    // Find valid password reset
    const passwordReset = await this.prisma.passwordReset.findFirst({
      where: {
        token: tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!passwordReset) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.password, 10);

    // Update user's password
    await this.prisma.user.update({
      where: { id: passwordReset.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Mark password reset as used
    await this.prisma.passwordReset.update({
      where: { id: passwordReset.id },
      data: { used: true },
    });

    // Revoke all user's refresh tokens (force re-login)
    await this.prisma.refreshToken.updateMany({
      where: { userId: passwordReset.userId },
      data: { revoked: true },
    });
  }

  async generateTokens(
    userId: string,
    email: string,
    orgId: string,
    familyId?: string,
  ) {
    const payload = { sub: userId, email, orgId };

    // If no familyId, generate new one (new login = new family)
    const tokenFamilyId = familyId ?? crypto.randomUUID();

    const accessExpiresIn =
      this.configService.get<string>('jwt.accessExpiresIn') || '15m';
    const refreshExpiresInStr =
      this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.parseExpiry(accessExpiresIn) / 1000, // seconds
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.parseExpiry(refreshExpiresInStr) / 1000, // seconds
      jwtid: crypto.randomUUID(),
    });

    // Hash refresh token for storage (SHA-256, fast lookup)
    const refreshTokenHash = this.hashToken(refreshToken);

    // Parse refresh token expiry for DB storage
    const expiresMs = this.parseExpiry(refreshExpiresInStr);

    // Store hashed refresh token in DB
    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenHash,
        userId,
        familyId: tokenFamilyId,
        expiresAt: new Date(Date.now() + expiresMs),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
