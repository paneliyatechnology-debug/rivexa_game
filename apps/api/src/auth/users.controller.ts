import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService, UpdatePasswordDto, AddBankAccountDto } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('update-password')
  @UseGuards(JwtAuthGuard)
  async updatePassword(@Req() req: any, @Body() dto: UpdatePasswordDto) {
    return this.authService.updatePassword(req.user.id, dto);
  }

  @Get('bank-accounts')
  @UseGuards(JwtAuthGuard)
  async getBankAccounts(@Req() req: any) {
    return this.authService.getBankAccounts(req.user.id);
  }

  @Post('bank-accounts')
  @UseGuards(JwtAuthGuard)
  async addBankAccount(@Req() req: any, @Body() dto: AddBankAccountDto) {
    return this.authService.addBankAccount(req.user.id, dto);
  }
}
