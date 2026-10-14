import { Module } from '@nestjs/common';
import { TaskDependenciesController } from './task-dependencies.controller';
import { TaskDependenciesService } from './task-dependencies.service';

@Module({
  controllers: [TaskDependenciesController],
  providers: [TaskDependenciesService],
  exports: [TaskDependenciesService],
})
export class TaskDependenciesModule {}

