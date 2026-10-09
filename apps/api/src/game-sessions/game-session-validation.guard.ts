import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { GameSessionTokenService } from './game-session-token.service.js';

@Injectable()
export class GameSessionValidationGuard implements CanActivate {
  constructor(
    private readonly db: DatabaseService,
    private readonly tokenService: GameSessionTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract raw session token from headers
    let rawToken: string | null = null;
    const sessionHeader = request.headers['x-game-session-token'];
    
    if (sessionHeader && typeof sessionHeader === 'string') {
      rawToken = sessionHeader.trim();
    } else {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer gs_')) {
        rawToken = authHeader.substring(7).trim();
      }
    }

    if (!rawToken) {
      throw new UnauthorizedException('Game session token is required.');
    }

    const tokenHash = this.tokenService.hashToken(rawToken);
    const session = await this.db.gameSession.findFirst({
      where: { tokenHash },
      include: { game: true, user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid game session token.');
    }

    const now = new Date();
    if (session.status !== 'ACTIVE' && session.status !== 'CREATED') {
      throw new ForbiddenException(`Game session is ${session.status.toLowerCase()}.`);
    }

    if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
      // Mark as EXPIRED in background if needed
      await this.db.gameSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED', closedAt: now },
      });
      throw new ForbiddenException('Game session has expired.');
    }

    // Ensure session owner matches authenticated request user (if present)
    if (request.user?.id && request.user.id !== session.userId) {
      throw new ForbiddenException('Cross-user session access is forbidden.');
    }

    // Attach validated game session to request object
    request.gameSession = session;
    return true;
  }
}
