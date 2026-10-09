import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameSessionsService } from './game-sessions.service.js';
import { GameSessionTokenService } from './game-session-token.service.js';
import { GameSessionAuditService } from './game-session-audit.service.js';
import { GameProviderRegistry } from './providers/game-provider.registry.js';
import { InternalGameProviderAdapter } from './providers/internal-game-provider.adapter.js';
import { MockGameProviderAdapter } from './providers/mock-game-provider.adapter.js';

describe('GameSessionsService', () => {
  let service: GameSessionsService;
  let tokenService: GameSessionTokenService;
  let auditService: GameSessionAuditService;
  let providerRegistry: GameProviderRegistry;
  let mockDb: any;

  beforeEach(() => {
    tokenService = new GameSessionTokenService();
    providerRegistry = new GameProviderRegistry();

    const internalAdapter = new InternalGameProviderAdapter();
    const mockAdapter = new MockGameProviderAdapter();
    providerRegistry.registerProvider(internalAdapter);
    providerRegistry.registerProvider(mockAdapter);

    mockDb = {
      user: {
        findUnique: vi.fn(),
      },
      game: {
        findFirst: vi.fn(),
      },
      gameSession: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      gameSessionEvent: {
        create: vi.fn(),
      },
    };

    auditService = new GameSessionAuditService(mockDb);
    service = new GameSessionsService(mockDb, tokenService, auditService, providerRegistry);
  });

  it('should successfully launch an internal game session', async () => {
    const userId = 'user-123';
    const gameId = 'chicken-road';

    mockDb.user.findUnique.mockResolvedValue({ id: userId, status: 'ACTIVE' });
    mockDb.game.findFirst.mockResolvedValue({ id: 'game-uuid-1', slug: 'chicken-road', name: 'Chicken Road', isActive: true });
    
    const fakeSession = {
      id: 'session-uuid-1',
      userId,
      gameId: 'game-uuid-1',
      tokenHash: 'somehash',
      status: 'ACTIVE',
      mode: 'REAL',
      currency: 'INR',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 600000),
      absoluteExpiresAt: new Date(Date.now() + 7200000),
      metadata: {},
    };

    mockDb.gameSession.create.mockResolvedValue(fakeSession);
    mockDb.gameSession.update.mockResolvedValue({
      ...fakeSession,
      status: 'ACTIVE',
      metadata: { launchUrl: '/chicken-road' },
    });

    const result = await service.launchGame(userId, { gameId, mode: 'REAL', currency: 'INR' });

    expect(result).toBeDefined();
    expect(result.sessionId).toBe('session-uuid-1');
    expect(result.token).toMatch(/^gs_/);
    expect(result.launchUrl).toContain('/chicken-road');
    expect(result.status).toBe('ACTIVE');
  });

  it('should throw ForbiddenException if user account is suspended', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'user-123', status: 'SUSPENDED' });

    await expect(
      service.launchGame('user-123', { gameId: 'chicken-road' })
    ).rejects.toThrow('User account is suspended');
  });

  it('should throw ForbiddenException if game is disabled', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'user-123', status: 'ACTIVE' });
    mockDb.game.findFirst.mockResolvedValue({ id: 'game-uuid-1', slug: 'chicken-road', name: 'Chicken Road', isActive: false });

    await expect(
      service.launchGame('user-123', { gameId: 'chicken-road' })
    ).rejects.toThrow('currently disabled');
  });

  it('should prevent cross-user session status viewing', async () => {
    mockDb.gameSession.findUnique.mockResolvedValue({
      id: 'session-123',
      userId: 'user-1',
      gameId: 'game-1',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 600000),
      absoluteExpiresAt: new Date(Date.now() + 7200000),
      createdAt: new Date(),
    });

    await expect(
      service.getSessionStatus('session-123', 'user-2', false)
    ).rejects.toThrow('You do not have permission to view this session');
  });

  it('should allow admin to view any user session status', async () => {
    mockDb.gameSession.findUnique.mockResolvedValue({
      id: 'session-123',
      userId: 'user-1',
      gameId: 'game-1',
      status: 'ACTIVE',
      mode: 'REAL',
      currency: 'INR',
      expiresAt: new Date(Date.now() + 600000),
      absoluteExpiresAt: new Date(Date.now() + 7200000),
      createdAt: new Date(),
      game: { id: 'game-1', slug: 'chicken-road', name: 'Chicken Road' },
      user: { id: 'user-1', name: 'Player 1', email: 'p1@test.com' },
    });

    const status = await service.getSessionStatus('session-123', 'admin-user', true);
    expect(status.id).toBe('session-123');
    expect(status.userId).toBe('user-1');
  });

  it('should validate a correct bearer token passed from URL', async () => {
    const { rawToken, tokenHash } = tokenService.generateToken();

    mockDb.gameSession.findFirst.mockResolvedValue({
      id: 'session-valid-1',
      userId: 'user-1',
      gameId: 'game-1',
      status: 'ACTIVE',
      mode: 'REAL',
      currency: 'INR',
      expiresAt: new Date(Date.now() + 600000),
      absoluteExpiresAt: new Date(Date.now() + 7200000),
      game: { id: 'game-1', slug: 'chicken-road', name: 'Chicken Road', isActive: true },
      user: { id: 'user-1', name: 'Player 1', email: 'p1@test.com', status: 'ACTIVE' },
    });

    const result = await service.validateToken(rawToken);
    expect(result.valid).toBe(true);
    expect(result.sessionId).toBe('session-valid-1');
  });

  it('should return invalid with Error 45 when invalid token is passed', async () => {
    mockDb.gameSession.findFirst.mockResolvedValue(null);

    const result = await service.validateToken('invalid_token_xyz');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Invalid user login credentials(Error:45)');
    expect(result.errorCode).toBe(45);
  });
});
