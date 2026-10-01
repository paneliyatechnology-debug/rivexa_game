# Laravel Migration Inventory

Inventory of all components discovered in the Laravel source at `/home/dell/fiewin` and mapped to NestJS / Next.js target architecture.

## 1. Routes Mapping

| Laravel Route | Method | Controller | Purpose | Target NestJS / Next.js Route | Status |
| ------------- | ------ | ---------- | ------- | ----------------------------- | ------ |
| `/login` | GET/POST | `LoginController` | User Authentication | `/api/v1/auth/login` | MIGRATED |
| `/register` | GET/POST | `RegisterController` | User Account Creation | `/api/v1/auth/register` | MIGRATED |
| `/logout` | POST | `LoginController` | Session Terminate | `/api/v1/auth/logout` | MIGRATED |
| `/games/fast-parity` | GET | `GameController@show` | Fast Parity Game UI | `/play/fast-parity` | MIGRATED |
| `/games/fast_parity/state` | GET | `GameController@getGameState` | Fast Parity Countdown & State | `/api/v1/games/parity/period` | MIGRATED |
| `/games/bet` | POST | `GameController@placeBet` | Fast Parity Bet Submission | `/api/v1/games/parity/bet` | MIGRATED |
| `/games/parity/history` | GET | `GameController@getGameState` | Fast Parity History Feed | `/api/v1/games/parity/history` | MIGRATED |
| `/games/parity/my-orders` | GET | `GameController@getGameState` | User Bet History | `/api/v1/games/parity/my-bets` | MIGRATED |
| `/games/mines/start` | POST | `GameController@startMines` | Mines Game Start | `/api/v1/games/mines/start` | MIGRATED |
| `/games/mines/click` | POST | `GameController@revealMinesTile` | Mines Tile Reveal | `/api/v1/games/mines/reveal` | MIGRATED |
| `/games/mines/cashout` | POST | `GameController@cashoutMines` | Mines Cash Out | `/api/v1/games/mines/cashout` | MIGRATED |
| `/games/crash/bet` | POST | `CrashController@placeBet` | Crash Rocket Bet | `/api/v1/games/crash/bet` | MIGRATED |
| `/games/crash/cashout` | POST | `CrashController@cashout` | Crash Rocket Cashout | `/api/v1/games/crash/cashout` | MIGRATED |
| `/games/jet/bet` | POST | `JetController@placeBet` | JetX Flight Bet | `/api/v1/games/crash/bet` | MIGRATED |
| `/games/spin/settle` | POST | `GameController@settleSpinWheel` | Spin Wheel Bet Settle | `/api/v1/games/spin/spin` | MIGRATED |
| `/games/dice/settle` | POST | `GameController@settleDice` | Over/Under Dice Roll | `/api/v1/games/dice/roll` | MIGRATED |
| `/games/andar-bahar/bet` | POST | `AndarBaharController@placeBet` | Andar Bahar Card Match | `/api/v1/games/andar-bahar/play` | MIGRATED |
| `/wallet` | GET | `WalletController@index` | Wallet Balance Overview | `/api/v1/wallet/balance` | MIGRATED |
| `/wallet/deposit` | POST | `WalletController@deposit` | UPI Deposit Request | `/api/v1/wallet/deposit/request` | MIGRATED |
| `/wallet/withdraw` | POST | `WalletController@withdraw` | Bank/UPI Withdrawal | `/api/v1/wallet/withdraw/request` | MIGRATED |
| `/promotion/daily-checkin` | POST | `PromotionController@claimDailyCheckin` | 7-Day Streak Rewards | `/api/v1/wallet/daily-reward/claim` | MIGRATED |
| `/admin/manual-deposits` | GET/POST | `AdminDepositController` | Deposit Verification Center | `/api/v1/admin/deposits` | MIGRATED |

---

## 2. Models & Entities Inventory

| Laravel Model | Table Name | Key Attributes & Relations | Target Prisma Model | Status |
| ------------- | ---------- | -------------------------- | ------------------- | ------ |
| `User` | `users` | `id`, `email`, `phone`, `password`, `referral_code`, `referred_by` | `User` | MIGRATED |
| `Wallet` | `wallets` | `user_id`, `main_balance`, `bonus_balance`, `commission_balance` | `Wallet` | MIGRATED |
| `WalletTransaction` | `wallet_transactions` | `wallet_id`, `type`, `amount`, `balance_before`, `balance_after` | `WalletTransaction` | MIGRATED |
| `Game` | `games` | `code`, `name`, `rtp_percentage`, `min_bet`, `max_bet`, `is_active` | `Game` | MIGRATED |
| `GameBet` | `game_bets` | `user_id`, `game_id`, `period_number`, `bet_type`, `bet_amount`, `win_amount` | `ParityBet` / `GameBet` | MIGRATED |
| `GameResult` | `game_results` | `game_id`, `period_number`, `result_data`, `provably_fair_hash` | `ParityPeriod` | MIGRATED |
| `DepositRequest` | `deposit_requests` | `user_id`, `amount`, `utr_number`, `status`, `proof_url` | `DepositRequest` | MIGRATED |
| `Withdrawal` | `withdrawals` | `user_id`, `amount`, `bank_account_id`, `status` | `Withdrawal` | MIGRATED |
| `Commission` | `commissions` | `user_id`, `from_user_id`, `level`, `bet_amount`, `commission_amount` | `Commission` | MIGRATED |
| `DailyReward` | `daily_rewards` | `user_id`, `day_index`, `amount`, `claimed_at` | `DailyReward` | MIGRATED |

---

## 3. Business Services Mapping

| Laravel Service | Purpose | Target NestJS Service | Status |
| --------------- | ------- | --------------------- | ------ |
| `GameEngineService` | Period countdowns, Fast Parity RTP calculation, bet payouts | `ParityService` & `GameEngineService` | MIGRATED |
| `WalletService` | Atomic balance deduction, credit, transaction logging | `WalletService` | MIGRATED |
| `ReferralCommissionService` | 3-Tier MLM distribution (3% L1, 2% L2, 1% L3) | `WalletService` & `CommissionService` | MIGRATED |
| `MineGameService` | 5x5 Grid tile reveal, mine calculation, multiplier formula | `MinesService` | MIGRATED |
| `CrashGameService` | Provably fair rocket multiplier generation, cashout | `CrashService` | MIGRATED |
