// src/lib/hooks/useSocket.ts
// Manages a Socket.io connection to the /tasks namespace.
// Join/leave project rooms when the projectId changes.
// On task events, invalidates the TanStack Query cache so all
// open components re-fetch automatically.
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

// Singleton socket — one connection for the whole app lifetime
let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io(`${SOCKET_URL}/tasks`, {
      withCredentials: true, // sends the access_token cookie
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return globalSocket;
}

interface TaskEventPayload {
  projectId: string;
  task?: Record<string, unknown>;
  taskId?: string;
}

/**
 * Connects to the /tasks Socket.io namespace and joins the room for
 * the given projectId. Invalidates TanStack Query caches on task events.
 *
 * Call with projectId=undefined (e.g. on Dashboard) to only connect
 * without joining a room — you'll still get global reconnection.
 */
export function useSocket(projectId?: string) {
  const queryClient = useQueryClient();
  const joinedRoom = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const handleTaskCreated = (payload: TaskEventPayload) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', { projectId: payload.projectId }] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    const handleTaskUpdated = (payload: TaskEventPayload) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', { projectId: payload.projectId }] });
      if (payload.task?.id) {
        queryClient.invalidateQueries({ queryKey: ['tasks', payload.task.id] });
      }
    };

    const handleTaskDeleted = (payload: TaskEventPayload) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', { projectId: payload.projectId }] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    // Join project room if projectId provided
    if (projectId && joinedRoom.current !== projectId) {
      if (joinedRoom.current) {
        socket.emit('leaveProject', joinedRoom.current);
      }
      socket.emit('joinProject', projectId);
      joinedRoom.current = projectId;
    }

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);

      // Leave the room on unmount
      if (joinedRoom.current) {
        socket.emit('leaveProject', joinedRoom.current);
        joinedRoom.current = null;
      }
    };
  }, [projectId, queryClient]);
}
