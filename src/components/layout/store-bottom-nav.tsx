"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Users, Receipt, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const storeNavItems = [
  { href: "/store", label: "Home", icon: LayoutDashboard },
  { href: "/store/products", label: "Products", icon: Package },
  { href: "/store/customers", label: "Customers", icon: Users },
  { href: "/store/receipts", label: "Receipts", icon: Receipt },
  { href: "/store/info", label: "More", icon: Info },
];

export function StoreBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-16 items-center justify-around">
        {storeNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/store" && pathname.startsWith(item.href)) ||
            (item.href === "/store/info" && pathname.startsWith("/store/employees"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-1.5 py-2 text-[10px] sm:text-xs transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
