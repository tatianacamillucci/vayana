import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksGateway } from './tasks.gateway';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { StoriesModule } from '../stories/stories.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    StoriesModule,
    NotificationsModule,
    WebhooksModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksGateway, WsJwtGuard],
  exports: [TasksService, TasksGateway],
})
export class TasksModule {}
