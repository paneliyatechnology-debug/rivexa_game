import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller.js';
import { WalletService } from './wallet.service.js';
import { DepositService } from './deposit.service.js';
import { DepositController } from './deposit.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [WalletController, DepositController],
  providers: [WalletService, DepositService],
  exports: [WalletService, DepositService],
})
export class WalletModule {}
