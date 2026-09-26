import jsPDF from "jspdf";
import type { Sale, BusinessSettings, CashRegister, CashMovement } from "../types/database";
import { money, formatDate, formatTime, paymentLabels } from "./format";
import { loadImageAsDataUrl } from "./image";

/* =====================================================================
   Constructor sencillo de recibo térmico: uno arma el contenido línea
   por línea (sin conocer todavía el alto final de la página) y al
   terminar sabemos exactamente cuánto papel se necesita — así el PDF
   no queda con espacio en blanco de más, ideal para rollo térmico.
===================================================================== */
const PAGE_WIDTH = 80; // mm — ancho estándar de impresora térmica
const MARGIN_X = 4;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

type ReceiptOp =
  | { type: "text"; text: string; y: number; size: number; bold: boolean; align: "left" | "center" | "right" }
  | { type: "row"; label: string; value: string; y: number; size: number; bold: boolean }
  | { type: "hr"; y: number }
  | { type: "image"; dataUrl: string; format: "PNG" | "JPEG"; y: number; w: number; h: number };

function createReceiptBuilder() {
  let y = 5;
  const ops: ReceiptOp[] = [];

  function lineHeight(size: number) {
    return size * 0.42 + 1.6;
  }

  function wrapByChars(text: string, maxChars: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  return {
    image(dataUrl: string, format: "PNG" | "JPEG", wmm: number, hmm: number) {
      ops.push({ type: "image", dataUrl, format, y, w: wmm, h: hmm });
      y += hmm + 2;
    },
    text(text: string, opts: { size?: number; bold?: boolean; align?: "left" | "center" | "right" } = {}) {
      const size = opts.size ?? 9;
      ops.push({ type: "text", text, y, size, bold: opts.bold ?? false, align: opts.align ?? "left" });
      y += lineHeight(size);
    },
    row(label: string, value: string, opts: { size?: number; bold?: boolean } = {}) {
      const size = opts.size ?? 9;
      const bold = opts.bold ?? false;
      const charWidth = size * 0.185;
      const maxChars = Math.floor(CONTENT_WIDTH / charWidth);
      const lines = wrapByChars(label, maxChars);
      lines.forEach((line, i) => {
        const isLast = i === lines.length - 1;
        if (isLast) {
          ops.push({ type: "row", label: line, value, y, size, bold });
        } else {
          ops.push({ type: "text", text: line, y, size, bold, align: "left" });
        }
        y += lineHeight(size);
      });
    },
    hr() {
      ops.push({ type: "hr", y });
      y += 3;
    },
    space(h = 2) {
      y += h;
    },
    heightSoFar() {
      return y;
    },
    build() {
      return { ops, height: y };
    },
  };
}

function renderReceipt(doc: jsPDF, ops: ReceiptOp[]) {
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  ops.forEach((op) => {
    if (op.type === "image") {
      doc.addImage(op.dataUrl, op.format, (PAGE_WIDTH - op.w) / 2, op.y, op.w, op.h);
    } else if (op.type === "hr") {
      doc.setLineWidth(0.15);
      doc.line(MARGIN_X, op.y, PAGE_WIDTH - MARGIN_X, op.y);
    } else if (op.type === "text") {
      doc.setFontSize(op.size);
      doc.setFont("helvetica", op.bold ? "bold" : "normal");
      const x = op.align === "center" ? PAGE_WIDTH / 2 : op.align === "right" ? PAGE_WIDTH - MARGIN_X : MARGIN_X;
      doc.text(op.text, x, op.y, { align: op.align });
    } else if (op.type === "row") {
      doc.setFontSize(op.size);
      doc.setFont("helvetica", op.bold ? "bold" : "normal");
      doc.text(op.label, MARGIN_X, op.y);
      doc.text(op.value, PAGE_WIDTH - MARGIN_X, op.y, { align: "right" });
    }
  });
}

/** Abre de inmediato una pestaña en blanco (para no chocar con el
 * bloqueador de ventanas emergentes del navegador, ya que el PDF se
 * termina de armar un instante después, de forma asíncrona por el
 * logo). Se debe llamar ANTES de generar el PDF, en el mismo clic del
 * usuario. */
export function openPdfPlaceholder(): Window | null {
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(
      "<title>Generando comprobante…</title><body style='font-family:sans-serif;padding:24px;color:#123B3E'>Generando comprobante…</body>"
    );
  }
  return win;
}

/** Muestra el PDF ya generado: en la pestaña que se abrió de antemano
 * (targetWindow) si existe, o en una nueva si no. */
function openInViewer(doc: jsPDF, targetWindow?: Window | null) {
  const blobUrl = doc.output("bloburl") as unknown as string;
  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = blobUrl;
  } else {
    window.open(blobUrl, "_blank");
  }
}

async function drawBusinessHeader(builder: ReturnType<typeof createReceiptBuilder>, settings: BusinessSettings) {
  if (settings.logo_url) {
    const image = await loadImageAsDataUrl(settings.logo_url);
    if (image) {
      builder.image(image.dataUrl, image.format, 20, 20);
    }
  }
  builder.text(settings.business_name || "El Paraíso", { size: 13, bold: true, align: "center" });
  const contact = [settings.address, settings.phone].filter(Boolean).join(" · ");
  if (contact) builder.text(contact, { size: 7.5, align: "center" });
  if (settings.email) builder.text(settings.email, { size: 7.5, align: "center" });
  builder.space(2);
  builder.hr();
  builder.space(1);
}

export async function generateSaleReceiptPDF(
  sale: Sale,
  settings: BusinessSettings,
  sellerName: string,
  targetWindow?: Window | null
) {
  const b = createReceiptBuilder();

  await drawBusinessHeader(b, settings);

  b.text(`Venta #${sale.sale_number}`, { size: 11, bold: true, align: "center" });
  b.space(1);
  b.row("Fecha", `${formatDate(sale.created_at)} ${formatTime(sale.created_at)}`);
  b.row("Cliente", sale.customer?.full_name ?? "—");
  b.row("CI / doc.", sale.customer?.document_number ?? "—");
  b.row("Atendido por", sellerName);
  b.space(1);
  b.hr();
  b.space(1);

  const lockers = sale.sale_lockers ?? [];
  if (lockers.length > 0) {
    const codes = lockers.map((sl) => sl.locker?.code).filter(Boolean).join(", ");
    const lockerTotal = lockers.reduce((s, sl) => s + Number(sl.unit_price), 0);
    b.row(`Casillero(s): ${codes}`, money(lockerTotal));
  }
  (sale.sale_items ?? []).forEach((item) => {
    const label = item.quantity > 1 ? `${item.product_name} x${item.quantity}` : item.product_name;
    b.row(label, money(item.line_total));
  });

  b.space(1);
  b.hr();
  b.space(1);
  b.row("Subtotal", money(sale.subtotal));
  b.row(`Descuento (${sale.discount_percentage}%)`, "-" + money(sale.discount_amount));
  b.row("Método de pago", paymentLabels[sale.payment_method]);
  b.space(1);
  b.hr();
  b.space(1);
  b.row("TOTAL", money(sale.total), { size: 12, bold: true });
  b.space(3);
  b.text("Gracias por su visita", { size: 8, align: "center" });
  b.space(6);

  const { ops, height } = b.build();
  const doc = new jsPDF({ unit: "mm", format: [PAGE_WIDTH, height + 4] });
  renderReceipt(doc, ops);
  openInViewer(doc, targetWindow);
}

export interface CashCloseCategoryTotals {
  lockers: number;
  consumables: number;
  rentals: number;
  noLockerFee: number;
}

export async function generateCashClosePDF(
  register: CashRegister,
  movements: CashMovement[],
  settings: BusinessSettings,
  openerName: string,
  closerName: string,
  categoryTotals?: CashCloseCategoryTotals,
  targetWindow?: Window | null
) {
  const b = createReceiptBuilder();

  await drawBusinessHeader(b, settings);

  b.text("Cierre de caja", { size: 11, bold: true, align: "center" });
  b.space(1);
  b.row("Apertura", `${formatDate(register.opened_at)} ${formatTime(register.opened_at)}`);
  b.row("Abrió", openerName);
  b.row("Cierre", register.closed_at ? `${formatDate(register.closed_at)} ${formatTime(register.closed_at)}` : "—");
  b.row("Cerró", closerName);
  b.space(1);
  b.hr();
  b.space(1);

  if (categoryTotals) {
    b.text("Ventas por categoría", { size: 9.5, bold: true });
    b.row("Casilleros", money(categoryTotals.lockers));
    b.row("Entrada sin casillero", money(categoryTotals.noLockerFee));
    b.row("Productos", money(categoryTotals.consumables));
    b.row("Alquiler", money(categoryTotals.rentals));
    b.space(1);
    b.hr();
    b.space(1);
  }

  b.text("Resumen de caja", { size: 9.5, bold: true });
  b.row("Fondo inicial", money(register.opening_amount));
  b.row("Ventas en efectivo", money(register.total_cash));
  b.row("Ventas por QR", money(register.total_qr));
  b.row("Ventas por transferencia", money(register.total_transfer));
  b.row("Otros ingresos", money(register.total_other_income));
  b.row("Total egresos", "-" + money(register.total_expenses));
  b.space(1);
  b.hr();
  b.space(1);
  b.row("Efectivo esperado en caja", money(register.closing_balance), { bold: true });

  if (register.counted_cash_amount !== null && register.counted_cash_amount !== undefined) {
    b.row("Efectivo contado", money(register.counted_cash_amount));
    const diff = Number(register.cash_difference ?? 0);
    const diffLabel = diff === 0 ? "Diferencia" : diff > 0 ? "Sobrante" : "Faltante";
    b.row(diffLabel, money(Math.abs(diff)), { bold: true });
  }

  if (register.notes) {
    b.space(1);
    b.hr();
    b.space(1);
    b.text("Observaciones:", { size: 8.5, bold: true });
    b.text(register.notes, { size: 8.5 });
  }

  if (movements.length) {
    b.space(1);
    b.hr();
    b.space(1);
    b.text("Movimientos manuales", { size: 9.5, bold: true });
    movements.forEach((m) => {
      const sign = m.type === "income" ? "+" : "-";
      b.row(`${formatTime(m.created_at)} ${m.concept}`, `${sign}${money(m.amount)}`, { size: 8 });
    });
  }

  b.space(6);

  const { ops, height } = b.build();
  const doc = new jsPDF({ unit: "mm", format: [PAGE_WIDTH, height + 4] });
  renderReceipt(doc, ops);
  openInViewer(doc, targetWindow);
}
