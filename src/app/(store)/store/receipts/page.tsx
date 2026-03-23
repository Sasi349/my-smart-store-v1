"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReceiptsStore } from "@/stores/receipts-store";
import { POSDialog } from "@/components/modules/store/pos-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Plus,
  Receipt as ReceiptIcon,
  Eye,
  ShoppingBag,
  ShieldX,
  Search,
  Phone,
  User,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";
import type { Receipt } from "@/types";

function formatReceiptId(id: string): string {
  const num = id.replace("rec-", "");
  const short = num.slice(-3).padStart(3, "0");
  return `#${short}`;
}

function formatDate(dateStr: string): string {
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

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default function ReceiptsPage() {
  const [posOpen, setPosOpen] = useState(false);
  const { currentStore } = useAuthStore();
  const {
    filteredReceipts,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isLoaded,
    fetchReceipts,
    receipts,
  } = useReceiptsStore();
  const router = useRouter();
  const { hasPermission, canAccessModule, isLoaded: permLoaded } = usePermissions();
  const canRead = canAccessModule("receipts");
  const canCreate = hasPermission("receipts", "canCreate");

  useEffect(() => {
    if (currentStore?.id && !isLoaded) {
      fetchReceipts(currentStore.id);
    }
  }, [currentStore?.id, isLoaded, fetchReceipts]);

  const history = filteredReceipts();

  if (permLoaded && !canRead) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ShieldX className="size-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs mt-1">You don&apos;t have permission to view receipts.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="Receipts" backHref="/store" count={receipts.length}>
        <div className="flex items-center gap-2">
          <Button size="sm" render={<Link href="/store/dues" />}>
            <IndianRupee className="size-4" data-icon="inline-start" />
            Dues
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setPosOpen(true)}>
              <Plus className="size-4" data-icon="inline-start" />
              New Receipt
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Search & Filter */}
      {receipts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, mobile, receipt #, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(val: string | null) => {
              if (val) setStatusFilter(val as "all" | "completed" | "draft" | "cancelled");
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
      )}

      {/* Receipt History */}
      <div className="flex-1">
        {receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium mb-1">No receipts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {canCreate ? "Create your first receipt using the POS." : "No receipts have been created yet."}
            </p>
            {canCreate && (
              <Button onClick={() => setPosOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Receipt
              </Button>
            )}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Search className="size-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No receipts found</p>
            <p className="text-xs mt-1">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((receipt) => (
              <Card key={receipt.id} size="sm">
                <CardContent className="space-y-2">
                  {/* Top row: ID + Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatReceiptId(receipt.id)}
                      </span>
                    </div>
                    <Badge variant={statusBadgeVariant(receipt.status)}>
                      {receipt.status}
                    </Badge>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatDate(receipt.createdAt)}</span>
                    <span>{receipt.items.length} item{receipt.items.length !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Customer info */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm flex items-center gap-1.5">
                        <User className="size-3.5 text-muted-foreground" />
                        {receipt.customer?.name ?? "Walk-in Customer"}
                      </span>
                      {receipt.customer?.mobile && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Phone className="size-3 text-muted-foreground" />
                          {receipt.customer.mobile}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold tabular-nums text-lg">
                      ₹{receipt.total.toFixed(2)}
                    </span>
                  </div>

                  {/* Balance due */}
                  {receipt.balance > 0 && (
                    <div className="flex items-center justify-between text-xs text-destructive">
                      <span>Balance due</span>
                      <span className="font-medium tabular-nums">₹{receipt.balance.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-1">
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(`/store/receipts/${receipt.id}`)
                      }
                    >
                      <Eye className="h-3.5 w-3.5" data-icon="inline-start" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <POSDialog open={posOpen} onOpenChange={setPosOpen} />
    </div>
  );
}
