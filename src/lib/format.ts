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
