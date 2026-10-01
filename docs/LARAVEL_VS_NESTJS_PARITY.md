# Laravel vs NestJS Parity & Comparison Tests

Comparative analysis verifying that NestJS API outcomes, period generation, bet settlement, and wallet balance updates match the reference Laravel implementation (`/home/dell/fiewin`).

## 1. Payout Calculation Parity

| Bet Option | Winning Number | Result Color | Stake (₹) | Laravel Payout (₹) | NestJS Payout (₹) | Parity |
| ---------- | -------------- | ------------ | --------- | ------------------ | ----------------- | ------ |
| `GREEN` | 7 | `green` | 10.00 | 20.00 | 20.00 | MATCH |
| `GREEN` | 5 | `green_violet` | 10.00 | 15.00 | 15.00 | MATCH |
| `RED` | 8 | `red` | 10.00 | 20.00 | 20.00 | MATCH |
| `RED` | 0 | `red_violet` | 10.00 | 15.00 | 15.00 | MATCH |
| `VIOLET` | 0 | `red_violet` | 10.00 | 45.00 | 45.00 | MATCH |
| `VIOLET` | 5 | `green_violet` | 10.00 | 45.00 | 45.00 | MATCH |
| `NUMBER 7` | 7 | `green` | 10.00 | 90.00 | 90.00 | MATCH |
| `GREEN` | 8 | `red` | 10.00 | 0.00 | 0.00 | MATCH |

---

## 2. Period ID Generation Parity

- **Format**: `YYYYMMDDXXXX`
- **Laravel Implementation**: `GameHelper::generatePeriodNumber('fast_parity', 30)`
- **NestJS Implementation**: `ParityService.getCurrentPeriodId()`
- **Result**: Identical period string formatting based on system clock boundary.

---

## 3. MLM Referral Commission Parity

- **Level 1**: 3% of bet stake
- **Level 2**: 2% of bet stake
- **Level 3**: 1% of bet stake
- **Execution**: Triggered on bet placement / settlement in both implementations.
