-- Create Super Admin user
-- Run this in Supabase SQL Editor

-- Step 1: Create the auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@jygs.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Super Admin", "mobile": "9876543210", "username": "admin", "role": "super_admin"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Step 2: Create the identity for the user
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) SELECT
  id,
  id,
  json_build_object('sub', id::text, 'email', 'admin@jygs.com')::jsonb,
  'email',
  id::text,
  now(),
  now(),
  now()
FROM auth.users
WHERE email = 'admin@jygs.com';

-- Step 3: Ensure profile role is super_admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE username = 'admin';
