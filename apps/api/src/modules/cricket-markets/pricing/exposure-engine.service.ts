import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { Prisma } from '@gaming-platform/database';

export interface ISelectionExposure {
  selectionId: string;
  selectionName: string;
  totalStake: Prisma.Decimal;
  potentialLiability: Prisma.Decimal;
  netExposure: Prisma.Decimal;
}

export interface IMarketExposureSummary {
  marketId: string;
  totalMarketStake: Prisma.Decimal;
  maxNetLiability: Prisma.Decimal;
  selectionsExposure: ISelectionExposure[];
}

@Injectable()
export class ExposureEngineService {
  private readonly logger = new Logger(ExposureEngineService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Calculates real-time total stake, potential liability, and net exposure for a market.
   */
  async calculateMarketExposure(
    marketId: string,
    tenantId?: string
  ): Promise<IMarketExposureSummary> {
    const market = await this.db.cricketMarket.findUnique({
      where: { id: marketId },
      include: { selections: true },
    });

    if (!market) {
      return {
        marketId,
        totalMarketStake: new Prisma.Decimal(0),
        maxNetLiability: new Prisma.Decimal(0),
        selectionsExposure: [],
      };
    }

    // Fetch all active open bets placed on this market
    const betsWhere: any = {
      marketId,
      status: 'OPEN',
    };
    if (tenantId) {
      betsWhere.testBet = { tenantId };
    }

    const betSelections = await this.db.testBetSelection.findMany({
      where: betsWhere,
      select: {
        selectionId: true,
        stake: true,
        oddsAtPlacement: true,
      },
    });

    // Map stakes by selection ID
    const stakeMap = new Map<string, number>();
    const payoutMap = new Map<string, number>();
    let totalMarketStakeNum = 0;

    for (const b of betSelections) {
      const st = Number(b.stake);
      const odds = Number(b.oddsAtPlacement);
      const payout = st * odds;

      totalMarketStakeNum += st;
      stakeMap.set(b.selectionId, (stakeMap.get(b.selectionId) || 0) + st);
      payoutMap.set(b.selectionId, (payoutMap.get(b.selectionId) || 0) + payout);
    }

    let maxNetLiabilityNum = 0;
    const selectionsExposure: ISelectionExposure[] = market.selections.map((sel: any) => {
      const selStake = stakeMap.get(sel.id) || 0;
      const selPayout = payoutMap.get(sel.id) || 0;
      
      // Potential Liability if this selection wins = Total Payout on this sel - Total Market Stake
      const netLiability = Math.max(0, selPayout - totalMarketStakeNum);
      const potentialLiability = Math.max(0, selPayout - selStake);

      if (netLiability > maxNetLiabilityNum) {
        maxNetLiabilityNum = netLiability;
      }

      return {
        selectionId: sel.id,
        selectionName: sel.name,
        totalStake: new Prisma.Decimal(selStake.toFixed(2)),
        potentialLiability: new Prisma.Decimal(potentialLiability.toFixed(2)),
        netExposure: new Prisma.Decimal(netLiability.toFixed(2)),
      };
    });

    return {
      marketId,
      totalMarketStake: new Prisma.Decimal(totalMarketStakeNum.toFixed(2)),
      maxNetLiability: new Prisma.Decimal(maxNetLiabilityNum.toFixed(2)),
      selectionsExposure,
    };
  }
}
