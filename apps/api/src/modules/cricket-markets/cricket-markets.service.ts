import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class CricketMarketsService implements OnModuleInit {
  private readonly logger = new Logger(CricketMarketsService.name);
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();

  constructor(private readonly db: DatabaseService) {}

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

    const whereClause: any = { matchId: match.id };
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

  async generateMarketsForMatch(match: any) {
    const teamAName = match.teamA?.name || 'Team A';
    const teamBName = match.teamB?.name || 'Team B';
    const teamAShort = match.teamA?.shortName || teamAName.substring(0, 3).toUpperCase();
    const teamBShort = match.teamB?.shortName || teamBName.substring(0, 3).toUpperCase();

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

      // 3. FIRST INNINGS TOTAL RUNS
      {
        categorySlug: 'first_innings',
        name: '1st Innings Total Runs',
        marketType: 'TOTAL_RUNS',
        lineThreshold: 175.5,
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 4,
        selections: [
          { name: 'Over 175.5 Runs', backPrice: 1.85, sortOrder: 1 },
          { name: 'Under 175.5 Runs', backPrice: 1.85, sortOrder: 2 },
        ],
      },

      // 4. OVERS MARKETS
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
        name: '6 Overs Powerplay Runs',
        marketType: 'OVER_RUNS',
        lineThreshold: 48.5,
        status: 'OPEN',
        sourceType: 'STATISTICAL_MODEL',
        sortOrder: 6,
        selections: [
          { name: 'Over 48.5 Runs', backPrice: 1.82, sortOrder: 1 },
          { name: 'Under 48.5 Runs', backPrice: 1.88, sortOrder: 2 },
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
        sourceType: 'DEVELOPMENT_MOCK',
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
      if (!market || market.status !== 'OPEN') {
        throw new BadRequestException(`Market "${market?.name || item.marketId}" is currently suspended or closed.`);
      }

      const selection = await this.db.cricketMarketSelection.findUnique({
        where: { id: item.selectionId },
      });
      if (!selection || selection.status !== 'ACTIVE') {
        throw new BadRequestException(`Selection "${selection?.name || item.selectionId}" is currently unavailable.`);
      }

      const currentOdds = Number(selection.backPrice);
      const submittedOdds = Number(item.odds);

      // Decimal-safe calculations
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

    const totalProfit = totalPotentialReturn - totalStake;
    const betReference = `TB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const testBet = await this.db.testBet.create({
      data: {
        betReference,
        userId: body.userId || undefined,
        matchId: body.matchId,
        totalStake,
        potentialReturn: totalPotentialReturn,
        potentialProfit: totalProfit,
        status: 'OPEN',
        isTestMode: true,
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
      message: 'Test bet placed successfully in non-monetary Development/Test Mode!',
      betReference: testBet.betReference,
      testBet,
    };
  }

  async getTestBetHistory(userId?: string) {
    const whereClause: any = { isTestMode: true };
    if (userId) whereClause.userId = userId;

    return await this.db.testBet.findMany({
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
  }

  // ─────────────────────────────────────────────
  // ADMIN CONTROL METHODS FOR SPORTS BETS & MARKETS
  // ─────────────────────────────────────────────

  async getAdminTestBets(query: { search?: string; status?: string; userId?: string }) {
    const whereClause: any = { isTestMode: true };
    if (query.status && query.status !== 'ALL') {
      whereClause.status = query.status;
    }
    if (query.userId) {
      whereClause.userId = query.userId;
    }
    if (query.search) {
      const searchLower = query.search.trim().toLowerCase();
      whereClause.OR = [
        { betReference: { contains: searchLower, mode: 'insensitive' } },
        { user: { email: { contains: searchLower, mode: 'insensitive' } } },
        { user: { name: { contains: searchLower, mode: 'insensitive' } } },
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

    return bets;
  }

  async settleTestBet(betId: string, status: string, summary?: string) {
    const validStatuses = ['WON', 'LOST', 'VOID', 'CANCELLED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      throw new BadRequestException(`Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}`);
    }

    const testBet = await this.db.testBet.findUnique({
      where: { id: betId },
      include: { selections: true },
    });

    if (!testBet) {
      throw new NotFoundException(`Test bet with ID "${betId}" not found`);
    }

    const updatedBet = await this.db.testBet.update({
      where: { id: betId },
      data: {
        status: status.toUpperCase(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        selections: true,
        match: { include: { teamA: true, teamB: true } },
        settlements: true,
      },
    });

    // Create settlement log
    const payout = status.toUpperCase() === 'WON' ? Number(testBet.potentialReturn) : 0;
    await this.db.testBetSettlement.create({
      data: {
        testBetId: testBet.id,
        resultSource: 'ADMIN_MANUAL_SETTLEMENT',
        settledBy: 'ADMIN',
        settlementSummary: summary || `Test bet settled as ${status.toUpperCase()} by Admin`,
        payoutAmount: payout,
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

    return await this.db.cricketMarket.findUnique({
      where: { id: createdMarket.id },
      include: { selections: true },
    });
  }

  async deleteMarket(marketId: string) {
    return await this.db.cricketMarket.delete({
      where: { id: marketId },
    });
  }
}


