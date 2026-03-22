-- JyGS Seed Data
-- Run this AFTER schema.sql and AFTER creating the auth users
--
-- IMPORTANT: First create users via Supabase Dashboard > Authentication > Users
-- or via the signup flow. The trigger will auto-create profiles.
--
-- This file seeds: roles, permissions, stores, products, customers
-- Profile data is handled by the auth trigger (see schema.sql)

-- ============================================================
-- 1. ROLES
-- ============================================================

INSERT INTO roles (id, name, is_system, created_at) VALUES
  (gen_random_uuid(), 'Super Admin', true, '2026-01-01T00:00:00Z'),
  (gen_random_uuid(), 'Shop Admin', true, '2026-01-01T00:00:00Z'),
  (gen_random_uuid(), 'Employee', true, '2026-01-01T00:00:00Z'),
  (gen_random_uuid(), 'Viewer', false, '2026-02-15T00:00:00Z');

-- ============================================================
-- 2. PERMISSIONS (using subqueries to get role IDs)
-- ============================================================

-- Super Admin: full access to everything
INSERT INTO permissions (id, role_id, module, can_create, can_read, can_update, can_delete)
SELECT gen_random_uuid(), r.id, m.module, true, true, true, true
FROM roles r
CROSS JOIN (VALUES ('users'), ('stores'), ('roles'), ('products'), ('customers'), ('receipts')) AS m(module)
WHERE r.name = 'Super Admin';

-- Shop Admin: full access to products/customers/receipts, limited users/info
INSERT INTO permissions (id, role_id, module, can_create, can_read, can_update, can_delete)
SELECT gen_random_uuid(), r.id, m.module, m.cc, m.cr, m.cu, m.cd
FROM roles r
CROSS JOIN (VALUES
  ('products', true, true, true, true),
  ('customers', true, true, true, true),
  ('receipts', true, true, true, true),
  ('users', true, true, true, false),
  ('info', false, true, true, false)
) AS m(module, cc, cr, cu, cd)
WHERE r.name = 'Shop Admin';

-- Employee: limited access
INSERT INTO permissions (id, role_id, module, can_create, can_read, can_update, can_delete)
SELECT gen_random_uuid(), r.id, m.module, m.cc, m.cr, m.cu, m.cd
FROM roles r
CROSS JOIN (VALUES
  ('products', false, true, true, false),
  ('customers', true, true, true, false),
  ('receipts', true, true, false, false)
) AS m(module, cc, cr, cu, cd)
WHERE r.name = 'Employee';

-- Viewer: read-only
INSERT INTO permissions (id, role_id, module, can_create, can_read, can_update, can_delete)
SELECT gen_random_uuid(), r.id, m.module, false, true, false, false
FROM roles r
CROSS JOIN (VALUES ('products'), ('customers'), ('receipts'), ('info')) AS m(module)
WHERE r.name = 'Viewer';

-- ============================================================
-- NOTE: Stores, products, and customers will be seeded
-- after auth users are created and profiles exist.
-- Use the app's UI to create initial data, or run
-- additional INSERT statements after user setup.
-- ============================================================
