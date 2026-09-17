import { useEffect, useState } from "react";
import { Download, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAppData } from "../hooks/useAppData";
import { money, formatDateTime } from "../lib/format";
import { generateCashClosePDF } from "../lib/pdf";
import type { CashRegister, CashMovement } from "../types/database";

export default function CashHistoryPage() {
  const { settings } = useAppData();
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("cash_registers")
      .select("*, opener:opened_by(full_name), closer:closed_by(full_name)")
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .then(({ data }) => {
        setRegisters((data as CashRegister[]) ?? []);
        setLoading(false);
      });
  }, []);

  async function handleDownload(r: CashRegister) {
    if (!settings) return;
    const { data: movements } = await supabase
      .from("cash_movements")
      .select("*")
      .eq("cash_register_id", r.id)
      .order("created_at");
    generateCashClosePDF(r, (movements as CashMovement[]) ?? [], settings, r.opener?.full_name ?? "—", r.closer?.full_name ?? "—");
  }

  return (
    <div>
      <Link to="/caja" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, color: "var(--text-muted)" }}>
        <ArrowLeft size={16} /> Volver a caja
      </Link>
      <h2 className="display" style={{ fontSize: 22, marginTop: 0 }}>
        Historial de cierres
      </h2>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : registers.length === 0 ? (
          <p style={{ padding: 24, color: "var(--text-muted)" }}>Todavía no hay cierres registrados.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Cierre</th>
                <th>Abrió</th>
                <th>Cerró</th>
                <th>Fondo inicial</th>
                <th>Saldo final</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {registers.map((r) => (
                <tr key={r.id}>
                  <td>{r.closed_at ? formatDateTime(r.closed_at) : "—"}</td>
                  <td>{r.opener?.full_name ?? "—"}</td>
                  <td>{r.closer?.full_name ?? "—"}</td>
                  <td>{money(r.opening_amount)}</td>
                  <td style={{ fontWeight: 600 }}>{money(r.closing_balance)}</td>
                  <td>
                    <button className="btn-ghost" style={{ color: "var(--available)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => handleDownload(r)}>
                      <Download size={14} /> PDF
                    </button>
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
