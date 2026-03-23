import { create } from "zustand";
import type { Product } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { dbInsertProduct, dbUpdateProduct, dbDeleteProduct } from "@/lib/db-actions";

type SortBy = "name" | "price" | "stock" | "newest";

interface ProductsState {
  products: Product[];
  searchQuery: string;
  categoryFilter: string;
  sortBy: SortBy;
  isLoaded: boolean;
  reset: () => void;
  fetchProducts: (storeId: string) => Promise<void>;
  addProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setSortBy: (sortBy: SortBy) => void;
  filteredProducts: () => Product[];
  categories: () => string[];
}

function mapRow(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    name: row.name as string,
    barcode: row.barcode as string | undefined,
    category: row.category as string,
    price: Number(row.price),
    purchasePrice: Number(row.purchase_price),
    offerPrice: row.offer_price != null ? Number(row.offer_price) : undefined,
    offerType: row.offer_type as Product["offerType"],
    stock: Number(row.stock),
    pictureUrl: row.picture_url as string | undefined,
    unit: row.unit as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useProductsStore = create<ProductsState>()((set, get) => ({
  products: [],
  searchQuery: "",
  categoryFilter: "all",
  sortBy: "newest",
  isLoaded: false,

  reset: () => set({ products: [], searchQuery: "", categoryFilter: "all", sortBy: "newest", isLoaded: false }),

  fetchProducts: async (storeId) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch products:", error.message);
      return;
    }
    if (data) {
      set({ products: data.map(mapRow), isLoaded: true });
    }
  },

  addProduct: async (productData) => {
    if (!productData.name?.trim() || !productData.storeId?.trim()) return;

    const result = await dbInsertProduct({
      store_id: productData.storeId,
      name: productData.name.trim(),
      barcode: productData.barcode?.trim() || null,
      category: productData.category,
      price: productData.price,
      purchase_price: productData.purchasePrice,
      offer_price: productData.offerPrice ?? null,
      offer_type: productData.offerType ?? null,
      stock: productData.stock,
      picture_url: productData.pictureUrl || null,
      unit: productData.unit,
    });

    if (!result.success) {
      console.error("Failed to add product:", result.error);
      return;
    }
    set((state) => ({ products: [mapRow(result.data), ...state.products] }));
  },

  updateProduct: async (id, updates) => {
    if (!id?.trim()) return;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode?.trim() || null;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.offerPrice !== undefined) dbUpdates.offer_price = updates.offerPrice ?? null;
    if (updates.offerType !== undefined) dbUpdates.offer_type = updates.offerType ?? null;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.pictureUrl !== undefined) dbUpdates.picture_url = updates.pictureUrl || null;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;

    const result = await dbUpdateProduct(id, dbUpdates);
    if (!result.success) {
      console.error("Failed to update product:", result.error);
      return;
    }
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? mapRow(result.data) : p)),
    }));
  },

  deleteProduct: async (id) => {
    if (!id?.trim()) return;

    const result = await dbDeleteProduct(id);
    if (!result.success) {
      console.error("Failed to delete product:", result.error);
      return;
    }
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setSortBy: (sortBy) => set({ sortBy }),

  filteredProducts: () => {
    const { products, searchQuery, categoryFilter, sortBy } = get();
    const query = searchQuery.toLowerCase().trim();

    const filtered = products.filter((product) => {
      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    switch (sortBy) {
      case "name":
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      case "price":
        return [...filtered].sort((a, b) => a.price - b.price);
      case "stock":
        return [...filtered].sort((a, b) => a.stock - b.stock);
      case "newest":
        return [...filtered].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      default:
        return filtered;
    }
  },

  categories: () => {
    const { products } = get();
    return [...new Set(products.map((p) => p.category))].sort();
  },
}));
