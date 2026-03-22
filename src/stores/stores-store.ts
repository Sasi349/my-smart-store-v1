import { create } from "zustand";
import type { Store } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface StoresState {
  stores: Store[];
  searchQuery: string;
  typeFilter: string;
  isLoaded: boolean;
  fetchStores: () => Promise<void>;
  addStore: (store: Omit<Store, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateStore: (id: string, data: Partial<Store>) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: string) => void;
  filteredStores: () => Store[];
}

function mapRow(row: Record<string, unknown>): Store {
  return {
    id: row.id as string,
    shopname: row.shopname as string,
    adminId: row.admin_id as string,
    location: row.location as string,
    type: row.type as string,
    pictureUrl: row.picture_url as string | undefined,
    themeColor: row.theme_color as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useStoresStore = create<StoresState>()((set, get) => ({
  stores: [],
  searchQuery: "",
  typeFilter: "",
  isLoaded: false,

  fetchStores: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch stores:", error.message);
      return;
    }
    if (data) {
      set({ stores: data.map(mapRow), isLoaded: true });
    }
  },

  addStore: async (storeData) => {
    if (!storeData.shopname?.trim() || !storeData.adminId?.trim()) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("stores")
      .insert({
        shopname: storeData.shopname.trim(),
        admin_id: storeData.adminId,
        location: storeData.location.trim(),
        type: storeData.type,
        picture_url: storeData.pictureUrl || null,
        theme_color: storeData.themeColor || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add store:", error.message);
      return;
    }
    if (data) {
      // Link the admin's profile to this store
      await supabase
        .from("profiles")
        .update({ store_id: data.id })
        .eq("id", storeData.adminId);

      set((state) => ({ stores: [mapRow(data), ...state.stores] }));
    }
  },

  updateStore: async (id, updates) => {
    if (!id?.trim()) return;

    const supabase = createClient();
    const dbUpdates: Record<string, unknown> = {};
    if (updates.shopname !== undefined) dbUpdates.shopname = updates.shopname.trim();
    if (updates.adminId !== undefined) dbUpdates.admin_id = updates.adminId;
    if (updates.location !== undefined) dbUpdates.location = updates.location.trim();
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.pictureUrl !== undefined) dbUpdates.picture_url = updates.pictureUrl || null;
    if (updates.themeColor !== undefined) dbUpdates.theme_color = updates.themeColor || null;

    const { data, error } = await supabase
      .from("stores")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update store:", error.message);
      return;
    }
    if (data) {
      // If admin changed, update both old and new admin's profile store_id
      if (updates.adminId) {
        const oldStore = get().stores.find((s) => s.id === id);
        if (oldStore && oldStore.adminId !== updates.adminId) {
          // Unlink old admin
          await supabase
            .from("profiles")
            .update({ store_id: null })
            .eq("id", oldStore.adminId);
        }
        // Link new admin
        await supabase
          .from("profiles")
          .update({ store_id: id })
          .eq("id", updates.adminId);
      }

      set((state) => ({
        stores: state.stores.map((s) => (s.id === id ? mapRow(data) : s)),
      }));
    }
  },

  deleteStore: async (id) => {
    if (!id?.trim()) return;

    const supabase = createClient();
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete store:", error.message);
      return;
    }
    set((state) => ({ stores: state.stores.filter((s) => s.id !== id) }));
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),

  filteredStores: () => {
    const { stores, searchQuery, typeFilter } = get();
    const query = searchQuery.toLowerCase();
    return stores.filter((store) => {
      const matchesSearch =
        !query ||
        store.shopname.toLowerCase().includes(query) ||
        store.location.toLowerCase().includes(query);
      const matchesType = !typeFilter || store.type === typeFilter;
      return matchesSearch && matchesType;
    });
  },
}));
