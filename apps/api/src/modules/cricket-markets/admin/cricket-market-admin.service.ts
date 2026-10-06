import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { Prisma } from '@gaming-platform/database';
import { OddsHistoryService } from '../history/odds-history.service.js';
import { MarketHistoryService } from '../history/market-history.service.js';
import { SportsGateway } from '../../../sports/sports.gateway.js';

export interface IManualOverrideDto {
  selectionId: string;
  newOdds: number;
  reason: string;
  adminUserId?: string;
  tenantId?: string;
  expiryMinutes?: number;
}

export interface ISuspendMarketDto {
  reason: string;
  adminUserId?: string;
  tenantId?: string;
}

@Injectable()
export class CricketMarketAdminService {
  private readonly logger = new Logger(CricketMarketAdminService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly oddsHistory: OddsHistoryService,
    private readonly marketHistory: MarketHistoryService,
    private readonly sportsGateway: SportsGateway
  ) {}

  /**
   * Admin Manual Price Override Flow:
   * Validation -> Create Override Record -> Update Selection -> Record History Snapshot -> Audit Log -> Broadcast Socket.IO
   */
  async overrideSelectionPrice(marketId: string, dto: IManualOverrideDto) {
    const { selectionId, newOdds, reason, adminUserId, tenantId, expiryMinutes } = dto;

    if (newOdds <= 1.0) {
      throw new BadRequestException('Override odds must be greater than 1.00');
    }

    const selection = await this.db.cricketMarketSelection.findUnique({
      where: { id: selectionId },
      include: { market: true },
    });

    if (!selection || selection.marketId !== marketId) {
      throw new NotFoundException(`Selection with ID "${selectionId}" not found in market "${marketId}"`);
    }

    const previousOdds = Number(selection.backPrice);
    const newOddsVal = new Prisma.Decimal(newOdds.toFixed(2));
    const expiresAt = expiryMinutes ? new Date(Date.now() + expiryMinutes * 60000) : null;

    // 1. Create Override Record
    const overrideRecord = await this.db.marketOverride.create({
      data: {
        marketId,
        selectionId,
        previousOdds: new Prisma.Decimal(previousOdds.toFixed(2)),
        newOdds: newOddsVal,
        reason,
        adminUserId: adminUserId || null,
        tenantId: tenantId || null,
        status: 'ACTIVE',
        expiresAt,
      },
    });

    // 2. Update Selection Current Price
    const updatedSelection = await this.db.cricketMarketSelection.update({
      where: { id: selectionId },
      data: {
        backPrice: newOddsVal,
        displayedOdds: newOddsVal,
        status: 'ACTIVE',
      },
    });

    // 3. Create Price History Snapshot
    const fairOdds = 1 / Math.max(0.01, 1 / newOdds);
    await this.oddsHistory.recordOddsChange({
      marketId,
      selectionId,
      oldOdds: previousOdds,
      newOdds,
      fairOdds,
      probability: 1 / newOdds,
      margin: selection.market.margin ? selection.market.margin.toNumber() : 0.04,
      reason: `ADMIN_OVERRIDE: ${reason}`,
      source: 'ADMIN_OVERRIDE',
      pricingVersion: 'v1.0.0-override',
      tenantId: tenantId || undefined,
    });

    // 4. Record Audit Log
    await this.db.marketAuditLog.create({
      data: {
        tenantId: tenantId || null,
        actorId: adminUserId || null,
        actorRole: 'ADMIN',
        entityType: 'SELECTION',
        entityId: selectionId,
        action: 'OVERRIDE',
        oldValue: { odds: previousOdds },
        newValue: { odds: newOdds, expiresAt },
        reason,
      },
    });

    // 5. Record Market Event
    await this.marketHistory.recordMarketEvent({
      matchId: selection.market.matchId,
      marketId,
      eventType: 'OVERRIDE',
      eventData: { selectionId, selectionName: selection.name, previousOdds, newOdds, reason },
    });

    // 6. Broadcast Real-Time WebSocket Event
    if (this.sportsGateway?.server) {
      const payload = {
        matchId: selection.market.matchId,
        marketId,
        selectionId,
        oldOdds: previousOdds,
        newOdds,
        reason,
        isOverride: true,
        updatedAt: new Date().toISOString(),
      };
      this.sportsGateway.server.to(`match_${selection.market.matchId}`).emit('cricket.odds.updated', payload);
      this.sportsGateway.server.to(`market_${marketId}`).emit('cricket.odds.updated', payload);
    }

    return {
      success: true,
      message: `Odds for "${selection.name}" updated to ${newOdds.toFixed(2)} via manual override.`,
      override: overrideRecord,
      selection: updatedSelection,
    };
  }

  /**
   * Suspend Market with Reason & Real-Time Broadcast
   */
  async suspendMarket(marketId: string, dto: ISuspendMarketDto) {
    const market = await this.db.cricketMarket.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID "${marketId}" not found`);
    }

    const updated = await this.db.cricketMarket.update({
      where: { id: marketId },
      data: {
        status: 'SUSPENDED',
        suspendReason: dto.reason,
      },
    });

    await this.db.marketAuditLog.create({
      data: {
        tenantId: dto.tenantId || null,
        actorId: dto.adminUserId || null,
        actorRole: 'ADMIN',
        entityType: 'MARKET',
        entityId: marketId,
        action: 'SUSPEND',
        oldValue: { status: market.status },
        newValue: { status: 'SUSPENDED', suspendReason: dto.reason },
        reason: dto.reason,
      },
    });

    await this.marketHistory.recordMarketEvent({
      matchId: market.matchId,
      marketId,
      eventType: 'SUSPENDED',
      eventData: { reason: dto.reason },
    });

    if (this.sportsGateway?.server) {
      const payload = {
        matchId: market.matchId,
        marketId,
        status: 'SUSPENDED',
        reason: dto.reason,
        updatedAt: new Date().toISOString(),
      };
      this.sportsGateway.server.to(`match_${market.matchId}`).emit('cricket.market.suspended', payload);
    }

    return {
      success: true,
      message: `Market "${market.name}" suspended.`,
      market: updated,
    };
  }

  /**
   * Resume Market & Real-Time Broadcast
   */
  async resumeMarket(marketId: string, adminUserId?: string, tenantId?: string) {
    const market = await this.db.cricketMarket.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID "${marketId}" not found`);
    }

    const updated = await this.db.cricketMarket.update({
      where: { id: marketId },
      data: {
        status: 'OPEN',
        suspendReason: null,
      },
    });

    await this.db.marketAuditLog.create({
      data: {
        tenantId: tenantId || null,
        actorId: adminUserId || null,
        actorRole: 'ADMIN',
        entityType: 'MARKET',
        entityId: marketId,
        action: 'RESUME',
        oldValue: { status: market.status },
        newValue: { status: 'OPEN' },
      },
    });

    await this.marketHistory.recordMarketEvent({
      matchId: market.matchId,
      marketId,
      eventType: 'RESUMED',
      eventData: { action: 'RESUMED' },
    });

    if (this.sportsGateway?.server) {
      const payload = {
        matchId: market.matchId,
        marketId,
        status: 'OPEN',
        updatedAt: new Date().toISOString(),
      };
      this.sportsGateway.server.to(`match_${market.matchId}`).emit('cricket.market.resumed', payload);
    }

    return {
      success: true,
      message: `Market "${market.name}" resumed.`,
      market: updated,
    };
  }

  /**
   * Admin Pricing & Risk Configuration
   */
  async getMarketConfiguration(tenantId?: string) {
    const config = await this.db.marketConfiguration.findFirst({
      where: { tenantId: tenantId || null },
    });

    if (!config) {
      return {
        defaultMargin: 0.04,
        minOdds: 1.01,
        maxOdds: 500.0,
        minStake: 10.0,
        maxStake: 100000.0,
        autoSuspendStaleSec: 60,
        maxLiabilityPerSelection: 500000.0,
        riskAdjustmentEnabled: true,
      };
    }
    return config;
  }

  async updateMarketConfiguration(body: any, adminUserId?: string, tenantId?: string) {
    const existing = await this.db.marketConfiguration.findFirst({
      where: { tenantId: tenantId || null },
    });

    const dataToSave = {
      defaultMargin: body.defaultMargin !== undefined ? new Prisma.Decimal(body.defaultMargin) : undefined,
      minOdds: body.minOdds !== undefined ? new Prisma.Decimal(body.minOdds) : undefined,
      maxOdds: body.maxOdds !== undefined ? new Prisma.Decimal(body.maxOdds) : undefined,
      minStake: body.minStake !== undefined ? new Prisma.Decimal(body.minStake) : undefined,
      maxStake: body.maxStake !== undefined ? new Prisma.Decimal(body.maxStake) : undefined,
      autoSuspendStaleSec: body.autoSuspendStaleSec !== undefined ? Number(body.autoSuspendStaleSec) : undefined,
      maxLiabilityPerSelection: body.maxLiabilityPerSelection !== undefined ? new Prisma.Decimal(body.maxLiabilityPerSelection) : undefined,
      riskAdjustmentEnabled: body.riskAdjustmentEnabled !== undefined ? Boolean(body.riskAdjustmentEnabled) : undefined,
    };

    let updated;
    if (existing) {
      updated = await this.db.marketConfiguration.update({
        where: { id: existing.id },
        data: dataToSave,
      });
    } else {
      updated = await this.db.marketConfiguration.create({
        data: {
          tenantId: tenantId || null,
          ...dataToSave,
        },
      });
    }

    await this.db.marketAuditLog.create({
      data: {
        tenantId: tenantId || null,
        actorId: adminUserId || null,
        actorRole: 'ADMIN',
        entityType: 'CONFIGURATION',
        entityId: updated.id,
        action: 'CONFIG_CHANGE',
        oldValue: existing ? JSON.parse(JSON.stringify(existing)) : null,
        newValue: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }

  /**
   * Admin Debug View: Pipeline calculation breakdown for a market
   */
  async getMarketCalculationDebug(marketId: string) {
    const market = await this.db.cricketMarket.findUnique({
      where: { id: marketId },
      include: {
        match: {
          include: { teamA: true, teamB: true, score: true },
        },
        selections: true,
        overrides: { where: { status: 'ACTIVE' } },
      },
    });

    if (!market) {
      throw new NotFoundException(`Market "${marketId}" not found`);
    }

    const latestState = await this.db.cricketMatchStateSnapshot.findFirst({
      where: { matchId: market.matchId },
      orderBy: { receivedAt: 'desc' },
    });

    const breakdown = market.selections.map((sel: any) => {
      const currentOddsNum = Number(sel.backPrice);
      const prob = Number(sel.fairProbability || (1 / currentOddsNum));
      const fairOdds = Number(sel.fairOdds || (1 / Math.max(0.01, prob)));
      const margin = Number(market.margin || 0.04);
      const exposure = Number(sel.exposure || 0);
      const liability = Number(sel.liability || 0);
      const activeOverride = market.overrides.find((o: any) => o.selectionId === sel.id);

      return {
        selectionId: sel.id,
        selectionName: sel.name,
        matchState: latestState || { runs: 0, wickets: 0, overs: 0, status: market.match.status },
        modelProbability: Math.round(prob * 10000) / 10000,
        fairOdds: Number(fairOdds.toFixed(2)),
        configuredMargin: margin,
        marginAdjustedOdds: Number((1 / (prob * (1 + margin))).toFixed(2)),
        exposure,
        liability,
        riskAdjustment: exposure > 0 ? '-0.02 (high liability)' : '0.00 (balanced)',
        finalDisplayedOdds: currentOddsNum,
        isOverrideActive: !!activeOverride,
        activeOverrideDetail: activeOverride || null,
        pricingVersion: 'v1.0.0',
      };
    });

    return {
      marketId,
      marketName: market.name,
      matchName: `${market.match.teamA?.name} vs ${market.match.teamB?.name}`,
      status: market.status,
      suspendReason: market.suspendReason,
      breakdown,
    };
  }
}
