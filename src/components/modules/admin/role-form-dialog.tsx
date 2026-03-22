"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Role, Permission } from "@/types";
import { MODULES } from "@/types";
import { useRolesStore } from "@/stores/roles-store";
import { useStoresStore } from "@/stores/stores-store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Schema ──

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required").max(50),
  storeScope: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

// ── Permission state type ──

type PermissionMatrix = Record<
  string,
  { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }
>;

// ── Props ──

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRole?: Role | null;
}

const ACTION_LABELS = [
  { key: "canCreate" as const, label: "C" },
  { key: "canRead" as const, label: "R" },
  { key: "canUpdate" as const, label: "U" },
  { key: "canDelete" as const, label: "D" },
];

function buildDefaultMatrix(): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const mod of MODULES) {
    matrix[mod] = { canCreate: false, canRead: false, canUpdate: false, canDelete: false };
  }
  return matrix;
}

function buildMatrixFromRole(role: Role): PermissionMatrix {
  const matrix = buildDefaultMatrix();
  for (const perm of role.permissions) {
    matrix[perm.module] = {
      canCreate: perm.canCreate,
      canRead: perm.canRead,
      canUpdate: perm.canUpdate,
      canDelete: perm.canDelete,
    };
  }
  return matrix;
}

export function RoleFormDialog({ open, onOpenChange, editingRole }: RoleFormDialogProps) {
  const { addRole, updateRole } = useRolesStore();
  const { stores } = useStoresStore();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<RoleFormValues & { permissionMatrix: PermissionMatrix }>({
    resolver: zodResolver(roleFormSchema) as any,
    defaultValues: {
      name: "",
      storeScope: "__global__",
      permissionMatrix: buildDefaultMatrix(),
    },
  });

  const permissionMatrix = watch("permissionMatrix");
  const storeScope = watch("storeScope");

  useEffect(() => {
    if (open) {
      if (editingRole) {
        reset({
          name: editingRole.name,
          storeScope: editingRole.storeId ?? "__global__",
          permissionMatrix: buildMatrixFromRole(editingRole),
        });
      } else {
        reset({
          name: "",
          storeScope: "__global__",
          permissionMatrix: buildDefaultMatrix(),
        });
      }
    }
  }, [open, editingRole, reset]);

  function togglePerm(module: string, action: keyof PermissionMatrix[string]) {
    const current = permissionMatrix[module];
    setValue(`permissionMatrix.${module}`, {
      ...current,
      [action]: !current[action],
    });
  }

  async function onSubmit(data: RoleFormValues & { permissionMatrix: PermissionMatrix }) {
    const storeId = data.storeScope === "__global__" ? undefined : data.storeScope;

    const permissions: Permission[] = MODULES.map((mod, i) => {
      const mp = data.permissionMatrix[mod];
      return {
        id: editingRole ? (editingRole.permissions.find((p) => p.module === mod)?.id ?? `perm-${i}`) : `perm-${i}`,
        roleId: editingRole?.id ?? "",
        module: mod,
        canCreate: mp?.canCreate ?? false,
        canRead: mp?.canRead ?? false,
        canUpdate: mp?.canUpdate ?? false,
        canDelete: mp?.canDelete ?? false,
      };
    });

    if (editingRole) {
      await updateRole(editingRole.id, {
        name: data.name,
        storeId,
        permissions,
      });
    } else {
      await addRole({
        name: data.name,
        storeId,
        isSystem: false,
        permissions,
      });
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
          <DialogDescription>
            {editingRole
              ? "Update the role details and permissions."
              : "Define a new role with specific permissions for each module."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Role Name */}
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name"
              placeholder="e.g. Billing Staff"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Store Scope */}
          <div className="space-y-1.5">
            <Label>Store Scope</Label>
            <Select
              value={storeScope}
              onValueChange={(val) => setValue("storeScope", val ?? "__global__")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select scope">
                  {storeScope === "__global__"
                    ? "Global (All Stores)"
                    : stores.find((s) => s.id === storeScope)?.shopname ?? "Select scope"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__">Global (All Stores)</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.shopname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permissions Matrix */}
          <div className="space-y-2">
            <Label>Permissions</Label>

            {/* Desktop: table layout */}
            <div className="hidden sm:block rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Module</th>
                    {ACTION_LABELS.map((a) => (
                      <th key={a.key} className="px-3 py-2 text-center font-medium w-14">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod) => (
                    <tr key={mod} className="border-b last:border-b-0">
                      <td className="px-3 py-2 capitalize">{mod}</td>
                      {ACTION_LABELS.map((a) => (
                        <td key={a.key} className="px-3 py-2 text-center">
                          <Switch
                            size="sm"
                            checked={permissionMatrix[mod]?.[a.key] ?? false}
                            onCheckedChange={() => togglePerm(mod, a.key)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: card layout */}
            <div className="sm:hidden space-y-2">
              {MODULES.map((mod) => (
                <div
                  key={mod}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <p className="text-sm font-medium capitalize">{mod}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ACTION_LABELS.map((a) => (
                      <label
                        key={a.key}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs"
                      >
                        <span>
                          {a.key === "canCreate"
                            ? "Create"
                            : a.key === "canRead"
                            ? "Read"
                            : a.key === "canUpdate"
                            ? "Update"
                            : "Delete"}
                        </span>
                        <Switch
                          size="sm"
                          checked={permissionMatrix[mod]?.[a.key] ?? false}
                          onCheckedChange={() => togglePerm(mod, a.key)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingRole ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
