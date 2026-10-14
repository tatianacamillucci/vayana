import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async searchByEmail(email: string) {
    return this.prisma.user.findMany({
      where: { email: { contains: email, mode: 'insensitive' } },
      select: { id: true, email: true, firstName: true, lastName: true },
      take: 10,
    });
  }

  async searchByQuery(q: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, firstName: true, lastName: true },
      take: 10,
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
      },
    });
  }

  async completeOnboarding(userId: string, dto: UpdateOnboardingDto) {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.firstName !== undefined && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        },
      });

      const orgName = dto.orgName?.trim();
      if (orgName) {
        const membership = await tx.organizationMember.findFirst({
          where: { userId },
          select: { organizationId: true },
          orderBy: { createdAt: 'asc' },
        });

        if (membership) {
          await tx.$executeRawUnsafe(
            `SELECT set_config('app.current_tenant_id', $1, false)`,
            membership.organizationId,
          );

          await tx.organization.update({
            where: { id: membership.organizationId },
            data: { name: orgName },
          });
        }
      }
    });

    return this.findById(userId);
  }
}
