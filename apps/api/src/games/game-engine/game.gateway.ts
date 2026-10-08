import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { CrashService } from '../crash/crash.service.js';
import { JetService } from '../jet/jet.service.js';
import { PushparaniService } from '../pushparani/pushparani.service.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
@Injectable()
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);
  private crashInterval: NodeJS.Timeout | null = null;
  private jetInterval: NodeJS.Timeout | null = null;
  private pushparaniInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(forwardRef(() => CrashService))
    private readonly crashService: CrashService,
    @Inject(forwardRef(() => JetService))
    private readonly jetService: JetService,
    @Inject(forwardRef(() => PushparaniService))
    private readonly pushparaniService: PushparaniService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket GameGateway Initialized');
  }

  onModuleInit() {
    this.startGameEngineLoops();
  }

  onModuleDestroy() {
    if (this.crashInterval) clearInterval(this.crashInterval);
    if (this.jetInterval) clearInterval(this.jetInterval);
    if (this.pushparaniInterval) clearInterval(this.pushparaniInterval);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from WebSocket: ${client.id}`);
  }

  @SubscribeMessage('subscribe:crash')
  async handleSubscribeCrash(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { userId?: string },
  ) {
    client.join('crash');
    try {
      const state = await this.crashService.getSynchronizedState(data?.userId);
      client.emit('crash:state', state);
    } catch (err) {
      this.logger.error('Error fetching crash state for join:', err);
    }
  }

  @SubscribeMessage('subscribe:jet')
  async handleSubscribeJet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { userId?: string },
  ) {
    client.join('jet');
    try {
      const state = await this.jetService.getSynchronizedState(data?.userId);
      client.emit('jet:state', state);
    } catch (err) {
      this.logger.error('Error fetching jet state for join:', err);
    }
  }

  @SubscribeMessage('subscribe:pushparani')
  async handleSubscribePushparani(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { userId?: string },
  ) {
    client.join('pushparani');
    try {
      const state = await this.pushparaniService.getSynchronizedState(data?.userId);
      client.emit('pushparani:state', state);
    } catch (err) {
      this.logger.error('Error fetching pushparani state for join:', err);
    }
  }

  @SubscribeMessage('join:user')
  handleJoinUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (data?.userId) {
      client.join(`user:${data.userId}`);
      this.logger.log(`Client ${client.id} subscribed to room user:${data.userId}`);
    }
  }

  public emitWalletUpdate(userId: string, mainBalance: number) {
    if (this.server && userId) {
      this.server.to(`user:${userId}`).emit('wallet:update', { mainBalance });
    }
  }

  private startGameEngineLoops() {
    this.logger.log('Starting persistent 24/7 Game Engine loops for Crash, JetX & Pushparani...');

    // Crash Loop
    this.crashInterval = setInterval(async () => {
      try {
        const state = await this.crashService.getSynchronizedState();
        delete (state as any).userBalance;
        delete (state as any).userBets;
        if (this.server) {
          this.server.to('crash').emit('crash:state', state);
        }
      } catch (error) {
        this.logger.error('Error in continuous Crash loop:', error);
      }
    }, 200);

    // Jet Loop
    this.jetInterval = setInterval(async () => {
      try {
        const state = await this.jetService.getSynchronizedState();
        delete (state as any).userBalance;
        delete (state as any).userBets;
        if (this.server) {
          this.server.to('jet').emit('jet:state', state);
        }
      } catch (error) {
        this.logger.error('Error in continuous Jet loop:', error);
      }
    }, 200);

    // Pushparani Loop
    this.pushparaniInterval = setInterval(async () => {
      try {
        const state = await this.pushparaniService.getSynchronizedState();
        delete (state as any).userBalance;
        delete (state as any).userBets;
        if (this.server) {
          this.server.to('pushparani').emit('pushparani:state', state);
        }
      } catch (error) {
        this.logger.error('Error in continuous Pushparani loop:', error);
      }
    }, 200);
  }
}
