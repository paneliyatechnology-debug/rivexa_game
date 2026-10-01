# Migration Checklist

Verification checklist for Laravel `/home/dell/fiewin` to Next.js + NestJS monorepo migration.

- [x] Laravel routes analyzed (`routes/web.php`, `routes/admin.php`, `routes/api.php`)
- [x] Laravel controllers analyzed (`GameController.php`, `WalletController.php`, `AndarBaharController.php`, `AdminDepositController.php`)
- [x] Laravel models analyzed (`User.php`, `Wallet.php`, `GameBet.php`, `GameResult.php`, `DepositRequest.php`, `Commission.php`)
- [x] Laravel migrations analyzed (`0001_01_01_000000_create_users_table.php`, etc.)
- [x] Laravel services analyzed (`GameEngineService.php`, `WalletService.php`, `MineGameService.php`, `CrashGameService.php`)
- [x] Fast Parity engine analyzed & migrated
- [x] Fast Parity round lifecycle (period generation `YYYYMMDDXXXX`, 30s/60s countdown, 5s lockout)
- [x] Fast Parity betting & multiplier payouts (9.0x number, 2.0x red/green, 4.5x violet, 1.5x split on 0 and 5)
- [x] Fast Parity bet auto-settlement & My Orders refresh persistence
- [x] 3-Tier MLM referral system (3% Level 1, 2% Level 2, 1% Level 3)
- [x] Daily Check-in 7-day streak rewards
- [x] Next.js Rivexa auto-changing hero slider
- [x] NestJS backend running live on port 4000
- [x] Next.js Web frontend running live on port 3000
- [x] Next.js Admin portal running live on port 3002
- [x] Automated builds passing (`pnpm --filter web build` & `pnpm --filter admin build`)
- [x] In-browser end-to-end verification
