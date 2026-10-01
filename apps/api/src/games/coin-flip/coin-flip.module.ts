import { Module } from '@nestjs/common';
import { CoinFlipController } from './coin-flip.controller.js';
import { CoinFlipService } from './coin-flip.service.js';
import { ReferralModule } from '../../referral/referral.module.js';

@Module({
  imports: [ReferralModule],
  controllers: [CoinFlipController],
  providers: [CoinFlipService],
  exports: [CoinFlipService],
})
export class CoinFlipModule {}
