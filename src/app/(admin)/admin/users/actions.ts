"use server";

import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function createAuthUser(data: {
  email: string;
  password: string;
  name: string;
  mobile: string;
  username: string;
  role: string;
  storeId?: string;
  roleId?: string;
  passcode?: string;
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  const supabase = createAdminClient();

  // Check if username already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", data.username)
    .single();

  if (existing) {
    return { success: false, error: "Username already taken" };
  }

  // Check if email already exists in auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const emailTaken = existingUsers?.users?.some(
    (u) => u.email?.toLowerCase() === data.email.toLowerCase()
  );
  if (emailTaken) {
    return { success: false, error: "Email already in use" };
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      name: data.name,
      mobile: data.mobile,
      username: data.username,
      role: data.role,
    },
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: "Failed to create user" };
  }

  // Ensure profile exists and update with additional fields
  // The trigger may have created it, but we update to be sure
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: authData.user.id,
      name: data.name,
      mobile: data.mobile,
      username: data.username,
      email: data.email,
      role: data.role,
      role_id: data.roleId || null,
      store_id: data.storeId || null,
      passcode: data.passcode || null,
      has_passcode: !!data.passcode,
    }, { onConflict: "id" });

  if (profileError) {
    // Auth user was created but profile failed — clean up
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { success: false, error: `Profile error: ${profileError.message}` };
  }

  return { success: true, userId: authData.user.id };
}

export async function deleteAuthUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    mobile?: string;
    username?: string;
    email?: string;
    role?: string;
    roleId?: string;
    storeId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const dbUpdates: Record<string, unknown> = {};
  if (data.name !== undefined) dbUpdates.name = data.name.trim();
  if (data.mobile !== undefined) dbUpdates.mobile = data.mobile.trim();
  if (data.username !== undefined) dbUpdates.username = data.username.trim();
  if (data.email !== undefined) dbUpdates.email = data.email?.trim() || null;
  if (data.role !== undefined) dbUpdates.role = data.role;
  if (data.roleId !== undefined) dbUpdates.role_id = data.roleId || null;
  if (data.storeId !== undefined) dbUpdates.store_id = data.storeId || null;

  const { error } = await supabase
    .from("profiles")
    .update(dbUpdates)
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateUserPasscode(
  userId: string,
  passcode: string
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{6}$/.test(passcode)) {
    return { success: false, error: "Passcode must be exactly 6 digits" };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ passcode, has_passcode: true })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateAuthUserPassword(userId: string, password: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
