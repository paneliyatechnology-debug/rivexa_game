import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { WalletService } from './wallet.service.js';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@Query('userId') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Get('transactions')
  async getTransactions(@Query('userId') userId: string) {
    return this.walletService.getTransactions(userId);
  }

  @Get('merchant')
  async getMerchant() {
    return this.walletService.getActiveMerchantAccount();
  }

  @Post('deposit/request')
  async createDepositRequest(
    @Body('userId') userId: string,
    @Body('amount') amount: number,
    @Body('utrNumber') utrNumber: string,
    @Body('proofUrl') proofUrl?: string,
  ) {
    return this.walletService.createDepositRequest(userId, amount, utrNumber, proofUrl);
  }

  @Post('withdraw/request')
  async createWithdrawalRequest(
    @Body('userId') userId: string,
    @Body('amount') amount: number,
    @Body('upiId') upiId?: string,
    @Body('bankName') bankName?: string,
    @Body('accountNumber') accountNumber?: string,
    @Body('ifscCode') ifscCode?: string,
  ) {
    return this.walletService.createWithdrawalRequest(userId, amount, upiId, bankName, accountNumber, ifscCode);
  }

  @Post('transfer-commission')
  async transferCommission(@Body('userId') userId: string) {
    return this.walletService.transferCommissionToMain(userId);
  }

  @Post('daily-reward')
  async claimDailyReward(@Body('userId') userId: string) {
    return this.walletService.claimDailyReward(userId);
  }

  @Get('daily-reward-status')
  async getDailyRewardStatus(@Query('userId') userId: string) {
    return this.walletService.getDailyRewardStatus(userId);
  }

  @Get('history')
  async getUserHistory(@Query('userId') userId: string) {
    return this.walletService.getUserHistory(userId);
  }

  @Get('rewards-history')
  async getRewardsHistory(@Query('userId') userId: string) {
    return this.walletService.getRewardsHistory(userId);
  }

  @Get('deposit-details/:depositId')
  async getDepositById(@Param('depositId') depositId: string) {
    return this.walletService.getDepositById(depositId);
  }
}
