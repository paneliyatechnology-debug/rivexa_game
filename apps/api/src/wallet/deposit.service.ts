import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import * as crypto from 'crypto';

@Injectable()
export class DepositService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Generate deposit ID e.g. DEP20260921X8K2M9
   * Traceable to Laravel: App\Services\ManualDepositService::generateDepositId
   */
  public generateDepositId(): string {
    const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `DEP${yyyymmdd}${randomStr}`;
  }

  /**
   * Select optimal merchant account based on load, priority, and capacity.
   * Traceable to Laravel: App\Services\MerchantLoadBalancerService::selectOptimalMerchant
   */
  async selectOptimalMerchant(amount: number, paymentMethod: string = 'upi', region: string = 'IN') {
    let activeMerchants = await this.db.merchantAccount.findMany({
      where: { status: 'active' },
    });

    if (activeMerchants.length === 0) {
      try {
        const defaultMerchant = await this.db.merchantAccount.create({
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
        activeMerchants = [defaultMerchant];
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
          dailyLimit: 500000.0,
          currentDailyTotal: 0.0,
          priority: 1,
        };
      }
    }

    const eligibleMerchants = activeMerchants.filter((m: any) => {
      const dailyLimit = Number(m.dailyLimit || 500000);
      const currentTotal = Number(m.currentDailyTotal || 0);
      const remainingCapacity = dailyLimit - currentTotal;
      return remainingCapacity >= amount;
    });

    if (eligibleMerchants.length === 0) {
      const sortedFallback = activeMerchants.sort((a: any, b: any) => {
        const remA = Number(a.dailyLimit || 500000) - Number(a.currentDailyTotal || 0);
        const remB = Number(b.dailyLimit || 500000) - Number(b.currentDailyTotal || 0);
        return remB - remA;
      });
      return sortedFallback[0];
    }

    eligibleMerchants.sort((a: any, b: any) => {
      const ratioA = Number(a.currentDailyTotal || 0) / (Number(a.dailyLimit) || 1);
      const ratioB = Number(b.currentDailyTotal || 0) / (Number(b.dailyLimit) || 1);

      if (Math.abs(ratioA - ratioB) > 0.05) {
        return ratioA - ratioB;
      }
      return (b.priority || 1) - (a.priority || 1);
    });

    return eligibleMerchants[0];
  }

  /**
   * Create deposit request.
   * Traceable to Laravel: App\Services\ManualDepositService::createDepositRequest
   */
  async createDepositRequest(userId: string, amount: number, paymentMethod: string = 'upi') {
    if (!amount || amount < 100) {
      throw new BadRequestException('Minimum deposit amount is ₹100.');
    }

    let activeUserId = userId;
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      activeUserId = '00000000-0000-0000-0000-000000000000';
    }

    try {
      const userExists = await this.db.user.findUnique({ where: { id: activeUserId } });
      if (!userExists) {
        await this.db.user.create({
          data: {
            id: activeUserId,
            email: `demo-${activeUserId.slice(0, 8)}@rivexa.com`,
            passwordHash: 'demo',
            referralCode: `DEMO-${activeUserId.slice(0, 4)}`,
          },
        });
      }
    } catch (e) {}

    const merchant = await this.selectOptimalMerchant(amount, paymentMethod);
    const depositId = this.generateDepositId();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const depositRequest = await this.db.depositRequest.create({
      data: {
        depositId,
        userId: activeUserId,
        merchantAccountId: merchant && merchant.id ? merchant.id : null,
        amount,
        paymentMethod,
        status: 'PENDING',
        expiresAt,
      },
      include: { merchantAccount: true },
    });

    if (merchant && merchant.id) {
      try {
        await this.db.merchantAssignmentLog.create({
          data: {
            depositRequestId: depositRequest.id,
            merchantAccountId: merchant.id,
            userId: activeUserId,
            amount,
            assignmentReason: `Load Balancer Assigned (Capacity: ₹${(Number(merchant.dailyLimit || 500000) - Number(merchant.currentDailyTotal || 0)).toFixed(2)})`,
            assignedAt: new Date(),
          },
        });
      } catch (e) {}
    }

    try {
      await this.db.notification.create({
        data: {
          userId: activeUserId,
          title: 'Deposit Request Created',
          message: `Deposit Request #${depositId} created for ₹${amount.toFixed(2)}. Please transfer to assigned merchant within 30 minutes.`,
        },
      });
    } catch (e) {}

    return {
      success: true,
      depositId: depositRequest.depositId,
      amount,
      merchant: {
        name: merchant.name,
        accountHolder: merchant.accountHolder,
        upiId: merchant.upiId,
        qrImage: merchant.qrImage,
        bankName: merchant.bankName,
        accountNumber: merchant.accountNumber,
        ifsc: merchant.ifsc,
      },
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Submit UTR number & proof.
   * Traceable to Laravel: App\Services\ManualDepositService::submitPaymentProof
   */
  async submitPaymentProof(depositId: string, userId: string, utrNumber: string, proofUrl?: string, userRemarks?: string) {
    const depositRequest = await this.db.depositRequest.findUnique({
      where: { depositId },
    });

    if (!depositRequest || depositRequest.userId !== userId) {
      throw new NotFoundException('Deposit request not found.');
    }

    if (['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(depositRequest.status)) {
      throw new BadRequestException(`Deposit request #${depositId} is already ${depositRequest.status}.`);
    }

    const trimmedUTR = utrNumber.trim();
    if (!trimmedUTR) {
      throw new BadRequestException('UTR Number is required.');
    }

    // Check duplicate UTR
    const duplicate = await this.db.depositRequest.findFirst({
      where: {
        utrNumber: trimmedUTR,
        id: { not: depositRequest.id },
        status: { in: ['PENDING', 'VERIFIED', 'APPROVED'] },
      },
    });

    if (duplicate) {
      throw new BadRequestException(`UTR Number '${trimmedUTR}' has already been submitted for Deposit #${duplicate.depositId}.`);
    }

    const updated = await this.db.depositRequest.update({
      where: { id: depositRequest.id },
      data: {
        utrNumber: trimmedUTR,
        userRemarks,
        status: 'VERIFIED',
      },
    });

    if (proofUrl) {
      await this.db.depositProof.create({
        data: {
          depositRequestId: depositRequest.id,
          filePath: proofUrl,
          uploadedAt: new Date(),
        },
      });
    }

    await this.db.depositVerification.create({
      data: {
        depositRequestId: depositRequest.id,
        statusFrom: 'PENDING',
        statusTo: 'VERIFIED',
        verificationNotes: `User submitted UTR: ${trimmedUTR}`,
        verifiedAt: new Date(),
      },
    });

    await this.db.notification.create({
      data: {
        userId,
        title: 'Deposit Payment Submitted',
        message: `Payment proof & UTR #${trimmedUTR} submitted for Deposit #${depositId}. Pending admin verification.`,
      },
    });

    return {
      success: true,
      depositId,
      status: 'VERIFIED',
      message: 'Payment proof & UTR submitted successfully! Pending admin verification.',
    };
  }

  /**
   * Approve deposit (Admin Action).
   * Traceable to Laravel: App\Services\ManualDepositService::approveDeposit
   */
  async approveDeposit(depositId: string, adminUserId: string, adminNotes?: string) {
    const depositRequest = await this.db.depositRequest.findUnique({
      where: { depositId },
      include: { merchantAccount: true },
    });

    if (!depositRequest) {
      throw new NotFoundException('Deposit request not found.');
    }

    if (depositRequest.status === 'APPROVED') {
      throw new BadRequestException(`Deposit #${depositId} is already approved.`);
    }

    const amount = Number(depositRequest.amount);

    // Credit User Wallet
    const wallet = await this.db.wallet.findUnique({
      where: { userId: depositRequest.userId },
    });

    if (!wallet) throw new NotFoundException('User wallet not found.');

    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter = balanceBefore + amount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: {
        mainBalance: balanceAfter,
        totalDeposited: { increment: amount },
      },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'deposit',
        amount,
        balanceBefore,
        balanceAfter,
        referenceType: 'manual_deposit',
        referenceId: depositId,
        metadata: { description: `Manual Deposit Approval #${depositId} (UTR: ${depositRequest.utrNumber})` },
      },
    });

    // Update merchant account daily total
    if (depositRequest.merchantAccountId) {
      await this.db.merchantAccount.update({
        where: { id: depositRequest.merchantAccountId },
        data: { currentDailyTotal: { increment: amount } },
      });
    }

    // Update Deposit Request status
    await this.db.depositRequest.update({
      where: { id: depositRequest.id },
      data: {
        status: 'APPROVED',
        adminNotes,
        approvedById: adminUserId,
        approvedAt: new Date(),
      },
    });

    await this.db.depositVerification.create({
      data: {
        depositRequestId: depositRequest.id,
        adminId: adminUserId,
        statusFrom: depositRequest.status,
        statusTo: 'APPROVED',
        verificationNotes: `Approved by Admin. Note: ${adminNotes || 'N/A'}`,
        verifiedAt: new Date(),
      },
    });

    await this.db.notification.create({
      data: {
        userId: depositRequest.userId,
        title: 'Deposit Approved! 🎉',
        message: `Your Deposit #${depositId} of ₹${amount.toFixed(2)} has been approved & credited to your wallet balance!`,
      },
    });

    return {
      success: true,
      message: `Deposit #${depositId} approved successfully!`,
      newBalance: balanceAfter.toFixed(2),
    };
  }

  /**
   * Reject deposit (Admin Action).
   * Traceable to Laravel: App\Services\ManualDepositService::rejectDeposit
   */
  async rejectDeposit(depositId: string, adminUserId: string, reason: string) {
    const depositRequest = await this.db.depositRequest.findUnique({
      where: { depositId },
    });

    if (!depositRequest) {
      throw new NotFoundException('Deposit request not found.');
    }

    if (depositRequest.status === 'APPROVED') {
      throw new BadRequestException('Cannot reject an already approved deposit.');
    }

    await this.db.depositRequest.update({
      where: { id: depositRequest.id },
      data: {
        status: 'REJECTED',
        adminNotes: reason,
        rejectedById: adminUserId,
        rejectedAt: new Date(),
      },
    });

    await this.db.depositVerification.create({
      data: {
        depositRequestId: depositRequest.id,
        adminId: adminUserId,
        statusFrom: depositRequest.status,
        statusTo: 'REJECTED',
        verificationNotes: `Rejected by Admin. Reason: ${reason}`,
        verifiedAt: new Date(),
      },
    });

    await this.db.notification.create({
      data: {
        userId: depositRequest.userId,
        title: 'Deposit Rejected',
        message: `Your Deposit #${depositId} of ₹${Number(depositRequest.amount).toFixed(2)} was rejected. Reason: ${reason}`,
      },
    });

    return {
      success: true,
      message: `Deposit #${depositId} rejected.`,
    };
  }
}
