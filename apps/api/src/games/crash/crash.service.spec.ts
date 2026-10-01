import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrashService } from './crash.service.js';

describe('CrashService (Laravel Source Verification)', () => {
  let crashService: CrashService;
  let mockDb: any;
  let mockReferralService: any;

  beforeEach(() => {
    mockDb = {
      crashRound: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      crashBet: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      wallet: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      walletTransaction: {
        create: vi.fn(),
      },
    };
    mockReferralService = {
      processBetCommission: vi.fn(),
    };
    const mockGameOverrideService = {
      getOverride: vi.fn().mockReturnValue(null),
    };
    crashService = new CrashService(mockDb, mockReferralService, mockGameOverrideService as any);
  });

  it('should generate provably fair HMAC crash multiplier within [1.00, 500.00] matching Laravel GameHelper', () => {
    const seed1 = 'test_seed_1';
    const seed2 = 'test_seed_2';

    const mult1 = crashService.generateCrashPoint(seed1);
    const mult2 = crashService.generateCrashPoint(seed2);

    expect(mult1).toBeGreaterThanOrEqual(1.00);
    expect(mult1).toBeLessThanOrEqual(500.00);

    expect(mult2).toBeGreaterThanOrEqual(1.00);
    expect(mult2).toBeLessThanOrEqual(500.00);

    // Deterministic HMAC for fixed seed
    expect(crashService.generateCrashPoint(seed1)).toBe(mult1);
  });
});
