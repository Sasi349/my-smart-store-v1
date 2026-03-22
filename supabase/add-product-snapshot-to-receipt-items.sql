-- Add product_name and product_unit columns to receipt_items
-- This stores a snapshot of the product at the time of purchase,
-- so receipt history is preserved even if the product is later deleted.
-- Run this in Supabase SQL Editor

-- Step 1: Add snapshot columns
ALTER TABLE public.receipt_items
  ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS product_unit TEXT NOT NULL DEFAULT 'piece';

-- Step 2: Backfill existing receipt items with current product data
UPDATE public.receipt_items ri
SET
  product_name = p.name,
  product_unit = p.unit::text
FROM public.products p
WHERE ri.product_id = p.id
  AND ri.product_name = '';

-- Step 3: Change product_id FK to allow product deletion
-- Drop the old constraint and recreate with ON DELETE SET NULL
ALTER TABLE public.receipt_items
  DROP CONSTRAINT IF EXISTS receipt_items_product_id_fkey;

ALTER TABLE public.receipt_items
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.receipt_items
  ADD CONSTRAINT receipt_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
