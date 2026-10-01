import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService, LoginDto, RegisterDto, UpdatePasswordDto, AddBankAccountDto, ForgotPasswordDto, ResetPasswordDto } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

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

  @Post('add-bank')
  @UseGuards(JwtAuthGuard)
  async addBankAccount(@Req() req: any, @Body() dto: AddBankAccountDto) {
    return this.authService.addBankAccount(req.user.id, dto);
  }
}
