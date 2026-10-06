import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

@Injectable()
export class MarketSnapshotService {
  private readonly logger = new Logger(MarketSnapshotService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Retrieves the current live snapshot for a market with selections, exposure, and pricing details.
   */
  async getLiveMarketSnapshot(marketId: string) {
    const market = await this.db.cricketMarket.findUnique({
      where: { id: marketId },
      include: {
        match: {
          include: { teamA: true, teamB: true, score: true },
        },
        selections: {
          orderBy: { sortOrder: 'asc' },
        },
        overrides: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!market) return null;

    return {
      marketId: market.id,
      matchId: market.matchId,
      name: market.name,
      marketType: market.marketType,
      status: market.status,
      suspendReason: market.suspendReason,
      margin: Number(market.margin),
      updatedAt: market.updatedAt,
      selections: market.selections.map((s: any) => ({
        id: s.id,
        name: s.name,
        backPrice: Number(s.backPrice),
        layPrice: s.layPrice ? Number(s.layPrice) : null,
        status: s.status,
        fairOdds: s.fairOdds ? Number(s.fairOdds) : Number(s.backPrice),
        exposure: s.exposure ? Number(s.exposure) : 0,
        liability: s.liability ? Number(s.liability) : 0,
      })),
    };
  }
}
