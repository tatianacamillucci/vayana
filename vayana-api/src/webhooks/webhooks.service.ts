import { Injectable, NotFoundException } from '@nestjs/common';
import {
  WebhookDeliveryStatus,
  WebhookEventType,
} from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const id = this.cls.get('tenantId');
    if (!id) throw new Error('No tenant context available');
    return id;
  }

  async create(dto: CreateWebhookDto, userId: string) {
    const db = this.prisma.forTenant();
    return db.webhookEndpoint.create({
      data: {
        organizationId: this.tenantId,
        name: dto.name,
        targetUrl: dto.targetUrl,
        secret: dto.secret,
        eventTypes: dto.eventTypes,
        createdById: userId,
      },
    });
  }

  async findAll() {
    const db = this.prisma.forTenant();
    return db.webhookEndpoint.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const db = this.prisma.forTenant();
    const endpoint = await db.webhookEndpoint.findFirst({
      where: { id },
    });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');
    return endpoint;
  }

  async update(id: string, dto: UpdateWebhookDto) {
    const db = this.prisma.forTenant();
    await this.findOne(id);
    return db.webhookEndpoint.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.targetUrl !== undefined && { targetUrl: dto.targetUrl }),
        ...(dto.secret !== undefined && { secret: dto.secret }),
        ...(dto.eventTypes !== undefined && { eventTypes: dto.eventTypes }),
      },
    });
  }

  async delete(id: string) {
    const db = this.prisma.forTenant();
    await this.findOne(id);
    await db.webhookEndpoint.delete({ where: { id } });
    return { message: 'Webhook endpoint deleted' };
  }

  async listEvents(limit = 100) {
    const db = this.prisma.forTenant();
    return db.webhookEvent.findMany({
      take: Math.min(limit, 200),
      orderBy: { createdAt: 'desc' },
      include: {
        endpoint: {
          select: { id: true, name: true, targetUrl: true },
        },
      },
    });
  }

  async test(id: string) {
    await this.emitEvent(WebhookEventType.PROJECT_UPDATED, {
      source: 'manual-test',
      webhookId: id,
      at: new Date().toISOString(),
    }, [id]);
    return { message: 'Test event queued' };
  }

  async emitEvent(
    eventType: WebhookEventType,
    payload: Record<string, unknown>,
    onlyEndpointIds?: string[],
  ) {
    const db = this.prisma.forTenant();
    const endpoints = await db.webhookEndpoint.findMany({
      where: {
        isActive: true,
        eventTypes: { has: eventType },
        ...(onlyEndpointIds ? { id: { in: onlyEndpointIds } } : {}),
      },
    });

    if (endpoints.length === 0) return;

    for (const endpoint of endpoints) {
      const event = await db.webhookEvent.create({
        data: {
          organizationId: this.tenantId,
          endpointId: endpoint.id,
          eventType,
          payload,
          status: WebhookDeliveryStatus.PENDING,
        },
      });

      try {
        const body = JSON.stringify({
          id: event.id,
          eventType,
          createdAt: event.createdAt,
          payload,
        });

        const headers: Record<string, string> = {
          'content-type': 'application/json',
          'x-vayana-event': eventType,
        };

        if (endpoint.secret) {
          const signature = crypto
            .createHmac('sha256', endpoint.secret)
            .update(body)
            .digest('hex');
          headers['x-vayana-signature'] = signature;
        }

        const response = await fetch(endpoint.targetUrl, {
          method: 'POST',
          headers,
          body,
        });

        if (!response.ok) {
          throw new Error(`Webhook HTTP ${response.status}`);
        }

        await db.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: WebhookDeliveryStatus.DELIVERED,
            deliveredAt: new Date(),
            errorMessage: null,
          },
        });
      } catch (err: any) {
        await db.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: WebhookDeliveryStatus.FAILED,
            errorMessage: err?.message ?? 'Webhook delivery failed',
          },
        });
      }
    }
  }
}

