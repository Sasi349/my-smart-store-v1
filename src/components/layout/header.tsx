"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Sun, Moon, Monitor, User, LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Header() {
  const { profile, currentStore, isImpersonating, setCurrentStore, setImpersonating, logout } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const headerTitle = isImpersonating && currentStore
    ? currentStore.shopname
    : profile?.role === "shop_admin" && currentStore
    ? currentStore.shopname
    : "JyGS";

  const handleExitImpersonation = () => {
    setCurrentStore(null);
    setImpersonating(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-3 gap-2">
        {isImpersonating && (
          <Button variant="ghost" size="icon" className="shrink-0" onClick={handleExitImpersonation}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
          {headerTitle}
        </h1>

        {isImpersonating && (
          <span className="shrink-0 whitespace-nowrap text-[10px] bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-medium">
            Store View
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" />}
          >
            <Settings className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setMode("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Light {mode === "light" && "✓"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Dark {mode === "dark" && "✓"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode("system")}>
              <Monitor className="mr-2 h-4 w-4" />
              System {mode === "system" && "✓"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/profile" />}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setLogoutOpen(true)}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Logout Confirmation */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { await logout(); router.push("/login"); }}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
