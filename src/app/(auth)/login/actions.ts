"use server";

import { createClient } from "@supabase/supabase-js";

// Server-only admin client (uses service role key)
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function verifyPasscode(passcode: string): Promise<{
  success: boolean;
  email?: string;
  token?: string;
  error?: string;
}> {
  if (!/^\d{6}$/.test(passcode)) {
    return { success: false, error: "Invalid passcode format" };
  }

  const supabase = createAdminClient();

  // Look up profile by passcode
  const { data: profile, error: lookupError } = await supabase
    .from("profiles")
    .select("email, id")
    .eq("passcode", passcode)
    .eq("has_passcode", true)
    .single();

  if (lookupError || !profile?.email) {
    return { success: false, error: "Invalid passcode" };
  }

  // Generate a magic link token for this user
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return { success: false, error: "Authentication failed" };
  }

  return {
    success: true,
    email: profile.email,
    token: linkData.properties.hashed_token,
  };
}
