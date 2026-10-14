import { Module } from '@nestjs/common';
import { TaskViewsController } from './task-views.controller';
import { TaskViewsService } from './task-views.service';

@Module({
  controllers: [TaskViewsController],
  providers: [TaskViewsService],
})
export class TaskViewsModule {}

