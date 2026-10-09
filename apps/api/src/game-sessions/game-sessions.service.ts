import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { GameSessionTokenService } from './game-session-token.service.js';
import { GameSessionAuditService } from './game-session-audit.service.js';
import { GameProviderRegistry } from './providers/game-provider.registry.js';
import { LaunchGameDto } from './dto/launch-game.dto.js';
import { GameSessionQueryDto } from './dto/game-session-query.dto.js';

@Injectable()
export class GameSessionsService {
  private readonly logger = new Logger(GameSessionsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly tokenService: GameSessionTokenService,
    private readonly auditService: GameSessionAuditService,
    private readonly providerRegistry: GameProviderRegistry,
  ) {}

  /**
   * Launch a game session: authenticates game access, generates unique bearer token,
   * stores SHA-256 token hash in DB, invokes provider adapter, and returns launch payload.
   */
  async launchGame(userId: string, dto: LaunchGameDto) {
    // 1. Validate User
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, name: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(`User account is ${user.status.toLowerCase()}.`);
    }

    // 2. Validate Game
    // Only include `id` filter when gameId looks like a UUID to avoid Prisma UUID parse errors
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = UUID_REGEX.test(dto.gameId);

    let game = await this.db.game.findFirst({
      where: isUuid
        ? { OR: [{ id: dto.gameId }, { slug: dto.gameId }] }
        : { slug: dto.gameId },
    });

    if (!game) {
      const formattedName = dto.gameId
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      try {
        game = await this.db.game.upsert({
          where: { slug: dto.gameId },
          update: { isActive: true },
          create: {
            slug: dto.gameId,
            name: formattedName,
            category: 'ORIGINAL',
            engine: 'react',
            isActive: true,
          },
        });
      } catch (upsertError: any) {
        this.logger.warn(`Game upsert failed for slug '${dto.gameId}': ${upsertError.message}`);
        game = await this.db.game.findFirst({ where: { slug: dto.gameId } });
      }
    }

    if (!game) {
      throw new NotFoundException(`Game with ID/slug '${dto.gameId}' not found.`);
    }

    if (!game.isActive) {
      throw new ForbiddenException(`Game '${game.name}' is currently disabled.`);
    }

    // 3. Check Idempotency Key (if provided)
    if (dto.idempotencyKey) {
      const existingSession = await this.db.gameSession.findFirst({
        where: {
          userId,
          gameId: game.id,
          status: { in: ['CREATED', 'ACTIVE'] },
          metadata: { path: ['idempotencyKey'], equals: dto.idempotencyKey },
        },
        include: { game: true },
      });

      if (existingSession && existingSession.expiresAt > new Date()) {
        this.logger.log(`Idempotent launch returned existing session ${existingSession.id}`);
        return {
          sessionId: existingSession.id,
          launchUrl: (existingSession.metadata as any)?.launchUrl || `/${game.slug}`,
          launchType: (existingSession.metadata as any)?.launchType || 'DIRECT_ROUTE',
          expiresAt: existingSession.expiresAt.toISOString(),
          status: existingSession.status,
          reused: true,
        };
      }
    }

    // 4. Resolve Provider Adapter
    const providerId = dto.providerId || 'internal';
    const adapter = this.providerRegistry.getProvider(providerId);

    // 5. Calculate Timestamps
    const launchTtl = Number(process.env.GAME_LAUNCH_TOKEN_TTL_SECONDS) || 600;
    const idleTimeout = Number(process.env.GAME_SESSION_IDLE_TIMEOUT_SECONDS) || 900;
    const absoluteTimeout = Number(process.env.GAME_SESSION_ABSOLUTE_TIMEOUT_SECONDS) || 7200;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + Math.min(launchTtl, idleTimeout) * 1000);
    const absoluteExpiresAt = new Date(now.getTime() + absoluteTimeout * 1000);

    // 6. Generate Token (Raw + SHA-256 Hash)
    const { rawToken, tokenHash } = this.tokenService.generateToken();

    // 7. Store Session in PostgreSQL (Status: CREATED)
    let session: any = null;
    try {
      session = await this.db.gameSession.create({
        data: {
          userId,
          gameId: game.id,
          tokenHash,
          status: 'CREATED',
          mode: dto.mode || 'REAL',
          currency: dto.currency || 'INR',
          createdAt: now,
          expiresAt,
          absoluteExpiresAt,
          metadata: {
            idempotencyKey: dto.idempotencyKey || null,
            ...(dto.metadata || {}),
          },
        },
      });
    } catch (dbError: any) {
      this.logger.error(`Database session creation failed: ${dbError.message}`);
      throw new BadRequestException('Failed to create game session record.');
    }

    // 8. Invoke Provider Adapter
    try {
      const launchResult = await adapter.createLaunchSession({
        sessionId: session.id,
        userId,
        gameId: game.id,
        gameSlug: game.slug,
        mode: dto.mode || 'REAL',
        currency: dto.currency || 'INR',
        token: rawToken,
        metadata: dto.metadata,
      });

      // Update session with provider reference and mark ACTIVE
      const updatedSession = await this.db.gameSession.update({
        where: { id: session.id },
        data: {
          status: 'ACTIVE',
          providerSessionId: launchResult.providerSessionId || null,
          lastActivityAt: now,
          metadata: {
            ...(session.metadata as object),
            launchUrl: launchResult.launchUrl,
            launchType: launchResult.launchType,
          },
        },
      });

      // 9. Log Audit Event
      await this.auditService.logEvent(session.id, 'CREATED', {
        userId,
        gameId: game.id,
        gameSlug: game.slug,
        providerId: adapter.providerId,
        mode: dto.mode || 'REAL',
        currency: dto.currency || 'INR',
      });

      return {
        sessionId: updatedSession.id,
        token: rawToken, // Returned raw ONCE to frontend
        launchUrl: launchResult.launchUrl,
        launchType: launchResult.launchType,
        expiresAt: updatedSession.expiresAt.toISOString(),
        status: updatedSession.status,
      };
    } catch (launchError: any) {
      this.logger.error(`Provider launch failed for session ${session.id}: ${launchError.message}`);
      
      // Mark session FAILED
      await this.db.gameSession.update({
        where: { id: session.id },
        data: { status: 'FAILED' },
      });

      await this.auditService.logEvent(session.id, 'FAILED', {
        error: launchError.message,
      });

      throw new BadRequestException(`Game launch failed: ${launchError.message}`);
    }
  }

  /**
   * Validates a raw game session bearer token passed via URL parameter (e.g. authToken, token, or sessionToken).
   * Hashes the token using SHA-256 and verifies session status, lifetime, and user eligibility.
   */
  async validateToken(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      return {
        valid: false,
        message: 'Invalid user login credentials(Error:45)',
        errorCode: 45,
      };
    }

    try {
      const tokenHash = this.tokenService.hashToken(rawToken);
      const session = await this.db.gameSession.findFirst({
        where: { tokenHash },
        include: {
          game: { select: { id: true, slug: true, name: true, isActive: true } },
          user: { select: { id: true, name: true, email: true, status: true } },
        },
      });

      if (!session) {
        return {
          valid: false,
          message: 'Invalid user login credentials(Error:45)',
          errorCode: 45,
        };
      }

      const now = new Date();

      if (session.status !== 'ACTIVE' && session.status !== 'CREATED') {
        return {
          valid: false,
          message: 'Invalid user login credentials(Error:45)',
          errorCode: 45,
          status: session.status,
        };
      }

      if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
        await this.db.gameSession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED', closedAt: now },
        });
        return {
          valid: false,
          message: 'Invalid user login credentials(Error:45)',
          errorCode: 45,
          status: 'EXPIRED',
        };
      }

      if (session.user.status !== 'ACTIVE' || !session.game.isActive) {
        return {
          valid: false,
          message: 'Invalid user login credentials(Error:45)',
          errorCode: 45,
        };
      }

      // Mark ACTIVE if CREATED
      if (session.status === 'CREATED') {
        await this.db.gameSession.update({
          where: { id: session.id },
          data: { status: 'ACTIVE', lastActivityAt: now },
        });
      }

      return {
        valid: true,
        sessionId: session.id,
        userId: session.userId,
        gameId: session.gameId,
        gameSlug: session.game.slug,
        mode: session.mode,
        currency: session.currency,
        expiresAt: session.expiresAt.toISOString(),
      };
    } catch {
      return {
        valid: false,
        message: 'Invalid user login credentials(Error:45)',
        errorCode: 45,
      };
    }
  }

  /**
   * Returns current session status with ownership verification.
   */
  async getSessionStatus(sessionId: string, requestingUserId: string, isAdmin = false) {
    const session = await this.db.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        game: { select: { id: true, slug: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Game session not found.');
    }

    if (!isAdmin && session.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have permission to view this session.');
    }

    const now = new Date();
    let currentStatus = session.status;

    if (
      (currentStatus === 'ACTIVE' || currentStatus === 'CREATED') &&
      (session.expiresAt <= now || session.absoluteExpiresAt <= now)
    ) {
      currentStatus = 'EXPIRED';
      await this.db.gameSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED', closedAt: now },
      });
    }

    return {
      id: session.id,
      userId: session.userId,
      user: session.user,
      gameId: session.gameId,
      game: session.game,
      status: currentStatus,
      mode: session.mode,
      currency: session.currency,
      providerSessionId: session.providerSessionId,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      absoluteExpiresAt: session.absoluteExpiresAt.toISOString(),
      lastActivityAt: session.lastActivityAt?.toISOString() || null,
      closedAt: session.closedAt?.toISOString() || null,
      revokedAt: session.revokedAt?.toISOString() || null,
      revocationReason: session.revocationReason || null,
    };
  }

  /**
   * Refreshes active session lastActivityAt and idle expiration timestamp.
   */
  async heartbeat(sessionId: string, requestingUserId: string) {
    const session = await this.db.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Game session not found.');
    }

    if (session.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have permission to access this session.');
    }

    const now = new Date();
    if (session.status !== 'ACTIVE') {
      throw new ForbiddenException(`Cannot heartbeat a ${session.status.toLowerCase()} session.`);
    }

    if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
      await this.db.gameSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED', closedAt: now },
      });
      throw new ForbiddenException('Game session has expired.');
    }

    const idleTimeout = Number(process.env.GAME_SESSION_IDLE_TIMEOUT_SECONDS) || 900;
    const newIdleExpiresAt = new Date(now.getTime() + idleTimeout * 1000);
    // Never extend past absoluteExpiresAt
    const newExpiresAt = newIdleExpiresAt > session.absoluteExpiresAt ? session.absoluteExpiresAt : newIdleExpiresAt;

    const updated = await this.db.gameSession.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: now,
        expiresAt: newExpiresAt,
      },
    });

    await this.auditService.logEvent(sessionId, 'HEARTBEAT', {
      lastActivityAt: now.toISOString(),
    });

    return {
      sessionId: updated.id,
      status: updated.status,
      lastActivityAt: updated.lastActivityAt?.toISOString(),
      expiresAt: updated.expiresAt.toISOString(),
    };
  }

  /**
   * Explicitly closes an active game session.
   */
  async closeSession(sessionId: string, requestingUserId: string) {
    const session = await this.db.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Game session not found.');
    }

    if (session.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have permission to close this session.');
    }

    const now = new Date();
    const updated = await this.db.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedAt: now,
      },
    });

    await this.auditService.logEvent(sessionId, 'CLOSED', {
      closedBy: requestingUserId,
      closedAt: now.toISOString(),
    });

    return {
      sessionId: updated.id,
      status: updated.status,
      closedAt: updated.closedAt?.toISOString(),
    };
  }

  /**
   * Administrative revocation of a game session.
   */
  async revokeSession(sessionId: string, adminId: string, reason?: string) {
    const session = await this.db.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Game session not found.');
    }

    const now = new Date();
    const revocationReason = reason || 'Administratively revoked by admin';

    const updated = await this.db.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'REVOKED',
        revokedAt: now,
        closedAt: now,
        revocationReason,
      },
    });

    await this.auditService.logEvent(sessionId, 'REVOKED', {
      adminId,
      reason: revocationReason,
      revokedAt: now.toISOString(),
    });

    this.logger.warn(`Admin ${adminId} revoked session ${sessionId}: ${revocationReason}`);

    return {
      sessionId: updated.id,
      status: updated.status,
      revokedAt: updated.revokedAt?.toISOString(),
      revocationReason: updated.revocationReason,
    };
  }

  /**
   * Returns active and recent game sessions for the authenticated user.
   */
  async getUserSessions(userId: string) {
    const sessions = await this.db.gameSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        game: { select: { id: true, name: true, slug: true } },
      },
    });

    return sessions.map((s: any) => ({
      id: s.id,
      gameId: s.gameId,
      gameName: s.game?.name,
      gameSlug: s.game?.slug,
      status: s.status,
      mode: s.mode,
      currency: s.currency,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      lastActivityAt: s.lastActivityAt?.toISOString() || null,
    }));
  }

  /**
   * Administrative paginated query with filters.
   */
  async getAdminSessions(query: GameSessionQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.gameId) {
      where.gameId = query.gameId;
    }
    if (query.providerId) {
      where.providerId = query.providerId;
    }

    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { game: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, sessions] = await Promise.all([
      this.db.gameSession.count({ where }),
      this.db.gameSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          game: { select: { id: true, name: true, slug: true } },
          provider: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    return {
      data: sessions.map((s: any) => ({
        id: s.id,
        user: s.user,
        game: s.game,
        provider: s.provider?.name || 'Internal',
        providerSessionId: s.providerSessionId,
        status: s.status,
        mode: s.mode,
        currency: s.currency,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        lastActivityAt: s.lastActivityAt?.toISOString() || null,
        closedAt: s.closedAt?.toISOString() || null,
        revokedAt: s.revokedAt?.toISOString() || null,
        revocationReason: s.revocationReason || null,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
