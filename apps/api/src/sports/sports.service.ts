import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class SportsService implements OnModuleInit {
  private readonly logger = new Logger(SportsService.name);

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    try {
      await this.seedInitialSportsData();
      await this.ensureLiveMatches();
    } catch (err) {
      this.logger.error('Failed seeding sports data', err);
    }
  }

  // ─────────────────────────────────────────────
  // SPORTS CATEGORIES
  // ─────────────────────────────────────────────

  async getAllSports() {
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

    return enriched;
  }

  async getSportBySlug(slug: string) {
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

    return {
      ...sport,
      matchCount: {
        live: liveCount,
        upcoming: upcomingCount,
        total: liveCount + upcomingCount,
      },
    };
  }

  async getCompetitions(sportSlugOrId: string) {
    const sport = await this.getSportBySlug(sportSlugOrId);
    if (!sport) return [];

    const competitions = await this.db.competition.findMany({
      where: { sportId: sport.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return Promise.all(
      competitions.map(async (comp: any) => {
        const matchCount = await this.db.match.count({
          where: { competitionId: comp.id },
        });
        return { ...comp, matchCount };
      })
    );
  }

  // ─────────────────────────────────────────────
  // MATCH LISTINGS & GROUPINGS
  // ─────────────────────────────────────────────

  async getMatches(params: {
    sportSlugOrId?: string;
    status?: string;
    competitionId?: string;
    limit?: number;
  }) {
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

    return matches;
  }

  async getLiveMatchesGroupedByCompetition(sportSlugOrId: string) {
    const sport = await this.getSportBySlug(sportSlugOrId);
    if (!sport) return [];

    const competitions = await this.db.competition.findMany({
      where: { sportId: sport.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const result = [];
    for (const comp of competitions) {
      const matches = await this.db.match.findMany({
        where: {
          sportId: sport.id,
          competitionId: comp.id,
          status: 'LIVE',
        },
        include: {
          teamA: true,
          teamB: true,
          score: true,
        },
        orderBy: { startTime: 'asc' },
      });

      if (matches.length > 0) {
        result.push({
          ...comp,
          matches,
          matchCount: matches.length,
        });
      }
    }

    return result;
  }

  async getUpcomingMatchesGroupedByCompetition(sportSlugOrId: string) {
    const sport = await this.getSportBySlug(sportSlugOrId);
    if (!sport) return [];

    const competitions = await this.db.competition.findMany({
      where: { sportId: sport.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const result = [];
    for (const comp of competitions) {
      const matches = await this.db.match.findMany({
        where: {
          sportId: sport.id,
          competitionId: comp.id,
          status: 'UPCOMING',
        },
        include: {
          teamA: true,
          teamB: true,
          score: true,
        },
        orderBy: { startTime: 'asc' },
      });

      if (matches.length > 0) {
        result.push({
          ...comp,
          matches,
          matchCount: matches.length,
        });
      }
    }

    return result;
  }

  // ─────────────────────────────────────────────
  // MATCH DETAIL & SUB-RESOURCES
  // ─────────────────────────────────────────────

  async getMatchById(matchId: string) {
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

    // Build statistics summary
    const statsSummary = {
      winProbabilityTeamA: 62,
      winProbabilityTeamB: 38,
      pitchReport: 'Batting-friendly track with good pace and even bounce. High scoring expected.',
      weatherReport: '31°C Clear Sky, 45% Humidity',
      tossWinner: match.teamA?.name,
      tossDecision: 'Elected to bat first',
    };

    return {
      ...match,
      statsSummary,
    };
  }

  async getMatchScore(matchId: string) {
    return this.db.matchScore.findUnique({
      where: { matchId },
    });
  }

  async getMatchScorecard(matchId: string) {
    const sc = await this.db.scorecard.findUnique({
      where: { matchId },
    });
    return sc?.data || null;
  }

  async getMatchCommentary(matchId: string, limit = 50) {
    return this.db.commentaryEvent.findMany({
      where: { matchId },
      orderBy: [{ overNumber: 'desc' }, { ballNumber: 'desc' }],
      take: limit,
    });
  }

  async getMatchStatistics(matchId: string) {
    const match = await this.getMatchById(matchId);
    if (!match) return null;

    return {
      matchId,
      teamA: match.teamA,
      teamB: match.teamB,
      headToHead: {
        totalMatches: 14,
        teamAWins: 8,
        teamBWins: 5,
        noResult: 1,
      },
      boundaries: {
        teamAFours: 18,
        teamASixes: 7,
        teamBFours: 14,
        teamBSixes: 5,
      },
      winProbability: {
        teamA: 64,
        teamB: 36,
      },
      recentForm: {
        teamA: ['W', 'W', 'L', 'W', 'W'],
        teamB: ['L', 'W', 'W', 'L', 'L'],
      },
    };
  }

  // ─────────────────────────────────────────────
  // INITIAL SEEDING
  // ─────────────────────────────────────────────

  async seedInitialSportsData() {
    const existingCount = await this.db.sport.count();
    if (existingCount > 0) {
      this.logger.log('Sports data already seeded.');
      return;
    }

    this.logger.log('Seeding initial Sports platform data...');

    // 1. Create Sports
    const cricket = await this.db.sport.create({
      data: {
        slug: 'cricket',
        name: 'Cricket',
        icon: 'trophy',
        sortOrder: 1,
        isActive: true,
      },
    });

    const football = await this.db.sport.create({
      data: {
        slug: 'football',
        name: 'Football',
        icon: 'circle-dot',
        sortOrder: 2,
        isActive: true,
      },
    });

    const tennis = await this.db.sport.create({
      data: {
        slug: 'tennis',
        name: 'Tennis',
        icon: 'activity',
        sortOrder: 3,
        isActive: true,
      },
    });

    const basketball = await this.db.sport.create({
      data: {
        slug: 'basketball',
        name: 'Basketball',
        icon: 'dribble',
        sortOrder: 4,
        isActive: true,
      },
    });

    const virtualSports = await this.db.sport.create({
      data: {
        slug: 'virtual-sports',
        name: 'Virtual Sports',
        icon: 'cpu',
        sortOrder: 5,
        isActive: true,
      },
    });

    const americanFootball = await this.db.sport.create({
      data: {
        slug: 'american-football',
        name: 'American Football',
        icon: 'shield',
        sortOrder: 6,
        isActive: true,
      },
    });

    const horseRacing = await this.db.sport.create({
      data: {
        slug: 'horse-racing',
        name: 'Horse Racing',
        icon: 'zap',
        sortOrder: 7,
        isActive: true,
      },
    });

    const greyhound = await this.db.sport.create({
      data: {
        slug: 'greyhound-racing',
        name: 'Greyhound Racing',
        icon: 'flame',
        sortOrder: 8,
        isActive: true,
      },
    });

    const baseball = await this.db.sport.create({
      data: {
        slug: 'baseball',
        name: 'Baseball',
        icon: 'target',
        sortOrder: 9,
        isActive: true,
      },
    });

    const mma = await this.db.sport.create({
      data: {
        slug: 'mma',
        name: 'Mixed Martial Arts',
        icon: 'swords',
        sortOrder: 10,
        isActive: true,
      },
    });

    // 2. Create Cricket Competitions
    const compIPL = await this.db.competition.create({
      data: {
        sportId: cricket.id,
        slug: 't20-premier-league',
        name: 'T20 Premier League 2026',
        country: 'India',
        sortOrder: 1,
        isActive: true,
      },
    });

    const compIntlT20 = await this.db.competition.create({
      data: {
        sportId: cricket.id,
        slug: 't20-international-series',
        name: 'International T20 Trophy',
        country: 'Global',
        sortOrder: 2,
        isActive: true,
      },
    });

    const compODI = await this.db.competition.create({
      data: {
        sportId: cricket.id,
        slug: 'one-day-internationals',
        name: 'One Day Internationals Series',
        country: 'Global',
        sortOrder: 3,
        isActive: true,
      },
    });

    const compTest = await this.db.competition.create({
      data: {
        sportId: cricket.id,
        slug: 'world-test-championship',
        name: 'World Test Championship',
        country: 'Global',
        sortOrder: 4,
        isActive: true,
      },
    });

    // 3. Create Teams
    const teamInd = await this.db.team.create({
      data: {
        sportId: cricket.id,
        name: 'India',
        shortName: 'IND',
        flagCode: 'IN',
        country: 'India',
      },
    });

    const teamAus = await this.db.team.create({
      data: {
        sportId: cricket.id,
        name: 'Australia',
        shortName: 'AUS',
        flagCode: 'AU',
        country: 'Australia',
      },
    });

    const teamEng = await this.db.team.create({
      data: {
        sportId: cricket.id,
        name: 'England',
        shortName: 'ENG',
        flagCode: 'GB',
        country: 'United Kingdom',
      },
    });

    const teamSA = await this.db.team.create({
      data: {
        sportId: cricket.id,
        name: 'South Africa',
        shortName: 'SA',
        flagCode: 'ZA',
        country: 'South Africa',
      },
    });

    const teamMI = await this.db.team.create({
      data: {
        sportId: cricket.id,
        name: 'Mumbai Champions',
        shortName: 'MC',
        flagCode: 'IN',
        country: 'India',
      },
    });

    const teamCSK = await this.db.team.create({
      data: {
        sportId: cricket.id,
        name: 'Chennai Superstars',
        shortName: 'CS',
        flagCode: 'IN',
        country: 'India',
      },
    });

    // 4. Create Players for Team India & Australia
    const indPlayers = [
      { name: 'Rohit Sharma', role: 'Batsman', jerseyNumber: 45 },
      { name: 'Shubman Gill', role: 'Batsman', jerseyNumber: 77 },
      { name: 'Virat Kohli', role: 'Batsman', jerseyNumber: 18 },
      { name: 'Suryakumar Yadav', role: 'Batsman', jerseyNumber: 63 },
      { name: 'Rishabh Pant', role: 'Wicket Keeper', jerseyNumber: 17 },
      { name: 'Hardik Pandya', role: 'All-Rounder', jerseyNumber: 33 },
      { name: 'Ravindra Jadeja', role: 'All-Rounder', jerseyNumber: 8 },
      { name: 'Axar Patel', role: 'All-Rounder', jerseyNumber: 20 },
      { name: 'Kuldeep Yadav', role: 'Bowler', jerseyNumber: 23 },
      { name: 'Jasprit Bumrah', role: 'Bowler', jerseyNumber: 93 },
      { name: 'Mohammed Siraj', role: 'Bowler', jerseyNumber: 73 },
    ];

    for (const p of indPlayers) {
      await this.db.player.create({
        data: {
          teamId: teamInd.id,
          name: p.name,
          role: p.role,
          jerseyNumber: p.jerseyNumber,
        },
      });
    }

    const ausPlayers = [
      { name: 'Travis Head', role: 'Batsman', jerseyNumber: 62 },
      { name: 'David Warner', role: 'Batsman', jerseyNumber: 31 },
      { name: 'Steve Smith', role: 'Batsman', jerseyNumber: 49 },
      { name: 'Marnus Labuschagne', role: 'Batsman', jerseyNumber: 33 },
      { name: 'Glenn Maxwell', role: 'All-Rounder', jerseyNumber: 32 },
      { name: 'Marcus Stoinis', role: 'All-Rounder', jerseyNumber: 17 },
      { name: 'Alex Carey', role: 'Wicket Keeper', jerseyNumber: 4 },
      { name: 'Pat Cummins', role: 'Bowler', jerseyNumber: 30 },
      { name: 'Mitchell Starc', role: 'Bowler', jerseyNumber: 56 },
      { name: 'Josh Hazlewood', role: 'Bowler', jerseyNumber: 38 },
      { name: 'Adam Zampa', role: 'Bowler', jerseyNumber: 88 },
    ];

    for (const p of ausPlayers) {
      await this.db.player.create({
        data: {
          teamId: teamAus.id,
          name: p.name,
          role: p.role,
          jerseyNumber: p.jerseyNumber,
        },
      });
    }

    // 5. Create Live Cricket Match (IND vs AUS T20 International)
    const matchLive1 = await this.db.match.create({
      data: {
        sportId: cricket.id,
        competitionId: compIntlT20.id,
        teamAId: teamInd.id,
        teamBId: teamAus.id,
        venue: 'Narendra Modi Stadium, Ahmedabad',
        matchType: 'T20',
        status: 'LIVE',
        startTime: new Date(),
        resultSummary: 'India need 34 runs off 22 balls',
      },
    });

    await this.db.matchScore.create({
      data: {
        matchId: matchLive1.id,
        teamAScore: '186/4',
        teamAOvers: '20.0',
        teamBScore: '153/3',
        teamBOvers: '16.2',
        currentInnings: 2,
        currentRunRate: 9.36,
        requiredRunRate: 9.27,
        targetRuns: 187,
        statusText: 'Australia need 34 runs in 22 balls',
        activeBatsman: 'G. Maxwell 54* (28), M. Stoinis 18* (11)',
        activeBowler: 'J. Bumrah 2/24 (3.2)',
        recentOvers: '1 4 0 6 1 4',
      },
    });

    const scorecardDataLive = {
      firstInnings: {
        inningsName: 'India Innings',
        teamName: 'India',
        totalRuns: 186,
        wickets: 4,
        overs: '20.0',
        batting: [
          { batsmanName: 'Rohit Sharma', dismissal: 'c Carey b Starc', runs: 42, balls: 26, fours: 5, sixes: 2, strikeRate: 161.54, isCaptain: true },
          { batsmanName: 'Shubman Gill', dismissal: 'b Cummins', runs: 31, balls: 20, fours: 4, sixes: 1, strikeRate: 155.00 },
          { batsmanName: 'Virat Kohli', dismissal: 'not out', runs: 68, balls: 44, fours: 6, sixes: 3, strikeRate: 154.55 },
          { batsmanName: 'Suryakumar Yadav', dismissal: 'c Head b Zampa', runs: 24, balls: 14, fours: 2, sixes: 2, strikeRate: 171.42 },
          { batsmanName: 'Rishabh Pant', dismissal: 'c & b Starc', runs: 12, balls: 9, fours: 1, sixes: 0, strikeRate: 133.33, isWicketKeeper: true },
          { batsmanName: 'Hardik Pandya', dismissal: 'not out', runs: 7, balls: 7, fours: 0, sixes: 0, strikeRate: 100.00 },
        ],
        bowling: [
          { bowlerName: 'Mitchell Starc', overs: '4.0', maidens: 0, runsConceded: 41, wickets: 2, economy: 10.25 },
          { bowlerName: 'Josh Hazlewood', overs: '4.0', maidens: 0, runsConceded: 32, wickets: 0, economy: 8.00 },
          { bowlerName: 'Pat Cummins', overs: '4.0', maidens: 0, runsConceded: 38, wickets: 1, economy: 9.50 },
          { bowlerName: 'Adam Zampa', overs: '4.0', maidens: 0, runsConceded: 45, wickets: 1, economy: 11.25 },
          { bowlerName: 'Marcus Stoinis', overs: '4.0', maidens: 0, runsConceded: 30, wickets: 0, economy: 7.50 },
        ],
        extras: { wides: 3, noBalls: 1, byes: 0, legByes: 2, total: 6 },
        fallOfWickets: [
          { wicketNumber: 1, score: 58, overs: '5.4', batsmanName: 'Rohit Sharma' },
          { wicketNumber: 2, score: 94, overs: '9.2', batsmanName: 'Shubman Gill' },
          { wicketNumber: 3, score: 142, overs: '14.5', batsmanName: 'Suryakumar Yadav' },
          { wicketNumber: 4, score: 171, overs: '18.1', batsmanName: 'Rishabh Pant' },
        ],
      },
      secondInnings: {
        inningsName: 'Australia Innings',
        teamName: 'Australia',
        totalRuns: 153,
        wickets: 3,
        overs: '16.2',
        batting: [
          { batsmanName: 'Travis Head', dismissal: 'c Pant b Bumrah', runs: 38, balls: 22, fours: 4, sixes: 2, strikeRate: 172.72 },
          { batsmanName: 'David Warner', dismissal: 'b Siraj', runs: 29, balls: 19, fours: 3, sixes: 1, strikeRate: 152.63 },
          { batsmanName: 'Steve Smith', dismissal: 'lbw b Kuldeep', runs: 14, balls: 11, fours: 1, sixes: 0, strikeRate: 127.27 },
          { batsmanName: 'Glenn Maxwell', dismissal: 'not out', runs: 54, balls: 28, fours: 5, sixes: 3, strikeRate: 192.85 },
          { batsmanName: 'Marcus Stoinis', dismissal: 'not out', runs: 18, balls: 11, fours: 2, sixes: 0, strikeRate: 163.63 },
        ],
        bowling: [
          { bowlerName: 'Jasprit Bumrah', overs: '3.2', maidens: 0, runsConceded: 24, wickets: 1, economy: 7.20 },
          { bowlerName: 'Mohammed Siraj', overs: '4.0', maidens: 0, runsConceded: 39, wickets: 1, economy: 9.75 },
          { bowlerName: 'Hardik Pandya', overs: '3.0', maidens: 0, runsConceded: 35, wickets: 0, economy: 11.66 },
          { bowlerName: 'Kuldeep Yadav', overs: '4.0', maidens: 0, runsConceded: 33, wickets: 1, economy: 8.25 },
          { bowlerName: 'Axar Patel', overs: '2.0', maidens: 0, runsConceded: 22, wickets: 0, economy: 11.00 },
        ],
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
        fallOfWickets: [
          { wicketNumber: 1, score: 52, overs: '5.1', batsmanName: 'David Warner' },
          { wicketNumber: 2, score: 78, overs: '8.3', batsmanName: 'Travis Head' },
          { wicketNumber: 3, score: 106, overs: '11.4', batsmanName: 'Steve Smith' },
        ],
      },
    };

    await this.db.scorecard.create({
      data: {
        matchId: matchLive1.id,
        data: scorecardDataLive as any,
      },
    });

    const commentariesLive = [
      { overNumber: 16.2, ballNumber: 2, runs: 4, event: 'FOUR', bowler: 'J. Bumrah', batsman: 'G. Maxwell', description: 'CRACKED AWAY! Full length outside off, Maxwell carves it over backward point for FOUR!' },
      { overNumber: 16.1, ballNumber: 1, runs: 1, event: 'SINGLE', bowler: 'J. Bumrah', batsman: 'M. Stoinis', description: 'Good yorker on middle stump, dug out towards mid-on for a single.' },
      { overNumber: 15.6, ballNumber: 6, runs: 6, event: 'SIX', bowler: 'A. Patel', batsman: 'G. Maxwell', description: 'BANG! Flighted on middle, Maxwell launches it high into the night sky over long-on for a massive SIX!' },
      { overNumber: 15.5, ballNumber: 5, runs: 0, event: 'DOT', bowler: 'A. Patel', batsman: 'G. Maxwell', description: 'Flatter delivery outside off, pushed straight to extra cover.' },
      { overNumber: 15.4, ballNumber: 4, runs: 1, event: 'SINGLE', bowler: 'A. Patel', batsman: 'M. Stoinis', description: 'Tucked away off the hips down to fine leg for one.' },
    ];

    for (const c of commentariesLive) {
      await this.db.commentaryEvent.create({
        data: {
          matchId: matchLive1.id,
          overNumber: c.overNumber,
          ballNumber: c.ballNumber,
          runs: c.runs,
          event: c.event,
          bowler: c.bowler,
          batsman: c.batsman,
          description: c.description,
        },
      });
    }

    // 6. Create Live Match 2 (Mumbai Champions vs Chennai Superstars)
    const matchLive2 = await this.db.match.create({
      data: {
        sportId: cricket.id,
        competitionId: compIPL.id,
        teamAId: teamMI.id,
        teamBId: teamCSK.id,
        venue: 'Wankhede Stadium, Mumbai',
        matchType: 'T20',
        status: 'LIVE',
        startTime: new Date(),
        resultSummary: 'Mumbai Champions elected to bat first',
      },
    });

    await this.db.matchScore.create({
      data: {
        matchId: matchLive2.id,
        teamAScore: '142/3',
        teamAOvers: '15.4',
        teamBScore: 'Yet to bat',
        teamBOvers: '0.0',
        currentInnings: 1,
        currentRunRate: 9.07,
        requiredRunRate: null,
        targetRuns: null,
        statusText: 'Mumbai Champions in strong position at 142/3 (15.4 ov)',
        activeBatsman: 'R. Sharma 58* (36), H. Pandya 22* (12)',
        activeBowler: 'D. Chahar 1/28 (3.4)',
        recentOvers: '4 1 6 2 0 1',
      },
    });

    // 7. Create Upcoming Matches
    const upcomingDate1 = new Date(Date.now() + 1000 * 60 * 60 * 5); // 5 hours from now
    await this.db.match.create({
      data: {
        sportId: cricket.id,
        competitionId: compIntlT20.id,
        teamAId: teamEng.id,
        teamBId: teamSA.id,
        venue: 'Lord\'s Cricket Ground, London',
        matchType: 'T20',
        status: 'UPCOMING',
        startTime: upcomingDate1,
        resultSummary: 'Starts today at 19:30 IST',
      },
    });

    const upcomingDate2 = new Date(Date.now() + 1000 * 60 * 60 * 26); // Tomorrow
    await this.db.match.create({
      data: {
        sportId: cricket.id,
        competitionId: compODI.id,
        teamAId: teamInd.id,
        teamBId: teamEng.id,
        venue: 'M. Chinnaswamy Stadium, Bengaluru',
        matchType: 'ODI',
        status: 'UPCOMING',
        startTime: upcomingDate2,
        resultSummary: '1st ODI match',
      },
    });

    const upcomingDate3 = new Date(Date.now() + 1000 * 60 * 60 * 50); // 2 days later
    await this.db.match.create({
      data: {
        sportId: cricket.id,
        competitionId: compTest.id,
        teamAId: teamAus.id,
        teamBId: teamEng.id,
        venue: 'The MCG, Melbourne',
        matchType: 'TEST',
        status: 'UPCOMING',
        startTime: upcomingDate3,
        resultSummary: '3rd Test - The Ashes',
      },
    });

    // 8. Create Football Mock Match
    const matchFootball = await this.db.match.create({
      data: {
        sportId: football.id,
        competitionId: (await this.db.competition.create({
          data: {
            sportId: football.id,
            slug: 'champions-league',
            name: 'UEFA Champions League',
            country: 'Europe',
          },
        })).id,
        teamAId: (await this.db.team.create({
          data: {
            sportId: football.id,
            name: 'Real Madrid',
            shortName: 'RMA',
            flagCode: 'ES',
          },
        })).id,
        teamBId: (await this.db.team.create({
          data: {
            sportId: football.id,
            name: 'Manchester City',
            shortName: 'MCI',
            flagCode: 'GB',
          },
        })).id,
        venue: 'Santiago Bernabéu, Madrid',
        matchType: 'FOOTBALL',
        status: 'LIVE',
        startTime: new Date(),
        resultSummary: '2nd Half - 74\'',
      },
    });

    await this.db.matchScore.create({
      data: {
        matchId: matchFootball.id,
        teamAScore: '2',
        teamBScore: '1',
        statusText: 'Real Madrid lead 2-1 (74 mins)',
      },
    });

    this.logger.log('Sports data seeded successfully!');
  }

  async ensureLiveMatches() {
    try {
      const matchesToUpdate = await this.db.match.findMany({
        where: {
          OR: [
            { status: 'LIVE' },
            { resultSummary: { contains: '19:30', mode: 'insensitive' } },
            { resultSummary: { contains: 'today', mode: 'insensitive' } },
          ],
        },
      });

      for (const m of matchesToUpdate) {
        await this.db.match.update({
          where: { id: m.id },
          data: {
            status: 'LIVE',
            resultSummary: '2nd Innings - South Africa need 31 runs in 28 balls',
          },
        });

        await this.db.matchScore.upsert({
          where: { matchId: m.id },
          create: {
            matchId: m.id,
            teamAScore: '178/4',
            teamAOvers: '20.0',
            teamBScore: '148/3',
            teamBOvers: '15.2',
            currentInnings: 2,
            currentRunRate: 9.67,
            requiredRunRate: 6.42,
            targetRuns: 179,
            statusText: 'South Africa need 31 runs in 28 balls (15.2 ov)',
            activeBatsman: 'A. Markram 54* (32), D. Miller 32* (18)',
            activeBowler: 'J. Archer 1/28 (3.2)',
            recentOvers: '1 4 1 6 2 1',
          },
          update: {
            teamAScore: '178/4',
            teamAOvers: '20.0',
            teamBScore: '148/3',
            teamBOvers: '15.2',
            currentInnings: 2,
            currentRunRate: 9.67,
            requiredRunRate: 6.42,
            targetRuns: 179,
            statusText: 'South Africa need 31 runs in 28 balls (15.2 ov)',
            activeBatsman: 'A. Markram 54* (32), D. Miller 32* (18)',
            activeBowler: 'J. Archer 1/28 (3.2)',
            recentOvers: '1 4 1 6 2 1',
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed promoting matches to live', err);
    }
  }
}

