import '../env.js';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@gaming-platform/database';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public readonly client = new PrismaClient();

  async onModuleInit() {
    try {
      await this.client.$connect();
      this.logger.log('Database connected successfully');
    } catch (error: any) {
      this.logger.warn(`Database connection failed: ${error.message}`);
      this.logger.warn('Please check DATABASE_URL in .env to ensure PostgreSQL credentials are correct.');
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.$disconnect();
    } catch {
      // ignore disconnect errors
    }
  }

  get user(): any { return this.client.user; }
  get wallet(): any { return this.client.wallet; }
  get walletTransaction(): any { return this.client.walletTransaction; }
  get merchantAccount(): any { return this.client.merchantAccount; }
  get depositRequest(): any { return this.client.depositRequest; }
  get depositProof(): any { return this.client.depositProof; }
  get depositVerification(): any { return this.client.depositVerification; }
  get merchantAssignmentLog(): any { return this.client.merchantAssignmentLog; }
  get bankAccount(): any { return this.client.bankAccount; }
  get withdrawal(): any { return this.client.withdrawal; }
  get referral(): any { return this.client.referral; }
  get commission(): any { return this.client.commission; }
  get dailyReward(): any { return this.client.dailyReward; }
  get coupon(): any { return this.client.coupon; }
  get game(): any { return this.client.game; }
  get gameBet(): any { return this.client.gameBet; }
  get gameMove(): any { return this.client.gameMove; }
  get jetRound(): any { return this.client.jetRound; }
  get jetBet(): any { return this.client.jetBet; }
  get crashRound(): any { return this.client.crashRound; }
  get crashBet(): any { return this.client.crashBet; }
  get andarBaharRound(): any { return this.client.andarBaharRound; }
  get andarBaharBet(): any { return this.client.andarBaharBet; }
  get minesGame(): any { return this.client.minesGame; }
  get parityPeriod(): any { return this.client.parityPeriod; }
  get parityBet(): any { return this.client.parityBet; }
  get spinBet(): any { return this.client.spinBet; }
  get diceBet(): any { return this.client.diceBet; }
  get pushparaniRound(): any { return (this.client as any).pushparaniRound; }
  get pushparaniBet(): any { return (this.client as any).pushparaniBet; }
  get coinFlipBet(): any { return (this.client as any).coinFlipBet; }
  get hiloRound(): any { return (this.client as any).hiloRound; }
  get hiloBet(): any { return (this.client as any).hiloBet; }
  get hiloSession(): any { return (this.client as any).hiloSession; }
  get hiloPlay(): any { return (this.client as any).hiloPlay; }
  get notification(): any { return this.client.notification; }
  get sport(): any { return (this.client as any).sport; }
  get competition(): any { return (this.client as any).competition; }
  get season(): any { return (this.client as any).season; }
  get team(): any { return (this.client as any).team; }
  get player(): any { return (this.client as any).player; }
  get match(): any { return (this.client as any).match; }
  get matchScore(): any { return (this.client as any).matchScore; }
  get scorecard(): any { return (this.client as any).scorecard; }
  get commentaryEvent(): any { return (this.client as any).commentaryEvent; }
  get sportsProviderConfig(): any { return (this.client as any).sportsProviderConfig; }
  get cricketProvider(): any { return (this.client as any).cricketProvider; }
  get providerEntityMapping(): any { return (this.client as any).providerEntityMapping; }
  get cricketDataSyncLog(): any { return (this.client as any).cricketDataSyncLog; }
  get cricketSquadPlayer(): any { return (this.client as any).cricketSquadPlayer; }
  get cricketScoreSnapshot(): any { return (this.client as any).cricketScoreSnapshot; }
  get cricketMarketCategory(): any { return (this.client as any).cricketMarketCategory; }
  get cricketMarket(): any { return (this.client as any).cricketMarket; }
  get cricketMarketSelection(): any { return (this.client as any).cricketMarketSelection; }
  get testBet(): any { return (this.client as any).testBet; }
  get testBetSelection(): any { return (this.client as any).testBetSelection; }
  get testBetSettlement(): any { return (this.client as any).testBetSettlement; }
  // ── Multi-tenant models ─────────────────────────────────────────────────
  get tenant(): any { return (this.client as any).tenant; }
  get tenantMember(): any { return (this.client as any).tenantMember; }
  get tenantPlayer(): any { return (this.client as any).tenantPlayer; }
  get tenantCreditLog(): any { return (this.client as any).tenantCreditLog; }
  get tenantAuditLog(): any { return (this.client as any).tenantAuditLog; }
  // ── Cricket Market Engine models ──────────────────────────────────────────
  get cricketMatchStateSnapshot(): any { return (this.client as any).cricketMatchStateSnapshot; }
  get marketPriceSnapshot(): any { return (this.client as any).marketPriceSnapshot; }
  get marketExposureSnapshot(): any { return (this.client as any).marketExposureSnapshot; }
  get marketEvent(): any { return (this.client as any).marketEvent; }
  get marketOverride(): any { return (this.client as any).marketOverride; }
  get marketConfiguration(): any { return (this.client as any).marketConfiguration; }
  get marketAuditLog(): any { return (this.client as any).marketAuditLog; }
  // ── Chicken Road models ──────────────────────────────────────────
  get chickenRoadRound(): any { return (this.client as any).chickenRoadRound; }
  get chickenRoadCheckpoint(): any { return (this.client as any).chickenRoadCheckpoint; }
  get chickenRoadAction(): any { return (this.client as any).chickenRoadAction; }
  get chickenRoadResult(): any { return (this.client as any).chickenRoadResult; }
  get chickenRoadDifficulty(): any { return (this.client as any).chickenRoadDifficulty; }
  get chickenRoadTrafficPattern(): any { return (this.client as any).chickenRoadTrafficPattern; }
  get chickenRoadSettings(): any { return (this.client as any).chickenRoadSettings; }
  get chickenRoadAuditLog(): any { return (this.client as any).chickenRoadAuditLog; }
  get $transaction(): any { return this.client.$transaction.bind(this.client); }
  get $queryRaw(): any { return this.client.$queryRaw.bind(this.client); }
}

