import { create } from "zustand";
import type { Receipt, ReceiptItem, Product, Customer } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useProductsStore } from "@/stores/products-store";

// Adjust stock for receipt items in the database and local store
// direction: -1 to reduce (sale), +1 to restore (cancel/delete)
async function adjustStock(items: ReceiptItem[], direction: 1 | -1) {
  const supabase = createClient();
  const productUpdates = items
    .filter((item) => item.productId)
    .map((item) => ({
      id: item.productId!,
      change: item.quantity * direction,
    }));

  if (productUpdates.length === 0) return;

  // Update each product stock in the database using direct read+write
  for (const update of productUpdates) {
    const { data: product } = await supabase
      .from("products")
      .select("stock")
      .eq("id", update.id)
      .single();

    if (product) {
      const newStock = (product.stock as number) + update.change;
      const { error } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", update.id);

      if (error) {
        console.error(`Failed to update stock for product ${update.id}:`, error.message);
      }
    }
  }

  // Sync local products store
  const productsStore = useProductsStore.getState();
  for (const update of productUpdates) {
    const product = productsStore.products.find((p) => p.id === update.id);
    if (product) {
      const newStock = product.stock + update.change;
      useProductsStore.setState((state) => ({
        products: state.products.map((p) =>
          p.id === update.id ? { ...p, stock: newStock } : p
        ),
      }));
    }
  }
}

interface CurrentDraft {
  customerId?: string;
  items: ReceiptItem[];
  discount: number;
}

interface ReceiptsState {
  receipts: Receipt[];
  currentDraft: CurrentDraft;
  isLoaded: boolean;

  // Fetch
  fetchReceipts: (storeId: string) => Promise<void>;

  // Actions
  addReceipt: (receipt: Omit<Receipt, "id" | "createdAt">) => Promise<void>;
  updateReceiptStatus: (id: string, status: Receipt["status"]) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;

  // Draft actions (local only — draft is not persisted to DB until finalized)
  setDraftCustomer: (customerId: string | undefined) => void;
  addDraftItem: (item: ReceiptItem) => void;
  updateDraftItemQuantity: (itemId: string, quantity: number) => void;
  removeDraftItem: (itemId: string) => void;
  setDraftDiscount: (discount: number) => void;
  resetDraft: () => void;

  // Computed
  receiptHistory: () => Receipt[];
  draftSubtotal: () => number;
  draftTotal: () => number;
}

const initialDraft: CurrentDraft = {
  customerId: undefined,
  items: [],
  discount: 0,
};

function mapProduct(row: Record<string, unknown>): Product {
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

function mapCustomer(row: Record<string, unknown>): Customer {
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

function mapReceiptItem(row: Record<string, unknown>): ReceiptItem {
  const productRow = row.products as Record<string, unknown> | null;
  return {
    id: row.id as string,
    receiptId: row.receipt_id as string,
    productId: (row.product_id as string) || undefined,
    product: productRow ? mapProduct(productRow) : undefined,
    productName: (row.product_name as string) || productRow?.name as string || "Product",
    productUnit: (row.product_unit as string) || productRow?.unit as string || "piece",
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    discount: Number(row.discount),
    total: Number(row.total),
  };
}

function mapReceipt(row: Record<string, unknown>, items: ReceiptItem[]): Receipt {
  const customerRow = row.customers as Record<string, unknown> | null;
  const total = Number(row.total);
  const paidAmount = row.paid_amount != null ? Number(row.paid_amount) : total;
  return {
      id: row.id as string,
      storeId: row.store_id as string,
      customerId: row.customer_id as string | undefined,
      customer: customerRow ? mapCustomer(customerRow) : undefined,
      createdBy: row.created_by as string,
      items,
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      total,
      paidAmount,
      balance: total - paidAmount,
      status: row.status as Receipt["status"],
      createdAt: row.created_at as string,
    };
}

export const useReceiptsStore = create<ReceiptsState>()((set, get) => ({
  receipts: [],
  currentDraft: { ...initialDraft },
  isLoaded: false,

  fetchReceipts: async (storeId) => {
    const supabase = createClient();

    // Fetch receipts with customer data joined
    const { data: receiptsData, error: rError } = await supabase
      .from("receipts")
      .select("*, customers(*)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (rError || !receiptsData) {
      if (rError) console.error("Failed to fetch receipts:", rError.message);
      return;
    }

    const receiptIds = receiptsData.map((r) => r.id as string);

    let itemsData: Record<string, unknown>[] = [];
    if (receiptIds.length > 0) {
      // Fetch receipt items with product data joined
      const { data } = await supabase
        .from("receipt_items")
        .select("*, products(*)")
        .in("receipt_id", receiptIds);
      itemsData = data || [];
    }

    // Group items by receipt
    const itemsByReceipt = new Map<string, ReceiptItem[]>();
    for (const item of itemsData) {
      const mapped = mapReceiptItem(item);
      const arr = itemsByReceipt.get(mapped.receiptId) || [];
      arr.push(mapped);
      itemsByReceipt.set(mapped.receiptId, arr);
    }

    const receipts = receiptsData.map((r) =>
      mapReceipt(r as Record<string, unknown>, itemsByReceipt.get(r.id as string) || [])
    );

    set({ receipts, isLoaded: true });
  },

  addReceipt: async (receiptData) => {
    if (!receiptData.storeId?.trim() || !receiptData.createdBy?.trim()) return;

    const supabase = createClient();

    // Insert receipt
    const { data: receiptRow, error: rError } = await supabase
      .from("receipts")
      .insert({
        store_id: receiptData.storeId,
        customer_id: receiptData.customerId || null,
        created_by: receiptData.createdBy,
        subtotal: receiptData.subtotal,
        discount: receiptData.discount,
        total: receiptData.total,
        paid_amount: receiptData.paidAmount,
        status: receiptData.status,
      })
      .select()
      .single();

    if (rError || !receiptRow) {
      if (rError) console.error("Failed to add receipt:", rError.message);
      return;
    }

    // Insert receipt items
    let items: ReceiptItem[] = [];
    if (receiptData.items.length > 0) {
      const itemInserts = receiptData.items.map((item) => ({
        receipt_id: receiptRow.id,
        product_id: item.productId || null,
        product_name: item.productName,
        product_unit: item.productUnit,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount,
        total: item.total,
      }));

      const { data: itemRows } = await supabase
        .from("receipt_items")
        .insert(itemInserts)
        .select();

      items = (itemRows || []).map(mapReceiptItem);
    }

    const newReceipt = mapReceipt(receiptRow, items);
    set((state) => ({ receipts: [newReceipt, ...state.receipts] }));

    // Reduce stock for completed receipts
    if (receiptData.status === "completed" && receiptData.items.length > 0) {
      console.log("Adjusting stock for", receiptData.items.length, "items");
      await adjustStock(receiptData.items, -1);
    }
  },

  updateReceiptStatus: async (id, status) => {
    if (!id?.trim()) return;

    const { receipts } = get();
    const receipt = receipts.find((r) => r.id === id);
    if (!receipt) return;

    const oldStatus = receipt.status;
    const supabase = createClient();
    const { error } = await supabase
      .from("receipts")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Failed to update receipt status:", error.message);
      return;
    }
    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === id ? { ...r, status } : r
      ),
    }));

    // Handle stock adjustments on status transitions
    if (oldStatus !== "completed" && status === "completed") {
      // Draft/cancelled → completed: reduce stock
      await adjustStock(receipt.items, -1);
    } else if (oldStatus === "completed" && status === "cancelled") {
      // Completed → cancelled: restore stock
      await adjustStock(receipt.items, 1);
    }
  },

  deleteReceipt: async (id) => {
    if (!id?.trim()) return;

    const { receipts } = get();
    const receipt = receipts.find((r) => r.id === id);

    const supabase = createClient();
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete receipt:", error.message);
      return;
    }
    set((state) => ({ receipts: state.receipts.filter((r) => r.id !== id) }));

    // Restore stock if deleting a completed receipt
    if (receipt && receipt.status === "completed") {
      await adjustStock(receipt.items, 1);
    }
  },

  // Draft actions (local only)
  setDraftCustomer: (customerId) =>
    set((state) => ({
      currentDraft: { ...state.currentDraft, customerId },
    })),

  addDraftItem: (item) =>
    set((state) => ({
      currentDraft: {
        ...state.currentDraft,
        items: [...state.currentDraft.items, item],
      },
    })),

  updateDraftItemQuantity: (itemId, quantity) =>
    set((state) => ({
      currentDraft: {
        ...state.currentDraft,
        items: state.currentDraft.items.map((item) =>
          item.id === itemId
            ? { ...item, quantity, total: item.unitPrice * quantity }
            : item
        ),
      },
    })),

  removeDraftItem: (itemId) =>
    set((state) => ({
      currentDraft: {
        ...state.currentDraft,
        items: state.currentDraft.items.filter((item) => item.id !== itemId),
      },
    })),

  setDraftDiscount: (discount) =>
    set((state) => ({
      currentDraft: { ...state.currentDraft, discount },
    })),

  resetDraft: () => set({ currentDraft: { ...initialDraft, items: [] } }),

  receiptHistory: () => {
    const { receipts } = get();
    return [...receipts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  draftSubtotal: () => {
    const { currentDraft } = get();
    return currentDraft.items.reduce((sum, item) => sum + item.total, 0);
  },

  draftTotal: () => {
    const { currentDraft } = get();
    const subtotal = currentDraft.items.reduce((sum, item) => sum + item.total, 0);
    return Math.max(0, subtotal - currentDraft.discount);
  },
}));
