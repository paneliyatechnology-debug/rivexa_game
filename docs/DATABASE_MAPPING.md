# Database Mapping Specification

Detailed schema mapping between the original Laravel MySQL database (`/home/dell/fiewin/database/migrations`) and the Prisma PostgreSQL target database (`/home/dell/Jaydeep/Game/gaming-platform/packages/database/prisma/schema.prisma`).

## 1. Table `users` -> `User`

| Laravel Field | PostgreSQL Field | Data Type | Nullable | Description / Default |
| ------------- | ---------------- | --------- | -------- | --------------------- |
| `id` | `id` | String / UUID | No | Primary Key |
| `email` | `email` | String | No | Unique User Email |
| `phone` | `phone` | String | Yes | Mobile Number |
| `password` | `password` | String | No | BCRYPT Hashed Password |
| `role` | `role` | Enum / String | No | Default: `'PLAYER'` |
| `referral_code` | `referralCode` | String | No | Unique User Referral Code |
| `referred_by` | `referredBy` | String | Yes | Parent Referrer User ID |
| `is_banned` | `isBanned` | Boolean | No | Default: `false` |
| `created_at` | `createdAt` | DateTime | No | Default: `now()` |
| `updated_at` | `updatedAt` | DateTime | No | Default: `now()` |

---

## 2. Table `wallets` -> `Wallet`

| Laravel Field | PostgreSQL Field | Data Type | Nullable | Description / Default |
| ------------- | ---------------- | --------- | -------- | --------------------- |
| `id` | `id` | String / UUID | No | Primary Key |
| `user_id` | `userId` | String | No | Foreign Key -> `User.id` |
| `main_balance` | `mainBalance` | Decimal(12,2) | No | Main Cash Wallet |
| `bonus_balance` | `bonusBalance` | Decimal(12,2) | No | Promotional Bonus Balance |
| `commission_balance`| `commissionBalance` | Decimal(12,2) | No | MLM Commission Wallet |
| `currency` | `currency` | String | No | Default: `'INR'` |
| `created_at` | `createdAt` | DateTime | No | Default: `now()` |

---

## 3. Table `game_bets` -> `ParityBet` / `GameBet`

| Laravel Field | PostgreSQL Field | Data Type | Nullable | Description / Default |
| ------------- | ---------------- | --------- | -------- | --------------------- |
| `id` | `id` | String / UUID | No | Primary Key |
| `user_id` | `userId` | String | No | Foreign Key -> `User.id` |
| `period_number` | `periodId` | String | No | Fast Parity Period Number (`YYYYMMDDXXXX`) |
| `bet_type` | `selectOption` | String | No | Bet Pick (`green`, `red`, `violet`, `0`-`9`) |
| `bet_amount` | `amount` | Decimal(12,2) | No | Stake Amount |
| `win_amount` | `payout` | Decimal(12,2) | No | Win Payout Amount |
| `status` | `status` | String | No | Bet Status (`PENDING`, `WON`, `LOST`) |
| `created_at` | `createdAt` | DateTime | No | Bet Submission Time |

---

## 4. Table `game_results` -> `ParityPeriod`

| Laravel Field | PostgreSQL Field | Data Type | Nullable | Description / Default |
| ------------- | ---------------- | --------- | -------- | --------------------- |
| `id` | `id` | String / UUID | No | Primary Key |
| `period_number` | `periodId` | String | No | Unique Period ID |
| `game_code` | `gameType` | String | No | Default: `'FAST_PARITY'` |
| `winning_number` | `resultNumber` | Integer | No | Winning Number (`0`-`9`) |
| `winning_colors` | `resultColor` | String | No | Color Result (`green`, `red`, `green_violet`, `red_violet`) |
| `provably_fair_hash`| `hash` | String | Yes | SHA-256 Hash Seed |
| `created_at` | `createdAt` | DateTime | No | Period Resolution Time |
