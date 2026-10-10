import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import {
  PenaltyShootoutService,
  PENALTY_DIFFICULTIES,
  COUNTRIES_CATALOGUE,
} from './penalty-shootout.service.js';
import { StartPenaltyRoundDto } from './dto/start-round.dto.js';
import { PenaltyShootDto } from './dto/shoot.dto.js';
import { PenaltyCashoutDto } from './dto/cashout.dto.js';

@Controller('games/penalty-shootout')
export class PenaltyShootoutController {
  constructor(private readonly penaltyService: PenaltyShootoutService) {}

  /** GET /games/penalty-shootout/config
   * Returns the full server-authoritative game configuration including
   * difficulty profiles, multiplier ladders and min/max bet limits.
   */
  @Get('config')
  getConfig() {
    return this.penaltyService.getConfig();
  }

  /** GET /games/penalty-shootout/difficulties
   * Returns difficulty profiles (alias for config.difficulties).
   */
  @Get('difficulties')
  getDifficulties() {
    return PENALTY_DIFFICULTIES;
  }

  /** GET /games/penalty-shootout/countries
   * Returns the full cosmetic country catalogue.
   * Country selection does not affect RNG outcomes.
   */
  @Get('countries')
  getCountries() {
    return this.penaltyService.getCountries();
  }

  /** GET /games/penalty-shootout/statistics
   * Returns aggregated game statistics (admin-use, no PII).
   */
  @Get('statistics')
  async getStatistics() {
    return this.penaltyService.getStatistics();
  }

  /** GET /games/penalty-shootout/active?userId=xxx
   * Returns the user's current active round if one exists.
   */
  @Get('active')
  async getActiveRound(@Query('userId') userId: string) {
    if (!userId) return null;
    return this.penaltyService.getActiveRound(userId);
  }

  /** GET /games/penalty-shootout/history?userId=xxx&limit=20
   * Returns the user's recent round history (paginated).
   */
  @Get('history')
  async getHistory(
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    if (!userId) return [];
    return this.penaltyService.getHistory(userId, limit ? Number(limit) : 20);
  }

  /** GET /games/penalty-shootout/fairness/:roundId?userId=xxx
   * Returns provably fair verification data for a completed round.
   * Server seed is only revealed after the round is settled.
   */
  @Get('fairness/:roundId')
  async getFairness(
    @Param('roundId') roundId: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) {
      return { error: 'userId query parameter required' };
    }
    return this.penaltyService.verifyFairness(roundId, userId);
  }

  /** POST /games/penalty-shootout/start
   * Creates a new game round, deducts bet from wallet atomically.
   */
  @Post('start')
  async startRound(@Body() dto: StartPenaltyRoundDto) {
    return this.penaltyService.startRound(dto);
  }

  /** POST /games/penalty-shootout/shoot
   * Executes a penalty kick. Outcome is server-authoritative.
   * targetSpot: 1-4 (EASY), 1-5 (MEDIUM), 1-8 (HARD/HARDCORE)
   */
  @Post('shoot')
  async shoot(@Body() dto: PenaltyShootDto) {
    return this.penaltyService.shoot(dto);
  }

  /** POST /games/penalty-shootout/cashout
   * Claims current winnings. Round must have at least 1 successful kick.
   */
  @Post('cashout')
  async cashout(@Body() dto: PenaltyCashoutDto) {
    return this.penaltyService.cashout(dto);
  }
}
