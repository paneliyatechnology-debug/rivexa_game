import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class ReferralService {
  constructor(private readonly db: DatabaseService) {}

  private readonly levelRates: Record<number, number> = {
    1: 3.0,
    2: 2.0,
    3: 1.0,
  };

  /**
   * Process 3-tier referral commissions for a settled bet.
   * Traceable to Laravel: App\Services\ReferralCommissionService::processBetCommission
   */
  async processBetCommission(bettorUserId: string, betAmount: number, betId?: string) {
    const bettor = await this.db.user.findUnique({
      where: { id: bettorUserId },
      select: { id: true, name: true, referredById: true },
    });

    if (!bettor || !bettor.referredById) {
      return;
    }

    let currentReferrerId: string | null = bettor.referredById;

    for (let level = 1; level <= 3; level++) {
      if (!currentReferrerId) {
        break;
      }

      const referrer = await this.db.user.findUnique({
        where: { id: currentReferrerId },
        select: { id: true, name: true, referredById: true },
      });

      if (!referrer) {
        break;
      }

      const rate = this.levelRates[level] || 0.0;
      const commissionAmount = Number(((betAmount * rate) / 100.0).toFixed(4));

      if (commissionAmount > 0) {
        // 1. Record commission log
        await this.db.commission.create({
          data: {
            userId: referrer.id,
            sourceUserId: bettor.id,
            betId: betId || null,
            level,
            amount: commissionAmount,
            ratePercentage: rate,
            status: 'credited',
          },
        });

        // 2. Update referral cumulative total
        const existingReferral = await this.db.referral.findFirst({
          where: { referrerId: referrer.id, refereeId: bettor.id, level },
          select: { id: true },
        });

        if (existingReferral) {
          await this.db.referral.update({
            where: { id: existingReferral.id },
            data: { totalCommissionEarned: { increment: commissionAmount } },
          });
        } else {
          await this.db.referral.create({
            data: {
              referrerId: referrer.id,
              refereeId: bettor.id,
              level,
              totalCommissionEarned: commissionAmount,
            },
          });
        }

        // 3. Direct credit to referrer's commission wallet balance
        const referrerWallet = await this.db.wallet.findUnique({
          where: { userId: referrer.id },
        });

        if (referrerWallet) {
          const balanceBefore = Number(referrerWallet.commissionBalance);
          const balanceAfter = balanceBefore + commissionAmount;

          await this.db.wallet.update({
            where: { id: referrerWallet.id },
            data: { commissionBalance: balanceAfter },
          });

          await this.db.walletTransaction.create({
            data: {
              walletId: referrerWallet.id,
              type: 'commission',
              amount: commissionAmount,
              balanceBefore,
              balanceAfter,
              referenceType: 'referral_bonus',
              referenceId: `COMM_BET_${betId || 'GENERIC'}_L${level}`,
              metadata: {
                description: `Level ${level} commission from player ${bettor.name || bettor.id}`,
              },
            },
          });
        }
      }

      // Move to upstream referrer (Level 2 & Level 3)
      currentReferrerId = referrer.referredById;
    }
  }

  async getReferralStats(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, wallet: true },
    });

    const level1Count = await this.db.user.count({ where: { referredById: userId } });
    
    // Level 2 downlines
    const level1Users = await this.db.user.findMany({
      where: { referredById: userId },
      select: { id: true },
    });
    const level1Ids = level1Users.map((u: any) => u.id);

    const level2Count = level1Ids.length > 0
      ? await this.db.user.count({ where: { referredById: { in: level1Ids } } })
      : 0;

    const level2Users = level1Ids.length > 0
      ? await this.db.user.findMany({
          where: { referredById: { in: level1Ids } },
          select: { id: true },
        })
      : [];
    const level2Ids = level2Users.map((u: any) => u.id);

    const level3Count = level2Ids.length > 0
      ? await this.db.user.count({ where: { referredById: { in: level2Ids } } })
      : 0;

    const totalCommission = Number(user?.wallet?.commissionBalance || 0);

    return {
      referralCode: user?.referralCode || '',
      level1Count,
      level2Count,
      level3Count,
      totalCommission,
      commissionBalance: totalCommission,
    };
  }
}
