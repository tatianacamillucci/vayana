import { Module } from '@nestjs/common';
import { TeamsController, InvitationsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  controllers: [TeamsController, InvitationsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
