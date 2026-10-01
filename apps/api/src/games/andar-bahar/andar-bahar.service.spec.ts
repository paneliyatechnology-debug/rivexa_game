import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AndarBaharService } from './andar-bahar.service.js';

describe('AndarBaharService (Laravel Source Verification)', () => {
  let andarBaharService: AndarBaharService;
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
    };
    const mockOverrideService: any = {
      getOverride: vi.fn().mockReturnValue(null),
    };
    andarBaharService = new AndarBaharService(mockDb, mockReferralService, mockOverrideService);
  });

  it('should return odds matching exact Laravel default settings (Andar=1.90, Bahar=2.00, Tie=8.00)', () => {
    expect(andarBaharService.getOdds('andar')).toBe(1.90);
    expect(andarBaharService.getOdds('bahar')).toBe(2.00);
    expect(andarBaharService.getOdds('tie')).toBe(8.00);
  });

  it('should generate 52 standard cards deck', () => {
    const deck = andarBaharService.getFullDeck();
    expect(deck.length).toBe(52);
    expect(new Set(deck).size).toBe(52);
  });
});
