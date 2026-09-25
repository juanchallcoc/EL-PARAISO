import jsPDF from "jspdf";
import type { Sale, BusinessSettings, CashRegister, CashMovement } from "../types/database";
import { money, formatDate, formatTime, paymentLabels } from "./format";

function header(doc: jsPDF, settings: BusinessSettings, title: string) {
  doc.setFillColor(31, 166, 184);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(settings.business_name || "El Paraíso", 14, 14);
  doc.setFontSize(10);
  const contact = [settings.address, settings.phone, settings.email].filter(Boolean).join("  ·  ");
  if (contact) doc.text(contact, 14, 21);
  doc.setFontSize(13);
  doc.text(title, 196, 14, { align: "right" });
  doc.setTextColor(20, 30, 30);
}

export function generateSaleReceiptPDF(sale: Sale, settings: BusinessSettings, sellerName: string) {
  const doc = new jsPDF();
  header(doc, settings, `Venta #${sale.sale_number}`);

  let y = 40;
  doc.setFontSize(11);
  doc.text(`Fecha: ${formatDate(sale.created_at)}   Hora: ${formatTime(sale.created_at)}`, 14, y);
  y += 8;
  doc.text(`Cliente: ${sale.customer?.full_name ?? "—"}`, 14, y);
  y += 7;
  doc.text(`CI / Documento: ${sale.customer?.document_number ?? "—"}`, 14, y);
  y += 7;
  doc.text(`Atendido por: ${sellerName}`, 14, y);
  y += 10;

  doc.setDrawColor(220, 238, 240);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFontSize(11);
  doc.text("Detalle", 14, y);
  doc.text("Total", 196, y, { align: "right" });
  y += 6;
  doc.setDrawColor(220, 238, 240);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFontSize(10);
  const lockers = sale.sale_lockers ?? [];
  if (lockers.length > 0) {
    const codes = lockers.map((sl) => sl.locker?.code).filter(Boolean).join(", ");
    const lockerTotal = lockers.reduce((s, sl) => s + Number(sl.unit_price), 0);
    doc.text(`Casillero(s): ${codes}`, 14, y);
    doc.text(money(lockerTotal), 196, y, { align: "right" });
    y += 7;
  }

  (sale.sale_items ?? []).forEach((item) => {
    const label = item.quantity > 1 ? `${item.product_name} x${item.quantity}` : item.product_name;
    doc.text(label, 14, y);
    doc.text(money(item.line_total), 196, y, { align: "right" });
    y += 7;
  });

  y += 4;
  doc.setDrawColor(220, 238, 240);
  doc.line(14, y, 196, y);
  y += 8;

  const rows: [string, string][] = [
    ["Subtotal", money(sale.subtotal)],
    [`Descuento (${sale.discount_percentage}%)`, "- " + money(sale.discount_amount)],
    ["Método de pago", paymentLabels[sale.payment_method]],
  ];
  doc.setFontSize(10);
  rows.forEach(([label, value], i) => {
    const rowY = y + i * 8;
    doc.text(label, 14, rowY);
    doc.text(value, 196, rowY, { align: "right" });
  });

  y += rows.length * 8 + 6;
  doc.setDrawColor(220, 238, 240);
  doc.line(14, y, 196, y);
  y += 10;
  doc.setFontSize(16);
  doc.setTextColor(255, 122, 80);
  doc.text(`TOTAL: ${money(sale.total)}`, 196, y, { align: "right" });
  doc.setTextColor(20, 30, 30);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Comprobante generado por el sistema de gestión de El Paraíso.", 14, 285);

  doc.save(`venta-${sale.sale_number}.pdf`);
}

export interface CashCloseCategoryTotals {
  lockers: number;
  consumables: number;
  rentals: number;
  noLockerFee: number;
}

export function generateCashClosePDF(
  register: CashRegister,
  movements: CashMovement[],
  settings: BusinessSettings,
  openerName: string,
  closerName: string,
  categoryTotals?: CashCloseCategoryTotals
) {
  const doc = new jsPDF();
  header(doc, settings, "Cierre de caja");

  let y = 40;
  doc.setFontSize(11);
  doc.text(`Apertura: ${formatDate(register.opened_at)} ${formatTime(register.opened_at)} · ${openerName}`, 14, y);
  y += 7;
  doc.text(
    `Cierre: ${register.closed_at ? formatDate(register.closed_at) + " " + formatTime(register.closed_at) : "—"} · ${closerName}`,
    14,
    y
  );
  y += 12;

  doc.setDrawColor(220, 238, 240);
  doc.line(14, y, 196, y);
  y += 10;

  if (categoryTotals) {
    doc.setFontSize(12);
    doc.text("Ventas por categoría", 14, y);
    y += 8;
    doc.setFontSize(10);
    const catRows: [string, string][] = [
      ["Casilleros", money(categoryTotals.lockers)],
      ["Entrada sin casillero", money(categoryTotals.noLockerFee)],
      ["Productos", money(categoryTotals.consumables)],
      ["Alquiler", money(categoryTotals.rentals)],
    ];
    catRows.forEach(([label, value], i) => {
      const rowY = y + i * 8;
      doc.text(label, 14, rowY);
      doc.text(value, 196, rowY, { align: "right" });
    });
    y += catRows.length * 8 + 8;
    doc.setDrawColor(220, 238, 240);
    doc.line(14, y, 196, y);
    y += 10;
  }

  doc.setFontSize(12);
  doc.text("Resumen de caja", 14, y);
  y += 8;
  const rows: [string, string][] = [
    ["Monto inicial (fondo de caja)", money(register.opening_amount)],
    ["Ventas en efectivo", money(register.total_cash)],
    ["Ventas por QR", money(register.total_qr)],
    ["Ventas por transferencia", money(register.total_transfer)],
    ["Otros ingresos", money(register.total_other_income)],
    ["Total egresos", "- " + money(register.total_expenses)],
    ["Saldo final calculado", money(register.closing_balance)],
  ];
  doc.setFontSize(10);
  rows.forEach(([label, value], i) => {
    const rowY = y + i * 8;
    doc.text(label, 14, rowY);
    doc.text(value, 196, rowY, { align: "right" });
  });
  y += rows.length * 8 + 8;

  if (movements.length) {
    doc.setDrawColor(220, 238, 240);
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFontSize(12);
    doc.text("Movimientos manuales", 14, y);
    y += 8;
    doc.setFontSize(9);
    movements.forEach((m) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      const sign = m.type === "income" ? "+" : "-";
      doc.text(`${formatTime(m.created_at)}  ${m.concept}`, 14, y);
      doc.text(`${sign} ${money(m.amount)}`, 196, y, { align: "right" });
      y += 6;
    });
  }

  doc.save(`cierre-caja-${register.id.slice(0, 8)}.pdf`);
}
