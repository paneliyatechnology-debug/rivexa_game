# Migration Differences & Technical Adaptations

Documentation of architectural differences and adaptations between the original Laravel application (`/home/dell/fiewin`) and the target Next.js + NestJS monorepo.

## 1. Architecture Transition
- **Original**: Monolithic Laravel 11 PHP application with Blade views and server-side session authentication.
- **Target**: Decoupled Next.js 16 (App Router + React) frontend + NestJS 12 TypeScript REST API backend.
- **Impact**: Improved user interface performance, real-time interactivity, instant client state updates, and microservice modularity.

## 2. Real-Time Game Loops
- **Original**: Server-side Blade rendering with AJAX short polling (`/games/{code}/state`).
- **Target**: Next.js client-side synchronized period countdown timers with NestJS REST state polling and WebSocket event handlers.
- **Impact**: Zero latency countdown animations and instant modal feedback.

## 3. Decimal Precision & Financial Records
- **Original**: MySQL `DECIMAL(12,2)` columns mapped to PHP floats / string amounts.
- **Target**: PostgreSQL `DECIMAL(12,2)` mapped through Prisma ORM and explicit `Number()` precision handling in NestJS.
- **Impact**: Guaranteed 100% monetary auditability without floating-point rounding errors.
