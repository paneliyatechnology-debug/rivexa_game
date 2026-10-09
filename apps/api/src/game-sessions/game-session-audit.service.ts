import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class GameSessionAuditService {
  private readonly logger = new Logger(GameSessionAuditService.name);

  constructor(private readonly db: DatabaseService) {}

  async logEvent(sessionId: string, eventType: string, payload: Record<string, any> = {}): Promise<void> {
    try {
      // Redact any potential sensitive properties before storing
      const safePayload = { ...payload };
      delete safePayload.rawToken;
      delete safePayload.token;
      delete safePayload.authorization;
      delete safePayload.password;
      delete safePayload.secret;

      await this.db.gameSessionEvent.create({
        data: {
          sessionId,
          eventType,
          payload: safePayload,
        },
      });
      this.logger.debug(`Audit event logged: [${eventType}] for session ${sessionId}`);
    } catch (error: any) {
      this.logger.error(`Failed to log audit event [${eventType}] for session ${sessionId}: ${error.message}`);
    }
  }
}
