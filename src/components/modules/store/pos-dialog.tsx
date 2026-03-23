"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useReceiptsStore } from "@/stores/receipts-store";
import { useProductsStore } from "@/stores/products-store";
import { useCustomersStore } from "@/stores/customers-store";
import type { Receipt, ReceiptItem, Product } from "@/types";

interface POSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateReceiptText(receipt: Receipt): string {
  const lines: string[] = [
    `--- RECEIPT #${receipt.id.replace("rec-", "").padStart(3, "0")} ---`,
    `Date: ${new Date(receipt.createdAt).toLocaleDateString()}`,
    receipt.customer ? `Customer: ${receipt.customer.name}` : "Customer: Walk-in",
    "",
    "Items:",
  ];

  receipt.items.forEach((item) => {
    const name = item.productName;
    lines.push(`  ${name} x${item.quantity} = ₹${item.total.toFixed(2)}`);
  });

  lines.push("");
  lines.push(`Subtotal: ₹${receipt.subtotal.toFixed(2)}`);
  if (receipt.discount > 0) {
    lines.push(`Discount: -₹${receipt.discount.toFixed(2)}`);
  }
  lines.push(`Total: ₹${receipt.total.toFixed(2)}`);
  lines.push("---");

  return lines.join("\n");
}

export function shareViaWhatsApp(receipt: Receipt) {
  const text = generateReceiptText(receipt);
  const encoded = encodeURIComponent(text);

  // Pre-fill customer's number with country code 91 if available
  const mobile = receipt.customer?.mobile?.replace(/\D/g, "");
  const phone = mobile ? `91${mobile}` : "";

  window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
}

export function POSDialog({ open, onOpenChange }: POSDialogProps) {
  const {
    currentDraft,
    setDraftCustomer,
    addDraftItem,
    updateDraftItemQuantity,
    updateDraftItemPrice,
    removeDraftItem,
    setDraftDiscount,
    setDraftDiscountType,
    resetDraft,
    addReceipt,
    draftSubtotal,
    draftTotal,
    receipts,
  } = useReceiptsStore();

  const { currentStore, profile } = useAuthStore();
  const { products: allProducts } = useProductsStore();
  const { customers: allCustomers, fetchCustomers, isLoaded: customersLoaded } = useCustomersStore();

  // Fetch customers when dialog opens
  useEffect(() => {
    if (open && !customersLoaded && currentStore) {
      fetchCustomers(currentStore.id);
    }
  }, [open, customersLoaded, currentStore, fetchCustomers]);

  const [searchQuery, setSearchQuery] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<Receipt | null>(null);
  const [paidAmount, setPaidAmount] = useState<number | "">("");

  const displayProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = q
      ? allProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.includes(q))
        )
      : allProducts;
    return filtered.slice(0, 50);
  }, [searchQuery, allProducts]);

  const handleAddProduct = (product: Product) => {
    const existing = currentDraft.items.find(
      (item) => item.productId === product.id
    );
    if (existing) {
      updateDraftItemQuantity(existing.id, existing.quantity + 1);
      return;
    }

    const effectivePrice =
      product.offerPrice !== undefined
        ? product.offerType === "percentage"
          ? product.price * (1 - product.offerPrice / 100)
          : product.offerPrice
        : product.price;

    const newItem: ReceiptItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      receiptId: "",
      productId: product.id,
      product,
      productName: product.name,
      productUnit: product.unit,
      quantity: 1,
      unitPrice: effectivePrice,
      discount: 0,
      total: effectivePrice,
    };
    addDraftItem(newItem);
  };

  const buildReceipt = (status: Receipt["status"]): Receipt => {
    const subtotal = draftSubtotal();
    const total = draftTotal();
    const receiptId = `rec-${Date.now()}`;
    const customer = currentDraft.customerId
      ? allCustomers.find((c) => c.id === currentDraft.customerId)
      : undefined;

    const paid = typeof paidAmount === "number" ? paidAmount : total;

    return {
      id: receiptId,
      storeId: currentStore?.id ?? "",
      customerId: currentDraft.customerId,
      customer,
      createdBy: profile?.id ?? "",
      items: currentDraft.items.map((item) => ({
        ...item,
        receiptId,
      })),
      subtotal,
      discount: currentDraft.discountType === "percentage"
        ? subtotal * (currentDraft.discount / 100)
        : currentDraft.discount,
      total,
      paidAmount: paid,
      balance: total - paid,
      status,
      createdAt: new Date().toISOString(),
    };
  };

  const handleSaveDraft = async () => {
    if (currentDraft.items.length === 0) return;
    const receipt = buildReceipt("draft");
    await addReceipt(receipt);
    resetDraft();
    setSearchQuery("");
    setPaidAmount("");
    setCompletedReceipt(null);
    onOpenChange(false);
  };

  const handleComplete = async () => {
    if (currentDraft.items.length === 0) return;
    const receipt = buildReceipt("completed");
    await addReceipt(receipt);
    setCompletedReceipt(receipt);
    resetDraft();
    setSearchQuery("");
    setPaidAmount("");
  };

  const handleClose = () => {
    setCompletedReceipt(null);
    onOpenChange(false);
  };

  // Completed receipt view
  if (completedReceipt) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="sm:max-w-md max-h-[90vh] overflow-y-auto"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Receipt Completed</DialogTitle>
            <DialogDescription>
              Receipt #{completedReceipt.id.replace("rec-", "").slice(0, 3).padStart(3, "0")} has been saved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span>{completedReceipt.customer?.name ?? "Walk-in"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <span>{completedReceipt.items.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Total</span>
              <span>₹{completedReceipt.total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span>₹{completedReceipt.paidAmount.toFixed(2)}</span>
            </div>
            {completedReceipt.balance > 0 && (
              <div className="flex items-center justify-between text-sm font-medium text-destructive">
                <span>Balance Due</span>
                <span>₹{completedReceipt.balance.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-lg max-w-[calc(100%-1rem)] max-h-[95vh] overflow-y-auto p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <DialogTitle>New Receipt</DialogTitle>
            <Button variant="ghost" size="icon-sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Customer selector */}
          <Select
            value={currentDraft.customerId ?? "walk-in"}
            onValueChange={(val: string | null) => {
              if (val === null) return;
              setDraftCustomer(val === "walk-in" ? undefined : val);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select customer">
                {currentDraft.customerId
                  ? (() => {
                      const c = allCustomers.find((c) => c.id === currentDraft.customerId);
                      return c ? `${c.name} (${c.mobile})` : "Select customer";
                    })()
                  : "Walk-in Customer"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Walk-in Customer</SelectItem>
              {allCustomers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name} ({customer.mobile})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product select with search */}
        <div className="px-4 relative">
          <div
            className="relative"
            onFocus={() => setProductDropdownOpen(true)}
          >
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search and add products..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setProductDropdownOpen(true);
              }}
              onFocus={() => setProductDropdownOpen(true)}
              className="pl-8"
            />
          </div>

          {/* Product dropdown */}
          {productDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-[5]"
                onClick={() => setProductDropdownOpen(false)}
              />
              <div className="absolute left-4 right-4 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-lg border bg-popover shadow-md">
                {displayProducts.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No products found
                  </p>
                ) : (
                  displayProducts.map((product) => {
                    const effectivePrice =
                      product.offerPrice !== undefined
                        ? product.offerType === "percentage"
                          ? product.price * (1 - product.offerPrice / 100)
                          : product.offerPrice
                        : product.price;
                    const inCart = currentDraft.items.find(
                      (item) => item.productId === product.id
                    );

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          handleAddProduct(product);
                          setSearchQuery("");
                          setProductDropdownOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ₹{effectivePrice.toFixed(0)}/{product.unit}
                          </span>
                        </div>
                        {inCart && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] shrink-0"
                          >
                            {inCart.quantity} in cart
                          </Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Cart */}
        <div className="px-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-sm font-medium">
              Cart ({currentDraft.items.length})
            </span>
          </div>

          {currentDraft.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
              No items added yet
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {currentDraft.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border p-2 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.productName}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0">
                      ₹{item.total.toFixed(0)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeDraftItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Tap-to-edit unit price */}
                    <TapToEditPrice
                      value={item.unitPrice}
                      onChange={(val) => updateDraftItemPrice(item.id, val)}
                    />

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() =>
                          item.quantity > 1
                            ? updateDraftItemQuantity(item.id, item.quantity - 1)
                            : removeDraftItem(item.id)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() =>
                          updateDraftItemQuantity(item.id, item.quantity + 1)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary and actions */}
        <div className="sticky bottom-0 bg-background border-t px-4 py-3 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">₹{draftSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">
                Discount
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <div className="flex rounded-md border overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setDraftDiscountType("flat")}
                    className={cn(
                      "px-2 text-xs font-medium transition-colors",
                      currentDraft.discountType === "flat"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    ₹
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftDiscountType("percentage")}
                    className={cn(
                      "px-2 text-xs font-medium transition-colors border-l",
                      currentDraft.discountType === "percentage"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    %
                  </button>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={currentDraft.discountType === "percentage" ? 100 : draftSubtotal()}
                  value={currentDraft.discount || ""}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    const max = currentDraft.discountType === "percentage" ? 100 : draftSubtotal();
                    setDraftDiscount(Math.min(val, max));
                  }}
                  placeholder="0"
                  className="h-7 w-20 text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums text-base">
                ₹{draftTotal().toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">
                Paid (₹)
              </span>
              <Input
                type="number"
                min={0}
                max={draftTotal()}
                value={paidAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setPaidAmount("");
                  } else {
                    const num = Math.max(0, Number(val));
                    setPaidAmount(Math.min(num, draftTotal()));
                  }
                }}
                placeholder={draftTotal().toFixed(0)}
                className="h-7 w-24 ml-auto text-right"
              />
            </div>
            {typeof paidAmount === "number" && paidAmount < draftTotal() && (
              <div className="flex items-center justify-between text-sm font-semibold text-destructive">
                <span>Balance Due</span>
                <span className="tabular-nums">
                  ₹{(draftTotal() - paidAmount).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSaveDraft}
              disabled={currentDraft.items.length === 0}
            >
              Save as Draft
            </Button>
            <Button
              className="flex-1"
              onClick={handleComplete}
              disabled={currentDraft.items.length === 0}
            >
              Complete & Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TapToEditPrice({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      // Small delay to let the input render
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, value]);

  function commit() {
    const num = Math.max(0, Number(draft));
    if (!isNaN(num) && num !== value) {
      onChange(num);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>₹</span>
        <Input
          ref={inputRef}
          type="number"
          min={0}
          step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-6 w-20 text-xs text-center tabular-nums px-1"
        />
        <span className="shrink-0">each</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-muted"
    >
      ₹{value.toFixed(2)} each
    </button>
  );
}
