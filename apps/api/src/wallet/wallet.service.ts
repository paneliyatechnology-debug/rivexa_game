import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { toValidUserId } from '../common/utils/user-id.util.js';

@Injectable()
export class WalletService {
  constructor(private readonly db: DatabaseService) {}

  private toValidUserId(userId?: string): string {
    return toValidUserId(userId);
  }

  async getBalance(userId: string) {
    const activeUserId = this.toValidUserId(userId);

    let wallet = await this.db.wallet.findUnique({
      where: { userId: activeUserId },
    });

    if (!wallet) {
      try {
        const userExists = await this.db.user.findUnique({ where: { id: activeUserId } });
        if (userExists) {
          wallet = await this.db.wallet.create({
            data: { userId: activeUserId, mainBalance: 1000.0, bonusBalance: 50.0 },
          });
        } else {
          await this.db.user.upsert({
            where: { id: activeUserId },
            update: {},
            create: {
              id: activeUserId,
              email: `user-${activeUserId.slice(0, 8)}@rivexa.com`,
              passwordHash: 'demo',
              referralCode: `REF-${activeUserId.slice(0, 8)}`,
            },
          });
          wallet = await this.db.wallet.upsert({
            where: { userId: activeUserId },
            update: {},
            create: { userId: activeUserId, mainBalance: 1000.0, bonusBalance: 50.0 },
          });
        }
      } catch (e) {
        // fallback
      }
    }

    return {
      walletId: wallet ? wallet.id : 'demo-wallet',
      mainBalance: wallet ? Number(wallet.mainBalance) : 1000.0,
      bonusBalance: wallet ? Number(wallet.bonusBalance) : 50.0,
      commissionBalance: wallet ? Number(wallet.commissionBalance) : 0.0,
      currency: wallet ? wallet.currency : 'INR',
    };
  }

  async getTransactions(userId: string) {
    const wallet = await this.db.wallet.findUnique({ where: { userId } });
    if (!wallet) return [];

    return this.db.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getActiveMerchantAccount() {
    let merchant = await this.db.merchantAccount.findFirst({
      where: { status: 'active' },
    });

    if (!merchant) {
      try {
        merchant = await this.db.merchantAccount.create({
          data: {
            name: 'Rivexa Official Collection Account',
            accountHolder: 'Rivexa Gaming Solutions',
            upiId: 'rivexa.pay@upi',
            qrImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=rivexa.pay@upi&pn=RivexaGames',
            bankName: 'HDFC Bank',
            accountNumber: '50200012345678',
            ifsc: 'HDFC0001234',
            status: 'active',
            dailyLimit: 500000.0,
            currentDailyTotal: 0.0,
            priority: 1,
            region: 'IN',
            currency: 'INR',
          },
        });
      } catch (e) {
        return {
          id: undefined,
          name: 'Rivexa Official UPI',
          accountHolder: 'Rivexa Gaming Solutions',
          upiId: 'rivexa.pay@upi',
          qrImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=rivexa.pay@upi&pn=RivexaGames',
          bankName: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifsc: 'HDFC0001234',
        };
      }
    }
    return merchant;
  }

  async createDepositRequest(userId: string, amount: number, utrNumber?: string, proofUrl?: string) {
    if (!amount || amount < 100) {
      throw new BadRequestException('Minimum deposit amount is ₹100.');
    }

    const activeUserId = this.toValidUserId(userId);
    const trimmedUTR = (utrNumber || '').trim();

    if (trimmedUTR && trimmedUTR.length >= 8) {
      const existingUtr = await this.db.depositRequest.findFirst({
        where: { utrNumber: trimmedUTR },
      });
      if (existingUtr) {
        throw new BadRequestException(`UTR number '${trimmedUTR}' has already been submitted.`);
      }
    }

    const merchant = await this.getActiveMerchantAccount();
    const merchantAccountId = merchant && 'id' in merchant && merchant.id ? merchant.id : null;

    const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const depositId = `DEP${yyyymmdd}${randomStr}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const depositRequest = await this.db.depositRequest.create({
      data: {
        depositId,
        userId: activeUserId,
        merchantAccountId,
        amount,
        paymentMethod: 'upi',
        utrNumber: trimmedUTR || null,
        userRemarks: proofUrl ? `Proof URL: ${proofUrl}` : null,
        status: trimmedUTR ? 'VERIFIED' : 'PENDING',
        expiresAt,
      },
    });

    if (proofUrl) {
      try {
        await this.db.depositProof.create({
          data: {
            depositRequestId: depositRequest.id,
            filePath: proofUrl,
            uploadedAt: new Date(),
          },
        });
      } catch (e) {}
    }

    try {
      await this.db.notification.create({
        data: {
          userId: activeUserId,
          title: 'Deposit Request Submitted',
          message: `Deposit Request #${depositId} submitted for ₹${amount.toFixed(2)}.`,
        },
      });
    } catch (e) {}

    return {
      success: true,
      depositId: depositRequest.depositId,
      amount: Number(depositRequest.amount),
      status: depositRequest.status,
      message: 'Deposit request submitted successfully!',
      merchant: {
        name: merchant.name,
        accountHolder: 'accountHolder' in merchant ? merchant.accountHolder : undefined,
        upiId: merchant.upiId,
        qrImage: 'qrImage' in merchant ? merchant.qrImage : undefined,
      },
    };
  }

  async createWithdrawalRequest(userId: string, amount: number, upiId?: string, bankName?: string, accountNumber?: string, ifscCode?: string) {
    if (!amount || amount < 200) {
      throw new BadRequestException('Minimum withdrawal amount is ₹200.');
    }

    const wallet = await this.db.wallet.findUnique({ where: { userId } });
    if (!wallet || Number(wallet.mainBalance) < amount) {
      throw new BadRequestException('Insufficient wallet balance.');
    }

    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter = balanceBefore - amount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { mainBalance: balanceAfter },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'withdrawal',
        amount,
        balanceBefore,
        balanceAfter,
        referenceType: 'withdrawal',
      },
    });

    let bankAccount = await this.db.bankAccount.findFirst({ where: { userId } });
    if (!bankAccount && (upiId || accountNumber)) {
      bankAccount = await this.db.bankAccount.create({
        data: {
          userId,
          holderName: 'User Account',
          upiId,
          bankName,
          accountNumber,
          ifscCode,
        },
      });
    }

    return this.db.withdrawal.create({
      data: {
        userId,
        bankAccountId: bankAccount?.id,
        amount,
        fee: 0,
        netAmount: amount,
        status: 'PENDING',
      },
    });
  }

  async transferCommissionToMain(userId: string) {
    const wallet = await this.db.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const commBalance = Number(wallet.commissionBalance);
    if (commBalance <= 0) {
      throw new BadRequestException('No commission balance available to transfer.');
    }

    const mainBefore = Number(wallet.mainBalance);
    const mainAfter = mainBefore + commBalance;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: {
        mainBalance: mainAfter,
        commissionBalance: 0,
      },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'transfer',
        amount: commBalance,
        balanceBefore: mainBefore,
        balanceAfter: mainAfter,
        referenceType: 'commission_transfer',
      },
    });

    return {
      success: true,
      transferredAmount: commBalance,
      newMainBalance: mainAfter,
    };
  }

  async claimDailyReward(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingToday = await this.db.dailyReward.findFirst({
      where: {
        userId,
        claimedAt: { gte: today },
      },
    });

    if (existingToday) {
      throw new BadRequestException('Daily reward already claimed today!');
    }

    const totalClaimed = await this.db.dailyReward.count({ where: { userId } });
    const dayIndex = (totalClaimed % 7) + 1;
    const rewardAmounts = [10, 15, 20, 25, 30, 40, 100];
    const rewardAmount = rewardAmounts[dayIndex - 1];

    const wallet = await this.db.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter = balanceBefore + rewardAmount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { mainBalance: balanceAfter },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'bonus',
        amount: rewardAmount,
        balanceBefore,
        balanceAfter,
        referenceType: 'daily_reward',
      },
    });

    await this.db.dailyReward.create({
      data: {
        userId,
        dayIndex,
        amount: rewardAmount,
      },
    });

    return {
      success: true,
      dayIndex,
      rewardAmount,
      newBalance: balanceAfter,
    };
  }

  async getDailyRewardStatus(userId: string) {
    const activeUserId = this.toValidUserId(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingToday = await this.db.dailyReward.findFirst({
      where: {
        userId: activeUserId,
        claimedAt: { gte: today },
      },
    });

    const totalClaimed = await this.db.dailyReward.count({ where: { userId: activeUserId } });
    const currentDay = existingToday ? ((totalClaimed - 1) % 7) + 1 : (totalClaimed % 7) + 1;

    const totalRewardsAggregate = await this.db.dailyReward.aggregate({
      where: { userId: activeUserId },
      _sum: { amount: true },
    });
    const totalRewards = Number(totalRewardsAggregate._sum?.amount || 0);

    // Tomorrow 00:00:00
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const msUntilTomorrow = Math.max(0, tomorrow.getTime() - Date.now());

    // Claimed days in current cycle
    const claimedDaysInCycle = existingToday ? currentDay : currentDay - 1;

    return {
      claimedToday: !!existingToday,
      currentDay,
      claimedDaysInCycle,
      totalClaimed,
      currentStreak: totalClaimed,
      bestStreak: Math.max(totalClaimed, 7),
      totalRewards,
      msUntilTomorrow,
      lastClaimedAt: existingToday?.claimedAt || null,
    };
  }

  async getUserHistory(userId: string) {
    const activeUserId = this.toValidUserId(userId);
    const wallet = await this.db.wallet.findUnique({ where: { userId: activeUserId } });

    const deposits = await this.db.depositRequest.findMany({
      where: { userId: activeUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { merchantAccount: true },
    });

    const withdrawals = await this.db.withdrawal.findMany({
      where: { userId: activeUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { bankAccount: true },
    });

    const transactions = wallet
      ? await this.db.walletTransaction.findMany({
          where: { walletId: wallet.id },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : [];

    return {
      deposits,
      withdrawals,
      transactions,
    };
  }

  async getDepositById(depositId: string) {
    const depositRequest = await this.db.depositRequest.findUnique({
      where: { depositId },
      include: { merchantAccount: true, proofs: true },
    });

    if (!depositRequest) {
      throw new NotFoundException('Deposit request not found');
    }

    const isExpired = depositRequest.expiresAt ? new Date() > new Date(depositRequest.expiresAt) : false;

    return {
      ...depositRequest,
      isExpired,
    };
  }

  async getRewardsHistory(userId: string) {
    const activeUserId = this.toValidUserId(userId);
    const user = await this.db.user.findUnique({
      where: { id: activeUserId },
      include: {
        gameBets: { select: { id: true } },
        depositRequests: { where: { status: 'APPROVED' }, select: { id: true } },
        downlines: { select: { id: true } },
      },
    });

    const wallet = await this.db.wallet.findUnique({ where: { userId: activeUserId } });

    const bonusTransactions = wallet
      ? await this.db.walletTransaction.findMany({
          where: { walletId: wallet.id, type: 'bonus' },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      : [];

    const dailyRewards = await this.db.dailyReward.findMany({
      where: { userId: activeUserId },
      orderBy: { claimedAt: 'desc' },
      take: 100,
    });

    const commissions = await this.db.commission.findMany({
      where: { userId: activeUserId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        sourceUser: { select: { name: true, phone: true } },
      },
    });

    // Build unified live records list
    const records: any[] = [];

    // 1. Welcome Registration Bonus
    if (user) {
      const regDate = new Date(user.createdAt);
      records.push({
        id: `welcome-${user.id}`,
        transactionId: `RW-${regDate.getFullYear()}${String(regDate.getMonth() + 1).padStart(2, '0')}${String(regDate.getDate()).padStart(2, '0')}-0001`,
        name: 'Welcome Registration Bonus',
        description: 'Complete registration and set up your account.',
        type: 'Task Reward',
        amount: 1000,
        status: 'Claimed',
        date: regDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: regDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        rawDate: regDate.toISOString(),
        iconType: 'gift',
      });
    }

    // 2. Bonus Transactions (tasks claimed, daily rewards, coupon redemptions, etc.)
    for (const tx of bonusTransactions) {
      const d = new Date(tx.createdAt);
      const isDaily = tx.referenceType === 'daily_reward';
      const isFirstDeposit = tx.referenceType === 'task_first_deposit';
      const isTask = tx.referenceType?.startsWith('task_');
      const isCoupon = tx.referenceType?.startsWith('coupon_');

      let name = (tx.metadata as any)?.title || 'Bonus Reward';
      let description = (tx.metadata as any)?.description || 'Reward credited directly to wallet balance.';
      let type = 'Deposit Bonus';
      let iconType = 'wallet';

      if (isDaily) {
        name = 'Daily Streak Day 1';
        description = 'Consecutive daily check-in streak bonus.';
        type = 'Daily Bonus';
        iconType = 'flame';
      } else if (isFirstDeposit) {
        name = 'First Deposit Bonus';
        description = 'Make your first deposit of ₹100 or more.';
        type = 'Deposit Bonus';
        iconType = 'wallet';
      } else if (isTask) {
        name = (tx.metadata as any)?.title || 'Task Mission Reward';
        description = 'Completed player mission reward.';
        type = 'Task Reward';
        iconType = 'game';
      } else if (isCoupon) {
        const code = tx.referenceType ? tx.referenceType.replace('coupon_', '') : 'PROMO';
        name = `Coupon Reward (${code})`;
        description = `Secret coupon voucher code "${code}" redeemed.`;
        type = 'Promotional';
        iconType = 'promo';
      }

      records.push({
        id: tx.id,
        transactionId: `RW-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${tx.id.substring(0, 4).toUpperCase()}`,
        name,
        description,
        type,
        amount: Number(tx.amount || 0),
        status: 'Claimed',
        date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        rawDate: d.toISOString(),
        iconType,
      });
    }

    // 3. Referral Commissions
    for (const comm of commissions) {
      const d = new Date(comm.createdAt);
      const friendName = comm.sourceUser?.name || 'Referred Friend';
      records.push({
        id: comm.id,
        transactionId: `RW-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${comm.id.substring(0, 4).toUpperCase()}`,
        name: `Referral Bonus (${friendName})`,
        description: `Commission earned from invited player wager (Tier ${comm.level}).`,
        type: 'Referral Bonus',
        amount: Number(comm.amount || 0),
        status: comm.status === 'credited' ? 'Claimed' : 'Pending',
        date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        rawDate: d.toISOString(),
        iconType: 'referral',
      });
    }

    // 4. In-progress / Pending Tasks
    if (user) {
      const totalBets = user.gameBets?.length || 0;
      const referralCount = user.downlines?.length || 0;
      const claimedRefTypes = new Set(
        wallet ? bonusTransactions.map((t: any) => t.referenceType).filter(Boolean) : [],
      );

      // Play 10 Games
      if (!claimedRefTypes.has('task_play_10_games')) {
        const now = new Date();
        records.push({
          id: `task-pending-play10-${user.id}`,
          transactionId: `RW-TASK-PLAY10`,
          name: 'Play 10 Games',
          description: `Participate in at least 10 games (Progress: ${Math.min(totalBets, 10)}/10).`,
          type: 'Task Reward',
          amount: 20,
          status: 'Pending',
          date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          time: 'Active',
          rawDate: new Date(now.getTime() - 86400000).toISOString(),
          iconType: 'game',
        });
      }

      // Invite Friend
      if (!claimedRefTypes.has('task_invite_friend')) {
        const now = new Date();
        records.push({
          id: `task-pending-invite-${user.id}`,
          transactionId: `RW-TASK-INVITE`,
          name: 'Invite Your First Friend',
          description: `Share your referral link with friends (Invited: ${referralCount}/1).`,
          type: 'Referral Bonus',
          amount: 50,
          status: 'Pending',
          date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          time: 'Active',
          rawDate: new Date(now.getTime() - 172800000).toISOString(),
          iconType: 'referral',
        });
      }
    }

    // Sort all records chronologically descending (newest first)
    records.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    // Live calculated summary metrics
    const claimedRecords = records.filter((r) => r.status === 'Claimed');
    const totalEarned = claimedRecords.reduce((sum, r) => sum + r.amount, 0);
    const taskRewards = claimedRecords
      .filter((r) => r.type === 'Task Reward')
      .reduce((sum, r) => sum + r.amount, 0);
    const bonusRewards = claimedRecords
      .filter((r) => r.type === 'Daily Bonus' || r.type === 'Deposit Bonus' || r.type === 'Promotional')
      .reduce((sum, r) => sum + r.amount, 0);
    const claimedCount = claimedRecords.length;

    return {
      success: true,
      records,
      summary: {
        totalEarned,
        taskRewards,
        bonusRewards,
        claimedCount,
      },
      bonusTransactions,
      dailyRewards,
      commissions,
    };
  }
}
