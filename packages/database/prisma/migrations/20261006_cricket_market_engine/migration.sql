-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'DEVELOPER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'CASHED_OUT', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TenantMemberRole" AS ENUM ('SUPER_ADMIN', 'SUB_ADMIN', 'SUPER_AGENT', 'AGENT');

-- CreateEnum
CREATE TYPE "TenantMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "kyc_status" TEXT NOT NULL DEFAULT 'pending',
    "referral_code" TEXT NOT NULL,
    "referred_by_id" UUID,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "main_balance" DECIMAL(16,4) NOT NULL DEFAULT 0.0000,
    "bonus_balance" DECIMAL(16,4) NOT NULL DEFAULT 0.0000,
    "commission_balance" DECIMAL(16,4) NOT NULL DEFAULT 0.0000,
    "total_deposited" DECIMAL(16,4) NOT NULL DEFAULT 0.0000,
    "total_winnings" DECIMAL(16,4) NOT NULL DEFAULT 0.0000,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(16,4) NOT NULL,
    "balance_before" DECIMAL(16,4) NOT NULL,
    "balance_after" DECIMAL(16,4) NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_accounts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "account_holder" TEXT,
    "upi_id" TEXT,
    "qr_image" TEXT,
    "bank_name" TEXT,
    "account_number" TEXT,
    "ifsc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "daily_limit" DECIMAL(16,4) NOT NULL DEFAULT 200000.00,
    "current_daily_total" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "supported_payment_types" JSONB,
    "region" TEXT NOT NULL DEFAULT 'IN',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_requests" (
    "id" UUID NOT NULL,
    "deposit_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "merchant_account_id" UUID,
    "amount" DECIMAL(16,4) NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'upi',
    "utr_number" TEXT,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "user_remarks" TEXT,
    "admin_notes" TEXT,
    "approved_by_id" UUID,
    "rejected_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_proofs" (
    "id" UUID NOT NULL,
    "deposit_request_id" UUID NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT,
    "original_name" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_verifications" (
    "id" UUID NOT NULL,
    "deposit_request_id" UUID NOT NULL,
    "admin_id" UUID,
    "status_from" TEXT NOT NULL,
    "status_to" TEXT NOT NULL,
    "verification_notes" TEXT,
    "verified_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_assignment_logs" (
    "id" UUID NOT NULL,
    "deposit_request_id" UUID NOT NULL,
    "merchant_account_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(16,4) NOT NULL,
    "assignment_reason" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_assignment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "holder_name" TEXT NOT NULL,
    "upi_id" TEXT,
    "bank_name" TEXT,
    "account_number" TEXT,
    "ifsc_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bank_account_id" UUID,
    "amount" DECIMAL(16,4) NOT NULL,
    "fee" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "net_amount" DECIMAL(16,4) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referee_id" UUID NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "total_commission_earned" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_user_id" UUID NOT NULL,
    "bet_id" UUID,
    "level" INTEGER NOT NULL,
    "amount" DECIMAL(16,4) NOT NULL,
    "rate_percentage" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'credited',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_rewards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "day_index" INTEGER NOT NULL,
    "amount" DECIMAL(16,4) NOT NULL,
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "reward" DECIMAL(16,4) NOT NULL,
    "max_uses" INTEGER NOT NULL DEFAULT 100,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "engine" TEXT NOT NULL DEFAULT 'phaser3',
    "rtp_percentage" DECIMAL(5,2) NOT NULL DEFAULT 95.00,
    "min_bet" DECIMAL(12,2) NOT NULL DEFAULT 10.00,
    "max_bet" DECIMAL(12,2) NOT NULL DEFAULT 10000.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "manifest" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "period_number" TEXT,
    "bet_amount" DECIMAL(16,4) NOT NULL,
    "bet_type" TEXT,
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "win_amount" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "bet_details" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_moves" (
    "id" UUID NOT NULL,
    "game_bet_id" UUID NOT NULL,
    "tile_index" INTEGER NOT NULL,
    "is_mine" BOOLEAN NOT NULL DEFAULT false,
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "profit" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jet_rounds" (
    "id" UUID NOT NULL,
    "round_number" BIGINT NOT NULL,
    "crash_multiplier" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jet_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jet_bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "amount" DECIMAL(16,4) NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "payout" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jet_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_rounds" (
    "id" UUID NOT NULL,
    "round_number" BIGINT NOT NULL,
    "crash_multiplier" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crash_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "amount" DECIMAL(16,4) NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "payout" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crash_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "andar_bahar_rounds" (
    "id" UUID NOT NULL,
    "round_number" BIGINT NOT NULL,
    "joker_card" TEXT NOT NULL,
    "winning_side" TEXT NOT NULL,
    "cards_dealt" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "andar_bahar_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "andar_bahar_bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "side" TEXT NOT NULL,
    "amount" DECIMAL(16,4) NOT NULL,
    "payout" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "andar_bahar_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mines_games" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bet_amount" DECIMAL(16,4) NOT NULL,
    "mine_count" INTEGER NOT NULL,
    "mine_positions" JSONB NOT NULL,
    "revealed_tiles" JSONB NOT NULL DEFAULT '[]',
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "payout" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mines_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parity_periods" (
    "id" UUID NOT NULL,
    "period_id" TEXT NOT NULL,
    "game_type" TEXT NOT NULL DEFAULT 'FAST_PARITY',
    "result_number" INTEGER NOT NULL,
    "result_color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parity_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parity_bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "period_id" TEXT NOT NULL,
    "select_option" TEXT NOT NULL,
    "amount" DECIMAL(16,4) NOT NULL,
    "payout" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parity_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spin_bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "selected_color" TEXT NOT NULL,
    "result_color" TEXT NOT NULL,
    "bet_amount" DECIMAL(16,4) NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "payout_amount" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spin_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dice_bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "target_number" INTEGER NOT NULL,
    "roll_type" TEXT NOT NULL,
    "rolled_number" INTEGER NOT NULL,
    "bet_amount" DECIMAL(16,4) NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "payout_amount" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dice_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pushparani_rounds" (
    "id" UUID NOT NULL,
    "round_number" BIGINT NOT NULL,
    "crash_multiplier" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pushparani_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pushparani_bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "amount" DECIMAL(16,4) NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "payout" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pushparani_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_flip_bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "chosen_side" TEXT NOT NULL,
    "result_side" TEXT NOT NULL,
    "bet_amount" DECIMAL(16,4) NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 1.96,
    "payout_amount" DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_flip_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_competitions" (
    "id" UUID NOT NULL,
    "sport_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "logo_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_seasons" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_teams" (
    "id" UUID NOT NULL,
    "sport_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "flag_code" TEXT,
    "logo_url" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_players" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Player',
    "jersey_number" INTEGER,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_matches" (
    "id" UUID NOT NULL,
    "sport_id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "season_id" UUID,
    "team_a_id" UUID NOT NULL,
    "team_b_id" UUID NOT NULL,
    "venue" TEXT,
    "match_type" TEXT NOT NULL DEFAULT 'T20',
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "result_summary" TEXT,
    "winning_team_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cricket_market_categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cricket_market_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cricket_markets" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "category_slug" TEXT NOT NULL DEFAULT 'main',
    "provider_market_id" TEXT,
    "name" TEXT NOT NULL,
    "market_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "suspend_reason" TEXT,
    "source_type" TEXT NOT NULL DEFAULT 'STATISTICAL_MODEL',
    "line_threshold" DOUBLE PRECISION,
    "is_back_lay" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "margin" DECIMAL(6,4) NOT NULL DEFAULT 0.04,
    "tenant_id" UUID,
    "configuration_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cricket_markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cricket_market_selections" (
    "id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "provider_selection_id" TEXT,
    "name" TEXT NOT NULL,
    "back_price" DECIMAL(8,2) NOT NULL,
    "lay_price" DECIMAL(8,2),
    "back_liquidity" DECIMAL(12,2),
    "lay_liquidity" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "fair_probability" DECIMAL(6,4),
    "fair_odds" DECIMAL(8,2),
    "displayed_odds" DECIMAL(8,2),
    "exposure" DECIMAL(16,4) DEFAULT 0,
    "liability" DECIMAL(16,4) DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cricket_market_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cricket_match_state_snapshots" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "innings" INTEGER NOT NULL DEFAULT 1,
    "batting_team" TEXT,
    "bowling_team" TEXT,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "overs" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "balls" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER,
    "required_runs" INTEGER,
    "required_rate" DOUBLE PRECISION,
    "current_run_rate" DOUBLE PRECISION,
    "last_event" TEXT,
    "source_provider" TEXT NOT NULL DEFAULT 'CRICAPI',
    "provider_event_id" TEXT,
    "provider_timestamp" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cricket_match_state_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_price_snapshots" (
    "id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "selection_id" UUID NOT NULL,
    "old_odds" DECIMAL(8,2) NOT NULL,
    "new_odds" DECIMAL(8,2) NOT NULL,
    "fair_odds" DECIMAL(8,2) NOT NULL,
    "probability" DECIMAL(6,4) NOT NULL,
    "margin" DECIMAL(6,4) NOT NULL,
    "exposure" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "liability" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SYSTEM_RECALCULATION',
    "pricing_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "match_state_reference" TEXT,
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_exposure_snapshots" (
    "id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "selection_id" UUID NOT NULL,
    "total_stake" DECIMAL(16,4) NOT NULL,
    "potential_liability" DECIMAL(16,4) NOT NULL,
    "net_exposure" DECIMAL(16,4) NOT NULL,
    "tenant_id" UUID,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_exposure_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_events" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "market_id" UUID,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL DEFAULT '{}',
    "provider_event_id" TEXT,
    "provider" TEXT,
    "sequence_number" INTEGER,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_overrides" (
    "id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "selection_id" UUID NOT NULL,
    "previous_odds" DECIMAL(8,2) NOT NULL,
    "new_odds" DECIMAL(8,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "admin_user_id" UUID,
    "tenant_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_configurations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "market_type" TEXT NOT NULL DEFAULT 'ALL',
    "default_margin" DECIMAL(6,4) NOT NULL DEFAULT 0.04,
    "min_odds" DECIMAL(8,2) NOT NULL DEFAULT 1.01,
    "max_odds" DECIMAL(8,2) NOT NULL DEFAULT 500.00,
    "min_stake" DECIMAL(16,4) NOT NULL DEFAULT 10.00,
    "max_stake" DECIMAL(16,4) NOT NULL DEFAULT 100000.00,
    "auto_suspend_stale_sec" INTEGER NOT NULL DEFAULT 60,
    "max_liability_per_selection" DECIMAL(16,4) NOT NULL DEFAULT 500000.00,
    "risk_adjustment_enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "actor_id" UUID,
    "actor_role" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_bets" (
    "id" UUID NOT NULL,
    "bet_reference" TEXT NOT NULL,
    "user_id" UUID,
    "match_id" UUID NOT NULL,
    "total_stake" DECIMAL(16,4) NOT NULL,
    "potential_return" DECIMAL(16,4) NOT NULL,
    "potential_profit" DECIMAL(16,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "is_test_mode" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_bet_selections" (
    "id" UUID NOT NULL,
    "test_bet_id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "selection_id" UUID NOT NULL,
    "market_name" TEXT NOT NULL,
    "selection_name" TEXT NOT NULL,
    "odds_at_placement" DECIMAL(8,2) NOT NULL,
    "stake" DECIMAL(16,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_bet_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_bet_settlements" (
    "id" UUID NOT NULL,
    "test_bet_id" UUID NOT NULL,
    "result_source" TEXT NOT NULL DEFAULT 'CRICAPI_MATCH_INFO',
    "settled_by" TEXT NOT NULL DEFAULT 'SYSTEM_AUTO',
    "settlement_summary" TEXT NOT NULL,
    "payout_amount" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "settled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_bet_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_match_scores" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_a_score" TEXT,
    "team_b_score" TEXT,
    "team_a_overs" TEXT,
    "team_b_overs" TEXT,
    "current_innings" INTEGER NOT NULL DEFAULT 1,
    "current_run_rate" DOUBLE PRECISION,
    "required_run_rate" DOUBLE PRECISION,
    "target_runs" INTEGER,
    "status_text" TEXT,
    "active_batsman" TEXT,
    "active_bowler" TEXT,
    "recent_overs" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_match_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_scorecards" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_commentary_events" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "over_number" DOUBLE PRECISION NOT NULL,
    "ball_number" INTEGER NOT NULL,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "event" TEXT NOT NULL DEFAULT 'RUN',
    "bowler" TEXT NOT NULL,
    "batsman" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sports_commentary_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_provider_configs" (
    "id" UUID NOT NULL,
    "provider_name" TEXT NOT NULL DEFAULT 'MockSportsProvider',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auto_sync" BOOLEAN NOT NULL DEFAULT true,
    "sync_interval" INTEGER NOT NULL DEFAULT 5,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cricket_providers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_test_mode" BOOLEAN NOT NULL DEFAULT true,
    "capabilities" JSONB NOT NULL DEFAULT '{}',
    "last_sync_at" TIMESTAMP(3),
    "sync_status" TEXT NOT NULL DEFAULT 'IDLE',
    "last_error" TEXT,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cricket_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_entity_mappings" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "provider_entity_id" TEXT NOT NULL,
    "internal_entity_id" UUID NOT NULL,
    "raw_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_entity_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cricket_data_sync_logs" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "status_code" INTEGER,
    "duration_ms" INTEGER NOT NULL,
    "record_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cricket_data_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cricket_squad_players" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "player_role" TEXT,
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "is_keeper" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cricket_squad_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cricket_score_snapshots" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "provider_match_id" TEXT NOT NULL,
    "score_data" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cricket_score_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#6366f1',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "commission_rates" JSONB NOT NULL DEFAULT '{}',
    "max_agent_count" INTEGER NOT NULL DEFAULT 50,
    "max_player_count" INTEGER NOT NULL DEFAULT 5000,
    "allowed_games" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_members" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "TenantMemberRole" NOT NULL,
    "status" "TenantMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "credit_balance" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "commission_balance" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "referral_code" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_players" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "agent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_credit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "giver_id" UUID,
    "receiver_id" UUID NOT NULL,
    "amount" DECIMAL(16,4) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "balance_before" DECIMAL(16,4) NOT NULL,
    "balance_after" DECIMAL(16,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_credit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "member_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_idx" ON "wallet_transactions"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_requests_deposit_id_key" ON "deposit_requests"("deposit_id");

-- CreateIndex
CREATE INDEX "deposit_requests_utr_number_idx" ON "deposit_requests"("utr_number");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "jet_rounds_round_number_key" ON "jet_rounds"("round_number");

-- CreateIndex
CREATE UNIQUE INDEX "crash_rounds_round_number_key" ON "crash_rounds"("round_number");

-- CreateIndex
CREATE UNIQUE INDEX "andar_bahar_rounds_round_number_key" ON "andar_bahar_rounds"("round_number");

-- CreateIndex
CREATE UNIQUE INDEX "parity_periods_period_id_key" ON "parity_periods"("period_id");

-- CreateIndex
CREATE UNIQUE INDEX "pushparani_rounds_round_number_key" ON "pushparani_rounds"("round_number");

-- CreateIndex
CREATE UNIQUE INDEX "sports_slug_key" ON "sports"("slug");

-- CreateIndex
CREATE INDEX "sports_competitions_sport_id_idx" ON "sports_competitions"("sport_id");

-- CreateIndex
CREATE INDEX "sports_matches_sport_id_status_idx" ON "sports_matches"("sport_id", "status");

-- CreateIndex
CREATE INDEX "sports_matches_competition_id_idx" ON "sports_matches"("competition_id");

-- CreateIndex
CREATE UNIQUE INDEX "cricket_market_categories_slug_key" ON "cricket_market_categories"("slug");

-- CreateIndex
CREATE INDEX "cricket_markets_match_id_category_slug_idx" ON "cricket_markets"("match_id", "category_slug");

-- CreateIndex
CREATE INDEX "cricket_markets_market_type_idx" ON "cricket_markets"("market_type");

-- CreateIndex
CREATE INDEX "cricket_markets_tenant_id_idx" ON "cricket_markets"("tenant_id");

-- CreateIndex
CREATE INDEX "cricket_market_selections_market_id_idx" ON "cricket_market_selections"("market_id");

-- CreateIndex
CREATE INDEX "cricket_match_state_snapshots_match_id_received_at_idx" ON "cricket_match_state_snapshots"("match_id", "received_at");

-- CreateIndex
CREATE INDEX "market_price_snapshots_market_id_selection_id_created_at_idx" ON "market_price_snapshots"("market_id", "selection_id", "created_at");

-- CreateIndex
CREATE INDEX "market_price_snapshots_tenant_id_idx" ON "market_price_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "market_exposure_snapshots_market_id_timestamp_idx" ON "market_exposure_snapshots"("market_id", "timestamp");

-- CreateIndex
CREATE INDEX "market_exposure_snapshots_tenant_id_idx" ON "market_exposure_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "market_events_match_id_processed_at_idx" ON "market_events"("match_id", "processed_at");

-- CreateIndex
CREATE INDEX "market_overrides_market_id_selection_id_idx" ON "market_overrides"("market_id", "selection_id");

-- CreateIndex
CREATE INDEX "market_overrides_tenant_id_idx" ON "market_overrides"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "market_configurations_tenant_id_key" ON "market_configurations"("tenant_id");

-- CreateIndex
CREATE INDEX "market_audit_logs_tenant_id_created_at_idx" ON "market_audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "test_bets_bet_reference_key" ON "test_bets"("bet_reference");

-- CreateIndex
CREATE INDEX "test_bets_user_id_status_idx" ON "test_bets"("user_id", "status");

-- CreateIndex
CREATE INDEX "test_bets_match_id_idx" ON "test_bets"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "sports_match_scores_match_id_key" ON "sports_match_scores"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "sports_scorecards_match_id_key" ON "sports_scorecards"("match_id");

-- CreateIndex
CREATE INDEX "sports_commentary_events_match_id_idx" ON "sports_commentary_events"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "cricket_providers_name_key" ON "cricket_providers"("name");

-- CreateIndex
CREATE INDEX "provider_entity_mappings_entity_type_provider_entity_id_idx" ON "provider_entity_mappings"("entity_type", "provider_entity_id");

-- CreateIndex
CREATE INDEX "provider_entity_mappings_internal_entity_id_idx" ON "provider_entity_mappings"("internal_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_entity_mappings_provider_id_entity_type_provider_e_key" ON "provider_entity_mappings"("provider_id", "entity_type", "provider_entity_id");

-- CreateIndex
CREATE INDEX "cricket_data_sync_logs_provider_id_created_at_idx" ON "cricket_data_sync_logs"("provider_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cricket_squad_players_match_id_team_id_player_id_key" ON "cricket_squad_players"("match_id", "team_id", "player_id");

-- CreateIndex
CREATE INDEX "cricket_score_snapshots_match_id_received_at_idx" ON "cricket_score_snapshots"("match_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_members_referral_code_key" ON "tenant_members"("referral_code");

-- CreateIndex
CREATE INDEX "tenant_members_tenant_id_role_idx" ON "tenant_members"("tenant_id", "role");

-- CreateIndex
CREATE INDEX "tenant_members_parent_id_idx" ON "tenant_members"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_members_tenant_id_email_key" ON "tenant_members"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "tenant_players_tenant_id_idx" ON "tenant_players"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_players_agent_id_idx" ON "tenant_players"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_players_tenant_id_user_id_key" ON "tenant_players"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "tenant_credit_logs_tenant_id_idx" ON "tenant_credit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_credit_logs_receiver_id_idx" ON "tenant_credit_logs"("receiver_id");

-- CreateIndex
CREATE INDEX "tenant_audit_logs_tenant_id_created_at_idx" ON "tenant_audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "tenant_audit_logs_member_id_idx" ON "tenant_audit_logs"("member_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_merchant_account_id_fkey" FOREIGN KEY ("merchant_account_id") REFERENCES "merchant_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_proofs" ADD CONSTRAINT "deposit_proofs_deposit_request_id_fkey" FOREIGN KEY ("deposit_request_id") REFERENCES "deposit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_verifications" ADD CONSTRAINT "deposit_verifications_deposit_request_id_fkey" FOREIGN KEY ("deposit_request_id") REFERENCES "deposit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_verifications" ADD CONSTRAINT "deposit_verifications_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_assignment_logs" ADD CONSTRAINT "merchant_assignment_logs_deposit_request_id_fkey" FOREIGN KEY ("deposit_request_id") REFERENCES "deposit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_assignment_logs" ADD CONSTRAINT "merchant_assignment_logs_merchant_account_id_fkey" FOREIGN KEY ("merchant_account_id") REFERENCES "merchant_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_assignment_logs" ADD CONSTRAINT "merchant_assignment_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_source_user_id_fkey" FOREIGN KEY ("source_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_bet_id_fkey" FOREIGN KEY ("bet_id") REFERENCES "game_bets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_rewards" ADD CONSTRAINT "daily_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_bets" ADD CONSTRAINT "game_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_bets" ADD CONSTRAINT "game_bets_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_game_bet_id_fkey" FOREIGN KEY ("game_bet_id") REFERENCES "game_bets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jet_bets" ADD CONSTRAINT "jet_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jet_bets" ADD CONSTRAINT "jet_bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "jet_rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_bets" ADD CONSTRAINT "crash_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_bets" ADD CONSTRAINT "crash_bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "crash_rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "andar_bahar_bets" ADD CONSTRAINT "andar_bahar_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "andar_bahar_bets" ADD CONSTRAINT "andar_bahar_bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "andar_bahar_rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mines_games" ADD CONSTRAINT "mines_games_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parity_bets" ADD CONSTRAINT "parity_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parity_bets" ADD CONSTRAINT "parity_bets_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "parity_periods"("period_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spin_bets" ADD CONSTRAINT "spin_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dice_bets" ADD CONSTRAINT "dice_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pushparani_bets" ADD CONSTRAINT "pushparani_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pushparani_bets" ADD CONSTRAINT "pushparani_bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "pushparani_rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_flip_bets" ADD CONSTRAINT "coin_flip_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_competitions" ADD CONSTRAINT "sports_competitions_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_seasons" ADD CONSTRAINT "sports_seasons_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "sports_competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_teams" ADD CONSTRAINT "sports_teams_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_players" ADD CONSTRAINT "sports_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sports_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_matches" ADD CONSTRAINT "sports_matches_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_matches" ADD CONSTRAINT "sports_matches_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "sports_competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_matches" ADD CONSTRAINT "sports_matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "sports_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_matches" ADD CONSTRAINT "sports_matches_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "sports_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_matches" ADD CONSTRAINT "sports_matches_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "sports_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cricket_markets" ADD CONSTRAINT "cricket_markets_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "sports_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cricket_market_selections" ADD CONSTRAINT "cricket_market_selections_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "cricket_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cricket_match_state_snapshots" ADD CONSTRAINT "cricket_match_state_snapshots_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "sports_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_price_snapshots" ADD CONSTRAINT "market_price_snapshots_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "cricket_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_price_snapshots" ADD CONSTRAINT "market_price_snapshots_selection_id_fkey" FOREIGN KEY ("selection_id") REFERENCES "cricket_market_selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_exposure_snapshots" ADD CONSTRAINT "market_exposure_snapshots_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "cricket_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_exposure_snapshots" ADD CONSTRAINT "market_exposure_snapshots_selection_id_fkey" FOREIGN KEY ("selection_id") REFERENCES "cricket_market_selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "sports_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "cricket_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_overrides" ADD CONSTRAINT "market_overrides_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "cricket_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_overrides" ADD CONSTRAINT "market_overrides_selection_id_fkey" FOREIGN KEY ("selection_id") REFERENCES "cricket_market_selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_bets" ADD CONSTRAINT "test_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_bets" ADD CONSTRAINT "test_bets_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "sports_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_bet_selections" ADD CONSTRAINT "test_bet_selections_test_bet_id_fkey" FOREIGN KEY ("test_bet_id") REFERENCES "test_bets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_bet_selections" ADD CONSTRAINT "test_bet_selections_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "cricket_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_bet_selections" ADD CONSTRAINT "test_bet_selections_selection_id_fkey" FOREIGN KEY ("selection_id") REFERENCES "cricket_market_selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_bet_settlements" ADD CONSTRAINT "test_bet_settlements_test_bet_id_fkey" FOREIGN KEY ("test_bet_id") REFERENCES "test_bets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_match_scores" ADD CONSTRAINT "sports_match_scores_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "sports_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_scorecards" ADD CONSTRAINT "sports_scorecards_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "sports_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_commentary_events" ADD CONSTRAINT "sports_commentary_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "sports_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_entity_mappings" ADD CONSTRAINT "provider_entity_mappings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "cricket_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cricket_data_sync_logs" ADD CONSTRAINT "cricket_data_sync_logs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "cricket_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cricket_squad_players" ADD CONSTRAINT "cricket_squad_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "sports_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cricket_squad_players" ADD CONSTRAINT "cricket_squad_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sports_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cricket_squad_players" ADD CONSTRAINT "cricket_squad_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "sports_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cricket_score_snapshots" ADD CONSTRAINT "cricket_score_snapshots_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "sports_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tenant_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_players" ADD CONSTRAINT "tenant_players_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_players" ADD CONSTRAINT "tenant_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_players" ADD CONSTRAINT "tenant_players_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "tenant_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_credit_logs" ADD CONSTRAINT "tenant_credit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_credit_logs" ADD CONSTRAINT "tenant_credit_logs_giver_id_fkey" FOREIGN KEY ("giver_id") REFERENCES "tenant_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_credit_logs" ADD CONSTRAINT "tenant_credit_logs_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "tenant_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_audit_logs" ADD CONSTRAINT "tenant_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_audit_logs" ADD CONSTRAINT "tenant_audit_logs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "tenant_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

