import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { toValidUserId } from '../../common/utils/user-id.util.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chicken-road',
})
export class ChickenRoadGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChickenRoadGateway.name);

  handleConnection(client: Socket) {
    const rawUserId =
      (client.handshake.query.userId as string) ||
      (client.handshake.headers['x-user-id'] as string) ||
      (client.handshake.headers['authorization'] ? (client.handshake.headers['authorization'] as string).replace('Bearer ', '') : '') ||
      (client.handshake.auth?.token as string);

    const userId = toValidUserId(rawUserId);

    client.join(`user:${userId}`);
    client.data.userId = userId;
    this.logger.log(`Client connected: ${client.id} -> user:${userId}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:round')
  handleJoinRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roundId: string },
  ) {
    if (data?.roundId && client.data?.userId) {
      client.join(`user:${client.data.userId}:round:${data.roundId}`);
      return { event: 'joined:round', data: { roundId: data.roundId } };
    }
  }

  /**
   * Send realtime socket message strictly to a specific user room
   */
  notifyUser(userId: string, event: string, payload: any) {
    if (this.server) {
      const validUserId = toValidUserId(userId);
      this.server.to(`user:${validUserId}`).emit(event, payload);
    }
  }

  /**
   * Broadcast realtime event strictly to a specific user's round room
   */
  broadcastRound(roundId: string, event: string, payload: any, userId?: string) {
    if (this.server && userId) {
      const validUserId = toValidUserId(userId);
      this.server.to(`user:${validUserId}`).emit(event, payload);
    }
  }
}
