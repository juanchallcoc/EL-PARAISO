import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { money, formatTime, paymentLabels } from "../lib/format";
import type { PaymentMethod, Sale } from "../types/database";

function todayDateInputValue() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function SalesPage() {
  const [date, setDate] = useState(todayDateInputValue());
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | "all">("all");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const from = new Date(date + "T00:00:00").toISOString();
      const to = new Date(date + "T23:59:59").toISOString();
      let query = supabase
        .from("sales")
        .select("*, customer:customers(full_name, document_number), seller:profiles(full_name), sale_lockers(locker:lockers(code))")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false });
      if (paymentFilter !== "all") query = query.eq("payment_method", paymentFilter);
      const { data } = await query;
      setSales((data as Sale[]) ?? []);
      setLoading(false);
    }
    load();
  }, [date, paymentFilter]);

  const total = sales.reduce((s, sale) => s + Number(sale.total), 0);
  const totalCash = sales.filter((s) => s.payment_method === "cash").reduce((s, sale) => s + Number(sale.total), 0);
  const totalQr = sales.filter((s) => s.payment_method === "qr").reduce((s, sale) => s + Number(sale.total), 0);
  const totalTransfer = sales.filter((s) => s.payment_method === "transfer").reduce((s, sale) => s + Number(sale.total), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <h2 className="display" style={{ margin: 0, fontSize: 22 }}>
          Ventas
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 160 }} />
          <select className="input" style={{ width: 160 }} value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as any)}>
            <option value="all">Todos los métodos</option>
            <option value="cash">Efectivo</option>
            <option value="qr">QR</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
      </div>

      <div className="card stats-row" style={{ display: "flex", gap: 32, marginBottom: 16, flexWrap: "wrap" }}>
        <Stat label="Total del día" value={money(total)} />
        <Stat label="Efectivo" value={money(totalCash)} />
        <Stat label="QR" value={money(totalQr)} />
        <Stat label="Transferencia" value={money(totalTransfer)} />
        <Stat label="N° de ventas" value={String(sales.length)} />
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : sales.length === 0 ? (
          <p style={{ padding: 24, color: "var(--text-muted)", margin: 0 }}>No hay ventas registradas para este filtro.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Cant.</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Vendedor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>#{s.sale_number}</td>
                  <td>{formatTime(s.created_at)}</td>
                  <td>{s.customer?.full_name ?? "—"}</td>
                  <td>{s.sale_type === "locker" ? "Casillero" : "Sin casillero"}</td>
                  <td>{s.quantity}</td>
                  <td style={{ fontWeight: 600 }}>{money(s.total)}</td>
                  <td>{paymentLabels[s.payment_method]}</td>
                  <td>{s.seller?.full_name ?? "—"}</td>
                  <td>
                    <Link to={`/ventas/${s.id}`} className="btn-ghost" style={{ color: "var(--available)", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                      <FileText size={14} /> PDF
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{label}</p>
      <p className="display" style={{ fontSize: 18, margin: 0 }}>
        {value}
      </p>
    </div>
  );
}
