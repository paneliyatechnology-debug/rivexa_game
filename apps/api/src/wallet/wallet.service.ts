import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class WalletService {
  constructor(private readonly db: DatabaseService) {}

  private readonly DEMO_UUID = '00000000-0000-0000-0000-000000000000';

  private toValidUserId(userId?: string): string {
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return userId;
    }
    return this.DEMO_UUID;
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
              email: `demo-${activeUserId.slice(0, 8)}@rivexa.com`,
              passwordHash: 'demo',
              referralCode: `DEMO-${activeUserId.slice(0, 4)}`,
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
}
