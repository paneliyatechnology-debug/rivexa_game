import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class SportsService implements OnModuleInit {
  private readonly logger = new Logger(SportsService.name);
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    try {
      await this.seedInitialSportsData();
      await this.cleanMockCommentary();
    } catch (err) {
      this.logger.error('Failed initializing sports platform data', err);
    }
  }

  public async cleanMockCommentary() {
    try {
      await this.db.commentaryEvent.deleteMany({
        where: {
          OR: [
            { bowler: { contains: 'MC Bowler' } },
            { bowler: { contains: 'CS Batter' } },
            { batsman: { contains: 'CS Batter' } },
            { batsman: { contains: 'MC Bowler' } },
            { description: { contains: 'CS Batter' } },
            { description: { contains: 'MC Bowler' } },
            { bowler: { contains: 'Batter' } },
            { bowler: { contains: 'Bowler' } },
            { batsman: { contains: 'Batter' } },
            { batsman: { contains: 'Bowler' } },
            { description: { contains: 'Batter' } },
            { description: { contains: 'Bowler' } },
          ],
        },
      });
    } catch (err) {
      // Ignore
    }
  }

  // ─────────────────────────────────────────────
  // RAM MICRO-CACHE HELPERS FOR HIGH CONCURRENCY
  // ─────────────────────────────────────────────

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
      if (key.startsWith(prefix) || key.startsWith('match:') || key.startsWith('matches:')) {
        this.cache.delete(key);
      }
    }
  }

  // ─────────────────────────────────────────────
  // SPORTS CATEGORIES
  // ─────────────────────────────────────────────

  async getAllSports() {
    const cacheKey = 'sports:all';
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const sports = await this.db.sport.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const enriched = await Promise.all(
      sports.map(async (sport: any) => {
        const liveCount = await this.db.match.count({
          where: { sportId: sport.id, status: 'LIVE' },
        });
        const upcomingCount = await this.db.match.count({
          where: { sportId: sport.id, status: 'UPCOMING' },
        });

        return {
          ...sport,
          matchCount: {
            live: liveCount,
            upcoming: upcomingCount,
            total: liveCount + upcomingCount,
          },
        };
      })
    );

    this.setToCache(cacheKey, enriched, 5000); // 5 sec RAM cache
    return enriched;
  }

  async getSportBySlug(slug: string) {
    const cacheKey = `sport:${slug}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const sport = await this.db.sport.findFirst({
      where: {
        ...(isUuid ? { OR: [{ slug }, { id: slug }] } : { slug }),
        isActive: true,
      },
      include: {
        competitions: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!sport) return null;

    const liveCount = await this.db.match.count({
      where: { sportId: sport.id, status: 'LIVE' },
    });
    const upcomingCount = await this.db.match.count({
      where: { sportId: sport.id, status: 'UPCOMING' },
    });

    const result = {
      ...sport,
      matchCount: {
        live: liveCount,
        upcoming: upcomingCount,
        total: liveCount + upcomingCount,
      },
    };

    this.setToCache(cacheKey, result, 5000);
    return result;
  }

  async getCompetitions(sportSlugOrId: string) {
    const cacheKey = `competitions:${sportSlugOrId}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const sport = await this.getSportBySlug(sportSlugOrId);
    if (!sport) return [];

    const competitions = await this.db.competition.findMany({
      where: { sportId: sport.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const result = await Promise.all(
      competitions.map(async (comp: any) => {
        const matchCount = await this.db.match.count({
          where: { competitionId: comp.id },
        });
        return { ...comp, matchCount };
      })
    );

    this.setToCache(cacheKey, result, 5000);
    return result;
  }

  // ─────────────────────────────────────────────
  // MATCH LISTINGS & GROUPINGS (OPTIMIZED)
  // ─────────────────────────────────────────────

  async getMatches(params: {
    sportSlugOrId?: string;
    status?: string;
    competitionId?: string;
    limit?: number;
  }) {
    const cacheKey = `matches:${JSON.stringify(params)}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    let sportId: string | undefined;
    if (params.sportSlugOrId) {
      const sport = await this.getSportBySlug(params.sportSlugOrId);
      sportId = sport?.id;
    }

    const where: any = {};
    if (sportId) where.sportId = sportId;
    if (params.status) where.status = params.status.toUpperCase();
    if (params.competitionId) where.competitionId = params.competitionId;

    const matches = await this.db.match.findMany({
      where,
      include: {
        sport: true,
        competition: true,
        teamA: true,
        teamB: true,
        score: true,
      },
      orderBy: [{ status: 'asc' }, { startTime: 'asc' }],
      take: params.limit || 50,
    });

    this.setToCache(cacheKey, matches, 1500); // 1.5s TTL
    return matches;
  }

  async getLiveMatchesGroupedByCompetition(sportSlugOrId: string) {
    const cacheKey = `matches:live:grouped:${sportSlugOrId}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const sport = await this.getSportBySlug(sportSlugOrId);
    if (!sport) return [];

    const matches = await this.db.match.findMany({
      where: {
        sportId: sport.id,
        status: 'LIVE',
      },
      include: {
        competition: true,
        teamA: true,
        teamB: true,
        score: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const compMap = new Map<string, { comp: any; matches: any[] }>();
    for (const match of matches) {
      const compId = match.competitionId || 'other';
      if (!compMap.has(compId)) {
        compMap.set(compId, {
          comp: match.competition || { id: 'other', name: 'Other Matches' },
          matches: [],
        });
      }
      compMap.get(compId)!.matches.push(match);
    }

    const result = Array.from(compMap.values()).map(({ comp, matches }) => ({
      ...comp,
      matches,
      matchCount: matches.length,
    }));

    this.setToCache(cacheKey, result, 1500);
    return result;
  }

  async getUpcomingMatchesGroupedByCompetition(sportSlugOrId: string) {
    const cacheKey = `matches:upcoming:grouped:${sportSlugOrId}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const sport = await this.getSportBySlug(sportSlugOrId);
    if (!sport) return [];

    const matches = await this.db.match.findMany({
      where: {
        sportId: sport.id,
        status: 'UPCOMING',
      },
      include: {
        competition: true,
        teamA: true,
        teamB: true,
        score: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const compMap = new Map<string, { comp: any; matches: any[] }>();
    for (const match of matches) {
      const compId = match.competitionId || 'other';
      if (!compMap.has(compId)) {
        compMap.set(compId, {
          comp: match.competition || { id: 'other', name: 'Upcoming Matches' },
          matches: [],
        });
      }
      compMap.get(compId)!.matches.push(match);
    }

    const result = Array.from(compMap.values()).map(({ comp, matches }) => ({
      ...comp,
      matches,
      matchCount: matches.length,
    }));

    this.setToCache(cacheKey, result, 5000);
    return result;
  }

  async getAllMatchesGroupedByCompetition(sportSlugOrId: string) {
    const cacheKey = `matches:all:grouped:${sportSlugOrId}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const sport = await this.getSportBySlug(sportSlugOrId);
    if (!sport) return [];

    const matches = await this.db.match.findMany({
      where: {
        sportId: sport.id,
        status: { in: ['LIVE', 'UPCOMING'] },
      },
      include: {
        competition: true,
        teamA: true,
        teamB: true,
        score: true,
      },
      orderBy: [{ status: 'asc' }, { startTime: 'asc' }],
    });

    const compMap = new Map<string, { comp: any; matches: any[] }>();
    for (const match of matches) {
      const compId = match.competitionId || 'other';
      if (!compMap.has(compId)) {
        compMap.set(compId, {
          comp: match.competition || { id: 'other', name: 'All Competition Matches' },
          matches: [],
        });
      }
      compMap.get(compId)!.matches.push(match);
    }

    const result = Array.from(compMap.values()).map(({ comp, matches }) => ({
      ...comp,
      matches,
      matchCount: matches.length,
    }));

    this.setToCache(cacheKey, result, 1500);
    return result;
  }

  // ─────────────────────────────────────────────
  // MATCH DETAIL & SUB-RESOURCES
  // ─────────────────────────────────────────────

  async getMatchById(matchId: string) {
    const cacheKey = `match:${matchId}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const match = await this.db.match.findUnique({
      where: { id: matchId },
      include: {
        sport: true,
        competition: true,
        teamA: {
          include: {
            players: true,
          },
        },
        teamB: {
          include: {
            players: true,
          },
        },
        score: true,
        scorecard: true,
        commentaries: {
          orderBy: { overNumber: 'desc' },
          take: 30,
        },
      },
    });

    if (!match) return null;

    // Check if MATCH_WINNER market exists for this match to read admin override or current odds
    const winnerMarket = await this.db.cricketMarket.findFirst({
      where: { matchId: match.id, marketType: 'MATCH_WINNER' },
      include: { selections: { orderBy: { sortOrder: 'asc' } } },
    });

    let winProbA = 50;
    let winProbB = 50;
    let oddsA = 2.00;
    let oddsB = 2.00;
    let isManual = false;

    if (winnerMarket && winnerMarket.sourceType === 'ADMIN_OVERRIDE' && winnerMarket.selections.length >= 2) {
      isManual = true;
      oddsA = Number(winnerMarket.selections[0].backPrice) || 1.75;
      oddsB = Number(winnerMarket.selections[1].backPrice) || 2.15;
      winProbA = Math.round(100 / oddsA);
      winProbB = Math.round(100 / oddsB);
    } else if (winnerMarket && winnerMarket.selections.length >= 2) {
      oddsA = Number(winnerMarket.selections[0].backPrice) || 1.75;
      oddsB = Number(winnerMarket.selections[1].backPrice) || 2.15;
      winProbA = Math.round(100 / oddsA);
      winProbB = Math.round(100 / oddsB);
    } else if (match.score) {
      const crr = match.score.currentRunRate || 8.0;
      const rrr = match.score.requiredRunRate || 8.0;
      const diff = crr - rrr;
      winProbA = Math.min(95, Math.max(5, Math.round(50 + diff * 5)));
      winProbB = 100 - winProbA;
      oddsA = Number((100 / winProbA).toFixed(2));
      oddsB = Number((100 / winProbB).toFixed(2));
    }

    const statsSummary = {
      winProbabilityTeamA: winProbA,
      winProbabilityTeamB: winProbB,
      oddsA,
      oddsB,
      isManual,
      tossWinner: match.teamA?.name,
      tossDecision: 'Elected to bat first',
    };

    const result = {
      ...match,
      statsSummary,
    };

    this.setToCache(cacheKey, result, 1500);
    return result;
  }

  async getMatchScore(matchId: string) {
    const cacheKey = `match:score:${matchId}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const res = await this.db.matchScore.findUnique({
      where: { matchId },
    });

    this.setToCache(cacheKey, res, 1000);
    return res;
  }

  async getMatchScorecard(matchId: string) {
    const cacheKey = `match:scorecard:${matchId}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const sc = await this.db.scorecard.findUnique({
      where: { matchId },
    });
    const res = sc?.data || null;

    this.setToCache(cacheKey, res, 2000);
    return res;
  }

  async getMatchCommentary(matchId: string, limit = 50) {
    const cacheKey = `match:commentary:${matchId}:${limit}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const res = await this.db.commentaryEvent.findMany({
      where: { matchId },
      orderBy: [{ overNumber: 'desc' }, { ballNumber: 'desc' }],
      take: limit,
    });

    this.setToCache(cacheKey, res, 1000);
    return res;
  }

  async getMatchStatistics(matchId: string) {
    const cacheKey = `match:stats:${matchId}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const match = await this.getMatchById(matchId);
    if (!match) return null;

    // Calculate boundary counts dynamically from commentary events
    const foursCount = await this.db.commentaryEvent.count({
      where: { matchId, event: 'FOUR' },
    });
    const sixesCount = await this.db.commentaryEvent.count({
      where: { matchId, event: 'SIX' },
    });

    // Calculate head-to-head dynamically from completed DB matches
    const completedMatches = await this.db.match.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { teamAId: match.teamAId, teamBId: match.teamBId },
          { teamAId: match.teamBId, teamBId: match.teamAId },
        ],
      },
    });

    let teamAWins = 0;
    let teamBWins = 0;
    completedMatches.forEach((m: any) => {
      if (m.winningTeamId === match.teamAId) teamAWins += 1;
      else if (m.winningTeamId === match.teamBId) teamBWins += 1;
    });

    const winProbA = match.statsSummary?.winProbabilityTeamA || 50;
    const winProbB = match.statsSummary?.winProbabilityTeamB || 50;

    const res = {
      matchId,
      teamA: match.teamA,
      teamB: match.teamB,
      headToHead: {
        totalMatches: completedMatches.length,
        teamAWins,
        teamBWins,
        noResult: Math.max(0, completedMatches.length - (teamAWins + teamBWins)),
      },
      boundaries: {
        foursCount,
        sixesCount,
      },
      winProbability: {
        teamA: winProbA,
        teamB: winProbB,
      },
    };

    this.setToCache(cacheKey, res, 3000);
    return res;
  }

  // ─────────────────────────────────────────────
  // INITIAL SEEDING (BASE CATEGORIES ONLY)
  // ─────────────────────────────────────────────

  async seedInitialSportsData() {
    const existingCount = await this.db.sport.count();
    if (existingCount > 0) {
      this.logger.log('Sports categories already seeded.');
      return;
    }

    this.logger.log('Initializing base Sports categories...');

    const sportsToSeed = [
      { slug: 'cricket', name: 'Cricket', icon: 'trophy', sortOrder: 1 },
      { slug: 'football', name: 'Football', icon: 'circle-dot', sortOrder: 2 },
      { slug: 'tennis', name: 'Tennis', icon: 'activity', sortOrder: 3 },
      { slug: 'basketball', name: 'Basketball', icon: 'dribble', sortOrder: 4 },
      { slug: 'virtual-sports', name: 'Virtual Sports', icon: 'cpu', sortOrder: 5 },
      { slug: 'american-football', name: 'American Football', icon: 'shield', sortOrder: 6 },
      { slug: 'horse-racing', name: 'Horse Racing', icon: 'zap', sortOrder: 7 },
      { slug: 'greyhound-racing', name: 'Greyhound Racing', icon: 'flame', sortOrder: 8 },
      { slug: 'baseball', name: 'Baseball', icon: 'target', sortOrder: 9 },
      { slug: 'mma', name: 'Mixed Martial Arts', icon: 'swords', sortOrder: 10 },
    ];

    for (const s of sportsToSeed) {
      await this.db.sport.create({
        data: {
          slug: s.slug,
          name: s.name,
          icon: s.icon,
          sortOrder: s.sortOrder,
          isActive: true,
        },
      });
    }

    this.logger.log('Base sports categories initialized successfully.');
  }
}

