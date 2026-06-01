import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase auth state changes and syncs the Zustand auth store.
 * - On SIGNED_OUT: clears profile and currentStore from the persisted store
 * - On TOKEN_REFRESHED / SIGNED_IN: re-fetches the profile to keep it fresh
 *
 * Mount this hook once in the root layout (or a provider near the root).
 */
export function useAuthListener() {
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Session was revoked or expired — clear stale Zustand state
        useAuthStore.getState().setProfile(null);
        useAuthStore.getState().setCurrentStore(null);
      }

      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        // Re-fetch profile to keep Zustand in sync with latest data
        useAuthStore.getState().fetchProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
