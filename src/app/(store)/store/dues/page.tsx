"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useReceiptsStore } from "@/stores/receipts-store";
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
  IndianRupee,
  AlertCircle,
  Phone,
  User,
  ShieldX,
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

export default function DuesPage() {
  const { currentStore } = useAuthStore();
  const { receipts, isLoaded, fetchReceipts, updateReceiptPayment } = useReceiptsStore();
  const { canAccessModule, isLoaded: permLoaded } = usePermissions();
  const canRead = canAccessModule("receipts");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Pay Due dialog state
  const [payTarget, setPayTarget] = useState<Receipt | null>(null);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (currentStore?.id && !isLoaded) {
      fetchReceipts(currentStore.id);
    }
  }, [currentStore?.id, isLoaded, fetchReceipts]);

  // Filter receipts with balance > 0
  const dueReceipts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return receipts
      .filter((r) => r.balance > 0)
      .filter((r) => {
        if (!query) return true;
        const name = r.customer?.name?.toLowerCase() || "";
        const mobile = r.customer?.mobile || "";
        const receiptNum = r.id.replace("rec-", "").slice(-3).padStart(3, "0");
        return (
          name.includes(query) ||
          mobile.includes(query) ||
          receiptNum.includes(query) ||
          query.replace("#", "") === receiptNum
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [receipts, searchQuery]);

  const totalDue = useMemo(
    () => dueReceipts.reduce((sum, r) => sum + r.balance, 0),
    [dueReceipts]
  );

  function openPayDialog(receipt: Receipt) {
    setPayTarget(receipt);
    setPayAmount("");
    setPayError("");
    setPayLoading(false);
  }

  async function handlePayDue() {
    if (!payTarget || typeof payAmount !== "number" || payAmount <= 0) {
      setPayError("Enter a valid amount");
      return;
    }
    if (payAmount > payTarget.balance) {
      setPayError(`Amount cannot exceed due balance ₹${payTarget.balance.toFixed(2)}`);
      return;
    }

    setPayLoading(true);
    setPayError("");
    const success = await updateReceiptPayment(payTarget.id, payAmount);
    setPayLoading(false);

    if (success) {
      setPayTarget(null);
    } else {
      setPayError("Failed to update payment. Please try again.");
    }
  }

  if (permLoaded && !canRead) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ShieldX className="size-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs mt-1">You don&apos;t have permission to view dues.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:pb-4">
      <PageHeader title="Due Balances" count={dueReceipts.length} backHref="/store/receipts" />

      {/* Total Due Summary */}
      <Card>
        <CardContent className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10">
              <IndianRupee className="size-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Due</p>
              <p className="text-lg font-bold tabular-nums text-destructive">
                ₹{totalDue.toFixed(2)}
              </p>
            </div>
          </div>
          <Badge variant="destructive">
            {dueReceipts.length} receipt{dueReceipts.length !== 1 ? "s" : ""}
          </Badge>
        </CardContent>
      </Card>

      {/* Search */}
      {receipts.some((r) => r.balance > 0) && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, mobile, receipt #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Content */}
      {dueReceipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <AlertCircle className="size-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {searchQuery ? "No matching dues found" : "No pending dues"}
          </p>
          <p className="text-xs mt-1">
            {searchQuery
              ? "Try a different search term."
              : "All balances are cleared."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="space-y-2 md:hidden">
            {dueReceipts.map((receipt) => (
              <DueCard
                key={receipt.id}
                receipt={receipt}
                onView={() => router.push(`/store/receipts/${receipt.id}?from=dues`)}
                onPay={() => openPayDialog(receipt)}
              />
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-center w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dueReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">
                      {formatReceiptId(receipt.id)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(receipt.createdAt)}
                    </TableCell>
                    <TableCell>
                      {receipt.customer?.name ?? "Walk-in"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {receipt.customer?.mobile ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{receipt.paidAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-destructive">
                      ₹{receipt.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="xs"
                          onClick={() => openPayDialog(receipt)}
                        >
                          <Banknote className="size-3.5" />
                          Pay Due
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => router.push(`/store/receipts/${receipt.id}?from=dues`)}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Pay Due Dialog */}
      <Dialog open={!!payTarget} onOpenChange={(open) => { if (!open) setPayTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay Due</DialogTitle>
            <DialogDescription>
              Record a payment for receipt {payTarget ? formatReceiptId(payTarget.id) : ""}.
            </DialogDescription>
          </DialogHeader>

          {payTarget && (
            <div className="space-y-4">
              {/* Receipt summary */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{payTarget.customer?.name ?? "Walk-in"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="tabular-nums">₹{payTarget.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="tabular-nums">₹{payTarget.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-destructive border-t pt-1.5">
                  <span>Balance Due</span>
                  <span className="tabular-nums">₹{payTarget.balance.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment input */}
              <div className="grid gap-1.5">
                <Label htmlFor="pay-amount">Payment Amount (₹) *</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min={1}
                  max={payTarget.balance}
                  step="0.01"
                  placeholder={`Max ₹${payTarget.balance.toFixed(2)}`}
                  value={payAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setPayAmount("");
                    } else {
                      setPayAmount(Math.min(Math.max(0, Number(val)), payTarget.balance));
                    }
                    setPayError("");
                  }}
                  autoFocus
                />
                {typeof payAmount === "number" && payAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Remaining after payment: <span className="font-medium tabular-nums">₹{(payTarget.balance - payAmount).toFixed(2)}</span>
                  </p>
                )}
                {payError && (
                  <p className="text-xs text-destructive">{payError}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>
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

function DueCard({
  receipt,
  onView,
  onPay,
}: {
  receipt: Receipt;
  onView: () => void;
  onPay: () => void;
}) {
  return (
    <Card size="sm">
      <CardContent className="space-y-2">
        {/* Row 1: Receipt # + Date */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {formatReceiptId(receipt.id)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(receipt.createdAt)}
          </span>
        </div>

        {/* Row 2: Customer info */}
        <div className="flex flex-col gap-0.5">
          <span className="text-sm flex items-center gap-1.5">
            <User className="size-3.5 text-muted-foreground" />
            {receipt.customer?.name ?? "Walk-in Customer"}
          </span>
          {receipt.customer?.mobile && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3" />
              {receipt.customer.mobile}
            </span>
          )}
        </div>

        {/* Row 3: Paid + Due amounts */}
        <div className="flex items-center justify-between pt-1 border-t">
          <div className="text-xs">
            <span className="text-muted-foreground">Paid: </span>
            <span className="tabular-nums font-medium">₹{receipt.paidAmount.toFixed(2)}</span>
          </div>
          <div className="text-sm font-semibold text-destructive tabular-nums">
            Due: ₹{receipt.balance.toFixed(2)}
          </div>
        </div>

        {/* Row 4: Actions */}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={onPay}>
            <Banknote className="size-3.5" data-icon="inline-start" />
            Pay Due
          </Button>
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="size-3.5" data-icon="inline-start" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
