import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

export interface TaskEvent {
  projectId: string;
  task: Record<string, unknown>;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/tasks',
})
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WS client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinProject')
  handleJoinProject(
    @MessageBody() projectId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`project:${projectId}`);
    return { event: 'joinedProject', data: projectId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveProject')
  handleLeaveProject(
    @MessageBody() projectId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(`project:${projectId}`);
    return { event: 'leftProject', data: projectId };
  }

  /** Called by TasksService after a task is created */
  emitTaskCreated(projectId: string, task: Record<string, unknown>) {
    this.server.to(`project:${projectId}`).emit('task:created', { projectId, task });
  }

  /** Called by TasksService after a task is updated */
  emitTaskUpdated(projectId: string, task: Record<string, unknown>) {
    this.server.to(`project:${projectId}`).emit('task:updated', { projectId, task });
  }

  /** Called by TasksService after a task is deleted */
  emitTaskDeleted(projectId: string, taskId: string) {
    this.server.to(`project:${projectId}`).emit('task:deleted', { projectId, taskId });
  }
}
