import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MinesService } from './mines.service.js';

describe('MinesService (Laravel Source Verification)', () => {
  let minesService: MinesService;
  let mockDb: any;
  let mockReferralService: any;

  beforeEach(() => {
    mockDb = {
      wallet: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      walletTransaction: {
        create: vi.fn(),
      },
      minesGame: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    mockReferralService = {
      processBetCommission: vi.fn(),
    };
    const mockGameOverrideService = {
      getOverride: vi.fn().mockReturnValue(null),
    };
    minesService = new MinesService(mockDb, mockReferralService, mockGameOverrideService as any);
  });

  it('should calculate exact multipliers matching Laravel MineGeneratorService (3 mines, 96% RTP)', () => {
    const calc = (minesService as any).calculateMultiplier.bind(minesService);

    // 1 safe pick with 3 mines
    expect(calc(3, 1)).toBe(1.09);

    // 2 safe picks with 3 mines
    expect(calc(3, 2)).toBe(1.25);

    // 3 safe picks with 3 mines
    expect(calc(3, 3)).toBe(1.43);
  });

  it('should generate sorted mine positions of specified count within 0-24 grid', () => {
    const gen = (minesService as any).generateMinePositions.bind(minesService);

    const pos1 = gen(3, 25);
    expect(pos1.length).toBe(3);
    expect(new Set(pos1).size).toBe(3);
    pos1.forEach((p: number) => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(24);
    });

    const pos2 = gen(10, 25);
    expect(pos2.length).toBe(10);
    expect(new Set(pos2).size).toBe(10);
  });
});
