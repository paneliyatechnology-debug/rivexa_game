import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface NormalizedMatchState {
  matchId: string;
  teamAName?: string;
  teamBName?: string;
  inningsNumber: number;
  battingTeamId?: string;
  bowlingTeamId?: string;
  runs: number;
  wickets: number;
  overs: number; // floating overs e.g. 24.5 overs
  target: number | null; // For 2nd innings chase: firstInningsRuns + 1
  runsRequired: number | null;
  ballsRemaining: number | null;
  currentRunRate: number;
  requiredRunRate: number | null;
  matchStatus: string;
  matchType?: string; // T20, ODI, TEST
  stateVersion: number;
  providerEventId?: string;
  providerSequence?: number;
  providerTimestamp?: string;
  processedAt: string;
}

export interface RawMatchScoreInput {
  matchId: string;
  teamAScore?: string | null;
  teamBScore?: string | null;
  teamAOvers?: string | null;
  teamBOvers?: string | null;
  currentInnings?: number | null;
  currentRunRate?: number | null;
  requiredRunRate?: number | null;
  targetRuns?: number | null;
  statusText?: string | null;
  providerEventId?: string;
  providerSequence?: number;
  providerTimestamp?: string;
  matchType?: string; // T20, ODI, TEST
}

@Injectable()
export class MatchStateService {
  private readonly logger = new Logger(MatchStateService.name);

  // In-memory idempotency cache per matchId: last processed sequence & version
  private readonly matchVersions = new Map<string, { sequence: number; version: number; timestamp: string }>();

  constructor(private readonly db: DatabaseService) {}

  /**
   * Helper to parse score strings like "174/10" or "74/2" into { runs, wickets }
   */
  public parseScoreString(scoreStr?: string | null): { runs: number; wickets: number } {
    if (!scoreStr || scoreStr === 'N/A') return { runs: 0, wickets: 0 };
    const parts = scoreStr.split('/');
    const runs = parseInt(parts[0] || '0', 10) || 0;
    const wickets = parseInt(parts[1] || '0', 10) || 0;
    return { runs, wickets };
  }

  /**
   * Helper to parse overs strings like "24.5" into float overs and total balls
   */
  public parseOversString(oversStr?: string | null): { oversFloat: number; ballsBowled: number } {
    if (!oversStr || oversStr === '0.0') return { oversFloat: 0, ballsBowled: 0 };
    const parts = oversStr.split('.');
    const completedOvers = parseInt(parts[0] || '0', 10) || 0;
    const extraBalls = parseInt(parts[1] || '0', 10) || 0;
    const ballsBowled = completedOvers * 6 + extraBalls;
    const oversFloat = completedOvers + extraBalls / 6;
    return { oversFloat: parseFloat(oversFloat.toFixed(4)), ballsBowled };
  }

  /**
   * Authoritative Normalization & Idempotency Processor for Cricket Match State
   */
  async processAndNormalizeMatchState(
    input: RawMatchScoreInput
  ): Promise<{ state: NormalizedMatchState | null; isDuplicate: boolean }> {
    const { matchId, providerEventId, providerSequence, providerTimestamp } = input;

    // Fetch existing match from DB to inspect teams, type, and existing score
    const match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { score: true },
    });

    if (!match) {
      this.logger.warn(`MatchStateService: Match ${matchId} not found in database.`);
      return { state: null, isDuplicate: false };
    }

    // 1. Event Idempotency & Ordering Check (Requirement #5)
    const existingTracking = this.matchVersions.get(matchId) || { sequence: 0, version: 0, timestamp: '' };
    
    if (providerSequence !== undefined && providerSequence > 0 && providerSequence <= existingTracking.sequence) {
      this.logger.warn(`[CRICKET_STATE] Skipping duplicate/stale provider event: seq=${providerSequence} <= lastSeq=${existingTracking.sequence} for matchId=${matchId}`);
      return { state: null, isDuplicate: true };
    }

    if (providerTimestamp && existingTracking.timestamp && new Date(providerTimestamp).getTime() <= new Date(existingTracking.timestamp).getTime()) {
      this.logger.warn(`[CRICKET_STATE] Skipping out-of-order provider timestamp: ${providerTimestamp} <= ${existingTracking.timestamp} for matchId=${matchId}`);
      return { state: null, isDuplicate: true };
    }

    const nextStateVersion = existingTracking.version + 1;

    // 2. Determine Innings & Batting/Bowling Scores
    const currentInnings = input.currentInnings || match.score?.currentInnings || 1;
    const teamAScoreParsed = this.parseScoreString(input.teamAScore || match.score?.teamAScore);
    const teamBScoreParsed = this.parseScoreString(input.teamBScore || match.score?.teamBScore);
    const teamAOversParsed = this.parseOversString(input.teamAOvers || match.score?.teamAOvers);
    const teamBOversParsed = this.parseOversString(input.teamBOvers || match.score?.teamBOvers);

    const maxOversObserved = Math.max(teamAOversParsed.oversFloat, teamBOversParsed.oversFloat);
    const statusUpper = (input.statusText || match.score?.statusText || match.resultSummary || '').toUpperCase();

    let resolvedMatchType = input.matchType || match.matchType || 'T20';
    if (statusUpper.includes('DAY ') || statusUpper.includes('SESSION') || statusUpper.includes('TEST') || maxOversObserved > 50) {
      resolvedMatchType = 'TEST';
    } else if (maxOversObserved > 20 || resolvedMatchType === 'ODI') {
      resolvedMatchType = 'ODI';
    }

    const maxOvers = resolvedMatchType === 'TEST' ? 90 : resolvedMatchType === 'ODI' ? 50 : 20;
    const maxBalls = maxOvers * 6;

    let runs = 0;
    let wickets = 0;
    let oversFloat = 0;
    let ballsBowled = 0;
    let firstInningsRuns: number | null = null;
    let battingTeamId = match.teamAId;
    let bowlingTeamId = match.teamBId;

    if (currentInnings === 1) {
      // Innings 1: Team A is batting
      runs = teamAScoreParsed.runs;
      wickets = teamAScoreParsed.wickets;
      oversFloat = teamAOversParsed.oversFloat;
      ballsBowled = teamAOversParsed.ballsBowled;
      battingTeamId = match.teamAId;
      bowlingTeamId = match.teamBId;
    } else {
      // Innings 2: Team B is batting & chasing Team A's 1st innings total
      runs = teamBScoreParsed.runs;
      wickets = teamBScoreParsed.wickets;
      oversFloat = teamBOversParsed.oversFloat;
      ballsBowled = teamBOversParsed.ballsBowled;
      firstInningsRuns = teamAScoreParsed.runs;
      battingTeamId = match.teamBId;
      bowlingTeamId = match.teamAId;
    }

    // 3. Fix Target Calculation (Requirement #6: Target = firstInningsTotal + 1)
    // For Australia 174/10 -> firstInningsRuns = 174 -> target = 175!
    let target: number | null = null;
    let runsRequired: number | null = null;
    let ballsRemaining: number | null = null;
    let requiredRunRate: number | null = null;

    if (currentInnings === 2 && firstInningsRuns !== null) {
      target = firstInningsRuns + 1; // Authoritative rule: target is 1st innings total + 1
      runsRequired = Math.max(0, target - runs);
      ballsRemaining = Math.max(0, maxBalls - ballsBowled);
      if (ballsRemaining > 0 && runsRequired > 0) {
        requiredRunRate = parseFloat(((runsRequired / ballsRemaining) * 6).toFixed(2));
      } else {
        requiredRunRate = 0;
      }
    } else if (input.targetRuns) {
      target = input.targetRuns;
    }

    const currentRunRate = oversFloat > 0 ? parseFloat((runs / oversFloat).toFixed(2)) : 0.0;

    // 4. Construct Authoritative NormalizedMatchState
    const state: NormalizedMatchState = {
      matchId,
      teamAName: match.teamA?.name,
      teamBName: match.teamB?.name,
      inningsNumber: currentInnings,
      battingTeamId,
      bowlingTeamId,
      runs,
      wickets,
      overs: oversFloat,
      target,
      runsRequired,
      ballsRemaining,
      currentRunRate,
      requiredRunRate,
      matchStatus: match.status,
      matchType: resolvedMatchType,
      stateVersion: nextStateVersion,
      providerEventId,
      providerSequence: providerSequence || existingTracking.sequence + 1,
      providerTimestamp: providerTimestamp || new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };

    // Update in-memory tracking
    this.matchVersions.set(matchId, {
      sequence: state.providerSequence || 0,
      version: nextStateVersion,
      timestamp: state.providerTimestamp || '',
    });

    // 5. Update Database MatchScore record with exact target & current rates
    await this.db.matchScore.upsert({
      where: { matchId },
      create: {
        matchId,
        teamAScore: input.teamAScore || '0/0',
        teamBScore: input.teamBScore || 'N/A',
        teamAOvers: input.teamAOvers || '0.0',
        teamBOvers: input.teamBOvers || '0.0',
        currentInnings,
        currentRunRate,
        requiredRunRate,
        targetRuns: target,
        statusText: input.statusText || '',
      },
      update: {
        ...(input.teamAScore !== undefined ? { teamAScore: input.teamAScore } : {}),
        ...(input.teamBScore !== undefined ? { teamBScore: input.teamBScore } : {}),
        ...(input.teamAOvers !== undefined ? { teamAOvers: input.teamAOvers } : {}),
        ...(input.teamBOvers !== undefined ? { teamBOvers: input.teamBOvers } : {}),
        currentInnings,
        currentRunRate,
        requiredRunRate,
        targetRuns: target,
        ...(input.statusText !== undefined ? { statusText: input.statusText } : {}),
      },
    });

    // 6. Log Snapshot to CricketMatchStateSnapshot table in DB
    try {
      await this.db.cricketMatchStateSnapshot.create({
        data: {
          matchId,
          inningsNumber: currentInnings,
          runs,
          wickets,
          overs: oversFloat,
          targetRuns: target,
          currentRunRate,
          requiredRunRate,
          rawScoreData: state as any,
          stateVersion: nextStateVersion,
          sourceProvider: 'PROVIDER_NORMALIZED',
        },
      });
    } catch (dbErr: any) {
      this.logger.error(`Error saving CricketMatchStateSnapshot for match ${matchId}: ${dbErr.message}`);
    }

    // 7. Structured Console Logging (Requirement #14)
    console.log(`[CRICKET_STATE] matchId=${matchId} version=${state.stateVersion} score=${runs}/${wickets} overs=${oversFloat} target=${target || 'N/A'}`);

    return { state, isDuplicate: false };
  }

  /** Retrieve active tracking version for a match */
  getMatchVersion(matchId: string): number {
    return this.matchVersions.get(matchId)?.version || 1;
  }
}
