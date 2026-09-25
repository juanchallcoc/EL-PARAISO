export function money(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return `Bs ${v.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function todayRangeISO(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

export const paymentLabels: Record<string, string> = {
  cash: "Efectivo",
  qr: "QR",
  transfer: "Transferencia",
};

export const roleLabels: Record<string, string> = {
  admin: "Administrador",
  staff: "Staff",
  client: "Cliente",
};

/** Resume en texto qué contiene una venta: casilleros, entrada, productos y/o alquiler */
export function describeSale(sale: {
  sale_lockers?: { id: string }[];
  sale_items?: { product_type: string; quantity: number }[];
}): string {
  const parts: string[] = [];
  const lockerCount = sale.sale_lockers?.length ?? 0;
  if (lockerCount > 0) parts.push(`${lockerCount} casillero${lockerCount > 1 ? "s" : ""}`);
  const items = sale.sale_items ?? [];
  if (items.some((i) => i.product_type === "service")) parts.push("entrada");
  const consumableQty = items.filter((i) => i.product_type === "consumable").reduce((s, i) => s + i.quantity, 0);
  if (consumableQty > 0) parts.push(`${consumableQty} producto${consumableQty > 1 ? "s" : ""}`);
  const rentalQty = items.filter((i) => i.product_type === "rental").length;
  if (rentalQty > 0) parts.push(`${rentalQty} alquiler${rentalQty > 1 ? "es" : ""}`);
  return parts.length > 0 ? parts.join(" + ") : "—";
}
