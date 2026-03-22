"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Package, Users, Receipt, Info, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useProductsStore } from "@/stores/products-store";
import { useCustomersStore } from "@/stores/customers-store";
import { useReceiptsStore } from "@/stores/receipts-store";

export default function StoreDashboardPage() {
  const { currentStore } = useAuthStore();
  const { products, isLoaded: productsLoaded, fetchProducts } = useProductsStore();
  const { customers, isLoaded: customersLoaded, fetchCustomers } = useCustomersStore();
  const { receipts, isLoaded: receiptsLoaded, fetchReceipts } = useReceiptsStore();

  useEffect(() => {
    if (currentStore?.id) {
      if (!productsLoaded) fetchProducts(currentStore.id);
      if (!customersLoaded) fetchCustomers(currentStore.id);
      if (!receiptsLoaded) fetchReceipts(currentStore.id);
    }
  }, [currentStore?.id, productsLoaded, customersLoaded, receiptsLoaded, fetchProducts, fetchCustomers, fetchReceipts]);

  const modules = [
    {
      title: "Products",
      description: "Manage products, pricing and stock",
      href: "/store/products",
      icon: Package,
      count: products.length,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    },
    {
      title: "Customers",
      description: "Manage customer records",
      href: "/store/customers",
      icon: Users,
      count: customers.length,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    },
    {
      title: "Receipts",
      description: "Create bills and view history",
      href: "/store/receipts",
      icon: Receipt,
      count: receipts.length,
      iconColor: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-500/10 dark:bg-violet-500/20",
    },
    {
      title: "Info",
      description: "Store details, staff and settings",
      href: "/store/info",
      icon: Info,
      count: null,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-4xl flex-col justify-center space-y-8 px-4 py-8 sm:px-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {currentStore?.shopname ?? "Store"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your store from here.
        </p>
      </div>

      {/* Module Cards — 2x2 grid */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.title}
              href={mod.href}
              className="group flex flex-col justify-between rounded-2xl border bg-card p-5 sm:p-7 transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 min-h-[200px] sm:min-h-[240px]"
            >
              {/* Top: Icon + Count */}
              <div className="flex items-start justify-between">
                <div className={`flex size-12 sm:size-14 items-center justify-center rounded-xl ${mod.iconBg}`}>
                  <Icon className={`size-6 sm:size-7 ${mod.iconColor}`} />
                </div>
              </div>

              {/* Bottom: Title + Description + Arrow */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
                  {mod.title}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">
                  {mod.description}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  Open
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
