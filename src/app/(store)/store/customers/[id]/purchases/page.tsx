"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useReceiptsStore } from "@/stores/receipts-store";
import { useCustomersStore } from "@/stores/customers-store";
import { usePermissions } from "@/hooks/use-permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Eye,
  ShoppingBag,
  Receipt as ReceiptIcon,
  IndianRupee,
  ShieldX,
  CircleCheck,
  Banknote,
} from "lucide-react";
import type { Receipt } from "@/types";

function formatReceiptId(id: string): string {
  const num = id.replace("rec-", "");
  return `#${num.slice(-3).padStart(3, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeVariant(
  status: Receipt["status"]
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "completed":
      return "default";
    case "draft":
      return "secondary";
    case "cancelled":
      return "destructive";
  }
}

type StatusFilter = "all" | "completed" | "draft" | "cancelled";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default function CustomerPurchasesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = use(params);
  const router = useRouter();
  const { currentStore } = useAuthStore();
  const { receipts, isLoaded, fetchReceipts, distributePayment } = useReceiptsStore();
  const { customers, isLoaded: customersLoaded, fetchCustomers } = useCustomersStore();
  const { canAccessModule, isLoaded: permLoaded } = usePermissions();
  const canRead = canAccessModule("receipts");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Pay Due dialog state
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (currentStore?.id) {
      if (!isLoaded) fetchReceipts(currentStore.id);
      if (!customersLoaded) fetchCustomers(currentStore.id);
    }
  }, [currentStore?.id, isLoaded, customersLoaded, fetchReceipts, fetchCustomers]);

  const customer = customers.find((c) => c.id === customerId);

  const filteredReceipts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return receipts
      .filter((r) => r.customerId === customerId)
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter((r) => {
        if (!query) return true;
        const receiptNum = r.id.replace("rec-", "").slice(-3).padStart(3, "0");
        const total = r.total.toFixed(2);
        return (
          receiptNum.includes(query) ||
          query.replace("#", "") === receiptNum ||
          total.includes(query)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [receipts, customerId, searchQuery, statusFilter]);

  const totalSpent = useMemo(
    () =>
      receipts
        .filter((r) => r.customerId === customerId && r.status === "completed")
        .reduce((sum, r) => sum + r.total, 0),
    [receipts, customerId]
  );

  const totalPaid = useMemo(
    () =>
      receipts
        .filter((r) => r.customerId === customerId)
        .reduce((sum, r) => sum + r.paidAmount, 0),
    [receipts, customerId]
  );

  const totalDue = useMemo(
    () =>
      receipts
        .filter((r) => r.customerId === customerId && r.balance > 0)
        .reduce((sum, r) => sum + r.balance, 0),
    [receipts, customerId]
  );

  // FIFO preview: show how payment will be distributed
  const fifoPreview = useMemo(() => {
    if (typeof payAmount !== "number" || payAmount <= 0) return [];
    const dueReceipts = receipts
      .filter((r) => r.customerId === customerId && r.balance > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let remaining = payAmount;
    const preview: { id: string; receiptNum: string; applied: number; newBalance: number }[] = [];

    for (const r of dueReceipts) {
      if (remaining <= 0) break;
      const applied = Math.min(remaining, r.balance);
      preview.push({
        id: r.id,
        receiptNum: formatReceiptId(r.id),
        applied,
        newBalance: r.balance - applied,
      });
      remaining -= applied;
    }
    return preview;
  }, [payAmount, receipts, customerId]);

  function openPayDialog() {
    setPayAmount("");
    setPayError("");
    setPayLoading(false);
    setPayOpen(true);
  }

  async function handlePayDue() {
    if (typeof payAmount !== "number" || payAmount <= 0) {
      setPayError("Enter a valid amount");
      return;
    }
    if (payAmount > totalDue) {
      setPayError(`Amount cannot exceed total due ₹${totalDue.toFixed(2)}`);
      return;
    }

    setPayLoading(true);
    setPayError("");
    const success = await distributePayment(customerId, payAmount);
    setPayLoading(false);

    if (success) {
      setPayOpen(false);
    } else {
      setPayError("Failed to update payment. Please try again.");
    }
  }

  if (permLoaded && !canRead) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ShieldX className="size-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs mt-1">You don&apos;t have permission to view purchases.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:pb-4">
      <PageHeader
        title={customer?.name ?? "Customer"}
        count={filteredReceipts.length}
        backHref="/store/customers"
      />

      {/* Summary */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-3 divide-x">
          <div className="flex flex-col items-center gap-1 px-3 py-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <IndianRupee className="size-4 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground">Spent</p>
            <p className="text-sm sm:text-base font-bold tabular-nums">₹{totalSpent.toFixed(2)}</p>
          </div>
          <div className="flex flex-col items-center gap-1 px-3 py-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
              <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-[10px] text-muted-foreground">Paid</p>
            <p className="text-sm sm:text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">₹{totalPaid.toFixed(2)}</p>
          </div>
          <div className="flex flex-col items-center gap-1 px-3 py-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-destructive/10">
              <IndianRupee className="size-4 text-destructive" />
            </div>
            <p className="text-[10px] text-muted-foreground">Due</p>
            <p className="text-sm sm:text-base font-bold tabular-nums text-destructive">₹{totalDue.toFixed(2)}</p>
          </div>
        </div>
        {totalDue > 0 && (
          <div className="border-t px-3 py-2.5 flex justify-end">
            <Button size="sm" onClick={openPayDialog}>
              <Banknote className="size-4" data-icon="inline-start" />
              Pay Due
            </Button>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by receipt #, amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val: string | null) => {
            if (val) setStatusFilter(val as StatusFilter);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>
              {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {filteredReceipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ShoppingBag className="size-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {searchQuery || statusFilter !== "all"
              ? "No matching receipts"
              : "No purchases yet"}
          </p>
          <p className="text-xs mt-1">
            {searchQuery || statusFilter !== "all"
              ? "Try a different search or filter."
              : "This customer has no receipts."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="space-y-2 md:hidden">
            {filteredReceipts.map((receipt) => (
              <Card key={receipt.id} size="sm">
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ReceiptIcon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{formatReceiptId(receipt.id)}</span>
                    </div>
                    <Badge variant={statusBadgeVariant(receipt.status)}>
                      {receipt.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDateTime(receipt.createdAt)}</span>
                    <span>{receipt.items.length} item{receipt.items.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t">
                    <div className="space-y-0.5">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Paid: </span>
                        <span className="tabular-nums font-medium">₹{receipt.paidAmount.toFixed(2)}</span>
                      </div>
                      {receipt.balance > 0 && (
                        <div className="text-xs text-destructive">
                          <span>Due: </span>
                          <span className="tabular-nums font-medium">₹{receipt.balance.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-base font-bold tabular-nums">₹{receipt.total.toFixed(2)}</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/store/receipts/${receipt.id}?from=customer&cid=${customerId}`)}
                  >
                    <Eye className="size-3.5" data-icon="inline-start" />
                    View Receipt
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">
                      {formatReceiptId(receipt.id)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(receipt.createdAt)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {receipt.items.length}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(receipt.status)}>
                        {receipt.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      ₹{receipt.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{receipt.paidAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-destructive">
                      {receipt.balance > 0 ? `₹${receipt.balance.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => router.push(`/store/receipts/${receipt.id}?from=customer&cid=${customerId}`)}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Pay Due Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay Due</DialogTitle>
            <DialogDescription>
              Record a payment for {customer?.name ?? "this customer"}. Amount will be applied to oldest dues first (FIFO).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{customer?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-destructive border-t pt-1.5">
                <span>Total Due</span>
                <span className="tabular-nums">₹{totalDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment input */}
            <div className="grid gap-1.5">
              <Label htmlFor="pay-amount">Payment Amount (₹) *</Label>
              <Input
                id="pay-amount"
                type="number"
                min={1}
                max={totalDue}
                step="0.01"
                placeholder={`Max ₹${totalDue.toFixed(2)}`}
                value={payAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setPayAmount("");
                  } else {
                    setPayAmount(Math.min(Math.max(0, Number(val)), totalDue));
                  }
                  setPayError("");
                }}
                autoFocus
              />
              {payError && (
                <p className="text-xs text-destructive">{payError}</p>
              )}
            </div>

            {/* FIFO distribution preview */}
            {fifoPreview.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Payment Distribution</p>
                <div className="rounded-lg border divide-y text-xs">
                  {fifoPreview.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-1.5">
                      <span className="font-medium">{item.receiptNum}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                          +₹{item.applied.toFixed(2)}
                        </span>
                        <span className="tabular-nums text-muted-foreground w-20 text-right">
                          {item.newBalance > 0
                            ? <span className="text-destructive">Due ₹{item.newBalance.toFixed(2)}</span>
                            : <span className="text-emerald-600 dark:text-emerald-400">Cleared</span>
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {typeof payAmount === "number" && payAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Remaining due after payment: <span className="font-medium tabular-nums">₹{(totalDue - payAmount).toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handlePayDue}
              disabled={payLoading || typeof payAmount !== "number" || payAmount <= 0}
            >
              {payLoading ? "Updating..." : "Update Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
