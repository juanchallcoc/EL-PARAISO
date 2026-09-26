import { supabase } from "./supabaseClient";
import type { Sale } from "../types/database";

export interface CreateSaleInput {
  customerId: string;
  cashRegisterId: string;
  discountPercentage: number;
  paymentMethod: "cash" | "qr" | "transfer";
  lockerIds: string[];
  noLockerQuantity: number;
  productLines: { productId: string; quantity: number }[];
}

/**
 * Registra una venta completa (casilleros + entrada sin casillero +
 * productos) en una sola operación atómica en la base de datos.
 * Si algo falla (casillero ya ocupado, stock insuficiente, etc.) no se
 * guarda nada a medias: la función SQL hace todo o nada.
 */
export async function createSale(input: CreateSaleInput): Promise<{ id: string; sale_number: number }> {
  const { data, error } = await supabase.rpc("create_sale", {
    p_customer_id: input.customerId,
    p_cash_register_id: input.cashRegisterId,
    p_discount_percentage: input.discountPercentage,
    p_payment_method: input.paymentMethod,
    p_locker_ids: input.lockerIds,
    p_no_locker_quantity: input.noLockerQuantity,
    p_product_lines: input.productLines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.sale_id, sale_number: row.sale_number };
}

/** Trae una venta completa (con casilleros y productos) lista para mostrar o generar el PDF */
export async function fetchFullSale(saleId: string): Promise<Sale | null> {
  const { data } = await supabase
    .from("sales")
    .select(
      "*, customer:customers(full_name, document_number), seller:profiles(full_name), sale_lockers(*, locker:lockers(code)), sale_items(*)"
    )
    .eq("id", saleId)
    .single();
  return (data as Sale) ?? null;
}
