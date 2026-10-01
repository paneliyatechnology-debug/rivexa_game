# API Migration Reference

Specification of REST endpoints migrated from Laravel to NestJS backend (`apps/api`).

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/register`
- **Request Body**: `{ email, phone, password, referralCode }`
- **Validation**: Email required, password min 6 chars.
- **Effects**: Creates `User`, initializes `Wallet` with ₹1,000 welcome bonus, processes referral code if supplied.
- **Response**: `{ accessToken, user: { id, email, phone, referralCode, wallet } }`

### `POST /api/v1/auth/login`
- **Request Body**: `{ email, password }`
- **Response**: `{ accessToken, user: { id, email, wallet } }`

---

## 2. Fast Parity Game Endpoints (`/api/v1/games/parity`)

### `GET /api/v1/games/parity/period`
- **Query Params**: `interval` (30 or 60)
- **Response**: `{ periodId: "202609215562", secondsRemaining: 15, totalDuration: 30 }`

### `GET /api/v1/games/parity/history`
- **Response**: Array of recent 20 settled periods `[{ periodId, gameType, resultNumber, resultColor }]`

### `GET /api/v1/games/parity/my-bets`
- **Query Params**: `userId`
- **Response**: Array of user bets `[{ periodNumber, selectOption, amount, winAmount, status }]`

### `POST /api/v1/games/parity/bet`
- **Request Body**: `{ userId, selectOption, amount }`
- **Validation**: Amount >= ₹10, valid option (`green`, `red`, `violet`, `0`-`9`), sufficient balance.
- **Effects**: Deducts stake from wallet, records `parityBet`, calculates win/loss, credits wallet if won, processes 3-tier MLM referral commission.
- **Response**: `{ betId, periodId, selectOption, amount, resultNumber, resultColor, isWin, multiplier, payout, status }`

---

## 3. Wallet Endpoints (`/api/v1/wallet`)

### `GET /api/v1/wallet/balance`
- **Query Params**: `userId`
- **Response**: `{ mainBalance, bonusBalance, commissionBalance }`

### `POST /api/v1/wallet/deposit/request`
- **Request Body**: `{ userId, amount, utrNumber, proofUrl }`
- **Response**: `{ id, status: "PENDING", utrNumber, amount }`

### `POST /api/v1/wallet/withdraw/request`
- **Request Body**: `{ userId, amount, upiId, bankName, accountNumber, ifscCode }`
- **Response**: `{ id, status: "PENDING", netAmount }`

### `POST /api/v1/wallet/daily-reward/claim`
- **Request Body**: `{ userId }`
- **Response**: `{ success: true, dayIndex, rewardAmount, newBalance }`
