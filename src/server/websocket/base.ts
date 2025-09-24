import { WebSocket } from 'ws';
import { logger } from '@/lib/utils/logger';
import { createSubscriber, getRedis } from '@/lib/server';

export interface BaseConnection {
  userId: string | null;
  socket: WebSocket;
  isAlive: boolean;
}

export abstract class BaseWebSocketService<TConnection extends BaseConnection> {
  protected connections: Map<string, TConnection> = new Map();
  protected userConnections: Map<string, Set<string>> = new Map();
  protected instanceId: string;
  protected publisher = getRedis();
  protected subscriber = createSubscriber();

  constructor(pingIntervalMs: number = 30000) {
    setInterval(() => {
      this.pingConnections();
    }, pingIntervalMs);

    this.instanceId = this.generateConnectionId();
  }

  protected generateConnectionId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  protected pingConnections(): void {
    this.connections.forEach((connection, connectionId) => {
      if (!connection.isAlive) {
        this.removeConnection(connectionId);
        return;
      }

      connection.isAlive = false;
      try {
        connection.socket.ping();
      } catch (error) {
        logger.error('Error pinging connection', { connectionId }, error as Error);
        this.removeConnection(connectionId);
      }
    });
  }

  protected removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.connections.delete(connectionId);

    if (connection.userId) {
      const userConnections = this.userConnections.get(connection.userId);
      if (userConnections) {
        userConnections.delete(connectionId);
        if (userConnections.size === 0) {
          this.userConnections.delete(connection.userId);
          // Notify subclasses that this user went offline (last connection closed)
          try {
            this.onUserOffline(connection.userId);
          } catch (err) {
            logger.error(
              'Error in onUserOffline hook',
              { userId: connection.userId },
              err as Error
            );
          }
        }
      }
    }
  }

  protected sendToConnection(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) return;

    try {
      connection.socket.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Error sending message to connection', { connectionId }, error as Error);
      this.removeConnection(connectionId);
    }
  }

  protected broadcastToAll(message: any): void {
    this.connections.forEach((_, connectionId) => {
      this.sendToConnection(connectionId, message);
    });
  }

  protected broadcastToAllExcept(excludeConnectionId: string, message: any): void {
    this.connections.forEach((_, connectionId) => {
      if (connectionId !== excludeConnectionId) {
        this.sendToConnection(connectionId, message);
      }
    });
  }

  protected sendToUser(userId: string, message: any): void {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections) return;

    userConnections.forEach((connectionId) => {
      this.sendToConnection(connectionId, message);
    });
  }

  protected async publish(channel: string, data: any): Promise<void> {
    try {
      await this.publisher.publish(
        channel,
        JSON.stringify({ instanceId: this.instanceId, type: channel, data })
      );
    } catch (error) {
      logger.error('Error publishing websocket event to Redis', { channel }, error as Error);
    }
  }

  // To be implemented by subclasses
  protected abstract setupRedisSubscriptions(): Promise<void>;

  // Optional presence hooks for subclasses
  // Called when the first connection for a user is established
  protected onUserOnline(_userId: string): void {
    // no-op by default
  }
  // Called when the last connection for a user is removed
  protected onUserOffline(_userId: string): void {
    // no-op by default
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.userConnections.has(userId);
  }
}
