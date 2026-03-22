"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas-pro";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useReceiptsStore } from "@/stores/receipts-store";
import { useAuthStore } from "@/stores/auth-store";
import { Download, ShoppingBag } from "lucide-react";
import type { Receipt } from "@/types";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatReceiptNumber(id: string): string {
  const num = id.replace("rec-", "");
  return num.slice(-4).padStart(4, "0");
}

function CharLine({ char = "-", className = "" }: { char?: string; className?: string }) {
  return (
    <div className={`overflow-hidden text-black/20 select-none leading-none ${className}`} aria-hidden>
      {char.repeat(60)}
    </div>
  );
}

export default function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { currentStore, profile } = useAuthStore();
  const { receipts, isLoaded, fetchReceipts } = useReceiptsStore();

  useEffect(() => {
    if (currentStore?.id && !isLoaded) {
      fetchReceipts(currentStore.id);
    }
  }, [currentStore?.id, isLoaded, fetchReceipts]);

  const receiptRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const receipt = receipts.find((r) => r.id === id);

  const captureReceipt = useCallback(async (): Promise<Blob | null> => {
    if (!receiptRef.current) return null;
    const canvas = await html2canvas(receiptRef.current, {
      scale: 3,
      backgroundColor: "#fefcf7",
      useCORS: true,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }, []);

  const handleWhatsAppShare = useCallback(async () => {
    setSharing(true);
    try {
      const blob = await captureReceipt();
      if (!blob) return;

      // Save image to device first
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${formatReceiptNumber(id)}.png`;
      a.click();
      URL.revokeObjectURL(url);

      // Open WhatsApp after a short delay so the download starts
      setTimeout(() => {
        const customerMobile = receipt?.customer?.mobile?.replace(/\D/g, "");
        const phone = customerMobile ? `91${customerMobile}` : "";
        const text = encodeURIComponent(
          `Receipt #${formatReceiptNumber(id)} - ₹${receipt?.total.toFixed(2)}\nPlease find the receipt image attached.`
        );
        window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
      }, 500);
    } catch (err) {
      console.error("Failed to share receipt:", err);
    } finally {
      setSharing(false);
    }
  }, [captureReceipt, id, receipt]);

  const handleDownload = useCallback(async () => {
    const blob = await captureReceipt();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${formatReceiptNumber(id)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [captureReceipt, id]);

  if (!receipt) {
    return (
      <div className="flex flex-col min-h-full">
        <PageHeader title="Receipt" backHref="/store/receipts" />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-base font-medium mb-1">Receipt not found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This receipt may have been deleted.
          </p>
          <Button variant="outline" onClick={() => router.push("/store/receipts")}>
            Back to Receipts
          </Button>
        </div>
      </div>
    );
  }

  const receiptNo = formatReceiptNumber(receipt.id);
  const storeName = currentStore?.shopname ?? "Store";
  const storeLocation = currentStore?.location;
  const adminName = profile?.name;
  const adminMobile = profile?.mobile;
  const totalQty = receipt.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title={`Receipt #${receiptNo}`}
        backHref="/store/receipts"
      />

      <div className="mx-auto w-full max-w-[380px]">
        {/* Receipt paper */}
        <div
          ref={receiptRef}
          id="receipt-print"
          className="receipt-paper bg-[#fefcf7] text-[#1a1a1a] font-mono text-[12px] leading-[1.6] px-5 py-6 rounded border border-black/10 shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
        >
          {/* Store header */}
          <div className="text-center mb-1">
            <h2 className="text-[15px] font-bold uppercase tracking-[0.15em]">
              {storeName}
            </h2>
            {storeLocation && (
              <p className="text-[10px] text-black/60 mt-0.5 leading-tight">
                {storeLocation}
              </p>
            )}
            {adminName && (
              <p className="text-[10px] text-black/50 mt-0.5">
                {adminName}{adminMobile ? ` | ${adminMobile}` : ""}
              </p>
            )}
          </div>

          <CharLine char="=" />

          {/* Title */}
          <div className="text-center font-bold text-[13px] uppercase tracking-[0.2em] my-1">
            {receipt.status === "draft" ? "DRAFT" : receipt.status === "cancelled" ? "CANCELLED" : "INVOICE"}
          </div>

          <CharLine />

          {/* Receipt meta */}
          <div className="flex justify-between my-1">
            <span>No: <span className="font-bold">{receiptNo}</span></span>
            <span>{formatDate(receipt.createdAt)}</span>
          </div>
          <div className="flex justify-between text-[10px] text-black/50">
            <span>Time: {formatTime(receipt.createdAt)}</span>
            <span>{receipt.status.toUpperCase()}</span>
          </div>

          <CharLine char="=" />

          {/* Table header */}
          <div className="grid grid-cols-[1.2rem_1fr_1.8rem_3rem_3.5rem] gap-x-1.5 font-bold text-[11px] uppercase text-black/60 my-1">
            <span>#</span>
            <span>Item</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amt</span>
          </div>

          <CharLine />

          {/* Items */}
          <div className="my-0.5">
            {receipt.items.map((item, i) => (
              <div
                key={item.id}
                className="grid grid-cols-[1.2rem_1fr_1.8rem_3rem_3.5rem] gap-x-1.5 py-[2px]"
              >
                <span className="text-black/40">{i + 1}</span>
                <span className="truncate uppercase text-[11px]">
                  {item.productName}
                </span>
                <span className="text-right tabular-nums">{item.quantity}</span>
                <span className="text-right tabular-nums text-black/60">
                  {item.unitPrice.toFixed(2)}
                </span>
                <span className="text-right tabular-nums font-bold">
                  {item.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <CharLine />

          {/* Subtotal */}
          <div className="flex justify-between my-0.5 text-black/60">
            <span>Subtotal ({totalQty} items)</span>
            <span className="tabular-nums">{receipt.subtotal.toFixed(2)}</span>
          </div>

          {/* Discount */}
          {receipt.discount > 0 && (
            <div className="flex justify-between my-0.5 text-black/60">
              <span>Discount</span>
              <span className="tabular-nums">-{receipt.discount.toFixed(2)}</span>
            </div>
          )}

          <CharLine char="=" />

          {/* Grand total */}
          <div className="flex justify-between my-1 text-[15px] font-bold">
            <span>TOTAL</span>
            <span className="tabular-nums">
              ₹{receipt.total.toFixed(2)}
            </span>
          </div>

          {/* Payment info */}
          <div className="flex justify-between my-0.5 text-black/60">
            <span>Paid</span>
            <span className="tabular-nums">₹{receipt.paidAmount.toFixed(2)}</span>
          </div>
          {receipt.balance > 0 && (
            <div className="flex justify-between my-0.5 font-bold">
              <span>BALANCE DUE</span>
              <span className="tabular-nums">₹{receipt.balance.toFixed(2)}</span>
            </div>
          )}

          <CharLine char="=" />

          {/* Footer */}
          <div className="text-center mt-3 space-y-1">
            <p className="text-[10px] text-black/40 uppercase tracking-[0.1em]">
              Thank you for your business
            </p>
            <p className="text-[9px] text-black/25">
              Generated by JyGS
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pb-4">
          <Button
            className="flex-1"
            onClick={handleDownload}
          >
            <Download className="size-4" data-icon="inline-start" />
            Save Image
          </Button>
        </div>
      </div>

    </div>
  );
}
