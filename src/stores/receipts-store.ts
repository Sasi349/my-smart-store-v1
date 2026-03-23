import { create } from "zustand";
import type { Receipt, ReceiptItem, Product, Customer } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useProductsStore } from "@/stores/products-store";
import {
  dbInsertReceipt,
  dbInsertReceiptItems,
  dbUpdateReceipt,
  dbDeleteReceipt,
  dbGetProductStock,
  dbUpdateProductStock,
} from "@/lib/db-actions";

// Adjust stock for receipt items in the database and local store
// direction: -1 to reduce (sale), +1 to restore (cancel/delete)
async function adjustStock(items: ReceiptItem[], direction: 1 | -1) {
  const productUpdates = items
    .filter((item) => item.productId)
    .map((item) => ({
      id: item.productId!,
      change: item.quantity * direction,
    }));

  if (productUpdates.length === 0) return;

  for (const update of productUpdates) {
    const stockResult = await dbGetProductStock(update.id);
    if (stockResult.success) {
      const newStock = stockResult.data + update.change;
      await dbUpdateProductStock(update.id, newStock);
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

type DiscountType = "flat" | "percentage";

interface CurrentDraft {
  customerId?: string;
  items: ReceiptItem[];
  discount: number;
  discountType: DiscountType;
}

type StatusFilter = "all" | "completed" | "draft" | "cancelled";

interface ReceiptsState {
  receipts: Receipt[];
  currentDraft: CurrentDraft;
  isLoaded: boolean;
  searchQuery: string;
  statusFilter: StatusFilter;

  // Fetch
  fetchReceipts: (storeId: string) => Promise<void>;

  // Actions
  addReceipt: (receipt: Omit<Receipt, "id" | "createdAt">) => Promise<void>;
  updateReceiptPayment: (id: string, additionalPayment: number) => Promise<boolean>;
  distributePayment: (customerId: string, amount: number) => Promise<boolean>;
  updateReceiptStatus: (id: string, status: Receipt["status"]) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: StatusFilter) => void;

  // Draft actions (local only — draft is not persisted to DB until finalized)
  setDraftCustomer: (customerId: string | undefined) => void;
  addDraftItem: (item: ReceiptItem) => void;
  updateDraftItemQuantity: (itemId: string, quantity: number) => void;
  updateDraftItemPrice: (itemId: string, unitPrice: number) => void;
  removeDraftItem: (itemId: string) => void;
  setDraftDiscount: (discount: number) => void;
  setDraftDiscountType: (type: DiscountType) => void;
  resetDraft: () => void;

  // Computed
  receiptHistory: () => Receipt[];
  filteredReceipts: () => Receipt[];
  draftSubtotal: () => number;
  draftTotal: () => number;
}

const initialDraft: CurrentDraft = {
  customerId: undefined,
  items: [],
  discount: 0,
  discountType: "flat",
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
  searchQuery: "",
  statusFilter: "all",

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

    const result = await dbInsertReceipt({
      store_id: receiptData.storeId,
      customer_id: receiptData.customerId || null,
      created_by: receiptData.createdBy,
      subtotal: receiptData.subtotal,
      discount: receiptData.discount,
      total: receiptData.total,
      paid_amount: receiptData.paidAmount,
      status: receiptData.status,
    });

    if (!result.success) {
      console.error("Failed to add receipt:", result.error);
      return;
    }

    const receiptRow = result.data;

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

      const itemsResult = await dbInsertReceiptItems(itemInserts);
      if (itemsResult.success) {
        items = itemsResult.data.map(mapReceiptItem);
      }
    }

    const newReceipt = mapReceipt(receiptRow, items);
    set((state) => ({ receipts: [newReceipt, ...state.receipts] }));

    // Reduce stock for completed receipts
    if (receiptData.status === "completed" && receiptData.items.length > 0) {
      await adjustStock(receiptData.items, -1);
    }
  },

  updateReceiptPayment: async (id, additionalPayment) => {
    if (!id?.trim() || additionalPayment <= 0) return false;

    const { receipts } = get();
    const receipt = receipts.find((r) => r.id === id);
    if (!receipt) return false;

    const newPaidAmount = receipt.paidAmount + additionalPayment;
    // Don't allow overpayment
    if (newPaidAmount > receipt.total) return false;

    const result = await dbUpdateReceipt(id, { paid_amount: newPaidAmount });
    if (!result.success) {
      console.error("Failed to update payment:", result.error);
      return false;
    }

    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === id
          ? { ...r, paidAmount: newPaidAmount, balance: r.total - newPaidAmount }
          : r
      ),
    }));
    return true;
  },

  distributePayment: async (customerId, amount) => {
    if (!customerId || amount <= 0) return false;

    const { receipts } = get();

    // Get due receipts for this customer, sorted oldest first (FIFO)
    const dueReceipts = receipts
      .filter((r) => r.customerId === customerId && r.balance > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (dueReceipts.length === 0) return false;

    let remaining = amount;
    const updates: { id: string; newPaidAmount: number }[] = [];

    for (const receipt of dueReceipts) {
      if (remaining <= 0) break;
      const payForThis = Math.min(remaining, receipt.balance);
      updates.push({
        id: receipt.id,
        newPaidAmount: receipt.paidAmount + payForThis,
      });
      remaining -= payForThis;
    }

    // Apply all updates to DB
    for (const update of updates) {
      const result = await dbUpdateReceipt(update.id, { paid_amount: update.newPaidAmount });
      if (!result.success) {
        console.error("Failed to update payment for receipt:", update.id, result.error);
        return false;
      }
    }

    // Update local state for all affected receipts
    set((state) => ({
      receipts: state.receipts.map((r) => {
        const update = updates.find((u) => u.id === r.id);
        if (!update) return r;
        return {
          ...r,
          paidAmount: update.newPaidAmount,
          balance: r.total - update.newPaidAmount,
        };
      }),
    }));

    return true;
  },

  updateReceiptStatus: async (id, status) => {
    if (!id?.trim()) return;

    const { receipts } = get();
    const receipt = receipts.find((r) => r.id === id);
    if (!receipt) return;

    const oldStatus = receipt.status;
    const result = await dbUpdateReceipt(id, { status });
    if (!result.success) {
      console.error("Failed to update receipt status:", result.error);
      return;
    }

    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === id ? { ...r, status } : r
      ),
    }));

    // Handle stock adjustments on status transitions
    if (oldStatus !== "completed" && status === "completed") {
      await adjustStock(receipt.items, -1);
    } else if (oldStatus === "completed" && status === "cancelled") {
      await adjustStock(receipt.items, 1);
    }
  },

  deleteReceipt: async (id) => {
    if (!id?.trim()) return;

    const { receipts } = get();
    const receipt = receipts.find((r) => r.id === id);

    const result = await dbDeleteReceipt(id);
    if (!result.success) {
      console.error("Failed to delete receipt:", result.error);
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

  updateDraftItemPrice: (itemId, unitPrice) =>
    set((state) => ({
      currentDraft: {
        ...state.currentDraft,
        items: state.currentDraft.items.map((item) =>
          item.id === itemId
            ? { ...item, unitPrice, total: unitPrice * item.quantity }
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

  setDraftDiscountType: (discountType) =>
    set((state) => ({
      currentDraft: { ...state.currentDraft, discountType, discount: 0 },
    })),

  resetDraft: () => set({ currentDraft: { ...initialDraft, items: [] } }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  receiptHistory: () => {
    const { receipts } = get();
    return [...receipts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  filteredReceipts: () => {
    const { receipts, searchQuery, statusFilter } = get();
    const query = searchQuery.toLowerCase().trim();

    let filtered = [...receipts];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Search by customer name, mobile, receipt ID, or total
    if (query) {
      filtered = filtered.filter((r) => {
        const customerName = r.customer?.name?.toLowerCase() || "";
        const customerMobile = r.customer?.mobile || "";
        const receiptId = r.id.toLowerCase();
        const receiptNum = r.id.replace("rec-", "").slice(-4).padStart(4, "0");
        const total = r.total.toFixed(2);

        return (
          customerName.includes(query) ||
          customerMobile.includes(query) ||
          receiptId.includes(query) ||
          receiptNum.includes(query) ||
          query.replace("#", "") === receiptNum ||
          total.includes(query)
        );
      });
    }

    // Sort newest first
    return filtered.sort(
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
    const discountAmount =
      currentDraft.discountType === "percentage"
        ? subtotal * (currentDraft.discount / 100)
        : currentDraft.discount;
    return Math.max(0, subtotal - discountAmount);
  },
}));
