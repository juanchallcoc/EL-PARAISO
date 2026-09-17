import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAppData } from "../hooks/useAppData";
import { generateSaleReceiptPDF } from "../lib/pdf";
import { money, formatDateTime, paymentLabels } from "../lib/format";
import type { Sale } from "../types/database";

export default function SaleReceiptPage() {
  const { id } = useParams();
  const { settings } = useAppData();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("sales")
        .select("*, customer:customers(full_name, document_number), seller:profiles(full_name), sale_lockers(locker:lockers(code))")
        .eq("id", id)
        .single();
      setSale(data as Sale | null);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!sale) {
    return <div className="card">No se encontró la venta.</div>;
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <Link to="/ventas" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, color: "var(--text-muted)" }}>
        <ArrowLeft size={16} /> Volver a ventas
      </Link>

      <div className="card">
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h2 className="display" style={{ margin: 0, fontSize: 20 }}>
            {settings?.business_name ?? "El Paraíso"}
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {[settings?.address, settings?.phone].filter(Boolean).join(" · ")}
          </p>
        </div>

        <div style={{ borderTop: "1px dashed var(--border)", borderBottom: "1px dashed var(--border)", padding: "12px 0", marginBottom: 12 }}>
          <Row label="N° de venta" value={`#${sale.sale_number}`} />
          <Row label="Fecha" value={formatDateTime(sale.created_at)} />
          <Row label="Cliente" value={sale.customer?.full_name ?? "—"} />
          <Row label="CI / documento" value={sale.customer?.document_number ?? "—"} />
          <Row label="Atendido por" value={sale.seller?.full_name ?? "—"} />
          {sale.sale_type === "locker" && sale.sale_lockers && sale.sale_lockers.length > 0 && (
            <Row label="Casilleros" value={sale.sale_lockers.map((sl) => sl.locker?.code).join(", ")} />
          )}
        </div>

        <Row label="Cantidad" value={String(sale.quantity)} />
        <Row label="Precio unitario" value={money(sale.unit_price)} />
        <Row label="Subtotal" value={money(sale.subtotal)} />
        <Row label={`Descuento (${sale.discount_percentage}%)`} value={"- " + money(sale.discount_amount)} />
        <Row label="Método de pago" value={paymentLabels[sale.payment_method]} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 700, borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 10, color: "var(--occupied)" }}>
          <span>Total</span>
          <span>{money(sale.total)}</span>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 20 }}
          onClick={() => settings && generateSaleReceiptPDF(sale, settings, sale.seller?.full_name ?? "—")}
        >
          <Download size={16} /> Descargar comprobante PDF
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
