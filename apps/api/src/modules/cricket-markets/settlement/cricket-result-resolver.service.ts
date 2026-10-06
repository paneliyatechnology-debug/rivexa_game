import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

export interface ICricketProviderResultInput {
  providerName?: string;
  providerMatchId?: string;
  providerMarketId?: string;
  providerOutcomeId?: string;
  providerWinnerId?: string;
  officialResultStatus?: string; // COMPLETED, FINISHED, DLS, SUPER_OVER, TIE, ABANDONED, NO_RESULT, CANCELLED
  resultSummary?: string;
  scoreA?: { runs: number; wickets: number; overs: number };
  scoreB?: { runs: number; wickets: number; overs: number };
}

export interface ICricketResolvedOutcome {
  matchId: string;
  marketId?: string;
  marketType: string;
  settlementStatus: 'SETTLED' | 'VOID' | 'PENDING' | 'CANCELLED';
  winnerParticipantId: string | null; // Canonical internal participant (team) UUID
  winnerSelectionName: string | null;
  resolutionReason: string;
  isDls: boolean;
  isSuperOver: boolean;
  isTie: boolean;
  isAbandoned: boolean;
  resolutionTimestamp: Date;
  metadata: Record<string, any>;
}

@Injectable()
export class CricketResultResolver {
  private readonly logger = new Logger(CricketResultResolver.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Resolves the authoritative winner participant ID and settlement outcome for a market.
   * Priority Order:
   *   1. Official Provider Settlement Payload / Outcome ID
   *   2. Provider Winner ID mapped via ProviderEntityMapping
   *   3. Internal Cricket Rules Engine (DLS, Super Over, Tie, Wickets/Runs, Target)
   */
  async resolveMarketOutcome(
    match: any,
    market: { id: string; marketType: string; name?: string; lineThreshold?: number | null },
    providerInput?: ICricketProviderResultInput
  ): Promise<ICricketResolvedOutcome> {
    const marketType = (market.marketType || '').toUpperCase();
    const teamAId = match.teamAId || match.teamA?.id;
    const teamBId = match.teamBId || match.teamB?.id;
    const teamAName = match.teamA?.name || 'Team A';
    const teamBName = match.teamB?.name || 'Team B';

    const rawStatus = (match.status || providerInput?.officialResultStatus || '').toUpperCase();
    const summaryText = (match.resultSummary || match.score?.statusText || providerInput?.resultSummary || '').toUpperCase();

    const isAbandoned =
      rawStatus === 'ABANDONED' ||
      rawStatus === 'CANCELLED' ||
      rawStatus === 'NO_RESULT' ||
      summaryText.includes('ABANDONED') ||
      summaryText.includes('NO RESULT') ||
      summaryText.includes('CANCELLED');

    const isDls = summaryText.includes('DLS') || summaryText.includes('DUCKWORTH');
    const isSuperOver = summaryText.includes('SUPER OVER') || summaryText.includes('ONE-OVER ELIMINATOR');
    const isTie = summaryText.includes('TIE') || summaryText.includes('DRAWN');

    if (isAbandoned) {
      return {
        matchId: match.id,
        marketId: market.id,
        marketType,
        settlementStatus: 'VOID',
        winnerParticipantId: null,
        winnerSelectionName: null,
        resolutionReason: 'MATCH_ABANDONED_OR_NO_RESULT',
        isDls,
        isSuperOver,
        isTie,
        isAbandoned: true,
        resolutionTimestamp: new Date(),
        metadata: { matchStatus: match.status, summaryText },
      };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. MATCH WINNER MARKET
    // ──────────────────────────────────────────────────────────────────────────
    if (marketType === 'MATCH_WINNER' || (market.name || '').toLowerCase().includes('match winner')) {
      // Check Priority 1: Provider Winner ID mapped to internal participant ID
      if (providerInput?.providerWinnerId) {
        const canonicalWinnerId = await this.resolveCanonicalParticipantId(providerInput.providerWinnerId, match.id);
        if (canonicalWinnerId) {
          const winnerName = canonicalWinnerId === teamAId ? teamAName : teamBName;
          return {
            matchId: match.id,
            marketId: market.id,
            marketType: 'MATCH_WINNER',
            settlementStatus: 'SETTLED',
            winnerParticipantId: canonicalWinnerId,
            winnerSelectionName: winnerName,
            resolutionReason: 'PROVIDER_OFFICIAL_WINNER_ID',
            isDls,
            isSuperOver,
            isTie,
            isAbandoned: false,
            resolutionTimestamp: new Date(),
            metadata: { providerWinnerId: providerInput.providerWinnerId },
          };
        }
      }

      // Check Priority 2: Database winnerTeamId relation
      if (match.winnerTeamId) {
        const winnerName = match.winnerTeamId === teamAId ? teamAName : teamBName;
        return {
          matchId: match.id,
          marketId: market.id,
          marketType: 'MATCH_WINNER',
          settlementStatus: 'SETTLED',
          winnerParticipantId: match.winnerTeamId,
          winnerSelectionName: winnerName,
          resolutionReason: 'DATABASE_MATCH_WINNER_RELATION',
          isDls,
          isSuperOver,
          isTie,
          isAbandoned: false,
          resolutionTimestamp: new Date(),
          metadata: { winnerTeamId: match.winnerTeamId },
        };
      }

      // Check Priority 3: Tie / Super Over / DLS Text Resolution
      if (isTie && !isSuperOver) {
        return {
          matchId: match.id,
          marketId: market.id,
          marketType: 'MATCH_WINNER',
          settlementStatus: 'VOID', // Tie in binary Match Winner market = VOID / PUSH
          winnerParticipantId: null,
          winnerSelectionName: null,
          resolutionReason: 'MATCH_TIED_WITHOUT_SUPER_OVER',
          isDls,
          isSuperOver: false,
          isTie: true,
          isAbandoned: false,
          resolutionTimestamp: new Date(),
          metadata: { summaryText },
        };
      }

      // Priority 4: Dynamic Score & Innings Evaluation
      const scoreA = providerInput?.scoreA || this.parseScore(match.score?.teamAScore, match.score?.teamAOvers);
      const scoreB = providerInput?.scoreB || this.parseScore(match.score?.teamBScore, match.score?.teamBOvers);

      let winnerId: string | null = null;
      let winnerName: string | null = null;
      let reason = 'SCORE_INNINGS_COMPLETION';

      // Text summary matching using canonical team names
      const textUpper = summaryText;
      if (teamAName && textUpper.includes(teamAName.toUpperCase())) {
        winnerId = teamAId;
        winnerName = teamAName;
        reason = 'RESULT_TEXT_CANONICAL_MATCH_TEAM_A';
      } else if (teamBName && textUpper.includes(teamBName.toUpperCase())) {
        winnerId = teamBId;
        winnerName = teamBName;
        reason = 'RESULT_TEXT_CANONICAL_MATCH_TEAM_B';
      } else if (scoreB.runs > scoreA.runs) {
        winnerId = teamBId;
        winnerName = teamBName;
        reason = 'TEAM_B_SURPASSED_TARGET';
      } else if (scoreA.runs > scoreB.runs && (scoreB.wickets >= 10 || scoreB.overs >= 20 || rawStatus === 'COMPLETED')) {
        winnerId = teamAId;
        winnerName = teamAName;
        reason = 'TEAM_A_DEFENDED_TOTAL';
      }

      if (winnerId) {
        return {
          matchId: match.id,
          marketId: market.id,
          marketType: 'MATCH_WINNER',
          settlementStatus: 'SETTLED',
          winnerParticipantId: winnerId,
          winnerSelectionName: winnerName,
          resolutionReason: reason,
          isDls,
          isSuperOver,
          isTie,
          isAbandoned: false,
          resolutionTimestamp: new Date(),
          metadata: { scoreA, scoreB, summaryText },
        };
      }

      // If match completed but no winner resolved yet
      if (rawStatus === 'COMPLETED' || rawStatus === 'FINISHED') {
        return {
          matchId: match.id,
          marketId: market.id,
          marketType: 'MATCH_WINNER',
          settlementStatus: 'PENDING',
          winnerParticipantId: null,
          winnerSelectionName: null,
          resolutionReason: 'COMPLETED_WAITING_OFFICIAL_PROVIDER_RESULT',
          isDls,
          isSuperOver,
          isTie,
          isAbandoned: false,
          resolutionTimestamp: new Date(),
          metadata: { summaryText },
        };
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. TOSS WINNER MARKET (Completely Independent from Match Winner)
    // ──────────────────────────────────────────────────────────────────────────
    if (marketType === 'TOSS_WINNER' || (market.name || '').toLowerCase().includes('toss winner')) {
      const tossText = (match.score?.tossWinner || summaryText).toUpperCase();
      let tossWinnerId: string | null = null;
      let tossWinnerName: string | null = null;

      if (teamAName && tossText.includes(teamAName.toUpperCase())) {
        tossWinnerId = teamAId;
        tossWinnerName = teamAName;
      } else if (teamBName && tossText.includes(teamBName.toUpperCase())) {
        tossWinnerId = teamBId;
        tossWinnerName = teamBName;
      } else if (rawStatus === 'COMPLETED' || match.score) {
        // Default to team A (first innings team) if toss text unavailable
        tossWinnerId = teamAId;
        tossWinnerName = teamAName;
      }

      if (tossWinnerId) {
        return {
          matchId: match.id,
          marketId: market.id,
          marketType: 'TOSS_WINNER',
          settlementStatus: 'SETTLED',
          winnerParticipantId: tossWinnerId,
          winnerSelectionName: tossWinnerName,
          resolutionReason: 'TOSS_WINNER_RESOLVED',
          isDls: false,
          isSuperOver: false,
          isTie: false,
          isAbandoned: false,
          resolutionTimestamp: new Date(),
          metadata: { tossText },
        };
      }
    }

    // Default response: PENDING settlement
    return {
      matchId: match.id,
      marketId: market.id,
      marketType,
      settlementStatus: 'PENDING',
      winnerParticipantId: null,
      winnerSelectionName: null,
      resolutionReason: 'UNRESOLVED_WAITING_FOR_DATA',
      isDls,
      isSuperOver,
      isTie,
      isAbandoned: false,
      resolutionTimestamp: new Date(),
      metadata: {},
    };
  }

  /** Resolve provider team ID to internal participant (team) UUID */
  public async resolveCanonicalParticipantId(providerWinnerId: string, matchId: string): Promise<string | null> {
    try {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: {
          entityType: 'TEAM',
          providerEntityId: providerWinnerId,
        },
      });

      if (mapping) {
        return mapping.internalEntityId;
      }

      // Check direct UUID match
      const team = await this.db.team.findUnique({
        where: { id: providerWinnerId },
      });

      return team ? team.id : null;
    } catch {
      return null;
    }
  }

  private parseScore(scoreStr?: string, oversStr?: string): { runs: number; wickets: number; overs: number } {
    if (!scoreStr) return { runs: 0, wickets: 0, overs: 0 };
    const parts = scoreStr.split('/');
    const runs = parseInt(parts[0] || '0', 10) || 0;
    const wickets = parseInt(parts[1] || '0', 10) || 0;
    const overs = parseFloat(oversStr || '0') || 0;
    return { runs, wickets, overs };
  }
}
