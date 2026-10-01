import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { SportsGateway } from './sports.gateway.js';

@Injectable()
export class SportsProviderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SportsProviderService.name);
  private syncIntervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => SportsGateway))
    private readonly gateway: SportsGateway
  ) {}

  onModuleInit() {
    this.startMockProviderSimulation();
  }

  onModuleDestroy() {
    if (this.syncIntervalHandle) {
      clearInterval(this.syncIntervalHandle);
    }
  }

  private startMockProviderSimulation() {
    this.logger.log('Starting MockSportsProvider simulation loop (every 5 seconds)...');
    this.syncIntervalHandle = setInterval(async () => {
      try {
        await this.simulateLiveCricketEvents();
      } catch (err) {
        this.logger.error('Error simulating live sports events', err);
      }
    }, 5000);
  }

  private async simulateLiveCricketEvents() {
    const liveMatches = await this.db.match.findMany({
      where: { status: 'LIVE' },
      include: {
        score: true,
        teamA: true,
        teamB: true,
      },
    });

    if (liveMatches.length === 0) return;

    for (const match of liveMatches) {
      const score = match.score;
      if (!score) continue;

      // Simulate a new ball event
      const possibleRuns = [0, 1, 2, 4, 6];
      const runs = possibleRuns[Math.floor(Math.random() * possibleRuns.length)];

      // Parse current overs e.g. "16.2"
      let currentOversFloat = parseFloat(score.teamBOvers || '0.0');
      let overNum = Math.floor(currentOversFloat);
      let ballNum = Math.round((currentOversFloat - overNum) * 10);

      ballNum += 1;
      if (ballNum >= 6) {
        overNum += 1;
        ballNum = 0;
      }

      const newOversStr = `${overNum}.${ballNum}`;
      const newOversFloat = overNum + ballNum * 0.1;

      // Calculate new score for batting team e.g. "153/3"
      let teamBRuns = 153;
      let teamBWickets = 3;
      if (score.teamBScore && score.teamBScore.includes('/')) {
        const parts = score.teamBScore.split('/');
        teamBRuns = parseInt(parts[0], 10) || 153;
        teamBWickets = parseInt(parts[1], 10) || 3;
      }

      teamBRuns += runs;
      const newTeamBScore = `${teamBRuns}/${teamBWickets}`;
      const targetRuns = score.targetRuns || 187;
      const runsNeeded = Math.max(0, targetRuns - teamBRuns);
      const ballsRemaining = Math.max(0, 120 - (overNum * 6 + ballNum));

      const statusText =
        runsNeeded === 0
          ? `${match.teamB?.name || 'Team B'} won the match!`
          : `${match.teamB?.name || 'Australia'} need ${runsNeeded} runs in ${ballsRemaining} balls`;

      // Event descriptions
      let eventType = 'RUN';
      let desc = `Delivery on length, pushed for ${runs} run(s).`;
      if (runs === 4) {
        eventType = 'FOUR';
        desc = `CRACKED AWAY FOR FOUR! Splendid boundary to the fence.`;
      } else if (runs === 6) {
        eventType = 'SIX';
        desc = `DISPATCHED FOR SIX! Massive blow straight over the bowler's head!`;
      } else if (runs === 0) {
        eventType = 'DOT';
        desc = `Good tight line on off stump, defended back to bowler.`;
      }

      // Update database score record
      const updatedScore = await this.db.matchScore.update({
        where: { matchId: match.id },
        data: {
          teamBScore: newTeamBScore,
          teamBOvers: newOversStr,
          statusText,
          recentOvers: `${score.recentOvers ? score.recentOvers.slice(-15) : ''} ${runs}`.trim(),
        },
      });

      // Create commentary event
      const commentary = await this.db.commentaryEvent.create({
        data: {
          matchId: match.id,
          overNumber: parseFloat(newOversStr),
          ballNumber: ballNum === 0 ? 6 : ballNum,
          runs,
          event: eventType,
          bowler: 'J. Bumrah',
          batsman: 'G. Maxwell',
          description: desc,
        },
      });

      // Broadcast real-time WebSocket events
      this.gateway.broadcastScoreUpdate(match.id, {
        matchId: match.id,
        score: updatedScore,
        latestCommentary: commentary,
      });

      this.gateway.broadcastBallCompleted(match.id, {
        matchId: match.id,
        overNumber: newOversFloat,
        runs,
        event: eventType,
        commentary,
        score: updatedScore,
      });

      // If target reached, mark match completed
      if (runsNeeded === 0) {
        await this.db.match.update({
          where: { id: match.id },
          data: {
            status: 'COMPLETED',
            resultSummary: `${match.teamB?.name || 'Australia'} won by ${10 - teamBWickets} wickets`,
          },
        });
        this.gateway.broadcastMatchCompleted(match.id, {
          matchId: match.id,
          resultSummary: `${match.teamB?.name || 'Australia'} won by ${10 - teamBWickets} wickets`,
        });
      }
    }
  }
}
