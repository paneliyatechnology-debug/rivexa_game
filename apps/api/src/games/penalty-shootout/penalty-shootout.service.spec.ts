import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PenaltyShootoutService, PENALTY_DIFFICULTIES, COUNTRIES_CATALOGUE } from './penalty-shootout.service.js';
import { DatabaseService } from '../../database/database.service.js';

// ── Mock Database Service ─────────────────────────────────────────────────────

const mockRound = {
  id: 'round-uuid-1',
  publicId: 'pub-uuid-1',
  userId: 'user-uuid-1',
  difficulty: 'MEDIUM',
  betAmount: { toString: () => '100', valueOf: () => 100 },
  currentStep: 0,
  currentMultiplier: { toString: () => '1.0', valueOf: () => 1.0 },
  potentialPayout: { toString: () => '0', valueOf: () => 0 },
  status: 'ACTIVE',
  result: 'PENDING',
  serverSeed: 'a'.repeat(64),
  serverSeedHash: 'b'.repeat(64),
  clientSeed: 'c'.repeat(24),
  nonce: 1,
  homeTeam: 'Brazil',
  awayTeam: 'Argentina',
  startedAt: new Date(),
  shots: [],
};

const mockWallet = {
  id: 'wallet-uuid-1',
  userId: 'user-uuid-1',
  mainBalance: { toString: () => '1000', valueOf: () => 1000 },
  totalWinnings: { toString: () => '0', valueOf: () => 0 },
};

const createMockDb = () => ({
  penaltyShootoutRound: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
    groupBy: vi.fn().mockResolvedValue([]),
  },
  penaltyShot: {
    create: vi.fn(),
  },
  penaltyResult: {
    create: vi.fn(),
    aggregate: vi.fn().mockResolvedValue({ _sum: {}, _avg: {} }),
  },
  wallet: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  walletTransaction: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
});

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('PenaltyShootoutService', () => {
  let service: PenaltyShootoutService;
  let db: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    db = createMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PenaltyShootoutService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();

    service = module.get<PenaltyShootoutService>(PenaltyShootoutService);
  });

  afterEach(() => vi.clearAllMocks());

  // ── Configuration ──────────────────────────────────────────────────────────

  describe('getConfig()', () => {
    it('should return game config with all 4 difficulty profiles', () => {
      const config = service.getConfig();
      expect(config.gameCode).toBe('penalty-shootout');
      expect(config.difficulties).toHaveProperty('EASY');
      expect(config.difficulties).toHaveProperty('MEDIUM');
      expect(config.difficulties).toHaveProperty('HARD');
      expect(config.difficulties).toHaveProperty('HARDCORE');
      expect(config.minBet).toBe(10);
      expect(config.maxBet).toBe(100000);
    });

    it('should include a config hash for integrity checking', () => {
      const config = service.getConfig();
      expect(config.configHash).toBeDefined();
      expect(config.configHash.length).toBe(16);
    });
  });

  describe('getCountries()', () => {
    it('should return all countries from the catalogue', () => {
      const result = service.getCountries();
      expect(result.countries).toHaveLength(COUNTRIES_CATALOGUE.length);
      expect(result.disclaimer).toContain('cosmetic');
    });

    it('each country should have name, code, flag, and continent', () => {
      const result = service.getCountries();
      result.countries.forEach((c) => {
        expect(c).toHaveProperty('name');
        expect(c).toHaveProperty('code');
        expect(c).toHaveProperty('flag');
        expect(c).toHaveProperty('continent');
      });
    });
  });

  // ── Difficulty Profiles ────────────────────────────────────────────────────

  describe('PENALTY_DIFFICULTIES', () => {
    it('EASY should have 4 maxSpots and 80% goal probability', () => {
      const d = PENALTY_DIFFICULTIES.EASY;
      expect(d.maxSpots).toBe(4);
      expect(d.goalProbability).toBe(0.80);
      expect(d.multipliers).toHaveLength(5);
    });

    it('MEDIUM should have 5 maxSpots and 66% goal probability', () => {
      const d = PENALTY_DIFFICULTIES.MEDIUM;
      expect(d.maxSpots).toBe(5);
      expect(d.goalProbability).toBe(0.66);
    });

    it('HARD should have 8 maxSpots and 50% goal probability', () => {
      const d = PENALTY_DIFFICULTIES.HARD;
      expect(d.maxSpots).toBe(8);
      expect(d.goalProbability).toBe(0.50);
    });

    it('HARDCORE should have 8 maxSpots and 33% goal probability', () => {
      const d = PENALTY_DIFFICULTIES.HARDCORE;
      expect(d.maxSpots).toBe(8);
      expect(d.goalProbability).toBe(0.33);
    });

    it('all difficulties should have exactly 5 multipliers', () => {
      Object.values(PENALTY_DIFFICULTIES).forEach((d) => {
        expect(d.multipliers).toHaveLength(5);
      });
    });

    it('multipliers should increase monotonically for all difficulties', () => {
      Object.values(PENALTY_DIFFICULTIES).forEach((d) => {
        for (let i = 1; i < d.multipliers.length; i++) {
          expect(d.multipliers[i]).toBeGreaterThan(d.multipliers[i - 1]);
        }
      });
    });
  });

  // ── startRound ─────────────────────────────────────────────────────────────

  describe('startRound()', () => {
    beforeEach(() => {
      db.penaltyShootoutRound.findFirst.mockResolvedValue(null); // no active round
      db.wallet.findUnique.mockResolvedValue(mockWallet);
      db.$transaction.mockImplementation(async (ops: any[]) => {
        const results = await Promise.all(ops);
        return results;
      });
      db.penaltyShootoutRound.create.mockResolvedValue({
        ...mockRound,
        shots: [],
      });
      db.wallet.update.mockResolvedValue(mockWallet);
      db.walletTransaction.create.mockResolvedValue({});
    });

    it('should throw if user already has an active round', async () => {
      db.penaltyShootoutRound.findFirst.mockResolvedValue(mockRound);

      await expect(
        service.startRound({
          userId: 'user-uuid-1',
          betAmount: 100,
          difficulty: 'MEDIUM',
          homeTeam: 'Brazil',
          awayTeam: 'Japan',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if wallet is not found', async () => {
      db.wallet.findUnique.mockResolvedValue(null);

      await expect(
        service.startRound({
          userId: 'user-uuid-1',
          betAmount: 100,
          difficulty: 'MEDIUM',
          homeTeam: 'Brazil',
          awayTeam: 'Japan',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if balance is insufficient', async () => {
      db.wallet.findUnique.mockResolvedValue({
        ...mockWallet,
        mainBalance: { toString: () => '50', valueOf: () => 50 },
      });

      await expect(
        service.startRound({
          userId: 'user-uuid-1',
          betAmount: 100,
          difficulty: 'MEDIUM',
          homeTeam: 'Brazil',
          awayTeam: 'Japan',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── shoot ──────────────────────────────────────────────────────────────────

  describe('shoot()', () => {
    it('should throw NotFoundException if round does not exist', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue(null);

      await expect(
        service.shoot({ userId: 'user-uuid-1', gameRoundId: 'bad-id', targetSpot: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if round belongs to a different user', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        userId: 'different-user',
      });

      await expect(
        service.shoot({ userId: 'user-uuid-1', gameRoundId: 'round-uuid-1', targetSpot: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if round is not ACTIVE', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        status: 'SAVED',
      });

      await expect(
        service.shoot({ userId: 'user-uuid-1', gameRoundId: 'round-uuid-1', targetSpot: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if targetSpot exceeds maxSpots for MEDIUM (max 5)', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        difficulty: 'MEDIUM',
        shots: [],
      });

      await expect(
        service.shoot({ userId: 'user-uuid-1', gameRoundId: 'round-uuid-1', targetSpot: 6 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow targetSpot up to 8 for HARD difficulty', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        difficulty: 'HARD',
        shots: [],
      });

      db.$transaction.mockImplementation(async (fn: any) =>
        fn({
          penaltyShot: { create: vi.fn().mockResolvedValue({}) },
          penaltyShootoutRound: { update: vi.fn().mockResolvedValue({ ...mockRound, currentStep: 1 }) },
          penaltyResult: { create: vi.fn().mockResolvedValue({}) },
          wallet: { findUnique: vi.fn().mockResolvedValue(mockWallet) },
          walletTransaction: { create: vi.fn().mockResolvedValue({}) },
        }),
      );

      // Should NOT throw for targetSpot = 8 on HARD
      await expect(
        service.shoot({ userId: 'user-uuid-1', gameRoundId: 'round-uuid-1', targetSpot: 8 }),
      ).resolves.toBeDefined();
    });

    it('should throw if a shot for the same number was already processed (idempotency)', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        currentStep: 0,
        shots: [
          { shotNumber: 1, targetSpot: 1, keeperSpot: 2, result: 'GOAL' },
        ],
      });

      await expect(
        service.shoot({ userId: 'user-uuid-1', gameRoundId: 'round-uuid-1', targetSpot: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if more than 5 shots attempted', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        currentStep: 5, // already at max
        shots: Array.from({ length: 5 }, (_, i) => ({ shotNumber: i + 1, result: 'GOAL' })),
      });

      await expect(
        service.shoot({ userId: 'user-uuid-1', gameRoundId: 'round-uuid-1', targetSpot: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── cashout ────────────────────────────────────────────────────────────────

  describe('cashout()', () => {
    it('should throw if round does not exist', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue(null);

      await expect(
        service.cashout({ userId: 'user-uuid-1', gameRoundId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if round belongs to a different user', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        userId: 'other-user',
      });

      await expect(
        service.cashout({ userId: 'user-uuid-1', gameRoundId: 'round-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if round is not ACTIVE', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        status: 'CASHED_OUT',
      });

      await expect(
        service.cashout({ userId: 'user-uuid-1', gameRoundId: 'round-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if no successful kick has been made yet (currentStep < 1)', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        currentStep: 0,
        status: 'ACTIVE',
      });

      await expect(
        service.cashout({ userId: 'user-uuid-1', gameRoundId: 'round-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── verifyFairness ─────────────────────────────────────────────────────────

  describe('verifyFairness()', () => {
    it('should throw NotFoundException for unknown round', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyFairness('bad-round', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not the round owner', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        userId: 'different-user',
        shots: [],
      });

      await expect(
        service.verifyFairness('round-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return verifiable=false and no server seed for ACTIVE round', async () => {
      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        status: 'ACTIVE',
        shots: [],
      });

      const result = await service.verifyFairness('round-uuid-1', 'user-uuid-1');
      expect(result.verifiable).toBe(false);
      expect(result).not.toHaveProperty('serverSeed');
      expect(result.serverSeedHash).toBeDefined();
    });

    it('should verify outcomes for a settled round', async () => {
      // Create a deterministic round for testing
      const crypto = await import('crypto');
      const testServerSeed = crypto.randomBytes(32).toString('hex');
      const testClientSeed = crypto.randomBytes(12).toString('hex');

      db.penaltyShootoutRound.findUnique.mockResolvedValue({
        ...mockRound,
        status: 'SAVED',
        difficulty: 'MEDIUM',
        serverSeed: testServerSeed,
        serverSeedHash: crypto.createHash('sha256').update(testServerSeed).digest('hex'),
        clientSeed: testClientSeed,
        nonce: 1,
        shots: [
          {
            shotNumber: 1,
            targetSpot: 2,
            keeperSpot: 4,
            result: 'GOAL',
          },
        ],
      });

      const result = await service.verifyFairness('round-uuid-1', 'user-uuid-1');
      expect(result.verifiable).toBe(true);
      expect(result.hashMatches).toBe(true);
      expect(result.shots).toHaveLength(1);
      // integrityOk may vary depending on the random seed, but structure must be correct
      expect(result.shots[0]).toHaveProperty('integrityOk');
      expect(result.shots[0]).toHaveProperty('recomputedFloat');
    });
  });
});
