# Cricket Market Pricing & Risk Engine Architecture

## Executive Summary
This document outlines the production architecture for the **Cricket Market Pricing, Risk, Exposure & Audit Engine** built directly into the existing Rivexa/GameHub monorepo platform. 

The architecture strictly separates raw provider data, statistical probability models, fair odds calculation, bookmaker margin application, exposure/risk adjustments, and final displayed odds, ensuring determinism, auditability, multi-tenant safety, and real-time Socket.IO synchronization.

---

## 1. Existing System Architecture vs Proposed Expansion

### 1.1 Existing Architecture
- **Monorepo Structure**: Next.js (`apps/web`, `apps/admin`), NestJS (`apps/api`), Socket.IO (`SportsGateway`), PostgreSQL + Prisma ORM (`packages/database`).
- **Data Flow**: `CricketDataService` fetches CricAPI / provider data → persists `Match`, `MatchScore`, `CommentaryEvent` → generates default `CricketMarket` and `CricketMarketSelection`.
- **Bets**: Stored in `TestBet` and `TestBetSelection` with real wallet balance debiting.

### 1.2 Proposed Architecture Pipeline
```
Cricket Provider (CricAPI / Provider Socket)
        │
        ▼
Cricket Provider Adapter & Normalization Layer
        │
        ▼
Cricket Match State & Immutable Match State History (CricketMatchStateHistory)
        │
        ├───────────────────────────────┐
        ▼                               ▼
Probability Engine (DLS / Run Rate)   Exposure & Liability Engine
        │                               │
        └───────────────┬───────────────┘
                        ▼
             Fair Odds Calculation (1 / P)
                        │
                        ▼
             Configurable Margin Engine
                        │
                        ▼
              Risk Adjustment Engine
                        │
                        ▼
          Authoritative Pricing Engine (v1.0.0)
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
PostgreSQL (MarketPriceSnapshot)   Redis Live Snapshot
       │                                 │
       └────────────────┬────────────────┘
                        ▼
       SportsGateway (Socket.IO Room Broadcast)
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
Player UI (Live Odds & Flash)   Admin UI (Ledger, History, Debug & Chart)
```

---

## 2. Data Separation & Domain Layers

| Domain Layer | Purpose | Calculation / Storage |
| :--- | :--- | :--- |
| **Provider Data** | Raw scores, balls, wickets | `CricketScoreSnapshot`, `CommentaryEvent` |
| **Statistical Model** | Team win probabilities based on state | `ProbabilityEngineService` |
| **Fair Odds** | Inverse of model probability ($1 / P$) | `FairOddsService` |
| **Margin** | Bookmaker overround | `MarginService` (Configurable per market/tenant) |
| **Exposure & Liability** | Total stake & net risk per selection | `ExposureEngineService` |
| **Risk Adjustment** | Imbalance / movement adjustments | `RiskEngineService` |
| **Final Displayed Odds** | Actual odds shown to users | `PricingEngineService` |
| **Audit & History** | Immutable trace of all price changes | `MarketPriceSnapshot`, `MarketOverride`, `MarketAuditLog` |

---

## 3. Database Schema Extensions (Prisma)

The following entities expand `packages/database/prisma/schema.prisma`:

1. **`CricketMatchInnings`**: Tracks per-innings detailed scores and overs.
2. **`CricketMatchStateSnapshot`**: Immutable log of every match score/ball update.
3. **`MarketPriceSnapshot`**: Immutable historical record of every odds movement with reason, version, margin, and exposure details.
4. **`MarketExposureSnapshot`**: Periodic snapshot of market liability and net exposure per selection.
5. **`MarketEvent`**: Audit log of market creation, suspension, resumption, and provider events.
6. **`MarketOverride`**: Admin manual odds overrides with expiry timestamps, reasons, and user tracking.
7. **`MarketConfiguration`**: Configurable rules for margins, min/max odds, stake limits, and stale data thresholds.
8. **`MarketAuditLog`**: Governance audit trail for all operational admin actions.

---

## 4. Multi-Tenant Safety & Security Boundary

- All database queries for markets, overrides, and snapshots validate `tenantId`.
- WebSocket broadcasts use isolated room subscriptions: `match_{matchId}` and `market_{marketId}`.
- Player socket payloads strip sensitive liability, margin, and internal model probabilities.
- Admin APIs require strict role-based access controls (`cricket.market.manage`, `cricket.market.override`).

---

## 5. Implementation Roadmap

1. **Database Schema & Prisma Migration**: Define all new entities and run Prisma generation.
2. **Pricing & Risk Core Services**: Build `ProbabilityEngineService`, `FairOddsService`, `MarginService`, `ExposureEngineService`, `RiskEngineService`, and `PricingEngineService`.
3. **History & Snapshot Persistence**: Implement `OddsHistoryService`, `MarketHistoryService`, and `MarketSnapshotService`.
4. **Admin API & Controls**: Build `CricketMarketAdminController` for manual overrides, suspension/resumption, margin updates, and complete calculation debug views.
5. **Socket.IO Gateway Integration**: Update `SportsGateway` with room broadcasting for `cricket.odds.updated`, `cricket.market.suspended`, `cricket.market.resumed`, `cricket.market.override`.
6. **Player UI Updates**: Enhance `MarketCardView.tsx` with odds movement visual indicators, live WebSocket updates, and suspension badges.
7. **Admin UI Screens**: Build Odds Movement Chart, Historical Ledger Drawer, Manual Override Dialog, and Pricing Debugger.
8. **Testing & Verification**: Execute unit tests, integration pipeline tests, TypeScript checks, and build verification.
