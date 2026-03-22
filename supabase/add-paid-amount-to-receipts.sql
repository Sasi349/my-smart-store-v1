-- Add paid_amount column to receipts for partial payment tracking
-- Run this in Supabase SQL Editor

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2);

-- Backfill: set paid_amount = total for all existing receipts (fully paid)
UPDATE public.receipts
SET paid_amount = total
WHERE paid_amount IS NULL;
