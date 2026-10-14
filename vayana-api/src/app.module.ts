import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { MailerModule } from '@nestjs-modules/mailer';
import { ClsModule } from 'nestjs-cls';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantModule } from './tenant/tenant.module';
import { TeamsModule } from './teams/teams.module';
import { ProjectsModule } from './projects/projects.module';
import { PhasesModule } from './phases/phases.module';
import { TasksModule } from './tasks/tasks.module';
import { TagsModule } from './tags/tags.module';
import { SectionsModule } from './sections/sections.module';
import { FollowersModule } from './followers/followers.module';
import { StoriesModule } from './stories/stories.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TaskDependenciesModule } from './task-dependencies/task-dependencies.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BatchModule } from './batch/batch.module';
import { TaskViewsModule } from './task-views/task-views.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TenantGuard } from './tenant/tenant.guard';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 60 }],
    }),
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('smtp.host'),
          port: configService.get<number>('smtp.port'),
          auth: {
            user: configService.get<string>('smtp.user'),
            pass: configService.get<string>('smtp.pass'),
          },
        },
        defaults: {
          from: configService.get<string>('smtp.from'),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantModule,
    TeamsModule,
    ProjectsModule,
    PhasesModule,
    TasksModule,
    TagsModule,
    SectionsModule,
    FollowersModule,
    StoriesModule,
    AttachmentsModule,
    CustomFieldsModule,
    PortfoliosModule,
    NotificationsModule,
    TaskDependenciesModule,
    WebhooksModule,
    BatchModule,
    TaskViewsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard execution order: APP_GUARD providers execute in registration order
    // 1. JwtAuthGuard runs first — authenticates user and sets request.user
    // 2. TenantGuard runs second — reads user.organizationId and sets CLS context
    // 3. ThrottlerGuard runs third — rate limiting
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
