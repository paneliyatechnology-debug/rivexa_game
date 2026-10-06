import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { Prisma } from '@gaming-platform/database';

export interface IRecordOddsChangeInput {
  marketId: string;
  selectionId: string;
  oldOdds: Prisma.Decimal | number;
  newOdds: Prisma.Decimal | number;
  fairOdds: Prisma.Decimal | number;
  probability: number;
  margin: number;
  exposure?: Prisma.Decimal | number;
  liability?: Prisma.Decimal | number;
  reason: string;
  source: string; // MODEL_UPDATE, SCORE_UPDATE, EXPOSURE_UPDATE, ADMIN_OVERRIDE, MARKET_CONFIG_UPDATE, PROVIDER_UPDATE, MANUAL_SUSPENSION, RESUME
  pricingVersion?: string;
  matchStateReference?: string;
  tenantId?: string;
}

export interface IOddsHistoryQuery {
  marketId?: string;
  matchId?: string;
  selectionId?: string;
  reason?: string;
  source?: string;
  tenantId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class OddsHistoryService {
  private readonly logger = new Logger(OddsHistoryService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Persists an immutable price movement snapshot.
   */
  async recordOddsChange(input: IRecordOddsChangeInput) {
    const oldVal = typeof input.oldOdds === 'number' ? new Prisma.Decimal(input.oldOdds.toFixed(2)) : input.oldOdds;
    const newVal = typeof input.newOdds === 'number' ? new Prisma.Decimal(input.newOdds.toFixed(2)) : input.newOdds;
    const fairVal = typeof input.fairOdds === 'number' ? new Prisma.Decimal(input.fairOdds.toFixed(2)) : input.fairOdds;
    const expVal = input.exposure ? (typeof input.exposure === 'number' ? new Prisma.Decimal(input.exposure.toFixed(2)) : input.exposure) : new Prisma.Decimal(0);
    const liabVal = input.liability ? (typeof input.liability === 'number' ? new Prisma.Decimal(input.liability.toFixed(2)) : input.liability) : new Prisma.Decimal(0);

    // Skip recording if oldOdds and newOdds are identical to prevent duplicate snapshot bloat
    if (oldVal.equals(newVal) && input.source !== 'ADMIN_OVERRIDE') {
      return null;
    }

    const snapshot = await this.db.marketPriceSnapshot.create({
      data: {
        marketId: input.marketId,
        selectionId: input.selectionId,
        oldOdds: oldVal,
        newOdds: newVal,
        fairOdds: fairVal,
        probability: new Prisma.Decimal(input.probability.toFixed(4)),
        margin: new Prisma.Decimal(input.margin.toFixed(4)),
        exposure: expVal,
        liability: liabVal,
        reason: input.reason,
        source: input.source,
        pricingVersion: input.pricingVersion || 'v1.0.0',
        matchStateReference: input.matchStateReference || null,
        tenantId: input.tenantId || null,
      },
      include: {
        market: {
          include: {
            match: {
              include: { teamA: true, teamB: true },
            },
          },
        },
        selection: true,
      },
    });

    return snapshot;
  }

  /**
   * Queries full odds movement history with rich filtering.
   */
  async getOddsHistory(query: IOddsHistoryQuery) {
    const {
      marketId,
      matchId,
      selectionId,
      reason,
      source,
      tenantId,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;

    const where: any = {};

    if (marketId) where.marketId = marketId;
    if (selectionId) where.selectionId = selectionId;
    if (reason) where.reason = reason;
    if (source) where.source = source;
    if (tenantId) where.tenantId = tenantId;

    if (matchId) {
      where.market = { matchId };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      where.OR = [
        { reason: { contains: searchLower, mode: 'insensitive' } },
        { source: { contains: searchLower, mode: 'insensitive' } },
        { selection: { name: { contains: searchLower, mode: 'insensitive' } } },
        { market: { name: { contains: searchLower, mode: 'insensitive' } } },
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [total, data] = await Promise.all([
      this.db.marketPriceSnapshot.count({ where }),
      this.db.marketPriceSnapshot.findMany({
        where,
        include: {
          market: {
            include: {
              match: {
                include: { teamA: true, teamB: true },
              },
            },
          },
          selection: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }
}
