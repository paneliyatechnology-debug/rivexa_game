import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

export interface IRecordMatchStateInput {
  matchId: string;
  innings: number;
  battingTeam?: string;
  bowlingTeam?: string;
  runs: number;
  wickets: number;
  overs: number;
  balls?: number;
  target?: number;
  requiredRuns?: number;
  requiredRate?: number;
  currentRunRate?: number;
  lastEvent?: string;
  sourceProvider?: string;
  providerEventId?: string;
  providerTimestamp?: Date;
}

export interface IRecordMarketEventInput {
  matchId: string;
  marketId?: string;
  eventType: string; // CREATED, SUSPENDED, RESUMED, CLOSED, SETTLED, OVERRIDE
  eventData?: any;
  providerEventId?: string;
  provider?: string;
  sequenceNumber?: number;
}

@Injectable()
export class MarketHistoryService {
  private readonly logger = new Logger(MarketHistoryService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Persists an immutable match state snapshot.
   */
  async recordMatchState(input: IRecordMatchStateInput) {
    return await this.db.cricketMatchStateSnapshot.create({
      data: {
        matchId: input.matchId,
        innings: input.innings,
        battingTeam: input.battingTeam || null,
        bowlingTeam: input.bowlingTeam || null,
        runs: input.runs,
        wickets: input.wickets,
        overs: input.overs,
        balls: input.balls || 0,
        target: input.target || null,
        requiredRuns: input.requiredRuns || null,
        requiredRate: input.requiredRate || null,
        currentRunRate: input.currentRunRate || null,
        lastEvent: input.lastEvent || null,
        sourceProvider: input.sourceProvider || 'CRICAPI',
        providerEventId: input.providerEventId || null,
        providerTimestamp: input.providerTimestamp || null,
      },
    });
  }

  /**
   * Persists a market event (suspension, resumption, override, settlement).
   */
  async recordMarketEvent(input: IRecordMarketEventInput) {
    return await this.db.marketEvent.create({
      data: {
        matchId: input.matchId,
        marketId: input.marketId || null,
        eventType: input.eventType,
        eventData: input.eventData || {},
        providerEventId: input.providerEventId || null,
        provider: input.provider || null,
        sequenceNumber: input.sequenceNumber || null,
      },
    });
  }

  /**
   * Retrieves match state timeline history.
   */
  async getMatchStateHistory(matchId: string, limit = 50) {
    return await this.db.cricketMatchStateSnapshot.findMany({
      where: { matchId },
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Retrieves market event log history.
   */
  async getMarketEvents(matchId: string, marketId?: string, limit = 50) {
    const where: any = { matchId };
    if (marketId) where.marketId = marketId;

    return await this.db.marketEvent.findMany({
      where,
      orderBy: { processedAt: 'desc' },
      take: limit,
    });
  }
}
