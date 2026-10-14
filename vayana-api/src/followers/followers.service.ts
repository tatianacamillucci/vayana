import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowersService {
  constructor(private readonly prisma: PrismaService) {}

  async addFollower(taskId: string, userId: string) {
    const db = this.prisma.forTenant();

    const task = await db.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    try {
      return await db.taskFollower.create({
        data: { taskId, userId },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('User is already following this task');
      }
      throw err;
    }
  }

  async removeFollower(taskId: string, userId: string) {
    const db = this.prisma.forTenant();

    const follower = await db.taskFollower.findFirst({
      where: { taskId, userId },
    });
    if (!follower) {
      throw new NotFoundException('Follower not found');
    }

    await db.taskFollower.delete({
      where: { taskId_userId: { taskId, userId } },
    });
  }

  async listFollowers(taskId: string) {
    const db = this.prisma.forTenant();

    return db.taskFollower.findMany({
      where: { taskId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
