import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParityService } from './parity.service.js';

describe('ParityService (Laravel Source Verification)', () => {
  let parityService: ParityService;
  let mockDb: any;
  let mockReferralService: any;

  beforeEach(() => {
    mockDb = {
      parityPeriod: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      parityBet: {
        findMany: vi.fn(),
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
    const mockOverrideService: any = {
      getOverride: vi.fn().mockReturnValue(null),
      setOverride: vi.fn(),
    };
    parityService = new ParityService(mockDb, mockReferralService, mockOverrideService);
  });

  it('should generate period ID matching exact Laravel GameHelper format', () => {
    const periodId = parityService.getCurrentPeriodId(30);
    // Format: YYYYMMDD + 4 digit index
    expect(periodId).toMatch(/^\d{12}$/);
  });

  it('should calculate payouts exactly as defined in Laravel GameEngineService', () => {
    const calc = (parityService as any).calculatePotentialPayout.bind(parityService);

    // Number bet on 7 when winning number is 7 -> 9x
    expect(calc('7', 100, 7)).toBe(900);

    // Number bet on 7 when winning number is 3 -> 0x
    expect(calc('7', 100, 3)).toBe(0);

    // Green bet on 7 (odd) -> 2x
    expect(calc('green', 100, 7)).toBe(200);

    // Green bet on 5 (violet + green) -> 1.5x
    expect(calc('green', 100, 5)).toBe(150);

    // Red bet on 4 (even) -> 2x
    expect(calc('red', 100, 4)).toBe(200);

    // Red bet on 0 (violet + red) -> 1.5x
    expect(calc('red', 100, 0)).toBe(150);

    // Violet bet on 0 or 5 -> 4.5x
    expect(calc('violet', 100, 0)).toBe(450);
    expect(calc('violet', 100, 5)).toBe(450);

    // Violet bet on 3 -> 0x
    expect(calc('violet', 100, 3)).toBe(0);
  });
});
