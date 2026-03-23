import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Store } from "@/types";
import { createClient } from "@/lib/supabase/client";

// Reset all data stores — called on logout and store switch
// Lazy imports to avoid circular dependencies
function resetAllDataStores() {
  const { useProductsStore } = require("@/stores/products-store");
  const { useCustomersStore } = require("@/stores/customers-store");
  const { useReceiptsStore } = require("@/stores/receipts-store");
  const { useUsersStore } = require("@/stores/users-store");
  const { useStoresStore } = require("@/stores/stores-store");
  const { useRolesStore } = require("@/stores/roles-store");

  useProductsStore.getState().reset();
  useCustomersStore.getState().reset();
  useReceiptsStore.getState().reset();
  useUsersStore.getState().reset();
  useStoresStore.getState().reset();
  useRolesStore.getState().reset();
}

// Profile as returned from Supabase profiles table
export interface Profile {
  id: string;
  name: string;
  mobile: string;
  username: string;
  email: string | null;
  role: "super_admin" | "shop_admin" | "employee";
  role_id: string | null;
  store_id: string | null;
  has_passcode: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  profile: Profile | null;
  currentStore: Store | null;
  isImpersonating: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  setProfile: (profile: Profile | null) => void;
  setCurrentStore: (store: Store | null) => void;
  setImpersonating: (val: boolean) => void;
  setHasHydrated: (val: boolean) => void;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<Profile | null>;
  fetchStore: (storeId: string) => Promise<Store | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      profile: null,
      currentStore: null,
      isImpersonating: false,
      isLoading: false,
      _hasHydrated: false,

      setProfile: (profile) => set({ profile }),
      setCurrentStore: (currentStore) => {
        const prev = get().currentStore;
        set({ currentStore });
        // Reset data stores when switching to a different store
        if (prev?.id !== currentStore?.id) {
          resetAllDataStores();
        }
      },
      setImpersonating: (isImpersonating) => set({ isImpersonating }),
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),

      logout: async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        resetAllDataStores();
        set({ profile: null, currentStore: null, isImpersonating: false });
      },

      fetchProfile: async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set({ profile: null });
          return null;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          set({ profile: profile as Profile });
          return profile as Profile;
        }
        return null;
      },

      fetchStore: async (storeId: string) => {
        const supabase = createClient();
        const { data: store } = await supabase
          .from("stores")
          .select("*")
          .eq("id", storeId)
          .single();

        if (store) {
          // Map snake_case DB columns to camelCase frontend types
          const mapped: Store = {
            id: store.id,
            shopname: store.shopname,
            adminId: store.admin_id,
            location: store.location,
            type: store.type,
            pictureUrl: store.picture_url,
            themeColor: store.theme_color,
            createdAt: store.created_at,
            updatedAt: store.updated_at,
          };
          set({ currentStore: mapped });
          return mapped;
        }
        return null;
      },
    }),
    {
      name: "jygs-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
