-- Atomic stock adjustment function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id UUID,
  p_quantity_change INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.products
  SET stock = stock + p_quantity_change
  WHERE id = p_product_id;
END;
$$;
