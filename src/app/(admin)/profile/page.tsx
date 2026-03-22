"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Lock, KeyRound, Pencil, Check } from "lucide-react";

import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const roleLabelMap: Record<string, string> = {
  super_admin: "Super Admin",
  shop_admin: "Shop Admin",
  employee: "Employee",
};

export default function ProfilePage() {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();
  const supabase = createClient();

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.name ?? "");
  const [editMobile, setEditMobile] = useState(profile?.mobile ?? "");
  const [editEmail, setEditEmail] = useState(profile?.email ?? "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Change Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Change Passcode state
  const [newPasscode, setNewPasscode] = useState("");
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const [passcodeMsg, setPasscodeMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleStartEdit = () => {
    setEditName(profile?.name ?? "");
    setEditMobile(profile?.mobile ?? "");
    setEditEmail(profile?.email ?? "");
    setProfileMsg(null);
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    setProfileMsg(null);
    if (!editName.trim()) {
      setProfileMsg({ type: "error", text: "Name is required." });
      return;
    }
    if (!editMobile.trim()) {
      setProfileMsg({ type: "error", text: "Mobile is required." });
      return;
    }

    setProfileLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: editName.trim(),
        mobile: editMobile.trim(),
        email: editEmail.trim() || null,
      })
      .eq("id", profile!.id);

    if (error) {
      setProfileMsg({ type: "error", text: error.message });
    } else {
      setProfile({
        ...profile!,
        name: editName.trim(),
        mobile: editMobile.trim(),
        email: editEmail.trim() || null,
      });
      setProfileMsg({ type: "success", text: "Profile updated." });
      setEditing(false);
    }
    setProfileLoading(false);
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);

    if (!newPassword || !confirmPassword) {
      setPasswordMsg({ type: "error", text: "All fields are required." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({
        type: "error",
        text: "New password must be at least 6 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMsg({ type: "error", text: error.message });
    } else {
      setPasswordMsg({ type: "success", text: "Password changed successfully." });
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  };

  const handleChangePasscode = async () => {
    setPasscodeMsg(null);

    if (!newPasscode) {
      setPasscodeMsg({ type: "error", text: "Passcode is required." });
      return;
    }
    if (!/^\d{6}$/.test(newPasscode)) {
      setPasscodeMsg({
        type: "error",
        text: "Passcode must be exactly 6 digits.",
      });
      return;
    }

    setPasscodeLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ passcode: newPasscode, has_passcode: true })
      .eq("id", profile!.id);

    if (error) {
      setPasscodeMsg({ type: "error", text: error.message });
    } else {
      setPasscodeMsg({ type: "success", text: "Passcode changed successfully." });
      setNewPasscode("");
    }
    setPasscodeLoading(false);
  };

  if (!profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Not logged in.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft data-icon="inline-start" />
        Back
      </Button>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-5" />
              </div>
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </div>
            </div>
            {!editing && (
              <Button variant="ghost" size="icon-sm" onClick={handleStartEdit}>
                <Pencil className="size-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-mobile">Mobile *</Label>
                <Input
                  id="edit-mobile"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  placeholder="Mobile number"
                  inputMode="tel"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Email address"
                />
              </div>
              <InfoRow label="Username" value={profile.username} />
              <InfoRow label="Role" value={roleLabelMap[profile.role] || profile.role} />

              {profileMsg && (
                <p
                  className={
                    profileMsg.type === "error"
                      ? "text-xs text-destructive"
                      : "text-xs text-emerald-600 dark:text-emerald-400"
                  }
                >
                  {profileMsg.text}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditing(false); setProfileMsg(null); }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={profileLoading}>
                  <Check className="size-4" data-icon="inline-start" />
                  {profileLoading ? "Saving..." : "Save"}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <InfoRow label="Name" value={profile.name} />
              <InfoRow label="Username" value={profile.username} />
              <InfoRow label="Mobile" value={profile.mobile} />
              <InfoRow label="Email" value={profile.email || "—"} />
              <InfoRow label="Role" value={roleLabelMap[profile.role] || profile.role} />
              {profileMsg && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {profileMsg.text}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="size-5" />
            </div>
            <div>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {passwordMsg && (
            <p
              className={
                passwordMsg.type === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-emerald-600 dark:text-emerald-400"
              }
            >
              {passwordMsg.text}
            </p>
          )}

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Passcode Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="size-5" />
            </div>
            <div>
              <CardTitle>Change Passcode</CardTitle>
              <CardDescription>
                Update your 6-digit passcode
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-passcode">New Passcode</Label>
            <Input
              id="new-passcode"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit passcode"
              value={newPasscode}
              onChange={(e) =>
                setNewPasscode(e.target.value.replace(/\D/g, ""))
              }
            />
          </div>

          {passcodeMsg && (
            <p
              className={
                passcodeMsg.type === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-emerald-600 dark:text-emerald-400"
              }
            >
              {passcodeMsg.text}
            </p>
          )}

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleChangePasscode} disabled={passcodeLoading}>
              {passcodeLoading ? "Updating..." : "Update Passcode"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
