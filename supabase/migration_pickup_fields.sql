-- ================================================================
-- RELOOP — MIGRATION: pickup/upload fields the app actually sends
-- Run this in Supabase Dashboard → SQL Editor, AFTER schema.sql
-- and admin_setup.sql have already been run.
--
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS /
-- DROP POLICY IF EXISTS + CREATE POLICY).
--
-- Fixes:
--  1. "Request Pickup" / "Submit Upload" failing silently because
--     the uploads table was missing columns the app writes to.
--  2. Admin Panel's Upload Queue (and the Collector app's pickup
--     list / verification save) failing to load or save because
--     they also select/update columns that never existed here.
--  3. GPS lat/lng captured on the pickup screen was never even
--     sent to the database — added columns + wired up in App.jsx.
-- ================================================================

ALTER TABLE uploads
  -- fields the user-facing submit flow writes
  ADD COLUMN IF NOT EXISTS photo_urls              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS item_types               TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS estimated_weight_range    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS pickup_type               VARCHAR(20) NOT NULL DEFAULT 'dropoff'
                                                        CHECK (pickup_type IN ('dropoff', 'pickup')),
  ADD COLUMN IF NOT EXISTS pickup_address            VARCHAR(500),
  ADD COLUMN IF NOT EXISTS pickup_flat               VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pickup_street             VARCHAR(200),
  ADD COLUMN IF NOT EXISTS pickup_landmark           VARCHAR(200),
  ADD COLUMN IF NOT EXISTS gps_lat                   DECIMAL(10,6),
  ADD COLUMN IF NOT EXISTS gps_lng                   DECIMAL(10,6),
  -- fields the Admin Panel + Collector app already expect
  ADD COLUMN IF NOT EXISTS collector_weights         JSONB,
  ADD COLUMN IF NOT EXISTS collector_counts          JSONB,
  ADD COLUMN IF NOT EXISTS collector_photos          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS verified_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by                UUID;

-- ================================================================
-- STORAGE: bucket for upload photos
-- Buckets aren't created by schema.sql — this covers projects
-- where storage.buckets is writable via SQL. If the INSERT below
-- errors, create the bucket manually instead:
-- Dashboard → Storage → New bucket → name: "uploads" → Public: ON
-- ================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow any authenticated user to upload into their own folder
-- (path convention used by the app: {user_id}/{timestamp}-{item}.ext)
DROP POLICY IF EXISTS "uploads_bucket_insert_own" ON storage.objects;
CREATE POLICY "uploads_bucket_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Collectors also write into uploads/collector/{their auth id}/...
DROP POLICY IF EXISTS "uploads_bucket_insert_collector" ON storage.objects;
CREATE POLICY "uploads_bucket_insert_collector"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = 'collector');

-- Public read (bucket is public, but keep an explicit policy for clarity)
DROP POLICY IF EXISTS "uploads_bucket_read_public" ON storage.objects;
CREATE POLICY "uploads_bucket_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');
