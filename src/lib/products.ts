import { supabase } from "./supabaseClient";
import type { Product, ProductWithAvailability } from "../types/database";

/**
 * Trae los productos activos y calcula su disponibilidad real:
 * - consumable: lo que queda en stock_quantity.
 * - rental: stock_quantity menos las unidades actualmente rentadas
 *   (líneas de sale_items de tipo rental que todavía no fueron devueltas).
 */
export async function fetchProductsWithAvailability(): Promise<ProductWithAvailability[]> {
  const [{ data: products }, { data: activeRentals }] = await Promise.all([
    supabase.from("products").select("*").eq("active", true).order("name"),
    supabase.from("sale_items").select("product_id").eq("product_type", "rental").is("returned_at", null),
  ]);

  const rentalCounts = new Map<string, number>();
  (activeRentals ?? []).forEach((row: any) => {
    rentalCounts.set(row.product_id, (rentalCounts.get(row.product_id) ?? 0) + 1);
  });

  return ((products as Product[]) ?? []).map((p) => {
    const activeRentalsForProduct = rentalCounts.get(p.id) ?? 0;
    const available = p.type === "rental" ? p.stock_quantity - activeRentalsForProduct : p.stock_quantity;
    return {
      ...p,
      activeRentals: activeRentalsForProduct,
      available,
      lowStock: available <= p.low_stock_threshold,
    };
  });
}
