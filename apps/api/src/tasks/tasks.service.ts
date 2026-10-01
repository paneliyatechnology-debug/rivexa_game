import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class TasksService {
  constructor(private readonly db: DatabaseService) {}

  async getTasks(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        gameBets: true,
        depositRequests: true,
        downlines: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const totalBets = user.gameBets?.length || 0;
    const totalDeposits = user.depositRequests?.filter((d: any) => d.status === 'APPROVED')?.length || 0;
    const referralCount = user.downlines?.length || 0;

    const tasks = [
      {
        id: 'welcome_reg',
        title: 'Welcome Registration Bonus',
        description: 'Complete registration and set up your account',
        rewardAmount: 1000.0,
        progress: 1,
        maxProgress: 1,
        isCompleted: true,
        isClaimed: true,
      },
      {
        id: 'first_deposit',
        title: 'First Deposit Bonus',
        description: 'Make your first deposit of ₹100 or more',
        rewardAmount: 50.0,
        progress: Math.min(totalDeposits, 1),
        maxProgress: 1,
        isCompleted: totalDeposits >= 1,
        isClaimed: false,
      },
      {
        id: 'play_10_games',
        title: 'Play 10 Games',
        description: 'Participate in at least 10 games (Mines, Parity, Jet, Spin, Dice)',
        rewardAmount: 20.0,
        progress: Math.min(totalBets, 10),
        maxProgress: 10,
        isCompleted: totalBets >= 10,
        isClaimed: false,
      },
      {
        id: 'invite_friend',
        title: 'Invite Your First Friend',
        description: 'Share your referral code and invite 1 active player',
        rewardAmount: 50.0,
        progress: Math.min(referralCount, 1),
        maxProgress: 1,
        isCompleted: referralCount >= 1,
        isClaimed: false,
      },
    ];

    return {
      success: true,
      tasks,
    };
  }

  async claimTask(userId: string, taskId: string) {
    const { tasks } = await this.getTasks(userId);
    const task = tasks.find((t) => t.id === taskId);

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    if (!task.isCompleted) {
      throw new BadRequestException('Task is not completed yet.');
    }

    if (task.isClaimed) {
      throw new BadRequestException('Task reward has already been claimed.');
    }

    const wallet = await this.db.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found.');

    const balanceBefore = Number(wallet.bonusBalance);
    const balanceAfter = balanceBefore + task.rewardAmount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { bonusBalance: balanceAfter },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'bonus',
        amount: task.rewardAmount,
        balanceBefore,
        balanceAfter,
        referenceType: `task_${taskId}`,
        metadata: { taskId, title: task.title },
      },
    });

    return {
      success: true,
      message: `🎉 Claimed ₹${task.rewardAmount} for completing "${task.title}"!`,
      rewardAmount: task.rewardAmount,
    };
  }

  async redeemCoupon(userId: string, code: string) {
    if (!code) {
      throw new BadRequestException('Coupon code is required.');
    }

    const coupon = await this.db.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid or expired coupon code.');
    }

    if (coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached.');
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Coupon code has expired.');
    }

    const wallet = await this.db.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found.');

    const reward = Number(coupon.reward);
    const balanceBefore = Number(wallet.bonusBalance);
    const balanceAfter = balanceBefore + reward;

    await this.db.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: coupon.usedCount + 1 },
    });

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { bonusBalance: balanceAfter },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'bonus',
        amount: reward,
        balanceBefore,
        balanceAfter,
        referenceType: `coupon_${coupon.code}`,
        metadata: { code: coupon.code },
      },
    });

    return {
      success: true,
      message: `🎉 Coupon redeemed! ₹${reward} added to your Bonus wallet.`,
      rewardAmount: reward,
    };
  }
}
