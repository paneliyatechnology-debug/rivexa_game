import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DepositService } from './deposit.service.js';

describe('DepositService (Laravel Source Verification)', () => {
  let depositService: DepositService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      merchantAccount: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      depositRequest: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      merchantAssignmentLog: {
        create: vi.fn(),
      },
      depositProof: {
        create: vi.fn(),
      },
      depositVerification: {
        create: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
      wallet: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      walletTransaction: {
        create: vi.fn(),
      },
    };
    depositService = new DepositService(mockDb);
  });

  it('should generate deposit ID matching exact Laravel DEPYYYYMMDDXXXXXX format', () => {
    const depositId = depositService.generateDepositId();
    expect(depositId).toMatch(/^DEP\d{8}[A-Z0-9]{6}$/);
  });

  it('should select merchant account with lowest load ratio matching Laravel MerchantLoadBalancerService', async () => {
    const merchants = [
      { id: 'm1', name: 'Merchant High Load', dailyLimit: 200000, currentDailyTotal: 180000, priority: 2, status: 'active', region: 'IN' }, // 90% load
      { id: 'm2', name: 'Merchant Low Load', dailyLimit: 200000, currentDailyTotal: 20000, priority: 1, status: 'active', region: 'IN' },   // 10% load
    ];
    mockDb.merchantAccount.findMany.mockResolvedValue(merchants);

    const selected = await depositService.selectOptimalMerchant(5000);
    expect(selected.id).toBe('m2'); // Low load merchant selected
  });
});
