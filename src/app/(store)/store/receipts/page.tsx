"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useReceiptsStore } from "@/stores/receipts-store";
import { POSDialog } from "@/components/modules/store/pos-dialog";
import {
  Plus,
  Receipt as ReceiptIcon,
  Eye,
  ShoppingBag,
} from "lucide-react";
import type { Receipt } from "@/types";

function formatReceiptId(id: string): string {
  const num = id.replace("rec-", "");
  // Use last 3 digits for display
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

export default function ReceiptsPage() {
  const [posOpen, setPosOpen] = useState(false);
  const { currentStore } = useAuthStore();
  const { receiptHistory, isLoaded, fetchReceipts } = useReceiptsStore();
  const router = useRouter();

  useEffect(() => {
    if (currentStore?.id && !isLoaded) {
      fetchReceipts(currentStore.id);
    }
  }, [currentStore?.id, isLoaded, fetchReceipts]);

  const history = receiptHistory();

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Receipts" backHref="/store" count={history.length}>
        <Button onClick={() => setPosOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Receipt
        </Button>
      </PageHeader>

      {/* Receipt History */}
      <div className="flex-1">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium mb-1">No receipts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first receipt using the POS.
            </p>
            <Button onClick={() => setPosOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Receipt
            </Button>
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

                  {/* Customer + Total */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {receipt.customer?.name ?? "Walk-in"}
                    </span>
                    <span className="font-semibold tabular-nums">
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
