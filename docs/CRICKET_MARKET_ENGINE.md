# Cricket Market Pricing, Risk, Exposure & Audit Engine Guide

## Operational Overview

The **Cricket Market Pricing, Risk, Exposure & Audit Engine** is a high-performance, deterministic module built natively inside the existing Rivexa/GameHub monorepo (`apps/api`, `apps/web`, `apps/admin`, `packages/database`).

It powers live in-play and pre-match cricket odds generation, real-time exposure calculations, automated risk management, manual operator overrides, and complete immutable auditing.

---

## 1. Engine Calculation Pipeline (7-Stage Deterministic Flow)

Every price calculation executes strictly through the authoritative `PricingEngineService` (`v1.0.0`):

```
[1. Provider Score & Inning Data]
               │
               ▼
[2. Normalized Match State & Idempotency] ── (MatchStateService: State versioning & sequence checks)
               │
               ▼
[3. Statistical Probability Model] ───────── (ProbabilityEngineService: DLS decay & Run Rate)
               │
               ▼
[4. Fair Odds & Margin Injection] ────────── (FairOddsService & MarginService: Overround scaling)
               │
               ▼
[5. Net Exposure & Risk Skew] ────────────── (ExposureEngineService & RiskEngineService)
               │
               ▼
[6. Authoritative Pricing Engine] ────────── (PricingEngineService v1.0.0)
               │
        ┌──────┴──────┐
        ▼             ▼
[PostgreSQL Snapshot] [Socket.IO Broadcast]
```

### Key Components

1. **`MatchStateService`** (`apps/api/src/modules/cricket-markets/match-state.service.ts`):
   - Creates the authoritative single `NormalizedMatchState` object.
   - Enforces **Target Calculation**: For chases, $\text{Target} = \text{1st Innings Runs} + 1$ (e.g. Australia 174/10 $\rightarrow$ Target 175).
   - Enforces **Event Idempotency & Sequence Ordering**: Ignores duplicate/out-of-order provider events based on `providerSequence` and `providerTimestamp`.
   - Logs structured server logs: `[CRICKET_STATE] matchId=... version=... score=... wickets=... overs=... target=...`

2. **`ProbabilityEngineService`** (`apps/api/src/modules/cricket-markets/pricing/probability-engine.service.ts`):
   - Computes win/outcome probabilities $P(A)$ and $P(B)$ based on target, required run rate, current run rate, overs remaining, and wickets lost.
   - Utilizes statistical DLS (Duckworth-Lewis-Stern) decay curves for second-innings chases.
   - Logs structured server logs: `[PROBABILITY] marketId=... selectionId=... probability=...`

3. **`FairOddsService`** (`apps/api/src/modules/cricket-markets/pricing/fair-odds.service.ts`):
   - Calculates raw zero-margin odds: $\text{Fair Odds} = \frac{1}{P}$.
   - Enforces rounding precision using `Prisma.Decimal` to eliminate floating-point drift.

4. **`MarginService`** (`apps/api/src/modules/cricket-markets/pricing/margin.service.ts`):
   - Injects configurable house margin (e.g., 4.0% overround): $P_{\text{margin}} = P \times (1 + M)$.
   - Normalizes probabilities so $\sum P_i = 1 + M$.

5. **`ExposureEngineService`** (`apps/api/src/modules/cricket-markets/pricing/exposure-engine.service.ts`):
   - Calculates total matched volume, selection liability, net position per selection, and maximum bookmaker liability across all outcomes.

6. **`RiskEngineService`** (`apps/api/src/modules/cricket-markets/pricing/risk-engine.service.ts`):
   - Applies skew factor to odds based on stake imbalance ($I = \frac{\text{Stake}_A - \text{Stake}_B}{\text{Total Stake}}$).
   - Detects stale provider feeds (>30 seconds) and automatically flags markets for suspension.

7. **`PricingEngineService`** (`apps/api/src/modules/cricket-markets/pricing/pricing-engine.service.ts`):
   - Authoritative orchestrator combining stages 1-6 into a single atomic calculation.
   - Exposes: `modelProbability`, `fairProbability`, `marketImpliedProbability`, `overroundPercent`, `finalOdds`.
   - Persists immutable snapshot rows to `MarketPriceSnapshot` in PostgreSQL on every price change.
   - Triggers real-time Socket.IO broadcasts via `SportsGateway`.
   - Logs structured server logs: `[PRICING] oldOdds=... newOdds=... reason=...`

---

## 2. Immutable Ledger & Auditability

Every single odds adjustment produces an immutable snapshot record in `MarketPriceSnapshot`:

- **Fields Captured**:
  - `oldOdds`, `newOdds`, `fairOdds`, `probability`, `margin`, `exposure`, `liability`
  - `changeReason` (e.g., `MATCH_STATE_MODEL_PRICING`, `PROVIDER_UPDATE`, `MANUAL_OVERRIDE`, `RISK_SKEW_ADJUSTMENT`)
  - `sourceProvider` (`AUTHORITATIVE_PRICING_ENGINE`)
  - `pricingVersion` (`v1.0.0`)
  - `createdAt` timestamp

---

## 3. Real-Time Socket.IO Broadcast Architecture

Real-time odds updates and market status changes are broadcasted via `SportsGateway` (`apps/api/src/sports/sports.gateway.ts`):

### Socket Events & Payloads

1. **`cricket.odds.updated`**:
   ```json
   {
     "matchId": "clx...",
     "marketId": "clx...",
     "selectionId": "sel_1",
     "oldOdds": 1.85,
     "newOdds": 1.96,
     "modelProbability": 0.491,
     "finalOdds": 1.96,
     "matchStateVersion": 2,
     "priceVersion": "v1.0.0",
     "updatedAt": "2026-10-06T12:08:00.000Z"
   }
   ```
   Logs: `[SOCKET] event=cricket.odds.updated matchId=... marketId=...`

2. **`cricket.market.suspended`**:
   ```json
   {
     "matchId": "clx...",
     "marketId": "clx...",
     "reason": "WICKET_FALLEN_OR_STALE_DATA",
     "timestamp": "2026-10-06T12:08:05.000Z"
   }
   ```

---

## 4. Testing & Verification Results

Vitest test suite (`src/modules/cricket-markets/pricing/cricket-pricing-pipeline.spec.ts`):

- **Test 1: Target Calculation**: Australia 174/10 1st innings total yields Target = 175 for India 74/2 at 24.5 overs (`PASSED`).
- **Test 2: State Update**: India 80/2 at 25.3 overs increments `matchStateVersion` (v2), maintains Target = 175, recalculates model probability (0.491) and final odds (1.96) (`PASSED`).
- **Test 3: Wicket Fall**: India 80/3 triggers further probability reduction (0.4654) and odds increase (2.07) with wicket penalty applied (`PASSED`).
- **Test 4: Event Idempotency**: Duplicate or older provider sequence is ignored with warning (`PASSED`).
