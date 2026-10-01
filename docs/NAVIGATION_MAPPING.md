# Navigation & Reward Routing Mapping: Laravel to Next.js + NestJS

## 1. Overview
This document maps the navigation header, bottom navigation bar, notification center, daily check-in, task rewards, and referral/invite routes from the Laravel source of truth (`fiewin`) to the Next.js + NestJS target application (`gaming-platform`).

---

## 2. Route & Controller Parity Matrix

| Feature | Laravel Route | Laravel Controller & Method | Next.js Route | NestJS Controller & Service | Prisma Model / DB Table |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Notifications Center** | `GET /notifications` | `NotificationController@index` | `apps/web/src/app/notifications/page.tsx` | `NotificationsController.getNotifications` | `notifications` |
| **Unread Notification Count** | `GET /notifications/unread-count` | `NotificationController@unreadCount` | Handled via API client in `TopHeader` | `NotificationsController.getUnreadCount` | `notifications` |
| **Mark Notification Read** | `POST /notifications/{id}/read` | `NotificationController@markAsRead` | `POST /api/v1/notifications/:id/read` | `NotificationsController.markAsRead` | `notifications` |
| **Mark All Read** | `POST /notifications/read-all` | `NotificationController@markAllAsRead` | `POST /api/v1/notifications/read-all` | `NotificationsController.markAllAsRead` | `notifications` |
| **Daily Check-In** | `GET /promotion` (or `/checkin`) | `PromotionController@index` & `claimDailyCheckin` | `apps/web/src/app/checkin/page.tsx` | `WalletController.claimDailyReward` / `WalletService.claimDailyReward` | `daily_rewards` |
| **Task Rewards** | `GET /promotion` (or `/tasks`) | `PromotionController@index` & `redeemCoupon` | `apps/web/src/app/tasks/page.tsx` | `TasksController.getTasks` & `claimTask` | `coupons` / `tasks` |
| **Invite & Earn (Referral)**| `GET /referral` | `ReferralController@index` | `apps/web/src/app/invite/page.tsx` (alias `/referral`) | `ReferralController.getReferralStats` | `referrals` / `commissions` |
| **Rewards Hub** | `GET /promotion` | `PromotionController@index` | `apps/web/src/app/rewards/page.tsx` | Aggregates checkin, tasks, and referral info | `daily_rewards`, `coupons` |
| **Wallet / Deposit** | `GET /wallet` | `WalletController@index` | `apps/web/src/app/deposit/page.tsx` (alias `/wallet`) | `WalletController.getBalance` | `wallets` |
| **Profile** | `GET /profile` | `ProfileController@index` | `apps/web/src/app/profile/page.tsx` | `AuthController.getProfile` | `users`, `bank_accounts` |

---

## 3. UI Icon & Action Audit Table

| UI Element / Location | Previous (Incorrect) Action | Correct Expected Action | Laravel Source Route | Next.js Target Route | Backend API Endpoint | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Header Bell Icon** (`TopHeader`) | Opened `/checkin` (Daily Check-in) | Open Notification Center | `route('notifications.index')` | `/notifications` | `GET /api/v1/notifications` | FIX |
| **Header Notification Badge** | Hardcoded `"1"` | Real unread count from backend | `$unreadBellCount` | Badge state in `TopHeader` | `GET /api/v1/notifications/unread-count` | FIX |
| **Quick Action: Daily Check-in** | Opened `/checkin` | Open Daily Check-In Page | `route('promotion.index')` | `/checkin` | `POST /api/v1/wallet/daily-reward` | OK |
| **Quick Action: Task Reward** | Opened `/checkin` | Open Task Rewards Page | `route('promotion.index')` | `/tasks` | `GET /api/v1/tasks` | FIX |
| **Quick Action: Invite Earn** | Opened `/register` | Open Invite & Earn Page | `route('referral.index')` | `/invite` | `GET /api/v1/referral` | FIX |
| **MLM Banner INVITE Button** | Opened `/register` | Open Invite & Earn Page | `route('referral.index')` | `/invite` | `GET /api/v1/referral` | FIX |
| **Bottom Nav: Rewards Item** | Opened `/checkin` | Open Rewards Hub Page | `route('promotion.index')` | `/rewards` | Aggregate Rewards API | FIX |
| **Bottom Nav: Wallet Item** | Opened `/deposit` | Open Deposit / Wallet Page | `route('wallet.index')` | `/deposit` | `GET /api/v1/wallet/balance` | OK |
| **Bottom Nav: Profile Item** | Opened `/profile` | Open Profile Page | `route('profile.index')` | `/profile` | `GET /api/v1/auth/me` | OK |
