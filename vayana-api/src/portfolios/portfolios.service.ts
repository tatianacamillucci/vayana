import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

@Injectable()
export class PortfoliosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  async create(dto: CreatePortfolioDto, ownerId: string) {
    const db = this.prisma.forTenant();
    return (db as any).portfolio.create({
      data: {
        organizationId: this.tenantId,
        name: dto.name,
        description: dto.description,
        color: dto.color,
        customFields: dto.customFields,
        ownerId,
      },
    });
  }

  async findAll() {
    const db = this.prisma.forTenant();
    return (db as any).portfolio.findMany({
      orderBy: { name: 'asc' },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: { select: { projects: true } },
        members: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async findOne(portfolioId: string) {
    const db = this.prisma.forTenant();
    const portfolio = await (db as any).portfolio.findFirst({
      where: { id: portfolioId },
      include: {
        projects: {
          include: {
            project: {
              select: { id: true, name: true, status: true, color: true },
            },
          },
        },
        members: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!portfolio) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }
    return portfolio;
  }

  async update(portfolioId: string, dto: UpdatePortfolioDto) {
    const db = this.prisma.forTenant();
    const portfolio = await (db as any).portfolio.findFirst({
      where: { id: portfolioId },
    });
    if (!portfolio) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }
    return (db as any).portfolio.update({
      where: { id: portfolioId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.customFields !== undefined && { customFields: dto.customFields }),
      },
    });
  }

  async delete(portfolioId: string) {
    const db = this.prisma.forTenant();
    const portfolio = await (db as any).portfolio.findFirst({
      where: { id: portfolioId },
    });
    if (!portfolio) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }
    await (db as any).portfolio.delete({ where: { id: portfolioId } });
  }

  async addProject(portfolioId: string, projectId: string) {
    const db = this.prisma.forTenant();

    // Verify portfolio exists
    const portfolio = await (db as any).portfolio.findFirst({
      where: { id: portfolioId },
    });
    if (!portfolio) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }

    // Verify project exists and not deleted
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    try {
      await (db as any).portfolioProject.create({
        data: { portfolioId, projectId },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('Project is already in this portfolio');
      }
      throw err;
    }
  }

  async removeProject(portfolioId: string, projectId: string) {
    const db = this.prisma.forTenant();

    const entry = await (db as any).portfolioProject.findFirst({
      where: { portfolioId, projectId },
    });
    if (!entry) {
      throw new NotFoundException('Project is not in this portfolio');
    }

    await (db as any).portfolioProject.delete({
      where: { portfolioId_projectId: { portfolioId, projectId } },
    });
  }

  async listMembers(portfolioId: string) {
    const db = this.prisma.forTenant();
    const portfolio = await (db as any).portfolio.findFirst({ where: { id: portfolioId } });
    if (!portfolio) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }

    return (db as any).portfolioMember.findMany({
      where: { portfolioId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(portfolioId: string, userId: string) {
    const db = this.prisma.forTenant();
    const [portfolio, orgMember] = await Promise.all([
      (db as any).portfolio.findFirst({ where: { id: portfolioId } }),
      this.prisma.organizationMember.findFirst({
        where: { organizationId: this.tenantId, userId },
      }),
    ]);

    if (!portfolio) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }
    if (!orgMember) {
      throw new BadRequestException('User is not part of this organization');
    }

    try {
      return await (db as any).portfolioMember.create({
        data: {
          organizationId: this.tenantId,
          portfolioId,
          userId,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('User is already a member of this portfolio');
      }
      throw err;
    }
  }

  async removeMember(portfolioId: string, userId: string) {
    const db = this.prisma.forTenant();
    const member = await (db as any).portfolioMember.findFirst({
      where: { portfolioId, userId },
    });
    if (!member) {
      throw new NotFoundException('Member is not in this portfolio');
    }

    await (db as any).portfolioMember.delete({
      where: { portfolioId_userId: { portfolioId, userId } },
    });
    return { message: 'Portfolio member removed' };
  }
}
