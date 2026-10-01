import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() body: any) {
    return this.adminService.adminLogin(body.email, body.password);
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Post('users')
  async createUser(@Body() body: any) {
    return this.adminService.createUser(body);
  }

  @Post('users/:id/update')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateUser(id, body);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('users/:id/balance')
  async updateUserBalance(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('action') action: 'ADD' | 'DEDUCT',
  ) {
    return this.adminService.updateUserBalance(id, amount, action);
  }

  @Post('users/:id/status')
  async toggleUserStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'BLOCKED',
  ) {
    return this.adminService.toggleUserStatus(id, status);
  }

  @Get('deposits')
  async getDeposits() {
    return this.adminService.getDeposits();
  }

  @Post('deposits/:id/approve')
  async approveDeposit(@Param('id') id: string) {
    return this.adminService.approveDeposit(id);
  }

  @Post('deposits/:id/reject')
  async rejectDeposit(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectDeposit(id, reason);
  }

  @Get('withdrawals')
  async getWithdrawals() {
    return this.adminService.getWithdrawals();
  }

  @Post('withdrawals/:id/approve')
  async approveWithdrawal(@Param('id') id: string) {
    return this.adminService.approveWithdrawal(id);
  }

  @Post('withdrawals/:id/reject')
  async rejectWithdrawal(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectWithdrawal(id, reason);
  }

  @Post('deposits/bulk-approve')
  async bulkApproveDeposits(@Body('ids') ids: string[]) {
    return this.adminService.bulkApproveDeposits(ids);
  }

  @Post('deposits/bulk-reject')
  async bulkRejectDeposits(@Body('ids') ids: string[], @Body('reason') reason?: string) {
    return this.adminService.bulkRejectDeposits(ids, reason);
  }

  @Get('bank-approvals')
  async getBankApprovals() {
    return this.adminService.getBankApprovals();
  }

  @Post('bank-approvals/:id/approve')
  async approveBankAccount(@Param('id') id: string) {
    return this.adminService.approveBankAccount(id);
  }

  @Post('bank-approvals/:id/reject')
  async rejectBankAccount(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectBankAccount(id, reason);
  }

  @Get('merchants')
  async getMerchants() {
    return this.adminService.getMerchants();
  }

  @Post('merchants')
  async createMerchant(@Body() body: any) {
    return this.adminService.createMerchant(body);
  }

  @Post('merchants/reset-daily')
  async resetDailyTotals(@Body('merchantId') merchantId?: string) {
    return this.adminService.resetDailyTotals(merchantId);
  }

  @Post('merchants/:id/reset-daily')
  async resetSingleMerchantDailyTotal(@Param('id') id: string) {
    return this.adminService.resetDailyTotals(id);
  }

  @Post('merchants/:id/toggle')
  async toggleMerchantStatus(@Param('id') id: string) {
    return this.adminService.toggleMerchantStatus(id);
  }

  @Post('merchants/:id')
  async updateMerchant(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateMerchant(id, body);
  }

  @Get('games')
  async getGameSettings() {
    return this.adminService.getGameSettings();
  }

  @Get('public-games')
  async getPublicGames() {
    return this.adminService.getPublicGames();
  }

  @Get('games/public')
  async getPublicGamesAlias() {
    return this.adminService.getPublicGames();
  }

  @Post('games/:id/toggle')
  async toggleGameActive(
    @Param('id') id: string,
    @Body('isActive') isActive?: boolean,
  ) {
    return this.adminService.toggleGameActive(id, isActive);
  }

  @Post('games/:id/rtp')
  async updateGameRtp(
    @Param('id') id: string,
    @Body('rtpPercentage') rtpPercentage: number,
    @Body('minBet') minBet?: number,
    @Body('maxBet') maxBet?: number,
  ) {
    return this.adminService.updateGameRtp(id, rtpPercentage, minBet, maxBet);
  }

  @Get('games/:id/control-center')
  async getGameControlCenter(@Param('id') id: string) {
    return this.adminService.getGameControlCenter(id);
  }

  @Get('reports')
  async getFinancialReports(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getFinancialReports(startDate, endDate);
  }
}

