import { create } from "zustand";
import type { Customer } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { dbInsertCustomer, dbUpdateCustomer, dbDeleteCustomer } from "@/lib/db-actions";

type SortBy = "name-asc" | "name-desc" | "newest" | "oldest";

interface CustomersState {
  customers: Customer[];
  searchQuery: string;
  typeFilter: Customer["type"] | "all";
  sortBy: SortBy;
  isLoaded: boolean;
  fetchCustomers: (storeId: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: Customer["type"] | "all") => void;
  setSortBy: (sortBy: SortBy) => void;
  filteredCustomers: () => Customer[];
}

function mapRow(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    name: row.name as string,
    mobile: row.mobile as string,
    email: row.email as string | undefined,
    type: row.type as Customer["type"],
    address: row.address as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useCustomersStore = create<CustomersState>()((set, get) => ({
  customers: [],
  searchQuery: "",
  typeFilter: "all",
  sortBy: "newest",
  isLoaded: false,

  fetchCustomers: async (storeId) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch customers:", error.message);
      return;
    }
    if (data) {
      set({ customers: data.map(mapRow), isLoaded: true });
    }
  },

  addCustomer: async (customerData) => {
    if (!customerData.name?.trim() || !customerData.storeId?.trim()) return;

    const result = await dbInsertCustomer({
      store_id: customerData.storeId,
      name: customerData.name.trim(),
      mobile: customerData.mobile.trim(),
      email: customerData.email?.trim() || null,
      type: customerData.type,
      address: customerData.address?.trim() || null,
    });

    if (!result.success) {
      console.error("Failed to add customer:", result.error);
      return;
    }
    set((state) => ({ customers: [mapRow(result.data), ...state.customers] }));
  },

  updateCustomer: async (id, updates) => {
    if (!id?.trim()) return;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.mobile !== undefined) dbUpdates.mobile = updates.mobile.trim();
    if (updates.email !== undefined) dbUpdates.email = updates.email?.trim() || null;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.address !== undefined) dbUpdates.address = updates.address?.trim() || null;

    const result = await dbUpdateCustomer(id, dbUpdates);
    if (!result.success) {
      console.error("Failed to update customer:", result.error);
      return;
    }
    set((state) => ({
      customers: state.customers.map((c) => (c.id === id ? mapRow(result.data) : c)),
    }));
  },

  deleteCustomer: async (id) => {
    if (!id?.trim()) return;

    const result = await dbDeleteCustomer(id);
    if (!result.success) {
      console.error("Failed to delete customer:", result.error);
      return;
    }
    set((state) => ({ customers: state.customers.filter((c) => c.id !== id) }));
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setSortBy: (sortBy) => set({ sortBy }),

  filteredCustomers: () => {
    const { customers, searchQuery, typeFilter, sortBy } = get();
    const query = searchQuery.toLowerCase().trim();

    const filtered = customers.filter((customer) => {
      const matchesType = typeFilter === "all" || customer.type === typeFilter;
      const matchesSearch =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.mobile.includes(query) ||
        (customer.email && customer.email.toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });
  },
}));
