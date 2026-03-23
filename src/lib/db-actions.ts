"use server";

import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type Result<T = null> = { success: true; data: T } | { success: false; error: string };

// ── Stores ──

export async function dbInsertStore(row: Record<string, unknown>): Promise<Result<Record<string, unknown>>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("stores").insert(row).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Record<string, unknown> };
}

export async function dbUpdateStore(id: string, row: Record<string, unknown>): Promise<Result<Record<string, unknown>>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("stores").update(row).eq("id", id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Record<string, unknown> };
}

export async function dbDeleteStore(id: string): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("stores").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

// ── Profiles ──

export async function dbUpdateProfile(id: string, row: Record<string, unknown>): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("profiles").update(row).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

export async function dbDeleteProfile(id: string): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("profiles").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

// ── Products ──

export async function dbInsertProduct(row: Record<string, unknown>): Promise<Result<Record<string, unknown>>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("products").insert(row).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Record<string, unknown> };
}

export async function dbUpdateProduct(id: string, row: Record<string, unknown>): Promise<Result<Record<string, unknown>>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("products").update(row).eq("id", id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Record<string, unknown> };
}

export async function dbDeleteProduct(id: string): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

export async function dbUpdateProductStock(id: string, newStock: number): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("products").update({ stock: newStock }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

export async function dbGetProductStock(id: string): Promise<Result<number>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("products").select("stock").eq("id", id).single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data as Record<string, unknown>).stock as number };
}

// ── Customers ──

export async function dbInsertCustomer(row: Record<string, unknown>): Promise<Result<Record<string, unknown>>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("customers").insert(row).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Record<string, unknown> };
}

export async function dbUpdateCustomer(id: string, row: Record<string, unknown>): Promise<Result<Record<string, unknown>>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("customers").update(row).eq("id", id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Record<string, unknown> };
}

export async function dbDeleteCustomer(id: string): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("customers").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

// ── Receipts ──

export async function dbInsertReceipt(row: Record<string, unknown>): Promise<Result<Record<string, unknown>>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("receipts").insert(row).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Record<string, unknown> };
}

export async function dbInsertReceiptItems(rows: Record<string, unknown>[]): Promise<Result<Record<string, unknown>[]>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("receipt_items").insert(rows).select();
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data || []) as Record<string, unknown>[] };
}

export async function dbUpdateReceipt(id: string, row: Record<string, unknown>): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("receipts").update(row).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

export async function dbDeleteReceipt(id: string): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("receipts").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

// ── Roles ──

export async function dbInsertRole(row: Record<string, unknown>): Promise<Result<Record<string, unknown>>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("roles").insert(row).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Record<string, unknown> };
}

export async function dbUpdateRole(id: string, row: Record<string, unknown>): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("roles").update(row).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

export async function dbDeleteRole(id: string): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("roles").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

// ── Permissions ──

export async function dbInsertPermissions(rows: Record<string, unknown>[]): Promise<Result<Record<string, unknown>[]>> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("permissions").insert(rows).select();
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data || []) as Record<string, unknown>[] };
}

export async function dbUpdatePermission(id: string, row: Record<string, unknown>): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("permissions").update(row).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

export async function dbDeletePermissionsByRole(roleId: string): Promise<Result> {
  const sb = createAdminClient();
  const { error } = await sb.from("permissions").delete().eq("role_id", roleId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}
