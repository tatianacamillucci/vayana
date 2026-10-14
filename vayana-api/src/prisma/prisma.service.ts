import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ClsService } from 'nestjs-cls';
import pg from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: pg.Pool;

  constructor(
    configService: ConfigService,
    private readonly cls: ClsService,
  ) {
    const connectionString = configService.get<string>('database.url');
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }

  /**
   * Returns a tenant-scoped Prisma client that:
   * 1. Sets the PostgreSQL session variable for RLS (database-layer defense)
   * 2. Injects organization_id into where/data clauses (application-layer defense)
   *
   * Defense-in-depth: even if the Prisma extension fails, RLS blocks cross-tenant access.
   * Uses session-level set_config (false) since there's no connection pooler (direct connection).
   */
  forTenant() {
    const tenantId = this.cls.get('tenantId');
    if (!tenantId) {
      throw new Error('No tenant context available');
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const prisma = this;

    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // Models that are NOT tenant-scoped — skip filtering
            const globalModels = ['User', 'RefreshToken', 'PasswordReset', 'TeamInvitation'];
            if (globalModels.includes(model as string)) {
              return query(args);
            }

            // Set PostgreSQL session variable for RLS
            // Using `false` = session-level (no connection pooler, direct connection)
            await prisma.$executeRawUnsafe(
              `SELECT set_config('app.current_tenant_id', $1, false)`,
              tenantId,
            );

            // Application-layer: inject organization_id into queries
            // Cast to `any` because $allOperations args is a union of all
            // possible operation args — can't be narrowed statically
            const a = args as any;

            const readOps = [
              'findMany',
              'findFirst',
              'findUnique',
              'findFirstOrThrow',
              'findUniqueOrThrow',
              'count',
              'aggregate',
              'groupBy',
            ];
            const createOps = ['create', 'createMany'];
            const writeOps = [
              'update',
              'updateMany',
              'delete',
              'deleteMany',
              'upsert',
            ];

            if (readOps.includes(operation)) {
              a.where = { ...a.where, organization_id: tenantId };
            } else if (createOps.includes(operation)) {
              if (Array.isArray(a.data)) {
                a.data = a.data.map(
                  (d: Record<string, unknown>) => ({
                    ...d,
                    organization_id: tenantId,
                  }),
                );
              } else {
                a.data = { ...a.data, organization_id: tenantId };
              }
            } else if (writeOps.includes(operation)) {
              if (operation === 'upsert') {
                a.where = { ...a.where, organization_id: tenantId };
                a.create = {
                  ...a.create,
                  organization_id: tenantId,
                };
              } else {
                a.where = { ...a.where, organization_id: tenantId };
              }
            }

            return query(args);
          },
        },
      },
    });
  }
}
