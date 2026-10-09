import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { GameSessionAuditService } from './game-session-audit.service.js';

@Injectable()
export class GameSessionCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameSessionCleanupService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: GameSessionAuditService,
  ) {}

  onModuleInit() {
    const intervalSeconds = Number(process.env.GAME_SESSION_CLEANUP_INTERVAL_SECONDS) || 300;
    this.timer = setInterval(() => {
      this.cleanupExpiredSessions().catch((err) => {
        this.logger.error(`Error during session cleanup: ${err.message}`);
      });
    }, intervalSeconds * 1000);
    this.logger.log(`GameSessionCleanupService initialized (Interval: ${intervalSeconds}s)`);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Scans and marks expired active or created sessions in batches.
   */
  async cleanupExpiredSessions(batchSize = 100): Promise<number> {
    const now = new Date();
    let totalCleaned = 0;

    try {
      // 1. Find sessions past absoluteExpiresAt or expiresAt or idle timeout
      const idleTimeoutSec = Number(process.env.GAME_SESSION_IDLE_TIMEOUT_SECONDS) || 900;
      const idleThreshold = new Date(now.getTime() - idleTimeoutSec * 1000);

      const expiredSessions = await this.db.gameSession.findMany({
        where: {
          status: { in: ['CREATED', 'ACTIVE'] },
          OR: [
            { expiresAt: { lte: now } },
            { absoluteExpiresAt: { lte: now } },
            {
              status: 'ACTIVE',
              lastActivityAt: { lte: idleThreshold },
            },
          ],
        },
        take: batchSize,
        select: { id: true, status: true, userId: true, gameId: true },
      });

      if (expiredSessions.length === 0) {
        return 0;
      }

      for (const session of expiredSessions) {
        await this.db.gameSession.update({
          where: { id: session.id },
          data: {
            status: 'EXPIRED',
            closedAt: now,
          },
        });

        await this.auditService.logEvent(session.id, 'EXPIRED', {
          reason: 'Scheduled cleanup detected expired or idle session',
          previousStatus: session.status,
          cleanedAt: now.toISOString(),
        });
        totalCleaned++;
      }

      this.logger.log(`Cleaned up ${totalCleaned} expired game sessions.`);
    } catch (error: any) {
      this.logger.error(`Failed to cleanup expired sessions: ${error.message}`);
    }

    return totalCleaned;
  }
}
