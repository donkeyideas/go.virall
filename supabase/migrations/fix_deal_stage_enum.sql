-- Fix deal_stage and invoice_status enums to match application code.
-- Run this in Supabase Dashboard SQL Editor.

-- ═══════════════════════════════════════════════════════════
-- 1. FIX deal_stage enum
-- DB has:   lead, pitched, negotiating, contract, delivering, review, invoiced, paid, done, lost
-- Code has: lead, outreach, negotiation, contract, production, review, live, done, lost
-- ═══════════════════════════════════════════════════════════

-- Add new values
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'outreach';
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'negotiation';
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'production';
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'live';

-- Migrate existing data from old to new stage names
UPDATE deals SET stage = 'outreach' WHERE stage = 'pitched';
UPDATE deals SET stage = 'negotiation' WHERE stage = 'negotiating';
UPDATE deals SET stage = 'production' WHERE stage = 'delivering';
UPDATE deals SET stage = 'live' WHERE stage = 'invoiced';
UPDATE deals SET stage = 'done' WHERE stage = 'paid';

-- ═══════════════════════════════════════════════════════════
-- 2. FIX invoice_status enum
-- DB has:   draft, sent, viewed, paid, overdue, void
-- Code has: draft, sent, viewed, paid, overdue, cancelled
-- ═══════════════════════════════════════════════════════════

ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Migrate existing data
UPDATE invoices SET status = 'cancelled' WHERE status = 'void';
