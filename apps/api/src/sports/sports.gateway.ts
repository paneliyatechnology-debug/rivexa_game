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
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/sports',
})
export class SportsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SportsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Sports Socket connected: ${client.id}`);
    client.emit('connected', { status: 'ok', socketId: client.id });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Sports Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_match')
  handleSubscribeMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string }
  ) {
    if (data?.matchId) {
      const room = `match_${data.matchId}`;
      client.join(room);
      this.logger.log(`Socket ${client.id} joined room ${room}`);
      return { event: 'subscribed', room, matchId: data.matchId };
    }
  }

  @SubscribeMessage('unsubscribe_match')
  handleUnsubscribeMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string }
  ) {
    if (data?.matchId) {
      const room = `match_${data.matchId}`;
      client.leave(room);
      this.logger.log(`Socket ${client.id} left room ${room}`);
      return { event: 'unsubscribed', room, matchId: data.matchId };
    }
  }

  @SubscribeMessage('subscribe_sports_live')
  handleSubscribeLive(@ConnectedSocket() client: Socket) {
    client.join('sports_live_matches');
    this.logger.log(`Socket ${client.id} subscribed to sports_live_matches`);
    return { event: 'subscribed_live' };
  }

  // ─────────────────────────────────────────────
  // BROADCAST BROADCASTERS
  // ─────────────────────────────────────────────

  broadcastScoreUpdate(matchId: string, scoreData: any) {
    if (!this.server) return;
    const payload = {
      matchId,
      score: scoreData,
      ...(typeof scoreData === 'object' ? scoreData : {}),
      updatedAt: new Date().toISOString(),
    };
    this.server.to(`match_${matchId}`).emit('cricket.score.updated', payload);
    this.server.to('sports_live_matches').emit('cricket.score.updated', payload);

  }

  broadcastBallCompleted(matchId: string, ballData: any) {
    if (!this.server) return;
    const payload = {
      matchId,
      ball: ballData,
      commentary: ballData,
      ...(typeof ballData === 'object' ? ballData : {}),
      updatedAt: new Date().toISOString(),
    };
    this.server.to(`match_${matchId}`).emit('cricket.ball.completed', payload);
    this.server.to('sports_live_matches').emit('cricket.ball.completed', payload);

  }

  broadcastMatchCompleted(matchId: string, matchData: any) {
    if (!this.server) return;
    const payload = {
      matchId,
      match: matchData,
      ...(typeof matchData === 'object' ? matchData : {}),
      updatedAt: new Date().toISOString(),
    };
    this.server.to(`match_${matchId}`).emit('cricket.match.completed', payload);
    this.server.to('sports_live_matches').emit('cricket.match.completed', payload);
  }

  broadcastOddsUpdate(matchId: string, oddsData: {
    matchId: string;
    marketId: string;
    selectionId: string;
    oldOdds: number;
    newOdds: number;
    modelProbability: number;
    finalOdds: number;
    matchStateVersion: number;
    priceVersion: string;
    updatedAt: string;
  }) {
    if (!this.server) return;
    console.log(`[SOCKET] event=cricket.odds.updated matchId=${matchId} marketId=${oddsData.marketId}`);
    this.server.to(`match_${matchId}`).emit('cricket.odds.updated', oddsData);
    this.server.to(`market_${oddsData.marketId}`).emit('cricket.odds.updated', oddsData);
    this.server.to('sports_live_matches').emit('cricket.odds.updated', oddsData);
  }

  broadcastMarketSuspended(matchId: string, marketId: string, reason: string) {
    if (!this.server) return;
    const payload = { matchId, marketId, reason, timestamp: new Date().toISOString() };
    console.log(`[SOCKET] event=cricket.market.suspended marketId=${marketId}`);
    this.server.to(`match_${matchId}`).emit('cricket.market.suspended', payload);
    this.server.to(`market_${marketId}`).emit('cricket.market.suspended', payload);
  }

  broadcastMarketResumed(matchId: string, marketId: string) {
    if (!this.server) return;
    const payload = { matchId, marketId, timestamp: new Date().toISOString() };
    console.log(`[SOCKET] event=cricket.market.resumed marketId=${marketId}`);
    this.server.to(`match_${matchId}`).emit('cricket.market.resumed', payload);
    this.server.to(`market_${marketId}`).emit('cricket.market.resumed', payload);
  }

  broadcastMarketSettled(matchId: string, payload: { marketId: string; winnerSelectionName?: string; winningSelectionName?: string; matchId: string }) {
    if (!this.server) return;
    const data = { ...payload, timestamp: new Date().toISOString() };
    console.log(`[SOCKET] event=market.settled marketId=${payload.marketId}`);
    this.server.to(`match_${matchId}`).emit('market.settled', data);
    this.server.to(`market_${payload.marketId}`).emit('market.settled', data);
    this.server.to('sports_live_matches').emit('market.settled', data);
  }

  broadcastMarketUpdated(matchId: string, payload: any) {
    if (!this.server) return;
    const data = { ...payload, timestamp: new Date().toISOString() };
    console.log(`[SOCKET] event=market.updated matchId=${matchId} marketId=${payload.marketId}`);
    this.server.to(`match_${matchId}`).emit('market.updated', data);
    this.server.to('sports_live_matches').emit('market.updated', data);
  }
}
