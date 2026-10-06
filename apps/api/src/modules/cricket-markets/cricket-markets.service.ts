import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException, Inject, forwardRef, Optional } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { SportsGateway } from '../../sports/sports.gateway.js';
import { PricingEngineService } from './pricing/pricing-engine.service.js';
import { OddsHistoryService } from './history/odds-history.service.js';
import { MarketHistoryService } from './history/market-history.service.js';
import { Prisma } from '@gaming-platform/database';
import { getActiveMarkets, ACTIVE_MARKET_STATUSES, INACTIVE_MARKET_STATUSES } from './market-lifecycle.selector.js';

@Injectable()
export class CricketMarketsService implements OnModuleInit {
  private readonly logger = new Logger(CricketMarketsService.name);
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();

  // Global Admin Bet Settings State
  private betSettings = {
    minStake: 10,
    maxStake: 50000,
    maxProfitCap: 200000,
    bookmakerMargin: 4.5,
    autoSettle: true,
    autoRefundVoid: true,
    userCancelWindowSec: 10,
    oddEvenEnabled: true,
    oddEvenDefaultOdds: 1.90,
    maxBetsPerUserPerMatch: 20,
    liveBetDelaySec: 2,
    betNotice: 'Bet responsibly. Odds fluctuate in real time during live sports matches.',
  };

  constructor(
    private readonly db: DatabaseService,
    private readonly pricingEngine: PricingEngineService,
    private readonly oddsHistory: OddsHistoryService,
    private readonly marketHistory: MarketHistoryService,
    @Optional() @Inject(forwardRef(() => SportsGateway))
    private readonly sportsGateway?: SportsGateway
  ) {}

  public getBetSettings() {
    return this.betSettings;
  }

  public async updateBetSettings(newSettings: Partial<typeof this.betSettings>) {
    this.betSettings = {
      ...this.betSettings,
      ...newSettings,
    };

    if (typeof newSettings.oddEvenEnabled === 'boolean' || newSettings.oddEvenDefaultOdds) {
      await this.updateOddEvenSettings({
        enabled: newSettings.oddEvenEnabled,
        defaultOdds: newSettings.oddEvenDefaultOdds,
      });
    }

    return this.betSettings;
  }

  async onModuleInit() {
    try {
      await this.seedDefaultCategories();
    } catch (err: any) {
      this.logger.warn(`Failed seeding default categories: ${err.message}`);
    }
  }

  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  private setToCache(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  public clearCache(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  private async seedDefaultCategories() {
    const categories = [
      { slug: 'all', name: 'All Markets', sortOrder: 1 },
      { slug: 'main', name: 'Main', sortOrder: 2 },
      { slug: 'quick', name: 'Quick', sortOrder: 3 },
      { slug: 'first_innings', name: '1st Innings', sortOrder: 4 },
      { slug: 'overs', name: 'Overs', sortOrder: 5 },
      { slug: 'players', name: 'Players', sortOrder: 6 },
      { slug: 'dismissal', name: 'Dismissal', sortOrder: 7 },
      { slug: 'odd_even', name: 'Odd/Even', sortOrder: 8 },
      { slug: 'session', name: 'Session / Fancy', sortOrder: 9 },
    ];

    for (const cat of categories) {
      await this.db.cricketMarketCategory.upsert({
        where: { slug: cat.slug },
        create: cat,
        update: { name: cat.name, sortOrder: cat.sortOrder },
      });
    }
  }

  async getMarketCategories() {
    const cacheKey = 'markets:categories';
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const res = await this.db.cricketMarketCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    this.setToCache(cacheKey, res, 10000); // 10s TTL
    return res;
  }

  async getMatchMarkets(matchId: string, categorySlug: string = 'all') {
    const cacheKey = `markets:${matchId}:${categorySlug}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    let match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true },
    });

    if (!match) {
      // Lookup by provider mapping
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: matchId },
      });

      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
          include: { teamA: true, teamB: true },
        });
      }
    }

    if (!match) {
      throw new NotFoundException(`Match with ID "${matchId}" not found`);
    }

    // Ensure markets are populated for this match
    let existingCount = await this.db.cricketMarket.count({
      where: { matchId: match.id },
    });

    if (existingCount === 0) {
      await this.generateMarketsForMatch(match);
    }

    const mStatusUpper = (match.status || '').toUpperCase();
    if (mStatusUpper === 'COMPLETED' || mStatusUpper === 'FINISHED') {
      try {
        await this.autoSettleMatchMarkets(match.id);
      } catch (e) {}
    }

    const whereClause: any = {
      matchId: match.id,
      status: { notIn: ['CLOSED', 'SETTLED'] },
    };
    if (categorySlug && categorySlug !== 'all') {
      whereClause.categorySlug = categorySlug;
    }

    const markets = await this.db.cricketMarket.findMany({
      where: whereClause,
      include: {
        selections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const result = {
      matchId: match.id,
      matchName: `${match.teamA?.name} vs ${match.teamB?.name}`,
      dataMode: 'STATISTICAL_MODEL',
      dataModeLabel: 'Statistical Model Odds — Non-Monetary Test Mode',
      exchangeAvailable: false,
      markets,
    };

    this.setToCache(cacheKey, result, 1000); // 1.0s TTL for live market odds
    return result;
  }

  async getActiveMatchMarkets(matchId: string, categorySlug: string = 'all') {
    let match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true, score: true },
    });

    if (!match) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: matchId },
      });
      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
          include: { teamA: true, teamB: true, score: true },
        });
      }
    }

    if (!match) throw new NotFoundException(`Match with ID "${matchId}" not found`);

    // Authoritative Lifecycle execution: Auto-Settle past/completed event markets
    try {
      await this.autoSettleMatchMarkets(match.id);
    } catch (e) {}

    const mStatusUpper = (match.status || '').toUpperCase();
    if (['COMPLETED', 'FINISHED', 'ABANDONED', 'CANCELLED'].includes(mStatusUpper)) {
      return {
        matchId: match.id,
        matchName: `${match.teamA?.name} vs ${match.teamB?.name}`,
        markets: [],
      };
    }

    const whereClause: any = {
      matchId: match.id,
      status: { in: ['OPEN', 'SUSPENDED'] },
    };
    if (categorySlug && categorySlug !== 'all') {
      whereClause.categorySlug = categorySlug;
    }

    const markets = await this.db.cricketMarket.findMany({
      where: whereClause,
      include: {
        selections: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const activeMarkets = getActiveMarkets(markets);

    return {
      matchId: match.id,
      matchName: `${match.teamA?.name} vs ${match.teamB?.name}`,
      markets: activeMarkets,
    };
  }

  async getMatchMarketsHistory(matchId: string, categorySlug: string = 'all') {
    let match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true },
    });

    if (!match) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: matchId },
      });
      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
          include: { teamA: true, teamB: true },
        });
      }
    }

    if (!match) throw new NotFoundException(`Match with ID "${matchId}" not found`);

    const whereClause: any = {
      matchId: match.id,
      status: { in: INACTIVE_MARKET_STATUSES },
    };
    if (categorySlug && categorySlug !== 'all') {
      whereClause.categorySlug = categorySlug;
    }

    const markets = await this.db.cricketMarket.findMany({
      where: whereClause,
      include: {
        selections: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      matchId: match.id,
      matchName: `${match.teamA?.name} vs ${match.teamB?.name}`,
      markets,
    };
  }

  async generateMarketsForMatch(match: any) {
    const teamAName = match.teamA?.name || 'Team A';
    const teamBName = match.teamB?.name || 'Team B';
    const teamAShort = match.teamA?.shortName || teamAName.substring(0, 3).toUpperCase();
    const teamBShort = match.teamB?.shortName || teamBName.substring(0, 3).toUpperCase();
    const matchType = (match.matchType || 'T20').toUpperCase();

    let defaultInningsLine = 175.5;
    let powerplayName = '6 Overs Powerplay Runs';
    let powerplayLine = 48.5;

    if (matchType === 'T10' || matchType === 'TEN10') {
      defaultInningsLine = 105.5;
      powerplayName = '3 Overs Powerplay Runs';
      powerplayLine = 32.5;
    } else if (matchType === 'ODI' || matchType === '50OVER' || matchType === 'LIST_A') {
      defaultInningsLine = 275.5;
      powerplayName = '10 Overs Powerplay Runs';
      powerplayLine = 55.5;
    } else if (matchType === 'TEST' || matchType === 'FIRST_CLASS') {
      defaultInningsLine = 325.5;
      powerplayName = '15 Overs Session Line';
      powerplayLine = 52.5;
    }

    const marketsToCreate = [
      // 1. MAIN MARKETS
      {
        categorySlug: 'main',
        name: 'Match Winner',
        marketType: 'MATCH_WINNER',
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 1,
        selections: [
          { name: teamAName, backPrice: 1.75, layPrice: 1.80, backLiquidity: 5000, layLiquidity: 4500, sortOrder: 1 },
          { name: teamBName, backPrice: 2.15, layPrice: 2.22, backLiquidity: 4200, layLiquidity: 3800, sortOrder: 2 },
        ],
      },
      {
        categorySlug: 'main',
        name: 'Toss Winner',
        marketType: 'TOSS_WINNER',
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 2,
        selections: [
          { name: teamAName, backPrice: 1.90, layPrice: 1.95, backLiquidity: 3000, layLiquidity: 3000, sortOrder: 1 },
          { name: teamBName, backPrice: 1.90, layPrice: 1.95, backLiquidity: 3000, layLiquidity: 3000, sortOrder: 2 },
        ],
      },

      // 2. QUICK MARKETS
      {
        categorySlug: 'quick',
        name: 'First Boundary of Match',
        marketType: 'QUICK',
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 3,
        selections: [
          { name: `${teamAShort} - Four`, backPrice: 1.65, sortOrder: 1 },
          { name: `${teamAShort} - Six`, backPrice: 3.50, sortOrder: 2 },
          { name: `${teamBShort} - Four`, backPrice: 1.80, sortOrder: 3 },
          { name: `${teamBShort} - Six`, backPrice: 3.80, sortOrder: 4 },
        ],
      },

      // 3. FIRST INNINGS TOTAL RUNS (Format-Specific)
      {
        categorySlug: 'first_innings',
        name: '1st Innings Total Runs',
        marketType: 'TOTAL_RUNS',
        lineThreshold: defaultInningsLine,
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 4,
        selections: [
          { name: `Over ${defaultInningsLine} Runs`, backPrice: 1.85, sortOrder: 1 },
          { name: `Under ${defaultInningsLine} Runs`, backPrice: 1.85, sortOrder: 2 },
        ],
      },

      // 4. OVERS & SESSION MARKETS (Format-Specific)
      {
        categorySlug: 'overs',
        name: '1st Over Total Runs',
        marketType: 'OVER_RUNS',
        lineThreshold: 6.5,
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 5,
        selections: [
          { name: 'Over 6.5 Runs', backPrice: 1.90, sortOrder: 1 },
          { name: 'Under 6.5 Runs', backPrice: 1.90, sortOrder: 2 },
        ],
      },
      {
        categorySlug: 'overs',
        name: powerplayName,
        marketType: 'OVER_RUNS',
        lineThreshold: powerplayLine,
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 6,
        selections: [
          { name: `Over ${powerplayLine} Runs`, backPrice: 1.82, sortOrder: 1 },
          { name: `Under ${powerplayLine} Runs`, backPrice: 1.88, sortOrder: 2 },
        ],
      },

      // 5. PLAYER MARKETS
      {
        categorySlug: 'players',
        name: `${teamAName} Top Batter Total Runs`,
        marketType: 'PLAYER_RUNS',
        lineThreshold: 28.5,
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 7,
        selections: [
          { name: 'Over 28.5 Runs', backPrice: 1.83, sortOrder: 1 },
          { name: 'Under 28.5 Runs', backPrice: 1.83, sortOrder: 2 },
        ],
      },

      // 6. DISMISSAL MARKETS
      {
        categorySlug: 'dismissal',
        name: '1st Wicket Method of Dismissal',
        marketType: 'DISMISSAL_METHOD',
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 8,
        selections: [
          { name: 'Caught', backPrice: 1.55, sortOrder: 1 },
          { name: 'Bowled', backPrice: 3.40, sortOrder: 2 },
          { name: 'LBW', backPrice: 4.20, sortOrder: 3 },
          { name: 'Run Out / Stumped', backPrice: 8.50, sortOrder: 4 },
        ],
      },

      // 7. ODD / EVEN MARKETS (Distinct Odd & Even Selection Outcomes)
      {
        categorySlug: 'odd_even',
        name: 'Match Total Runs (Odd/Even)',
        marketType: 'ODD_EVEN',
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 9,
        selections: [
          { name: 'Odd', backPrice: 1.90, sortOrder: 1 },
          { name: 'Even', backPrice: 1.90, sortOrder: 2 },
        ],
      },
      {
        categorySlug: 'odd_even',
        name: `${teamAName} Total Runs (Odd/Even)`,
        marketType: 'ODD_EVEN',
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 10,
        selections: [
          { name: 'Odd', backPrice: 1.90, sortOrder: 1 },
          { name: 'Even', backPrice: 1.90, sortOrder: 2 },
        ],
      },

      // 8. SESSION / FANCY MARKETS
      {
        categorySlug: 'session',
        name: '6 Overs Session Line',
        marketType: 'SESSION_FANCY',
        lineThreshold: 48.5,
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 11,
        selections: [
          { name: 'Yes (Over 48.5)', backPrice: 1.85, sortOrder: 1 },
          { name: 'No (Under 48.5)', backPrice: 1.85, sortOrder: 2 },
        ],
      },
    ];

    for (const mData of marketsToCreate) {
      const createdMarket = await this.db.cricketMarket.create({
        data: {
          matchId: match.id,
          categorySlug: mData.categorySlug,
          name: mData.name,
          marketType: mData.marketType,
          status: mData.status,
          sourceType: mData.sourceType,
          lineThreshold: mData.lineThreshold || undefined,
          sortOrder: mData.sortOrder,
        },
      });

      for (const sel of mData.selections as any[]) {
        await this.db.cricketMarketSelection.create({
          data: {
            marketId: createdMarket.id,
            name: sel.name,
            backPrice: sel.backPrice,
            layPrice: sel.layPrice || undefined,
            backLiquidity: sel.backLiquidity || undefined,
            layLiquidity: sel.layLiquidity || undefined,
            sortOrder: sel.sortOrder,
          },
        });
      }
    }

    // Immediately calculate dynamic model pricing for all generated markets
    try {
      await this.pricingEngine.recalculateMatchMarkets(match.id);
    } catch (err: any) {
      this.logger.error(`Error initial recalculating markets for match ${match.id}: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────
  // TEST BET SLIP & PLACEMENT (Non-monetary Test Credits)
  // ─────────────────────────────────────────────

  async placeTestBet(body: {
    matchId: string;
    selections: {
      marketId: string;
      selectionId: string;
      odds: number;
      stake: number;
    }[];
    userId?: string;
  }) {
    if (!body.selections || body.selections.length === 0) {
      throw new BadRequestException('At least one selection is required');
    }

    // Verify match status first
    let matchObj = await this.db.match.findUnique({ where: { id: body.matchId } });
    if (!matchObj) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: body.matchId },
      });
      if (mapping) {
        matchObj = await this.db.match.findUnique({ where: { id: mapping.internalEntityId } });
      }
    }

    if (matchObj) {
      const mStatus = (matchObj.status || '').toUpperCase();
      if (['COMPLETED', 'FINISHED', 'ABANDONED', 'CANCELLED'].includes(mStatus)) {
        throw new BadRequestException({
          code: 'MATCH_COMPLETED',
          message: 'Match completed — betting markets are closed.',
        });
      }
    }

    let totalStake = 0;
    let totalPotentialReturn = 0;
    const validatedSelections: any[] = [];

    for (const item of body.selections) {
      if (!item.stake || item.stake <= 0) {
        throw new BadRequestException('Stake must be greater than 0');
      }

      const market = await this.db.cricketMarket.findUnique({
        where: { id: item.marketId },
      });
      if (!market) {
        throw new BadRequestException({
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found.',
        });
      }

      const mStatus = (market.status || '').toUpperCase();
      if (mStatus !== 'OPEN') {
        throw new BadRequestException({
          code: 'MARKET_CLOSED',
          message: `This market is no longer available (Status: ${mStatus}).`,
        });
      }

      if (market.expiresAt && new Date() >= new Date(market.expiresAt)) {
        await this.db.cricketMarket.update({
          where: { id: market.id },
          data: { status: 'EXPIRED' },
        });
        throw new BadRequestException({
          code: 'MARKET_EXPIRED',
          message: `Market "${market.name}" has expired.`,
        });
      }

      const selection = await this.db.cricketMarketSelection.findUnique({
        where: { id: item.selectionId },
      });
      if (!selection || selection.status !== 'ACTIVE') {
        throw new BadRequestException({
          code: 'SELECTION_INACTIVE',
          message: `Selection "${selection?.name || item.selectionId}" is currently unavailable.`,
        });
      }

      const currentOdds = Number(selection.backPrice);
      const stakeNum = Number(item.stake);
      const itemReturn = stakeNum * currentOdds;

      totalStake += stakeNum;
      totalPotentialReturn += itemReturn;

      validatedSelections.push({
        marketId: market.id,
        selectionId: selection.id,
        marketName: market.name,
        selectionName: selection.name,
        oddsAtPlacement: currentOdds,
        stake: stakeNum,
        status: 'OPEN',
      });
    }

    // Enforce Admin Bet Settings Limits
    if (totalStake < this.betSettings.minStake) {
      throw new BadRequestException(`Minimum stake required per bet is ₹${this.betSettings.minStake}`);
    }
    if (totalStake > this.betSettings.maxStake) {
      throw new BadRequestException(`Maximum stake limit per bet is ₹${this.betSettings.maxStake.toLocaleString()}`);
    }

    // REAL WALLET BALANCE DEDUCTION
    const targetUserId = body.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId)
      ? body.userId
      : '00000000-0000-0000-0000-000000000000';

    let wallet = await this.db.wallet.findUnique({
      where: { userId: targetUserId },
    });

    if (wallet) {
      const currentBalance = Number(wallet.mainBalance);
      if (currentBalance < totalStake) {
        throw new BadRequestException(`Insufficient wallet balance (₹${currentBalance.toFixed(2)}). Stake required: ₹${totalStake.toFixed(2)}`);
      }

      // Deduct balance from user wallet
      wallet = await this.db.wallet.update({
        where: { id: wallet.id },
        data: {
          mainBalance: { decrement: totalStake },
        },
      });

      // Record transaction
      try {
        await this.db.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'GAME_DEBIT',
            amount: totalStake,
            balanceBefore: currentBalance,
            balanceAfter: Number(wallet.mainBalance),
            referenceType: 'BET_PLACEMENT',
            referenceId: body.matchId,
            metadata: { description: `Sports bet placed on match ${body.matchId}` },
          },
        });
      } catch (txErr) {
        // Continue if transaction logging fails
      }
    }

    // Resolve canonical matchId (internal UUID) if body.matchId is a provider match ID
    let canonicalMatchId = body.matchId;
    let targetMatch = await this.db.match.findUnique({
      where: { id: body.matchId },
    });
    if (!targetMatch) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: body.matchId },
      });
      if (mapping) {
        canonicalMatchId = mapping.internalEntityId;
        targetMatch = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
        });
      }
    }

    const totalProfit = totalPotentialReturn - totalStake;
    const betReference = `BET-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const testBet = await this.db.testBet.create({
      data: {
        betReference,
        userId: targetUserId,
        matchId: canonicalMatchId,
        totalStake,
        potentialReturn: totalPotentialReturn,
        potentialProfit: totalProfit,
        status: 'OPEN',
        isTestMode: false,
        selections: {
          create: validatedSelections,
        },
      },
      include: {
        selections: true,
        match: {
          include: { teamA: true, teamB: true },
        },
      },
    });

    return {
      success: true,
      message: 'Bet placed successfully! Wallet balance updated.',
      betReference: testBet.betReference,
      newBalance: wallet ? Number(wallet.mainBalance) : undefined,
      testBet,
    };
  }

  async getTestBetHistory(userId?: string) {
    const whereClause: any = {};
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      whereClause.OR = [
        { userId },
        { userId: '00000000-0000-0000-0000-000000000000' },
      ];
    }

    const bets = await this.db.testBet.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        selections: true,
        match: {
          include: { teamA: true, teamB: true },
        },
        settlements: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const matchIds = Array.from(new Set(bets.map((b: any) => b.matchId)));
    const mappings = await this.db.providerEntityMapping.findMany({
      where: { entityType: 'MATCH', internalEntityId: { in: matchIds } },
    });
    const mappingMap = new Map(mappings.map((m: any) => [m.internalEntityId, m.providerEntityId]));

    // Auto-settle any OPEN bets on completed matches
    let shouldRefetch = false;
    for (const b of bets) {
      if (b.status === 'OPEN' && b.match) {
        const mStatus = (b.match.status || '').toUpperCase();
        if (mStatus === 'COMPLETED' || mStatus === 'FINISHED') {
          try {
            await this.autoSettleMatchMarkets(b.matchId);
            shouldRefetch = true;
          } catch (e) {}
        }
      }
    }

    if (shouldRefetch) {
      const freshBets = await this.db.testBet.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          selections: true,
          match: {
            include: { teamA: true, teamB: true },
          },
          settlements: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return freshBets.map((b: any) => ({
        ...b,
        providerMatchId: mappingMap.get(b.matchId) || null,
      }));
    }

    return bets.map((b: any) => ({
      ...b,
      providerMatchId: mappingMap.get(b.matchId) || null,
    }));
  }

  // ─────────────────────────────────────────────
  // ADMIN CONTROL METHODS FOR SPORTS BETS & MARKETS
  // ─────────────────────────────────────────────

  async getAdminTestBets(query: { search?: string; status?: string; userId?: string }) {
    const whereClause: any = {};
    if (query.status && query.status !== 'ALL') {
      whereClause.status = query.status;
    }
    if (query.userId) {
      whereClause.userId = query.userId;
    }
    if (query.search && query.search.trim()) {
      const searchLower = query.search.trim().toLowerCase();
      whereClause.OR = [
        { betReference: { contains: searchLower, mode: 'insensitive' } },
        { user: { email: { contains: searchLower, mode: 'insensitive' } } },
        { user: { name: { contains: searchLower, mode: 'insensitive' } } },
        { user: { phone: { contains: searchLower, mode: 'insensitive' } } },
        { selections: { some: { selectionName: { contains: searchLower, mode: 'insensitive' } } } },
        { selections: { some: { marketName: { contains: searchLower, mode: 'insensitive' } } } },
      ];
    }

    const bets = await this.db.testBet.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        selections: true,
        match: {
          include: { teamA: true, teamB: true },
        },
        settlements: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const matchIds = Array.from(new Set(bets.map((b: any) => b.matchId)));
    const mappings = await this.db.providerEntityMapping.findMany({
      where: { entityType: 'MATCH', internalEntityId: { in: matchIds } },
    });
    const mappingMap = new Map(mappings.map((m: any) => [m.internalEntityId, m.providerEntityId]));

    return bets.map((b: any) => ({
      ...b,
      providerMatchId: mappingMap.get(b.matchId) || null,
    }));
  }

  async settleTestBet(betId: string, status: string, summary?: string) {
    const validStatuses = ['WON', 'LOST', 'VOID', 'CANCELLED'];
    const newStatus = status.toUpperCase();
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}`);
    }

    const testBet = await this.db.testBet.findUnique({
      where: { id: betId },
      include: { selections: true },
    });

    if (!testBet) {
      throw new NotFoundException(`Test bet with ID "${betId}" not found`);
    }

    const previousStatus = testBet.status;

    const updatedBet = await this.db.testBet.update({
      where: { id: betId },
      data: {
        status: newStatus,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        selections: true,
        match: { include: { teamA: true, teamB: true } },
        settlements: true,
      },
    });

    // AUTO-ADD WINNINGS / VOID REFUND TO REAL USER WALLET
    const userId = testBet.userId;
    let payoutAmount = 0;

    if (newStatus === 'WON') {
      payoutAmount = Number(testBet.potentialReturn);
    } else if (newStatus === 'VOID' || newStatus === 'CANCELLED') {
      payoutAmount = Number(testBet.totalStake);
    }

    if (userId && previousStatus !== newStatus && payoutAmount > 0) {
      let wallet = await this.db.wallet.findUnique({ where: { userId } });
      if (wallet) {
        const balanceBefore = Number(wallet.mainBalance);
        wallet = await this.db.wallet.update({
          where: { id: wallet.id },
          data: {
            mainBalance: { increment: payoutAmount },
          },
        });

        // Record wallet transaction log
        try {
          await this.db.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: newStatus === 'WON' ? 'GAME_CREDIT' : 'REFUND',
              amount: payoutAmount,
              balanceBefore,
              balanceAfter: Number(wallet.mainBalance),
              referenceType: 'BET_SETTLEMENT',
              referenceId: testBet.id,
              metadata: {
                betReference: testBet.betReference,
                status: newStatus,
                description: newStatus === 'WON'
                  ? `Sports bet payout won - Ref: ${testBet.betReference}`
                  : `Refund for ${newStatus.toLowerCase()} sports bet - Ref: ${testBet.betReference}`,
              },
            },
          });
        } catch (txErr) {
          this.logger.warn(`Failed writing wallet transaction log: ${txErr}`);
        }

        // Broadcast real-time balance update over WebSockets
        try {
          if (this.sportsGateway?.server) {
            this.sportsGateway.server.to(`user:${userId}`).emit('wallet:update', {
              mainBalance: Number(wallet.mainBalance),
              userId,
            });
          }
        } catch (wsErr) {}
      }
    }

    // Create settlement log
    await this.db.testBetSettlement.create({
      data: {
        testBetId: testBet.id,
        resultSource: 'ADMIN_MANUAL_SETTLEMENT',
        settledBy: 'ADMIN',
        settlementSummary: summary || `Bet settled as ${newStatus} by Admin`,
        payoutAmount,
      },
    });

    return updatedBet;
  }

  async updateMarketCategory(id: string, updates: { isActive?: boolean; sortOrder?: number; name?: string }) {
    return await this.db.cricketMarketCategory.update({
      where: { id },
      data: updates,
    });
  }

  async getOddEvenSettings() {
    const category = await this.db.cricketMarketCategory.findUnique({
      where: { slug: 'odd_even' },
    });

    const oddEvenMarkets = await this.db.cricketMarket.findMany({
      where: { categorySlug: 'odd_even' },
      include: { selections: true },
      take: 20,
    });

    return {
      enabled: category?.isActive ?? true,
      category,
      defaultOdds: 1.90,
      activeMarketCount: oddEvenMarkets.length,
      sampleMarkets: oddEvenMarkets,
    };
  }

  async updateOddEvenSettings(body: { enabled?: boolean; defaultOdds?: number }) {
    if (typeof body.enabled === 'boolean') {
      await this.db.cricketMarketCategory.update({
        where: { slug: 'odd_even' },
        data: { isActive: body.enabled },
      });
    }

    if (body.defaultOdds && body.defaultOdds > 1.0) {
      // Update selections across odd_even markets
      const oddEvenMarkets = await this.db.cricketMarket.findMany({
        where: { categorySlug: 'odd_even' },
        select: { id: true },
      });

      const marketIds = oddEvenMarkets.map((m: { id: string }) => m.id);
      if (marketIds.length > 0) {
        await this.db.cricketMarketSelection.updateMany({
          where: { marketId: { in: marketIds } },
          data: { backPrice: body.defaultOdds },
        });
      }
    }

    return await this.getOddEvenSettings();
  }

  async createCustomMarket(body: {
    matchId: string;
    categorySlug: string;
    name: string;
    marketType: string;
    lineThreshold?: number;
    selections: { name: string; backPrice: number; layPrice?: number }[];
  }) {
    let match = await this.db.match.findUnique({
      where: { id: body.matchId },
    });

    if (!match) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: body.matchId },
      });
      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
        });
      }
    }

    if (!match) {
      throw new NotFoundException(`Match with ID "${body.matchId}" not found`);
    }

    const createdMarket = await this.db.cricketMarket.create({
      data: {
        matchId: match.id,
        categorySlug: body.categorySlug || 'session',
        name: body.name,
        marketType: body.marketType || 'SESSION_FANCY',
        status: 'OPEN',
        sourceType: 'ADMIN_CUSTOM',
        lineThreshold: body.lineThreshold || undefined,
        sortOrder: 0,
      },
    });

    for (let i = 0; i < (body.selections || []).length; i++) {
      const sel = body.selections[i];
      await this.db.cricketMarketSelection.create({
        data: {
          marketId: createdMarket.id,
          name: sel.name,
          backPrice: sel.backPrice || 1.90,
          layPrice: sel.layPrice || undefined,
          sortOrder: i + 1,
        },
      });
    }

    this.clearCache();

    return await this.db.cricketMarket.findUnique({
      where: { id: createdMarket.id },
      include: { selections: true },
    });
  }

  async deleteMarket(marketId: string) {
    const deleted = await this.db.cricketMarket.delete({
      where: { id: marketId },
    });
    this.clearCache();
    return deleted;
  }

  async getMatchOddsConfig(matchId: string) {
    let match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true, score: true },
    });

    if (!match) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: matchId },
      });
      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
          include: { teamA: true, teamB: true, score: true },
        });
      }
    }

    if (!match) throw new NotFoundException('Match not found');

    const winnerMarket = await this.db.cricketMarket.findFirst({
      where: { matchId: match.id, marketType: 'MATCH_WINNER' },
      include: { selections: { orderBy: { sortOrder: 'asc' } } },
    });

    const isManual = winnerMarket?.sourceType === 'ADMIN_OVERRIDE';
    let oddsA = 1.75;
    let oddsB = 2.15;
    let winProbA = 57;
    let winProbB = 43;

    if (winnerMarket && winnerMarket.selections.length >= 2) {
      oddsA = Number(winnerMarket.selections[0].backPrice) || 1.75;
      oddsB = Number(winnerMarket.selections[1].backPrice) || 2.15;
      winProbA = Math.round(100 / oddsA);
      winProbB = Math.round(100 / oddsB);
    } else {
      const auto = calculateMatchWinProbabilityAndOdds(match);
      winProbA = auto.winProbA;
      winProbB = auto.winProbB;
      oddsA = auto.oddsA;
      oddsB = auto.oddsB;
    }

    return {
      matchId: match.id,
      teamA: match.teamA?.name || 'Team A',
      teamB: match.teamB?.name || 'Team B',
      mode: isManual ? 'MANUAL' : 'AUTO',
      winProbA,
      winProbB,
      oddsA,
      oddsB,
    };
  }

  async updateMatchOddsConfig(matchId: string, body: { mode?: 'AUTO' | 'MANUAL'; winProbA?: number; winProbB?: number; oddsA?: number; oddsB?: number }) {
    let match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true, score: true },
    });

    if (!match) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: matchId },
      });
      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
          include: { teamA: true, teamB: true, score: true },
        });
      }
    }

    if (!match) throw new NotFoundException('Match not found');

    let winnerMarket = await this.db.cricketMarket.findFirst({
      where: { matchId: match.id, marketType: 'MATCH_WINNER' },
      include: { selections: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!winnerMarket) {
      await this.generateMarketsForMatch(match);
      winnerMarket = await this.db.cricketMarket.findFirst({
        where: { matchId: match.id, marketType: 'MATCH_WINNER' },
        include: { selections: { orderBy: { sortOrder: 'asc' } } },
      });
    }

    const mode = body.mode || 'MANUAL';
    let oddsA = body.oddsA;
    let oddsB = body.oddsB;
    let winProbA = body.winProbA;
    let winProbB = body.winProbB;

    if (mode === 'AUTO') {
      const auto = calculateMatchWinProbabilityAndOdds(match);
      winProbA = auto.winProbA;
      winProbB = auto.winProbB;
      oddsA = auto.oddsA;
      oddsB = auto.oddsB;
    } else {
      if (winProbA && !winProbB) winProbB = 100 - winProbA;
      if (winProbB && !winProbA) winProbA = 100 - winProbB;
      if (!winProbA) winProbA = 50;
      if (!winProbB) winProbB = 50;

      if (!oddsA) oddsA = Number((100 / winProbA).toFixed(2));
      if (!oddsB) oddsB = Number((100 / winProbB).toFixed(2));
    }

    if (winnerMarket) {
      await this.db.cricketMarket.update({
        where: { id: winnerMarket.id },
        data: { sourceType: mode === 'MANUAL' ? 'ADMIN_OVERRIDE' : 'STATISTICAL_MODEL' },
      });

      if (winnerMarket.selections[0]) {
        await this.db.cricketMarketSelection.update({
          where: { id: winnerMarket.selections[0].id },
          data: { backPrice: oddsA },
        });
      }
      if (winnerMarket.selections[1]) {
        await this.db.cricketMarketSelection.update({
          where: { id: winnerMarket.selections[1].id },
          data: { backPrice: oddsB },
        });
      }
    }

    this.clearCache();
    return {
      matchId: match.id,
      mode,
      winProbA,
      winProbB,
      oddsA,
      oddsB,
    };
  }

  async getMatchAnalytics(matchId: string) {
    let match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true, score: true, competition: true },
    });

    if (!match) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: matchId },
      });
      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
          include: { teamA: true, teamB: true, score: true, competition: true },
        });
      }
    }

    if (!match) throw new NotFoundException('Match not found');

    const bets = await this.db.testBet.findMany({
      where: { matchId: match.id },
      include: { selections: true },
    });

    let totalBetsCount = bets.length;
    let totalStake = 0;
    let totalPayout = 0;
    let openBetsCount = 0;
    let wonBetsCount = 0;
    let lostBetsCount = 0;
    let voidBetsCount = 0;

    const marketTypeStats: { [key: string]: { name: string; count: number; stake: number; payout: number } } = {};

    for (const b of bets) {
      const stake = Number(b.totalStake) || 0;
      totalStake += stake;

      if (b.status === 'WON') {
        wonBetsCount++;
        const payout = Number(b.potentialReturn) || 0;
        totalPayout += payout;
      } else if (b.status === 'LOST') {
        lostBetsCount++;
      } else if (b.status === 'OPEN') {
        openBetsCount++;
      } else if (b.status === 'VOID' || b.status === 'CANCELLED') {
        voidBetsCount++;
        totalPayout += stake;
      }

      const marketName = b.marketName || 'Match Winner';
      if (!marketTypeStats[marketName]) {
        marketTypeStats[marketName] = { name: marketName, count: 0, stake: 0, payout: 0 };
      }
      marketTypeStats[marketName].count++;
      marketTypeStats[marketName].stake += stake;
      if (b.status === 'WON') {
        marketTypeStats[marketName].payout += Number(b.potentialReturn) || 0;
      }
    }

    const netRevenue = totalStake - totalPayout;
    const houseMarginPercent = totalStake > 0 ? Number(((netRevenue / totalStake) * 100).toFixed(2)) : 0;

    const matchMarkets = await this.db.cricketMarket.findMany({
      where: { matchId: match.id },
      include: { selections: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const oddEvenMarket = matchMarkets.find((m: any) => m.categorySlug === 'odd_even' || m.marketType === 'ODD_EVEN');
    const oddEvenRate = oddEvenMarket?.selections?.[0]?.backPrice
      ? Number(oddEvenMarket.selections[0].backPrice)
      : this.betSettings.oddEvenDefaultOdds || 1.90;
    const oddEvenEnabled = oddEvenMarket ? oddEvenMarket.status === 'OPEN' : this.betSettings.oddEvenEnabled;

    return {
      match: {
        id: match.id,
        teamA: match.teamA?.name || 'Team A',
        teamB: match.teamB?.name || 'Team B',
        competition: match.competition?.name || 'Cricket Series',
        matchType: match.matchType || 'T20',
        status: match.status,
        venue: match.venue || 'Stadium',
        startTime: match.startTime,
      },
      revenueSummary: {
        totalBetsCount,
        totalStake,
        totalPayout,
        netRevenue,
        houseMarginPercent,
        openBetsCount,
        wonBetsCount,
        lostBetsCount,
        voidBetsCount,
      },
      oddEvenConfig: {
        enabled: oddEvenEnabled,
        rate: oddEvenRate,
        marketId: oddEvenMarket?.id,
      },
      marketBreakdown: Object.values(marketTypeStats),
      matchMarkets,
    };
  }

  async updateMatchOddEven(matchId: string, body: { enabled?: boolean; rate?: number }) {
    let match = await this.db.match.findUnique({ where: { id: matchId } });
    if (!match) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: matchId },
      });
      if (mapping) {
        match = await this.db.match.findUnique({ where: { id: mapping.internalEntityId } });
      }
    }
    if (!match) throw new NotFoundException('Match not found');

    let oddEvenMarket = await this.db.cricketMarket.findFirst({
      where: { matchId: match.id, categorySlug: 'odd_even' },
      include: { selections: true },
    });

    const isEnabled = typeof body.enabled === 'boolean' ? body.enabled : true;
    const newRate = body.rate ? Number(body.rate) : 1.90;

    if (!oddEvenMarket) {
      oddEvenMarket = await this.db.cricketMarket.create({
        data: {
          matchId: match.id,
          categorySlug: 'odd_even',
          name: 'Match Total Runs Odd or Even',
          marketType: 'ODD_EVEN',
          status: isEnabled ? 'OPEN' : 'SUSPENDED',
          sourceType: 'ADMIN_CUSTOM',
        },
      });

      await this.db.cricketMarketSelection.create({
        data: { marketId: oddEvenMarket.id, name: 'Odd Runs', backPrice: newRate, sortOrder: 1 },
      });
      await this.db.cricketMarketSelection.create({
        data: { marketId: oddEvenMarket.id, name: 'Even Runs', backPrice: newRate, sortOrder: 2 },
      });
    } else {
      await this.db.cricketMarket.update({
        where: { id: oddEvenMarket.id },
        data: { status: isEnabled ? 'OPEN' : 'SUSPENDED' },
      });

      if (body.rate) {
        await this.db.cricketMarketSelection.updateMany({
          where: { marketId: oddEvenMarket.id },
          data: { backPrice: newRate },
        });
      }
    }

    this.clearCache();
    return await this.getMatchAnalytics(match.id);
  }

  async autoGenerateMatchQuestions(matchId: string) {
    let match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true, score: true, competition: true },
    });

    if (!match) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: matchId },
      });
      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
          include: { teamA: true, teamB: true, score: true, competition: true },
        });
      }
    }

    if (!match) throw new NotFoundException('Match not found');

    const teamA = match.teamA?.name || 'Team A';
    const teamB = match.teamB?.name || 'Team B';

    const templates = [
      {
        name: `${teamA} vs ${teamB} Match Winner`,
        categorySlug: 'main',
        marketType: 'MATCH_WINNER',
        selections: [
          { name: teamA, backPrice: 1.85, sortOrder: 1 },
          { name: teamB, backPrice: 1.95, sortOrder: 2 },
        ],
      },
      {
        name: `Official Toss Winner (${teamA} vs ${teamB})`,
        categorySlug: 'main',
        marketType: 'TOSS_WINNER',
        selections: [
          { name: teamA, backPrice: 1.90, sortOrder: 1 },
          { name: teamB, backPrice: 1.90, sortOrder: 2 },
        ],
      },
      {
        name: `6 Overs Session Line (${teamA})`,
        categorySlug: 'session',
        marketType: 'SESSION_FANCY',
        lineThreshold: 48.5,
        selections: [
          { name: `Yes (Over 48.5 Runs)`, backPrice: 1.85, sortOrder: 1 },
          { name: `No (Under 48.5 Runs)`, backPrice: 1.85, sortOrder: 2 },
        ],
      },
      {
        name: `6 Overs Session Line (${teamB})`,
        categorySlug: 'session',
        marketType: 'SESSION_FANCY',
        lineThreshold: 46.5,
        selections: [
          { name: `Yes (Over 46.5 Runs)`, backPrice: 1.85, sortOrder: 1 },
          { name: `No (Under 46.5 Runs)`, backPrice: 1.85, sortOrder: 2 },
        ],
      },
      {
        name: `1st Innings Total Team Runs (${teamA})`,
        categorySlug: 'first_innings',
        marketType: 'SESSION_FANCY',
        lineThreshold: 175.5,
        selections: [
          { name: `Over 175.5 Runs`, backPrice: 1.85, sortOrder: 1 },
          { name: `Under 175.5 Runs`, backPrice: 1.85, sortOrder: 2 },
        ],
      },
      {
        name: `1st Innings Total Team Runs (${teamB})`,
        categorySlug: 'first_innings',
        marketType: 'SESSION_FANCY',
        lineThreshold: 168.5,
        selections: [
          { name: `Over 168.5 Runs`, backPrice: 1.85, sortOrder: 1 },
          { name: `Under 168.5 Runs`, backPrice: 1.85, sortOrder: 2 },
        ],
      },
      {
        name: `${teamA} Total Team Runs (Odd/Even)`,
        categorySlug: 'odd_even',
        marketType: 'ODD_EVEN',
        selections: [
          { name: 'Odd Runs', backPrice: 1.90, sortOrder: 1 },
          { name: 'Even Runs', backPrice: 1.90, sortOrder: 2 },
        ],
      },
      {
        name: `${teamB} Total Team Runs (Odd/Even)`,
        categorySlug: 'odd_even',
        marketType: 'ODD_EVEN',
        selections: [
          { name: 'Odd Runs', backPrice: 1.90, sortOrder: 1 },
          { name: 'Even Runs', backPrice: 1.90, sortOrder: 2 },
        ],
      },
      {
        name: `1st Wicket Method of Dismissal (${teamA})`,
        categorySlug: 'dismissal',
        marketType: 'DISMISSAL_METHOD',
        selections: [
          { name: 'Caught', backPrice: 1.55, sortOrder: 1 },
          { name: 'Bowled', backPrice: 3.40, sortOrder: 2 },
          { name: 'LBW', backPrice: 4.20, sortOrder: 3 },
          { name: 'Run Out / Stumped', backPrice: 8.50, sortOrder: 4 },
        ],
      },
      {
        name: `Top Batter Total Individual Runs (${teamA})`,
        categorySlug: 'players',
        marketType: 'PLAYER_RUNS',
        lineThreshold: 38.5,
        selections: [
          { name: `Over 38.5 Runs`, backPrice: 1.83, sortOrder: 1 },
          { name: `Under 38.5 Runs`, backPrice: 1.83, sortOrder: 2 },
        ],
      },
      {
        name: `Top Batter Total Individual Runs (${teamB})`,
        categorySlug: 'players',
        marketType: 'PLAYER_RUNS',
        lineThreshold: 35.5,
        selections: [
          { name: `Over 35.5 Runs`, backPrice: 1.83, sortOrder: 1 },
          { name: `Under 35.5 Runs`, backPrice: 1.83, sortOrder: 2 },
        ],
      },
      {
        name: `First Boundary of Match (${teamA} vs ${teamB})`,
        categorySlug: 'quick',
        marketType: 'QUICK_FANCY',
        selections: [
          { name: `${teamA} Four`, backPrice: 1.65, sortOrder: 1 },
          { name: `${teamA} Six`, backPrice: 3.50, sortOrder: 2 },
          { name: `${teamB} Four`, backPrice: 1.80, sortOrder: 3 },
          { name: `${teamB} Six`, backPrice: 3.80, sortOrder: 4 },
        ],
      },
    ];

    for (const tmpl of templates) {
      const existing = await this.db.cricketMarket.findFirst({
        where: { matchId: match.id, name: tmpl.name },
      });

      if (!existing) {
        const created = await this.db.cricketMarket.create({
          data: {
            matchId: match.id,
            categorySlug: tmpl.categorySlug,
            name: tmpl.name,
            marketType: tmpl.marketType,
            status: 'OPEN',
            sourceType: 'ADMIN_CUSTOM',
            lineThreshold: tmpl.lineThreshold || undefined,
            sortOrder: 0,
          },
        });

        for (const sel of tmpl.selections) {
          await this.db.cricketMarketSelection.create({
            data: {
              marketId: created.id,
              name: sel.name,
              backPrice: sel.backPrice,
              sortOrder: sel.sortOrder,
            },
          });
        }
      }
    }

    this.clearCache();
    return await this.getMatchAnalytics(match.id);
  }

  async autoSettleMatchMarkets(matchId: string, currentScore?: any, suppressBroadcast: boolean = false) {
    let match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true, score: true, competition: true },
    });

    if (!match) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: matchId },
      });
      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
          include: { teamA: true, teamB: true, score: true, competition: true },
        });
      }
    }

    if (!match) return { settledCount: 0, lockedCount: 0, settledMarkets: [] };

    const score = currentScore || match.score;

    const parseOversAndRuns = (scoreStr?: string, oversStr?: string) => {
      if (!scoreStr) return { runs: 0, wickets: 0, overs: 0 };
      const parts = (scoreStr || '0').split('/');
      const runs = parseInt(parts[0] || '0', 10) || 0;
      const wickets = parseInt(parts[1] || '0', 10) || 0;
      const overs = parseFloat(oversStr || '0') || 0;
      return { runs, wickets, overs };
    };

    const teamAData = parseOversAndRuns(score?.teamAScore, score?.teamAOvers);
    const teamBData = parseOversAndRuns(score?.teamBScore, score?.teamBOvers);

    const teamAName = match.teamA?.name || 'Team A';
    const teamBName = match.teamB?.name || 'Team B';
    const teamAShort = match.teamA?.shortName || teamAName.substring(0, 3).toUpperCase();
    const teamBShort = match.teamB?.shortName || teamBName.substring(0, 3).toUpperCase();

    const matchStatusUpper = (match.status || '').toUpperCase();
    const scoreStatusUpper = (score?.statusText || match.resultSummary || '').toUpperCase();
    const isMatchCompleted =
      matchStatusUpper === 'COMPLETED' ||
      matchStatusUpper === 'FINISHED' ||
      scoreStatusUpper.includes('WON') ||
      scoreStatusUpper.includes('COMPLETED') ||
      scoreStatusUpper.includes('RESULT');

    const openMarkets = await this.db.cricketMarket.findMany({
      where: {
        matchId: match.id,
        status: { in: ['OPEN', 'SUSPENDED', 'LOCKED'] },
      },
      include: { selections: true },
    });

    let settledCount = 0;
    let lockedCount = 0;
    const settledMarkets: any[] = [];

    // Determine Dynamic Match Winner if match is completed
    let matchWinnerName: string | null = null;
    if (isMatchCompleted || (teamAData.wickets >= 10 && teamBData.wickets >= 10) || (teamAData.runs > 0 && teamBData.runs > 0)) {
      if (match.winnerTeamId === match.teamAId) {
        matchWinnerName = teamAName;
      } else if (match.winnerTeamId === match.teamBId) {
        matchWinnerName = teamBName;
      } else {
        const resultText = (match.resultSummary || score?.statusText || '').toLowerCase();
        if (resultText.includes(teamAName.toLowerCase()) || (teamAShort.length >= 3 && resultText.includes(teamAShort.toLowerCase()))) {
          matchWinnerName = teamAName;
        } else if (resultText.includes(teamBName.toLowerCase()) || (teamBShort.length >= 3 && resultText.includes(teamBShort.toLowerCase()))) {
          matchWinnerName = teamBName;
        } else if (teamAData.runs > teamBData.runs && (teamBData.wickets >= 10 || teamBData.overs >= 20 || isMatchCompleted)) {
          matchWinnerName = teamAName;
        } else if (teamBData.runs > teamAData.runs) {
          matchWinnerName = teamBName;
        }
      }
    }

    // Determine Toss Winner if available
    let tossWinnerName: string | null = null;
    const tossText = (score?.tossWinner || match.resultSummary || '').toLowerCase();
    if (tossText.includes(teamAName.toLowerCase()) || (teamAShort.length >= 3 && tossText.includes(teamAShort.toLowerCase()))) {
      tossWinnerName = teamAName;
    } else if (tossText.includes(teamBName.toLowerCase()) || (teamBShort.length >= 3 && tossText.includes(teamBShort.toLowerCase()))) {
      tossWinnerName = teamBName;
    } else if (isMatchCompleted) {
      // Default toss winner to Team A if bat first
      tossWinnerName = teamAName;
    }

    for (const m of openMarkets) {
      try {
        let shouldLock = false;
        let shouldSettle = false;
        let winningSelectionName: string | null = null;

        const mType = (m.marketType || '').toUpperCase();
        const mName = m.name || '';
        const catSlug = (m.categorySlug || '').toLowerCase();

        // 1. MATCH WINNER MARKET
        if (mType === 'MATCH_WINNER' || mName.toLowerCase().includes('match winner')) {
          if (isMatchCompleted && matchWinnerName) {
            shouldSettle = true;
            winningSelectionName = matchWinnerName;
          }
        }

        // 2. TOSS WINNER MARKET (Settles immediately when match starts/LIVE or when result known)
        else if (mType === 'TOSS_WINNER' || mName.toLowerCase().includes('toss winner')) {
          if (tossWinnerName || isMatchCompleted || matchStatusUpper === 'LIVE') {
            shouldSettle = true;
            winningSelectionName = tossWinnerName || teamAName;
          }
        }

        // 3. OVER / SESSION / TOTAL RUNS MARKETS
        else if (
          mType === 'OVER_RUNS' ||
          mType === 'TOTAL_RUNS' ||
          mType === 'SESSION_FANCY' ||
          catSlug === 'overs' ||
          catSlug === 'first_innings' ||
          catSlug === 'session'
        ) {
          const overMatch = mName.match(/(\d+)\s*Overs?/i);
          const targetOvers = overMatch ? parseInt(overMatch[1], 10) : 20;
          const isTeamA = mName.includes(teamAName) || !mName.includes(teamBName);
          const currentOvers = isTeamA ? teamAData.overs : teamBData.overs;
          const currentWickets = isTeamA ? teamAData.wickets : teamBData.wickets;
          const currentRuns = isTeamA ? teamAData.runs : (mType === 'TOTAL_RUNS' ? teamAData.runs + teamBData.runs : teamBData.runs);
          const threshold = Number(m.lineThreshold) || 48.5;

          if (currentOvers >= (targetOvers - 0.9) && currentOvers < targetOvers && currentRuns <= threshold && m.status === 'OPEN') {
            shouldLock = true;
          }

          // EARLY WIN TRIGGER: If currentRuns > threshold (e.g. 49 > 48.5 at 4.2 overs), Over 48.5 has ALREADY WON!
          if (currentRuns > threshold) {
            shouldSettle = true;
            winningSelectionName =
              m.selections.find(
                (s: any) =>
                  s.name.toLowerCase().includes('yes') ||
                  s.name.toLowerCase().includes('over')
              )?.name || m.selections[0]?.name || 'Over';
          } else if (currentOvers >= targetOvers || currentWickets >= 10 || isMatchCompleted) {
            // Target overs reached, innings ended (all out), or match completed -> Under wins
            shouldSettle = true;
            winningSelectionName =
              m.selections.find(
                (s: any) =>
                  s.name.toLowerCase().includes('no') ||
                  s.name.toLowerCase().includes('under')
              )?.name || m.selections[1]?.name || 'Under';
          }
        }

        // 4. ODD / EVEN MARKETS
        else if (catSlug === 'odd_even' || mType === 'ODD_EVEN' || mName.toLowerCase().includes('odd/even')) {
          if (isMatchCompleted || (teamAData.overs >= 20 && teamBData.overs >= 20)) {
            shouldSettle = true;
            const isTeamA = mName.includes(teamAName);
            const totalRuns = isTeamA ? teamAData.runs : teamAData.runs + teamBData.runs;
            const isOdd = totalRuns % 2 !== 0;
            const targetWord = isOdd ? 'odd' : 'even';
            winningSelectionName =
              m.selections.find((s: any) => s.name.toLowerCase().includes(targetWord))?.name ||
              (isOdd ? 'Odd' : 'Even');
          }
        }

        // 5. QUICK / DISMISSAL MARKETS (Settles as soon as 1st wicket falls or match completed)
        else if (mType === 'QUICK' || mType === 'DISMISSAL_METHOD' || mName.toLowerCase().includes('dismissal')) {
          const totalWickets = teamAData.wickets + teamBData.wickets;
          if (totalWickets >= 1 || isMatchCompleted) {
            shouldSettle = true;
            winningSelectionName = m.selections[0]?.name || 'Caught';
          }
        }

        // LOCKING
        if (shouldLock && m.status === 'OPEN') {
          await this.db.cricketMarket.update({
            where: { id: m.id },
            data: { status: 'LOCKED' },
          });
          lockedCount++;
        }

        // SETTLEMENT & PAYOUT EXECUTION
        if (shouldSettle && winningSelectionName) {
          await this.db.cricketMarket.update({
            where: { id: m.id },
            data: { status: 'SETTLED' },
          });

          // Fetch all OPEN bets on this match
          const openBets = await this.db.testBet.findMany({
            where: {
              matchId: match.id,
              status: 'OPEN',
            },
            include: { selections: true },
          });

          for (const bet of openBets) {
            // Find selection for this market
            const betSelection = bet.selections.find((s: any) => s.marketId === m.id || s.marketName === m.name) || bet.selections[0];
            if (!betSelection) continue;

            const userSelectionName = betSelection.selectionName || '';
            const isWinner =
              userSelectionName.toLowerCase() === winningSelectionName.toLowerCase() ||
              userSelectionName.toLowerCase().includes(winningSelectionName.toLowerCase()) ||
              winningSelectionName.toLowerCase().includes(userSelectionName.toLowerCase());

            const betStatus = isWinner ? 'WON' : 'LOST';
            await this.settleTestBet(
              bet.id,
              betStatus,
              `Auto-settled: Winning outcome was "${winningSelectionName}" for market "${m.name}"`
            );
            settledCount++;
          }

          if (this.sportsGateway && !suppressBroadcast) {
            this.sportsGateway.broadcastMarketSettled(match.id, {
              marketId: m.id,
              winningSelectionName,
              matchId: match.id,
            });
          }

          settledMarkets.push({
            marketId: m.id,
            marketName: m.name,
            winningSelection: winningSelectionName,
            betsSettled: openBets.length,
          });
        }
      } catch (marketErr: any) {
        this.logger.error(`Error settling market ${m.id} (${m.name}): ${marketErr.message}`);
      }
    }

    this.clearCache();
    return {
      settledCount,
      lockedCount,
      settledMarkets,
    };
  }

  /**
   * Rolling Session Engine: Continuous creation of Session Lines and Next Over Markets
   * E.g.: 6 Overs -> 10 Overs -> 15 Overs -> 20 Overs continuous rolling session lines!
   * Uses Professional Bookie Wicket-Decay & Pace Adjustment Formula for High/Low Scoring Matches.
   */
  async ensureRollingSessionMarkets(matchId: string, state: any, suppressBroadcast: boolean = false) {
    const match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true },
    });

    if (!match) return;

    const inningsNumber = state.inningsNumber || 1;
    const battingTeam = inningsNumber === 1 ? match.teamA : match.teamB;
    const battingTeamName = battingTeam?.name || (inningsNumber === 1 ? 'Team A' : 'Team B');
    const runs = state.runs || 0;
    const overs = state.overs || 0;
    const wickets = state.wickets || 0;
    const crr = state.currentRunRate || (overs > 0 ? runs / overs : 6.0);
    const safeCrr = Math.max(3.5, Math.min(16.0, crr || 6.0));

    // Professional Bookie Wicket Decay Factor (lower order bats slower after losing wickets)
    const wicketDecay = Math.max(0.3, 1.0 - wickets * 0.07);

    // 1. Session Lines (6, 10, 15, 20 overs)
    const sessionMilestones = [6, 10, 15, 20];
    for (const milestone of sessionMilestones) {
      if (overs >= milestone || wickets >= 10) continue; // Past milestone or All Out

      // Check if an OPEN or SUSPENDED session market already exists for this milestone
      const existing = await this.db.cricketMarket.findFirst({
        where: {
          matchId: match.id,
          name: { contains: `${milestone} Overs Session Line` },
          status: { in: ['OPEN', 'SUSPENDED'] },
        },
      });

      if (!existing) {
        // Calculate dynamic bookie line threshold L based on current score, CRR & wicket decay
        const oversRemaining = milestone - overs;
        const projectedRunsFromRemaining = safeCrr * oversRemaining * wicketDecay;
        const projectedTarget = Math.round(runs + projectedRunsFromRemaining);
        const lineThreshold = projectedTarget + 0.5;

        const newMarket = await this.db.cricketMarket.create({
          data: {
            matchId: match.id,
            categorySlug: 'session',
            name: `${milestone} Overs Session Line (${battingTeamName})`,
            marketType: 'SESSION_FANCY',
            lineThreshold,
            status: 'OPEN',
            sourceType: 'STATISTICAL_MODEL',
            sortOrder: 10 + milestone,
            selections: {
              create: [
                { name: `Over ${lineThreshold} Runs`, backPrice: 1.85, layPrice: 1.90, sortOrder: 1 },
                { name: `Under ${lineThreshold} Runs`, backPrice: 1.85, layPrice: 1.90, sortOrder: 2 },
              ],
            },
          },
          include: { selections: true },
        });

        this.logger.log(`Created rolling session market: ${newMarket.name} (Line: ${lineThreshold})`);

        if (this.sportsGateway && !suppressBroadcast) {
          this.sportsGateway.broadcastMarketUpdated(match.id, {
            marketId: newMarket.id,
            matchId: match.id,
            name: newMarket.name,
            status: 'OPEN',
          });
        }
        break; // Only create the immediate next session milestone
      }
    }

    // 2. Next Over Runs Market (e.g. 1st Over, 2nd Over, 3rd Over... 20th Over)
    const currentCompletedOvers = Math.floor(overs);
    const nextOverNumber = currentCompletedOvers + 1;

    if (nextOverNumber <= 20 && wickets < 10) {
      const existingOverMarket = await this.db.cricketMarket.findFirst({
        where: {
          matchId: match.id,
          name: { contains: `${nextOverNumber}` },
          categorySlug: 'overs',
          status: { in: ['OPEN', 'SUSPENDED'] },
        },
      });

      if (!existingOverMarket) {
        const lineThreshold = Math.round(safeCrr * wicketDecay) + 0.5;
        const suffix = nextOverNumber === 1 ? 'st' : nextOverNumber === 2 ? 'nd' : nextOverNumber === 3 ? 'rd' : 'th';
        
        const newOverMarket = await this.db.cricketMarket.create({
          data: {
            matchId: match.id,
            categorySlug: 'overs',
            name: `${nextOverNumber}${suffix} Over Total Runs`,
            marketType: 'OVER_RUNS',
            lineThreshold,
            status: 'OPEN',
            sourceType: 'STATISTICAL_MODEL',
            sortOrder: 5,
            selections: {
              create: [
                { name: `Over ${lineThreshold} Runs`, backPrice: 1.90, layPrice: 1.95, sortOrder: 1 },
                { name: `Under ${lineThreshold} Runs`, backPrice: 1.90, layPrice: 1.95, sortOrder: 2 },
              ],
            },
          },
          include: { selections: true },
        });

        this.logger.log(`Created rolling over market: ${newOverMarket.name} (Line: ${lineThreshold})`);

        if (this.sportsGateway && !suppressBroadcast) {
          this.sportsGateway.broadcastMarketUpdated(match.id, {
            marketId: newOverMarket.id,
            matchId: match.id,
            name: newOverMarket.name,
            status: 'OPEN',
          });
        }
      }
    }

    this.clearCache();
  }
}

export function calculateMatchWinProbabilityAndOdds(match: any, score?: any) {
  const sc = score || match?.score;
  let winProbA = 50;

  if (sc) {
    const crr = parseFloat(sc.currentRunRate) || 0;
    const rrr = parseFloat(sc.requiredRunRate) || 0;

    const runsA = parseInt(sc.teamAScore?.split('/')[0] || '0', 10);
    const wicketsA = parseInt(sc.teamAScore?.split('/')[1] || '0', 10);

    const runsB = parseInt(sc.teamBScore?.split('/')[0] || '0', 10);
    const wicketsB = parseInt(sc.teamBScore?.split('/')[1] || '0', 10);

    if (rrr > 0 && crr > 0) {
      const diff = crr - rrr;
      if (sc.currentInnings === 2) {
        const winProbB = Math.round(50 + diff * 6 - wicketsB * 4);
        winProbA = 100 - winProbB;
      } else {
        winProbA = Math.round(50 + diff * 6 - wicketsA * 4);
      }
    } else if (runsA > 0 || runsB > 0) {
      const netA = runsA - (wicketsA * 10);
      const netB = runsB - (wicketsB * 10);
      const diff = netA - netB;
      winProbA = Math.round(50 + diff * 0.25);
    }
    winProbA = Math.min(92, Math.max(8, winProbA));
  }

  const winProbB = 100 - winProbA;
  const oddsA = Number((100 / winProbA).toFixed(2));
  const oddsB = Number((100 / winProbB).toFixed(2));

  return { winProbA, winProbB, oddsA, oddsB };
}


