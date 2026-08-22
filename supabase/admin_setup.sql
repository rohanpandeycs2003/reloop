-- ================================================================
-- RELOOP — ADMIN + COLLECTOR SETUP
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ================================================================

-- ── Step 1: Grant view access ─────────────────────────────────
GRANT SELECT ON collector_daily_summary TO authenticated;
GRANT SELECT ON leaderboard             TO authenticated;
GRANT SELECT ON city_impact             TO authenticated;
GRANT SELECT ON admin_pending_uploads   TO authenticated;

-- ── Step 2: Admin RLS policies ────────────────────────────────
-- Run these after creating your admin user in Auth → Users

CREATE POLICY "admin_read_all_uploads"
  ON uploads FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_update_uploads"
  ON uploads FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_read_all_users"
  ON users FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_all_collectors"
  ON collectors FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_all_pickups"
  ON pickups FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_all_settlements"
  ON settlements FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_all_notifications"
  ON notifications FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── Step 3: Mark your admin user ─────────────────────────────
-- Replace the email below with YOUR admin email before running
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
WHERE email = 'admin@reloop.in';

-- ── Step 4: Collector auth policies ──────────────────────────

-- Allow collector to read their row by email (needed before auth_user_id is set)
CREATE POLICY "collectors_read_by_email"
  ON collectors FOR SELECT
  USING ((auth.jwt() ->> 'email') = email);

-- Allow collector to self-link their auth_user_id on first login
CREATE POLICY "collectors_self_link"
  ON collectors FOR UPDATE
  USING ((auth.jwt() ->> 'email') = email AND auth_user_id IS NULL)
  WITH CHECK (auth_user_id = auth.uid());

-- Allow collector to update their own pickups (status, actual_cans, proof_photo_url)
-- (supplements the existing pickups_collector_update policy)

-- ── Step 5: Test pickups (optional — for demo only) ───────────
-- Replace collector_id and user_id with real UUIDs from your tables
/*
INSERT INTO pickups (collector_id, user_id, address, zone, reported_cans, status, scheduled_time)
SELECT
  c.id,
  u.id,
  '14 Hill Road, Bandra West',
  'Bandra West',
  12,
  'pending',
  NOW() + INTERVAL '1 hour'
FROM collectors c, users u
WHERE c.email = 'raju@reloop.in'
LIMIT 1;
*/
