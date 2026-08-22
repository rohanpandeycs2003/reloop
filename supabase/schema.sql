-- ================================================================
-- RELOOP — SUPABASE DATABASE SCHEMA  (optimised)
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- ENUMS
-- ================================================================

CREATE TYPE upload_status     AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE transaction_type  AS ENUM (
  'upload_reward',
  'bulk_bonus',
  'streak_bonus',
  'first_upload_bonus',
  'referral_bonus',
  'monthly_challenge_bonus',
  'redemption',
  'admin_adjustment'
);
CREATE TYPE redemption_status AS ENUM ('active', 'used', 'expired');
CREATE TYPE pickup_status     AS ENUM ('pending', 'in_transit', 'collected', 'cancelled');
CREATE TYPE settlement_status AS ENUM ('pending', 'settled');
CREATE TYPE collector_status  AS ENUM ('active', 'inactive');

-- ================================================================
-- USERS
-- Auto-created on Google OAuth via Supabase Auth trigger
-- ================================================================

CREATE TABLE users (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    VARCHAR(100) NOT NULL DEFAULT '',
  phone                   VARCHAR(20) UNIQUE,
  city                    VARCHAR(100) NOT NULL DEFAULT 'Mumbai',
  avatar_url              VARCHAR(500),

  -- GreenCoins
  greencoins_balance      INTEGER NOT NULL DEFAULT 0 CHECK (greencoins_balance >= 0),

  -- Recycling stats (updated when upload approved)
  total_approved_cans     INTEGER NOT NULL DEFAULT 0 CHECK (total_approved_cans >= 0),
  total_approved_uploads  INTEGER NOT NULL DEFAULT 0 CHECK (total_approved_uploads >= 0),
  co2_saved_kg            DECIMAL(10,1) GENERATED ALWAYS AS (total_approved_cans * 0.1) STORED,

  -- Streak
  current_streak          INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  last_upload_date        DATE,

  -- Flags
  is_first_upload_done    BOOLEAN NOT NULL DEFAULT FALSE,
  account_type            VARCHAR(20) NOT NULL DEFAULT 'personal'
                            CHECK (account_type IN ('personal', 'business')),

  -- Referral
  referral_code           VARCHAR(12) UNIQUE NOT NULL
                            DEFAULT UPPER(SUBSTRING(MD5(gen_random_uuid()::TEXT), 1, 6)),
  referred_by             UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- DROP POINTS
-- ================================================================

CREATE TABLE drop_points (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(150) NOT NULL,
  address             VARCHAR(300) NOT NULL,
  city                VARCHAR(100) NOT NULL DEFAULT 'Mumbai',
  lat                 DECIMAL(9,6),
  lng                 DECIMAL(9,6),
  emoji               VARCHAR(10) NOT NULL DEFAULT '📍',
  bg_color            VARCHAR(20) NOT NULL DEFAULT '#D1FAE5',
  accepted_materials  TEXT[] NOT NULL DEFAULT ARRAY['Cans'],
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- COLLECTORS  (must come before pickups & settlements)
-- ================================================================

CREATE TABLE collectors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  zone          VARCHAR(100) NOT NULL,
  radius_km     SMALLINT NOT NULL DEFAULT 4 CHECK (radius_km BETWEEN 1 AND 50),
  rate_per_kg   NUMERIC(6,2) NOT NULL DEFAULT 120.00 CHECK (rate_per_kg > 0),
  status        collector_status NOT NULL DEFAULT 'active',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ================================================================
-- UPLOADS
-- ================================================================

CREATE TABLE uploads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drop_point_id     UUID REFERENCES drop_points(id) ON DELETE SET NULL,
  can_count         SMALLINT NOT NULL CHECK (can_count > 0 AND can_count <= 10000),
  photo_url         VARCHAR(500),

  status            upload_status NOT NULL DEFAULT 'pending',
  coins_awarded     INTEGER CHECK (coins_awarded >= 0),
  rejection_reason  VARCHAR(500),

  reviewed_by       UUID,
  reviewed_at       TIMESTAMPTZ,

  image_hash        VARCHAR(64),
  risk_score        SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  fraud_flags       VARCHAR(50)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(50)[],

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- GREENCOINS TRANSACTIONS  — full audit trail
-- ================================================================

CREATE TABLE greencoins_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          transaction_type NOT NULL,
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  ref_id        UUID,
  description   VARCHAR(300),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- REWARDS CATALOG
-- ================================================================

CREATE TABLE rewards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(150) NOT NULL,
  emoji           VARCHAR(10) NOT NULL,
  coins_required  INTEGER NOT NULL CHECK (coins_required > 0),
  category        VARCHAR(30) NOT NULL
                    CHECK (category IN ('Food', 'Cafes', 'Shopping', 'Fun', 'Mystery')),
  bg_color        VARCHAR(20) NOT NULL DEFAULT '#F3F4F6',
  partner_name    VARCHAR(100),
  coupon_code     VARCHAR(60),
  coupon_url      VARCHAR(500),
  total_stock     INTEGER CHECK (total_stock > 0),
  redeemed_count  INTEGER NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  is_mystery      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  valid_until     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- REDEMPTIONS
-- ================================================================

CREATE TABLE redemptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id     UUID NOT NULL REFERENCES rewards(id),
  coins_spent   INTEGER NOT NULL CHECK (coins_spent > 0),
  coupon_code   VARCHAR(60),
  status        redemption_status NOT NULL DEFAULT 'active',
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  used_at       TIMESTAMPTZ,
  CHECK (used_at IS NULL OR used_at >= redeemed_at)
);

-- ================================================================
-- CHALLENGES
-- ================================================================

CREATE TABLE challenges (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(150) NOT NULL,
  emoji         VARCHAR(10) NOT NULL,
  sponsor       VARCHAR(150),
  target_cans   INTEGER NOT NULL CHECK (target_cans > 0),
  reward_coins  INTEGER NOT NULL CHECK (reward_coins > 0),
  bg_color      VARCHAR(20) NOT NULL DEFAULT '#D1FAE5',
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at       TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE challenge_progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress_cans   INTEGER NOT NULL DEFAULT 0 CHECK (progress_cans >= 0),
  completed       BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_paid      BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  UNIQUE(user_id, challenge_id)
);

-- ================================================================
-- REFERRALS
-- ================================================================

CREATE TABLE referrals (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_bonus_paid   BOOLEAN NOT NULL DEFAULT FALSE,
  new_user_bonus_paid   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- ================================================================
-- BADGES
-- ================================================================

CREATE TABLE badges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emoji             VARCHAR(10) NOT NULL,
  name              VARCHAR(100) NOT NULL,
  description       VARCHAR(300),
  condition_type    VARCHAR(30) NOT NULL
                      CHECK (condition_type IN ('first_upload','streak','total_cans','city_rank','referrals','user_number')),
  condition_value   INTEGER NOT NULL DEFAULT 0 CHECK (condition_value >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ================================================================
-- NOTIFICATIONS
-- ================================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       VARCHAR(10) NOT NULL DEFAULT '🔔',
  title       VARCHAR(200) NOT NULL,
  body        VARCHAR(500),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  ref_type    VARCHAR(30) CHECK (ref_type IN ('upload','reward','badge','challenge','referral','pickup')),
  ref_id      UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- MONTHLY STATS
-- ================================================================

CREATE TABLE monthly_stats (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year                SMALLINT NOT NULL CHECK (year >= 2024),
  month               SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  approved_cans       INTEGER NOT NULL DEFAULT 0 CHECK (approved_cans >= 0),
  monthly_bonus_paid  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, year, month)
);

-- ================================================================
-- PICKUPS  (depends on uploads, collectors, users)
-- ================================================================

CREATE TABLE pickups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id       UUID REFERENCES uploads(id) ON DELETE SET NULL,
  collector_id    UUID REFERENCES collectors(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  settlement_id   UUID,                             -- FK added after settlements created (see below)
  address         VARCHAR(300),
  zone            VARCHAR(100),
  scheduled_time  TIMESTAMPTZ,
  reported_cans   SMALLINT NOT NULL DEFAULT 0 CHECK (reported_cans >= 0),
  actual_cans     SMALLINT CHECK (actual_cans >= 0),
  proof_photo_url VARCHAR(500),
  status          pickup_status NOT NULL DEFAULT 'pending',
  mismatch        BOOLEAN GENERATED ALWAYS AS
                    (actual_cans IS NOT NULL AND actual_cans <> reported_cans) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collected_at    TIMESTAMPTZ,
  CHECK (collected_at IS NULL OR collected_at >= created_at)
);

-- ================================================================
-- SETTLEMENTS  (depends on collectors)
-- ================================================================

CREATE TABLE settlements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collector_id    UUID NOT NULL REFERENCES collectors(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cans      INTEGER NOT NULL DEFAULT 0 CHECK (total_cans >= 0),
  total_kg        NUMERIC(10,3) GENERATED ALWAYS AS (total_cans * 0.015) STORED,
  rate_per_kg     NUMERIC(6,2) NOT NULL CHECK (rate_per_kg > 0),
  amount          NUMERIC(10,2) GENERATED ALWAYS AS (total_cans * 0.015 * rate_per_kg) STORED,
  status          settlement_status NOT NULL DEFAULT 'pending',
  settled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collector_id, date)
);

-- Back-fill FK from pickups → settlements
ALTER TABLE pickups
  ADD CONSTRAINT fk_pickups_settlement
    FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE SET NULL;

-- ================================================================
-- VIEWS
-- ================================================================

-- Global + city leaderboard
CREATE VIEW leaderboard AS
SELECT
  u.id,
  u.name,
  u.city,
  u.greencoins_balance,
  u.total_approved_cans,
  u.co2_saved_kg,
  u.current_streak,
  RANK() OVER (ORDER BY u.greencoins_balance DESC)                          AS global_rank,
  RANK() OVER (PARTITION BY u.city ORDER BY u.greencoins_balance DESC)      AS city_rank
FROM users u
WHERE u.account_type = 'personal';

-- City collective impact
CREATE VIEW city_impact AS
SELECT
  city,
  COUNT(*)                                     AS active_users,
  SUM(total_approved_cans)                     AS total_cans,
  ROUND(SUM(total_approved_cans) * 0.1, 1)     AS co2_saved_kg
FROM users
WHERE account_type = 'personal'
GROUP BY city;

-- Admin: pending uploads queue
CREATE VIEW admin_pending_uploads AS
SELECT
  u.id,
  u.can_count,
  u.photo_url,
  u.created_at,
  u.risk_score,
  u.fraud_flags,
  usr.name   AS user_name,
  usr.city   AS user_city,
  dp.name    AS drop_point_name
FROM uploads u
JOIN users        usr ON u.user_id       = usr.id
LEFT JOIN drop_points dp  ON u.drop_point_id = dp.id
WHERE u.status = 'pending'
ORDER BY u.risk_score DESC, u.created_at ASC;

-- Collector daily summary (used by admin settlement screen)
CREATE VIEW collector_daily_summary AS
SELECT
  c.id            AS collector_id,
  c.name          AS collector_name,
  c.zone,
  c.rate_per_kg,
  p.collected_at::DATE            AS date,
  COUNT(p.id)                     AS pickups_count,
  COALESCE(SUM(p.actual_cans), 0) AS total_cans,
  ROUND(COALESCE(SUM(p.actual_cans), 0) * 0.015, 3)                    AS total_kg,
  ROUND(COALESCE(SUM(p.actual_cans), 0) * 0.015 * c.rate_per_kg, 2)    AS amount_due,
  COUNT(p.id) FILTER (WHERE p.mismatch = TRUE)                          AS mismatch_count
FROM collectors c
JOIN pickups p ON p.collector_id = c.id AND p.status = 'collected'
GROUP BY c.id, c.name, c.zone, c.rate_per_kg, p.collected_at::DATE;

-- ================================================================
-- INDEXES
-- ================================================================

-- users
CREATE INDEX idx_users_coins         ON users(greencoins_balance DESC);
CREATE INDEX idx_users_city_coins    ON users(city, greencoins_balance DESC);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- uploads
CREATE INDEX idx_uploads_user_id     ON uploads(user_id);
CREATE INDEX idx_uploads_status      ON uploads(status);
CREATE INDEX idx_uploads_created_at  ON uploads(created_at DESC);
CREATE INDEX idx_uploads_image_hash  ON uploads(image_hash) WHERE image_hash IS NOT NULL;

-- greencoins_transactions
CREATE INDEX idx_tx_user_id          ON greencoins_transactions(user_id);
CREATE INDEX idx_tx_user_created     ON greencoins_transactions(user_id, created_at DESC);

-- notifications
CREATE INDEX idx_notif_user_unread   ON notifications(user_id, is_read);
CREATE INDEX idx_notif_created_at    ON notifications(created_at DESC);

-- redemptions
CREATE INDEX idx_redemptions_user    ON redemptions(user_id);
CREATE INDEX idx_redemptions_reward  ON redemptions(reward_id);

-- challenge_progress
CREATE INDEX idx_ch_prog_user        ON challenge_progress(user_id);
CREATE INDEX idx_ch_prog_challenge   ON challenge_progress(challenge_id);

-- monthly_stats
CREATE INDEX idx_monthly_user        ON monthly_stats(user_id);

-- collectors
CREATE INDEX idx_collectors_email    ON collectors(email);
CREATE INDEX idx_collectors_status   ON collectors(status);
CREATE INDEX idx_collectors_zone     ON collectors(zone);

-- pickups
CREATE INDEX idx_pickups_collector   ON pickups(collector_id);
CREATE INDEX idx_pickups_user        ON pickups(user_id);
CREATE INDEX idx_pickups_status      ON pickups(status);
CREATE INDEX idx_pickups_coll_status ON pickups(collector_id, status);
CREATE INDEX idx_pickups_created_at  ON pickups(created_at DESC);
CREATE INDEX idx_pickups_collected   ON pickups(collected_at DESC) WHERE collected_at IS NOT NULL;
CREATE INDEX idx_pickups_settlement  ON pickups(settlement_id) WHERE settlement_id IS NOT NULL;

-- settlements
CREATE INDEX idx_settlements_coll    ON settlements(collector_id);
CREATE INDEX idx_settlements_date    ON settlements(date DESC);
CREATE INDEX idx_settlements_status  ON settlements(status);

-- ================================================================
-- FUNCTIONS & TRIGGERS
-- ================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------
-- FUNCTION: Approve an upload
-- Awards coins, updates streak/monthly stats, fires bonuses.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_upload(
  p_upload_id   UUID,
  p_admin_id    UUID
)
RETURNS JSON AS $$
DECLARE
  v_upload        uploads%ROWTYPE;
  v_user          users%ROWTYPE;
  v_base_coins    INTEGER;
  v_bonus_coins   INTEGER := 0;
  v_total_coins   INTEGER;
  v_month_cans    INTEGER;
  v_new_balance   INTEGER;
  v_new_streak    INTEGER;
  v_streak_done   BOOLEAN := FALSE;
  v_monthly_hit   BOOLEAN := FALSE;
  v_is_first      BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_upload FROM uploads WHERE id = p_upload_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Upload % not found', p_upload_id;
  END IF;
  IF v_upload.status != 'pending' THEN
    RAISE EXCEPTION 'Upload % is not pending (status: %)', p_upload_id, v_upload.status;
  END IF;

  SELECT * INTO v_user FROM users WHERE id = v_upload.user_id FOR UPDATE;

  -- 1. Base reward: 15 coins per can
  v_base_coins  := v_upload.can_count * 15;
  v_total_coins := v_base_coins;

  -- 2. First upload bonus (+100)
  IF NOT v_user.is_first_upload_done THEN
    v_bonus_coins := v_bonus_coins + 100;
    v_is_first    := TRUE;
    INSERT INTO greencoins_transactions(user_id, type, amount, balance_after, ref_id, description)
    VALUES (v_user.id, 'first_upload_bonus', 100, 0, p_upload_id, 'First upload bonus');
  END IF;

  -- 3. Bulk bonus (+40 if 10+ cans)
  IF v_upload.can_count >= 10 THEN
    v_bonus_coins := v_bonus_coins + 40;
    INSERT INTO greencoins_transactions(user_id, type, amount, balance_after, ref_id, description)
    VALUES (v_user.id, 'bulk_bonus', 40, 0, p_upload_id, 'Bulk upload bonus (10+ cans)');
  END IF;

  -- 4. Streak logic
  IF v_user.last_upload_date IS NULL OR v_user.last_upload_date < CURRENT_DATE - INTERVAL '1 day' THEN
    v_new_streak := 1;
  ELSIF v_user.last_upload_date = CURRENT_DATE - INTERVAL '1 day' THEN
    v_new_streak := v_user.current_streak + 1;
  ELSE
    v_new_streak := v_user.current_streak; -- already uploaded today, streak holds
  END IF;

  IF v_new_streak > 0 AND v_new_streak % 7 = 0 THEN
    v_bonus_coins := v_bonus_coins + 50;
    v_streak_done := TRUE;
    INSERT INTO greencoins_transactions(user_id, type, amount, balance_after, ref_id, description)
    VALUES (v_user.id, 'streak_bonus', 50, 0, p_upload_id, '7-day streak bonus');
  END IF;

  -- 5. Monthly challenge: first time hitting 100 cans this month
  INSERT INTO monthly_stats(user_id, year, month, approved_cans)
  VALUES (v_user.id, EXTRACT(YEAR FROM NOW())::SMALLINT, EXTRACT(MONTH FROM NOW())::SMALLINT, v_upload.can_count)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET approved_cans = monthly_stats.approved_cans + v_upload.can_count;

  SELECT approved_cans INTO v_month_cans
  FROM monthly_stats
  WHERE user_id = v_user.id
    AND year  = EXTRACT(YEAR  FROM NOW())::SMALLINT
    AND month = EXTRACT(MONTH FROM NOW())::SMALLINT;

  IF (v_month_cans - v_upload.can_count) < 100 AND v_month_cans >= 100 THEN
    IF NOT (SELECT monthly_bonus_paid FROM monthly_stats
            WHERE user_id = v_user.id
              AND year  = EXTRACT(YEAR  FROM NOW())::SMALLINT
              AND month = EXTRACT(MONTH FROM NOW())::SMALLINT) THEN
      v_bonus_coins := v_bonus_coins + 500;
      v_monthly_hit := TRUE;
      UPDATE monthly_stats SET monthly_bonus_paid = TRUE
      WHERE user_id = v_user.id
        AND year  = EXTRACT(YEAR  FROM NOW())::SMALLINT
        AND month = EXTRACT(MONTH FROM NOW())::SMALLINT;
      INSERT INTO greencoins_transactions(user_id, type, amount, balance_after, ref_id, description)
      VALUES (v_user.id, 'monthly_challenge_bonus', 500, 0, p_upload_id, 'Monthly 100-cans challenge bonus');
    END IF;
  END IF;

  v_total_coins := v_base_coins + v_bonus_coins;
  v_new_balance := v_user.greencoins_balance + v_total_coins;

  -- 6. Update upload row
  UPDATE uploads SET
    status        = 'approved',
    coins_awarded = v_total_coins,
    reviewed_by   = p_admin_id,
    reviewed_at   = NOW()
  WHERE id = p_upload_id;

  -- 7. Update user stats
  UPDATE users SET
    greencoins_balance      = v_new_balance,
    total_approved_cans     = total_approved_cans + v_upload.can_count,
    total_approved_uploads  = total_approved_uploads + 1,
    current_streak          = v_new_streak,
    last_upload_date        = CURRENT_DATE,
    is_first_upload_done    = TRUE
  WHERE id = v_user.id;

  -- 8. Log base reward (balance_after now known)
  INSERT INTO greencoins_transactions(user_id, type, amount, balance_after, ref_id, description)
  VALUES (v_user.id, 'upload_reward', v_base_coins, v_new_balance, p_upload_id,
          FORMAT('%s cans × 15 coins', v_upload.can_count));

  -- Fix balance_after = 0 placeholders on bonus rows written above
  UPDATE greencoins_transactions
  SET balance_after = v_new_balance
  WHERE user_id = v_user.id AND balance_after = 0 AND ref_id = p_upload_id;

  -- 9. Notify user
  INSERT INTO notifications(user_id, emoji, title, body, ref_type, ref_id)
  VALUES (
    v_user.id, '✅',
    FORMAT('Upload Approved! +%s GreenCoins', v_total_coins),
    FORMAT('%s cans verified · %s coins earned', v_upload.can_count, v_total_coins),
    'upload', p_upload_id
  );

  RETURN JSON_BUILD_OBJECT(
    'success',       TRUE,
    'coins_awarded', v_total_coins,
    'new_balance',   v_new_balance,
    'streak',        v_new_streak,
    'streak_bonus',  v_streak_done,
    'monthly_hit',   v_monthly_hit,
    'first_upload',  v_is_first
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- FUNCTION: Reject an upload
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION reject_upload(
  p_upload_id   UUID,
  p_admin_id    UUID,
  p_reason      VARCHAR(500) DEFAULT 'Photo unclear or invalid'
)
RETURNS JSON AS $$
BEGIN
  UPDATE uploads SET
    status           = 'rejected',
    rejection_reason = p_reason,
    reviewed_by      = p_admin_id,
    reviewed_at      = NOW()
  WHERE id = p_upload_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Upload % not found or already reviewed', p_upload_id;
  END IF;

  INSERT INTO notifications(user_id, emoji, title, body, ref_type, ref_id)
  SELECT user_id, '❌', 'Upload Rejected', p_reason, 'upload', p_upload_id
  FROM uploads WHERE id = p_upload_id;

  RETURN JSON_BUILD_OBJECT('success', TRUE, 'reason', p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- FUNCTION: Redeem a reward
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION redeem_reward(
  p_user_id   UUID,
  p_reward_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_reward    rewards%ROWTYPE;
  v_user      users%ROWTYPE;
  v_redemp_id UUID;
BEGIN
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND OR NOT v_reward.is_active THEN
    RAISE EXCEPTION 'Reward is not available';
  END IF;
  IF v_reward.total_stock IS NOT NULL AND v_reward.redeemed_count >= v_reward.total_stock THEN
    RAISE EXCEPTION 'Reward is out of stock';
  END IF;

  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF v_user.greencoins_balance < v_reward.coins_required THEN
    RAISE EXCEPTION 'Insufficient GreenCoins. Need %, have %',
      v_reward.coins_required, v_user.greencoins_balance;
  END IF;

  UPDATE users
  SET greencoins_balance = greencoins_balance - v_reward.coins_required
  WHERE id = p_user_id;

  INSERT INTO redemptions(user_id, reward_id, coins_spent, coupon_code)
  VALUES (p_user_id, p_reward_id, v_reward.coins_required, v_reward.coupon_code)
  RETURNING id INTO v_redemp_id;

  UPDATE rewards SET redeemed_count = redeemed_count + 1 WHERE id = p_reward_id;

  INSERT INTO greencoins_transactions(user_id, type, amount, balance_after, ref_id, description)
  VALUES (
    p_user_id, 'redemption', -v_reward.coins_required,
    v_user.greencoins_balance - v_reward.coins_required,
    v_redemp_id, FORMAT('Redeemed: %s', v_reward.name)
  );

  RETURN JSON_BUILD_OBJECT(
    'success',        TRUE,
    'redemption_id',  v_redemp_id,
    'coupon_code',    v_reward.coupon_code,
    'coupon_url',     v_reward.coupon_url,
    'expires_at',     NOW() + INTERVAL '30 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- FUNCTION: Pay referral bonus (call after new user's first upload approved)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION pay_referral_bonus(p_new_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_ref referrals%ROWTYPE;
BEGIN
  SELECT * INTO v_ref
  FROM referrals
  WHERE referred_id = p_new_user_id AND new_user_bonus_paid = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT('success', FALSE, 'reason', 'No pending referral');
  END IF;

  UPDATE users SET greencoins_balance = greencoins_balance + 100 WHERE id = p_new_user_id;
  INSERT INTO greencoins_transactions(user_id, type, amount, balance_after, description)
  SELECT p_new_user_id, 'referral_bonus', 100, greencoins_balance, 'Welcome referral bonus'
  FROM users WHERE id = p_new_user_id;
  UPDATE referrals SET new_user_bonus_paid = TRUE WHERE id = v_ref.id;

  IF NOT v_ref.referrer_bonus_paid THEN
    UPDATE users SET greencoins_balance = greencoins_balance + 250 WHERE id = v_ref.referrer_id;
    INSERT INTO greencoins_transactions(user_id, type, amount, balance_after, description)
    SELECT v_ref.referrer_id, 'referral_bonus', 250, greencoins_balance, 'Referral reward — friend joined'
    FROM users WHERE id = v_ref.referrer_id;
    INSERT INTO notifications(user_id, emoji, title, body, ref_type)
    VALUES (v_ref.referrer_id, '🤝', '+250 GreenCoins!', 'Your referred friend just made their first upload.', 'referral');
    UPDATE referrals SET referrer_bonus_paid = TRUE WHERE id = v_ref.id;
  END IF;

  RETURN JSON_BUILD_OBJECT('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- FUNCTION: Create (or refresh) a daily settlement for a collector
-- Sums all collected pickups for p_date that aren't settled yet.
-- Safe to call multiple times — uses INSERT … ON CONFLICT DO UPDATE.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_daily_settlement(
  p_collector_id  UUID,
  p_date          DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
  v_collector   collectors%ROWTYPE;
  v_total_cans  INTEGER;
  v_settle_id   UUID;
BEGIN
  SELECT * INTO v_collector FROM collectors WHERE id = p_collector_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Collector % not found', p_collector_id;
  END IF;

  SELECT COALESCE(SUM(actual_cans), 0) INTO v_total_cans
  FROM pickups
  WHERE collector_id  = p_collector_id
    AND status        = 'collected'
    AND settlement_id IS NULL
    AND collected_at::DATE = p_date;

  IF v_total_cans = 0 THEN
    RETURN JSON_BUILD_OBJECT('success', FALSE, 'reason', 'No unsettled pickups for this date');
  END IF;

  INSERT INTO settlements(collector_id, date, total_cans, rate_per_kg)
  VALUES (p_collector_id, p_date, v_total_cans, v_collector.rate_per_kg)
  ON CONFLICT (collector_id, date)
  DO UPDATE SET
    total_cans  = settlements.total_cans + EXCLUDED.total_cans,
    rate_per_kg = EXCLUDED.rate_per_kg
  RETURNING id INTO v_settle_id;

  -- Link pickups to this settlement
  UPDATE pickups SET settlement_id = v_settle_id
  WHERE collector_id  = p_collector_id
    AND status        = 'collected'
    AND settlement_id IS NULL
    AND collected_at::DATE = p_date;

  RETURN JSON_BUILD_OBJECT(
    'success',        TRUE,
    'settlement_id',  v_settle_id,
    'total_cans',     v_total_cans,
    'rate_per_kg',    v_collector.rate_per_kg,
    'amount',         ROUND(v_total_cans * 0.015 * v_collector.rate_per_kg, 2)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE greencoins_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_stats            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_points              ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges               ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickups                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements              ENABLE ROW LEVEL SECURITY;

-- ── Users ──────────────────────────────────────────────────────
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- ── Uploads ───────────────────────────────────────────────────
CREATE POLICY "uploads_own" ON uploads FOR ALL USING (auth.uid() = user_id);

-- ── GreenCoins transactions ───────────────────────────────────
CREATE POLICY "tx_read_own" ON greencoins_transactions FOR SELECT USING (auth.uid() = user_id);

-- ── Redemptions ───────────────────────────────────────────────
CREATE POLICY "redemptions_own" ON redemptions FOR ALL USING (auth.uid() = user_id);

-- ── Notifications ─────────────────────────────────────────────
CREATE POLICY "notif_own" ON notifications FOR ALL USING (auth.uid() = user_id);

-- ── Challenge progress ────────────────────────────────────────
CREATE POLICY "ch_prog_own" ON challenge_progress FOR ALL USING (auth.uid() = user_id);

-- ── Monthly stats ─────────────────────────────────────────────
CREATE POLICY "monthly_own" ON monthly_stats FOR SELECT USING (auth.uid() = user_id);

-- ── User badges ───────────────────────────────────────────────
CREATE POLICY "user_badges_own" ON user_badges FOR SELECT USING (auth.uid() = user_id);

-- ── Referrals ─────────────────────────────────────────────────
CREATE POLICY "ref_own" ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- ── Public catalog (any authenticated user) ───────────────────
CREATE POLICY "rewards_read"     ON rewards     FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "droppoints_read"  ON drop_points FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "challenges_read"  ON challenges  FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "badges_read"      ON badges      FOR SELECT TO authenticated USING (TRUE);

-- ── Collectors: each collector sees only their own row ─────────
CREATE POLICY "collectors_read_own" ON collectors FOR SELECT
  USING (auth.uid() = auth_user_id);

-- ── Pickups: collector reads/updates their own ────────────────
CREATE POLICY "pickups_collector_select" ON pickups FOR SELECT
  USING (collector_id IN (SELECT id FROM collectors WHERE auth_user_id = auth.uid()));

CREATE POLICY "pickups_collector_update" ON pickups FOR UPDATE
  USING (collector_id IN (SELECT id FROM collectors WHERE auth_user_id = auth.uid()));

-- Users can read their own pickups (for status tracking)
CREATE POLICY "pickups_user_select" ON pickups FOR SELECT
  USING (auth.uid() = user_id);

-- ── Settlements: collector reads their own ────────────────────
CREATE POLICY "settlements_collector_select" ON settlements FOR SELECT
  USING (collector_id IN (SELECT id FROM collectors WHERE auth_user_id = auth.uid()));

-- ================================================================
-- SEED DATA
-- ================================================================

-- Badges
INSERT INTO badges (emoji, name, description, condition_type, condition_value) VALUES
  ('🌱', 'Loop Starter',   'Dropped your first can',     'first_upload', 1),
  ('🔥', '7-Day Streak',   '7 consecutive upload days',  'streak',       7),
  ('🥫', 'Can Collector',  'Recycled 50+ cans',          'total_cans',   50),
  ('💪', 'Eco Grinder',    'Recycled 100+ cans',         'total_cans',   100),
  ('👑', 'ReLoop OG',      'One of the first 100 users', 'user_number',  100),
  ('🏆', 'City Champion',  'Reach #1 in your city',      'city_rank',    1),
  ('🌍', 'ReLoop Legend',  'Recycle 2000+ cans',         'total_cans',   2000),
  ('🤝', 'Squad Goals',    'Refer 10 friends',           'referrals',    10);

-- Drop Points
INSERT INTO drop_points (name, address, city, emoji, bg_color, accepted_materials) VALUES
  ('Brew & Beans Café',   'Bandra West, Mumbai',   'Mumbai', '☕',  '#FEF3C7', ARRAY['Cans','Plastic']),
  ('FitZone Gym',         'Andheri East, Mumbai',  'Mumbai', '🏋️', '#DBEAFE', ARRAY['Cans','E-Waste']),
  ('NM College',          'Vile Parle, Mumbai',    'Mumbai', '🎓', '#F3E8FF', ARRAY['All Materials']),
  ('D-Mart Partner',      'Goregaon West, Mumbai', 'Mumbai', '🏪', '#D1FAE5', ARRAY['Cans','Plastic','Cardboard']),
  ('Hiranandani Society', 'Powai, Mumbai',         'Mumbai', '🏢', '#FCE7F3', ARRAY['Cans','Plastic']);

-- Rewards
INSERT INTO rewards (name, emoji, coins_required, category, bg_color, coupon_code, partner_name, is_mystery) VALUES
  ('Free Coffee',         '☕',  60,  'Cafes',    '#FEF3C7', 'RELOOP-CF-7731', 'Brew & Beans', FALSE),
  ('Domino''s ₹100 Off',  '🍕', 120, 'Food',     '#FEE2E2', 'RELOOP-DM-4829', 'Dominos',      FALSE),
  ('Movie Ticket ₹200',   '🎬', 180, 'Fun',      '#F3E8FF', 'RELOOP-MV-3391', 'BookMyShow',   FALSE),
  ('Myntra ₹150',         '🛍️', 200, 'Shopping', '#EDE9FE', 'RELOOP-MN-9203', 'Myntra',       FALSE),
  ('Gym Day Pass',        '🏋️', 100, 'Fun',      '#DBEAFE', 'RELOOP-GM-6612', 'FitZone',      FALSE),
  ('Spotify 1 Month',     '🎵', 150, 'Fun',      '#FCE7F3', 'RELOOP-SP-8820', 'Spotify',      FALSE),
  ('Mystery Box',         '📦',  75, 'Mystery',  '#FEF9C3', NULL,             NULL,           TRUE);

-- Challenges
INSERT INTO challenges (title, emoji, sponsor, target_cans, reward_coins, bg_color, ends_at) VALUES
  ('Can Crusher Week',   '🥤', 'Sponsored by Red Bull India', 10,   150, '#FEE2E2', NOW() + INTERVAL '7 days'),
  ('Plastic-Free Month', '🌊', 'Sponsored by Bisleri',        15,   300, '#DBEAFE', NOW() + INTERVAL '30 days'),
  ('City Champion',      '🏙️', 'Reloop Challenge',            5000, 500, '#D1FAE5', NOW() + INTERVAL '30 days'),
  ('Squad Goals',        '👥', 'Refer 3 friends',             3,    200, '#FEF3C7', NOW() + INTERVAL '30 days');
