-- ============================================================
-- Migration: a child's birthday may be unknown
--
-- Staff one-time orders don't always include a birthday. The column
-- was NOT NULL, so those orders could not be saved without inventing
-- a date. Grade and teacher stay NOT NULL and are stored as empty
-- text when the office leaves them blank — no change for those.
--
-- Run this in the Supabase SQL editor before using the one-time order
-- tab without a birthday. Orders that include a birthday save either
-- way. This is a metadata-only change: existing birthdays stay put,
-- and admin_orders already selects children.birthday.
-- ============================================================

alter table children alter column birthday drop not null;
