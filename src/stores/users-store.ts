import { create } from "zustand";
import type { User, UserRole } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface UsersState {
  users: User[];
  searchQuery: string;
  roleFilter: UserRole | "all";
  isLoaded: boolean;
  fetchUsers: () => Promise<void>;
  addUser: (user: User) => void;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setRoleFilter: (role: UserRole | "all") => void;
  filteredUsers: () => User[];
}

function mapRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    mobile: row.mobile as string,
    username: row.username as string,
    email: row.email as string | undefined,
    role: row.role as UserRole,
    roleId: row.role_id as string,
    storeId: row.store_id as string | undefined,
    hasPasscode: row.has_passcode as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useUsersStore = create<UsersState>()((set, get) => ({
  users: [],
  searchQuery: "",
  roleFilter: "all",
  isLoaded: false,

  fetchUsers: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch users:", error.message);
      return;
    }
    if (data) {
      set({ users: data.map(mapRow), isLoaded: true });
    }
  },

  addUser: (user) =>
    set((state) => ({ users: [user, ...state.users] })),

  updateUser: async (id, updates) => {
    if (!id?.trim()) return;

    const supabase = createClient();
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.mobile !== undefined) dbUpdates.mobile = updates.mobile.trim();
    if (updates.username !== undefined) dbUpdates.username = updates.username.trim();
    if (updates.email !== undefined) dbUpdates.email = updates.email?.trim() || null;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.roleId !== undefined) dbUpdates.role_id = updates.roleId;
    if (updates.storeId !== undefined) dbUpdates.store_id = updates.storeId || null;

    const { data, error } = await supabase
      .from("profiles")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update user:", error.message);
      return;
    }
    if (data) {
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? mapRow(data) : u)),
      }));
    }
  },

  deleteUser: async (id) => {
    if (!id?.trim()) return;

    const supabase = createClient();
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete user:", error.message);
      return;
    }
    set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setRoleFilter: (roleFilter) => set({ roleFilter }),

  filteredUsers: () => {
    const { users, searchQuery, roleFilter } = get();
    const query = searchQuery.toLowerCase().trim();

    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.mobile.includes(query);
      return matchesRole && matchesSearch;
    });
  },
}));
