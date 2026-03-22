"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useStoresStore } from "@/stores/stores-store";
import { STORE_TYPES } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, Phone, Mail, User, Store, UserCog, ArrowRight, Pencil } from "lucide-react";
import Link from "next/link";

export default function StoreInfoPage() {
  const { currentStore, setCurrentStore } = useAuthStore();
  const { updateStore } = useStoresStore();
  const [editOpen, setEditOpen] = useState(false);

  // Edit form state
  const [shopname, setShopname] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");

  if (!currentStore) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24 sm:pb-4">
        <PageHeader title="Store Info" backHref="/store" />
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No store selected.
        </div>
      </div>
    );
  }

  const admin = currentStore.admin;

  function openEdit() {
    setShopname(currentStore!.shopname);
    setLocation(currentStore!.location);
    setType(currentStore!.type);
    setEditOpen(true);
  }

  function handleSave() {
    if (!currentStore || !shopname.trim() || !location.trim() || !type) return;

    const updated = {
      shopname: shopname.trim(),
      location: location.trim(),
      type,
    };

    updateStore(currentStore.id, updated);
    setCurrentStore({ ...currentStore, ...updated });
    setEditOpen(false);
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 sm:pb-4">
      <PageHeader title="Store Info" backHref="/store">
        <Button size="sm" onClick={openEdit}>
          <Pencil className="size-4" data-icon="inline-start" />
          Edit
        </Button>
      </PageHeader>

      {/* Store Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="size-4" />
            Store Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-start gap-3">
            <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">
              Shop Name
            </span>
            <span className="text-sm">{currentStore.shopname}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">
              Type
            </span>
            <span className="text-sm">{currentStore.type}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3" />
                Location
              </span>
            </span>
            <span className="text-sm">{currentStore.location}</span>
          </div>
          {admin && (
            <div className="flex items-start gap-3">
              <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">
                Admin
              </span>
              <span className="text-sm">{admin.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Contact */}
      {admin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Admin Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-start gap-3">
              <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">
                Name
              </span>
              <span className="text-sm">{admin.name}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3" />
                  Mobile
                </span>
              </span>
              <span className="text-sm">{admin.mobile}</span>
            </div>
            {admin.email && (
              <div className="flex items-start gap-3">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3" />
                    Email
                  </span>
                </span>
                <span className="text-sm">{admin.email}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Staff link */}
      <Button
        variant="outline"
        className="w-full justify-between"
        render={<Link href="/store/employees" />}
      >
        <span className="flex items-center gap-2">
          <UserCog className="size-4" />
          Manage Staff
        </span>
        <ArrowRight className="size-4" />
      </Button>

      {/* Edit Store Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Store Details</DialogTitle>
            <DialogDescription>
              Update your store information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-shopname">Shop Name</Label>
              <Input
                id="edit-shopname"
                value={shopname}
                onChange={(e) => setShopname(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-location">Location</Label>
              <Textarea
                id="edit-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(val) => val && setType(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {STORE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!shopname.trim() || !location.trim() || !type}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
