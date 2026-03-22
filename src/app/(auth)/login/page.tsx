"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type Profile } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, KeyRound, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { verifyPasscode } from "./actions";

type LoginMode = "credentials" | "passcode";

export default function LoginPage() {
  const router = useRouter();
  const { profile, _hasHydrated, fetchProfile, fetchStore } = useAuthStore();
  const supabase = createClient();

  const [mode, setMode] = useState<LoginMode>("passcode");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passcodeInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already logged in (only after hydration)
  useEffect(() => {
    if (_hasHydrated && profile) {
      redirectUser(profile);
    }
  }, [_hasHydrated]);

  async function redirectUser(p: Profile | null) {
    if (!p) return;

    if (p.role === "super_admin") {
      router.push("/admin");
      return;
    }

    // Shop admin or employee — try to find their store
    if (p.role === "shop_admin" || p.role === "employee") {
      // First try store_id on profile
      if (p.store_id) {
        await fetchStore(p.store_id);
        router.push("/store");
        return;
      }

      // For shop_admin, try to find store where they are the admin
      if (p.role === "shop_admin") {
        const { data: store } = await supabase
          .from("stores")
          .select("id")
          .eq("admin_id", p.id)
          .single();

        if (store) {
          await fetchStore(store.id);
          router.push("/store");
          return;
        }
      }
    }

    // Fallback — no store found
    router.push("/admin");
  }

  async function handleCredentialLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Fetch profile from database
      const userProfile = await fetchProfile();
      if (!userProfile) {
        setError("Profile not found. Please contact admin.");
        setLoading(false);
        return;
      }

      await redirectUser(userProfile);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasscodeLogin() {
    setError("");
    if (passcode.length !== 6) return;

    setLoading(true);
    try {
      // Server action: verify passcode and get magic link token
      const result = await verifyPasscode(passcode);

      if (!result.success || !result.email || !result.token) {
        setError(result.error || "Invalid passcode");
        setPasscode("");
        setLoading(false);
        return;
      }

      // Use the hashed token to verify OTP and create a session
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: result.token,
        type: "magiclink",
      });

      if (otpError) {
        setError("Authentication failed");
        setPasscode("");
        setLoading(false);
        return;
      }

      const userProfile = await fetchProfile();
      if (!userProfile) {
        setError("Profile not found");
        setPasscode("");
        setLoading(false);
        return;
      }

      await redirectUser(userProfile);
    } catch {
      setError("An unexpected error occurred");
      setPasscode("");
    } finally {
      setLoading(false);
    }
  }

  // Auto-submit when passcode reaches 6 digits
  useEffect(() => {
    if (passcode.length === 6) {
      handlePasscodeLogin();
    }
  }, [passcode]);

  function handlePadPress(digit: string) {
    if (passcode.length < 6) {
      setPasscode((prev) => prev + digit);
    }
  }

  function handlePadDelete() {
    setPasscode((prev) => prev.slice(0, -1));
    setError("");
  }

  if (!_hasHydrated || profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-primary">JyGS</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">JyGS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Smart Store Management
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-xl border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => { setMode("passcode"); setError(""); setPasscode(""); }}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
              mode === "passcode"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <KeyRound className="size-4" />
              Passcode
            </span>
          </button>
          <button
            type="button"
            onClick={() => { setMode("credentials"); setError(""); }}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
              mode === "credentials"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <Mail className="size-4" />
              Email
            </span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {/* Credential Login */}
        {mode === "credentials" && (
          <form onSubmit={handleCredentialLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="pl-9"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        )}

        {/* Passcode Login */}
        {mode === "passcode" && (
          <div className="space-y-6">
            <p className="text-center text-sm text-muted-foreground">
              Enter your 6-digit passcode
            </p>

            {/* Passcode dots */}
            <div className="flex justify-center gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "size-4 rounded-full border-2 transition-all",
                    i < passcode.length
                      ? "bg-primary border-primary scale-110"
                      : "border-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            {/* Hidden input for accessibility */}
            <input
              ref={passcodeInputRef}
              type="text"
              inputMode="numeric"
              className="sr-only"
              value={passcode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPasscode(val);
                setError("");
              }}
              autoFocus
            />

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-2 mx-auto max-w-[240px]">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
                (key) => {
                  if (key === "") return <div key="empty" />;
                  if (key === "del") {
                    return (
                      <button
                        key="del"
                        type="button"
                        onClick={handlePadDelete}
                        className="flex items-center justify-center h-14 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <Delete className="size-5" />
                      </button>
                    );
                  }
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePadPress(key)}
                      disabled={loading}
                      className="flex items-center justify-center h-14 rounded-xl text-lg font-semibold hover:bg-muted active:bg-muted/80 transition-colors"
                    >
                      {key}
                    </button>
                  );
                }
              )}
            </div>

            {loading && (
              <p className="text-center text-sm text-muted-foreground">
                Verifying...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
