import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldValueDto } from './dto/update-custom-field-value.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  async createField(projectId: string, dto: CreateCustomFieldDto) {
    const db = this.prisma.forTenant();

    // Get current max position for this project
    const aggregate = await (db as any).customField.aggregate({
      where: { projectId },
      _max: { position: true },
    });
    const maxPosition: number = aggregate._max.position ?? 0;

    try {
      return await (db as any).customField.create({
        data: {
          organizationId: this.tenantId,
          projectId,
          name: dto.name,
          type: dto.type,
          options: dto.options ?? undefined,
          position: maxPosition + 1,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Custom field "${dto.name}" already exists in this project`,
        );
      }
      throw err;
    }
  }

  async listFields(projectId: string) {
    const db = this.prisma.forTenant();
    return (db as any).customField.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });
  }

  async deleteField(fieldId: string) {
    const db = this.prisma.forTenant();

    const field = await (db as any).customField.findFirst({
      where: { id: fieldId },
    });
    if (!field) {
      throw new NotFoundException(`Custom field ${fieldId} not found`);
    }

    await (db as any).customField.delete({ where: { id: fieldId } });
  }

  async setFieldValue(
    taskId: string,
    fieldId: string,
    dto: UpdateCustomFieldValueDto,
  ) {
    const db = this.prisma.forTenant();

    // Verify task exists and is not deleted
    const task = await db.task.findFirst({ where: { id: taskId, deletedAt: null } });
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Verify field exists
    const field = await (db as any).customField.findFirst({
      where: { id: fieldId },
    });
    if (!field) {
      throw new NotFoundException(`Custom field ${fieldId} not found`);
    }

    return (db as any).customFieldValue.upsert({
      where: { customFieldId_taskId: { customFieldId: fieldId, taskId } },
      create: { customFieldId: fieldId, taskId, value: dto.value ?? null },
      update: { value: dto.value ?? null },
      include: { customField: true },
    });
  }

  async listFieldValues(taskId: string) {
    const db = this.prisma.forTenant();
    return (db as any).customFieldValue.findMany({
      where: { taskId },
      include: { customField: true },
      orderBy: { customField: { position: 'asc' } },
    });
  }
}
