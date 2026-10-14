import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';

@Module({
  imports: [ProjectsModule, TasksModule],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}

