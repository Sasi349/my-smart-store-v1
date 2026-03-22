-- JyGS Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- ============================================================
-- 1. CUSTOM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'shop_admin', 'employee');
CREATE TYPE store_type AS ENUM ('Grocery', 'Electronics', 'Clothing', 'Hardware', 'Pharmacy', 'General', 'Other');
CREATE TYPE customer_type AS ENUM ('regular', 'new', 'wholesale');
CREATE TYPE receipt_status AS ENUM ('draft', 'completed', 'cancelled');
CREATE TYPE offer_type AS ENUM ('flat', 'percentage');
CREATE TYPE product_unit AS ENUM ('Kg', 'g', 'l', 'ml', 'm', 'cm', 'inch', 'piece', 'box', 'pack', 'dozen');

-- ============================================================
-- 2. PROFILES TABLE (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  role user_role NOT NULL DEFAULT 'employee',
  role_id UUID,
  store_id UUID,
  has_passcode BOOLEAN DEFAULT false,
  passcode TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, mobile, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'employee')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. STORES TABLE
-- ============================================================

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopname TEXT NOT NULL,
  admin_id UUID REFERENCES public.profiles(id),
  location TEXT NOT NULL,
  type store_type NOT NULL DEFAULT 'General',
  picture_url TEXT,
  theme_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Now add FK constraints to profiles (stores table exists now)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

-- ============================================================
-- 4. ROLES & PERMISSIONS
-- ============================================================

CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK constraint for role_id in profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_id_fkey
  FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;

CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false
);

-- ============================================================
-- 5. PRODUCTS TABLE
-- ============================================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  barcode TEXT,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  offer_price DECIMAL(10,2),
  offer_type offer_type,
  stock INTEGER NOT NULL DEFAULT 0,
  picture_url TEXT,
  unit product_unit NOT NULL DEFAULT 'piece',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. CUSTOMERS TABLE
-- ============================================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  type customer_type NOT NULL DEFAULT 'new',
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. RECEIPTS & RECEIPT ITEMS
-- ============================================================

CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status receipt_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  product_unit TEXT NOT NULL DEFAULT 'piece',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL
);

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role (in PUBLIC schema, not auth)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: get current user's store_id
-- Checks profiles.store_id first, then falls back to stores.admin_id
CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT store_id FROM public.profiles WHERE id = auth.uid()),
    (SELECT id FROM public.stores WHERE admin_id = auth.uid() LIMIT 1)
  );
$$;

-- Helper: check if user owns/belongs to a specific store
CREATE OR REPLACE FUNCTION public.user_owns_store(check_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND store_id = check_store_id
    UNION ALL
    SELECT 1 FROM public.stores
    WHERE id = check_store_id AND admin_id = auth.uid()
  );
$$;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Shop admins can view store employees"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role() = 'shop_admin'
    AND store_id = public.get_user_store_id()
  );

CREATE POLICY "Super admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- STORES policies
CREATE POLICY "Super admins can manage all stores"
  ON public.stores FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Shop admins can view own store"
  ON public.stores FOR SELECT
  USING (admin_id = auth.uid() OR id = public.get_user_store_id());

CREATE POLICY "Shop admins can update own store"
  ON public.stores FOR UPDATE
  USING (admin_id = auth.uid());

CREATE POLICY "Employees can view own store"
  ON public.stores FOR SELECT
  USING (id = public.get_user_store_id());

-- ROLES policies
CREATE POLICY "Anyone authenticated can view roles"
  ON public.roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage roles"
  ON public.roles FOR ALL
  USING (public.get_user_role() = 'super_admin');

-- PERMISSIONS policies
CREATE POLICY "Anyone authenticated can view permissions"
  ON public.permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage permissions"
  ON public.permissions FOR ALL
  USING (public.get_user_role() = 'super_admin');

-- PRODUCTS policies
CREATE POLICY "Users can view products in their store"
  ON public.products FOR SELECT
  USING (public.get_user_role() = 'super_admin' OR public.user_owns_store(store_id));

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

-- CUSTOMERS policies
CREATE POLICY "Users can view customers in their store"
  ON public.customers FOR SELECT
  USING (public.get_user_role() = 'super_admin' OR public.user_owns_store(store_id));

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

-- RECEIPTS policies
CREATE POLICY "Users can view receipts in their store"
  ON public.receipts FOR SELECT
  USING (store_id = public.get_user_store_id() OR public.get_user_role() = 'super_admin');

CREATE POLICY "Users can create receipts in their store"
  ON public.receipts FOR INSERT
  WITH CHECK (store_id = public.get_user_store_id() OR public.get_user_role() = 'super_admin');

CREATE POLICY "Admins can manage receipts"
  ON public.receipts FOR ALL
  USING (
    (store_id = public.get_user_store_id() AND public.get_user_role() IN ('super_admin', 'shop_admin'))
    OR public.get_user_role() = 'super_admin'
  );

-- RECEIPT ITEMS policies
CREATE POLICY "Users can view receipt items"
  ON public.receipt_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE public.receipts.id = receipt_items.receipt_id
      AND (public.receipts.store_id = public.get_user_store_id() OR public.get_user_role() = 'super_admin')
    )
  );

CREATE POLICY "Users can manage receipt items"
  ON public.receipt_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE public.receipts.id = receipt_items.receipt_id
      AND (public.receipts.store_id = public.get_user_store_id() OR public.get_user_role() = 'super_admin')
    )
  );

-- ============================================================
-- 9. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
