-- Fix RLS policies: avoid get_user_store_id() which can return NULL
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- ============================================================
-- Step 1: Drop ALL old product/customer write policies
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage products in their store" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products in their store" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products in their store" ON public.products;

DROP POLICY IF EXISTS "Admins can manage customers in their store" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers in their store" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers in their store" ON public.customers;

-- ============================================================
-- Step 2: Helper — check if a user owns a store (direct check)
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_owns_store(check_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    -- User's profile is linked to this store
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND store_id = check_store_id
    UNION ALL
    -- User is the admin of this store
    SELECT 1 FROM public.stores
    WHERE id = check_store_id AND admin_id = auth.uid()
  );
$$;

-- ============================================================
-- Step 3: PRODUCTS policies (using direct ownership check)
-- ============================================================
CREATE POLICY "Shop admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'super_admin'
    OR (public.get_user_role() = 'shop_admin' AND public.user_owns_store(store_id))
  );

CREATE POLICY "Shop admins can update products"
  ON public.products FOR UPDATE
  USING (
    public.get_user_role() = 'super_admin'
    OR (public.get_user_role() = 'shop_admin' AND public.user_owns_store(store_id))
  );

CREATE POLICY "Shop admins can delete products"
  ON public.products FOR DELETE
  USING (
    public.get_user_role() = 'super_admin'
    OR (public.get_user_role() = 'shop_admin' AND public.user_owns_store(store_id))
  );

-- ============================================================
-- Step 4: CUSTOMERS policies (using direct ownership check)
-- ============================================================
CREATE POLICY "Store users can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'super_admin'
    OR (public.get_user_role() IN ('shop_admin', 'employee') AND public.user_owns_store(store_id))
  );

CREATE POLICY "Store users can update customers"
  ON public.customers FOR UPDATE
  USING (
    public.get_user_role() = 'super_admin'
    OR (public.get_user_role() IN ('shop_admin', 'employee') AND public.user_owns_store(store_id))
  );

CREATE POLICY "Store users can delete customers"
  ON public.customers FOR DELETE
  USING (
    public.get_user_role() = 'super_admin'
    OR (public.get_user_role() IN ('shop_admin', 'employee') AND public.user_owns_store(store_id))
  );
