import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Droplet, Sun, Plus, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAppData } from "../hooks/useAppData";
import SaleCartModal from "../components/modals/SaleCartModal";
import ConfirmFreeModal from "../components/modals/ConfirmFreeModal";
import type { Locker, LockerWithStatus } from "../types/database";

export default function DashboardPage() {
  const { activeRegister } = useAppData();
  const [lockers, setLockers] = useState<LockerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [preselectedLockerIds, setPreselectedLockerIds] = useState<string[]>([]);
  const [freeTarget, setFreeTarget] = useState<LockerWithStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: lockerRows }, { data: activeRows }] = await Promise.all([
      supabase.from("lockers").select("*").eq("active", true).order("code"),
      supabase
        .from("sale_lockers")
        .select("id, locker_id, sale_id, sales(customer:customers(full_name))")
        .is("released_at", null),
    ]);

    const activeMap = new Map<string, any>();
    (activeRows ?? []).forEach((row: any) => activeMap.set(row.locker_id, row));

    const merged: LockerWithStatus[] = ((lockerRows as Locker[]) ?? []).map((l) => {
      const active = activeMap.get(l.id);
      return {
        ...l,
        occupied: !!active,
        saleLockerId: active?.id,
        saleId: active?.sale_id,
        customerName: active?.sales?.customer?.full_name,
      };
    });

    setLockers(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const available = lockers.filter((l) => !l.occupied);
  const occupied = lockers.filter((l) => l.occupied);

  return (
    <div>
      {!activeRegister && (
        <div
          className="card"
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, background: "#fff6ee", border: "1.5px solid #ffd3bc" }}
        >
          <AlertCircle size={20} color="#c1512f" />
          <p style={{ margin: 0, fontSize: 14 }}>
            No hay una caja abierta. <Link to="/caja" style={{ color: "var(--available)", fontWeight: 600 }}>Abre la caja</Link> para poder registrar ventas.
          </p>
        </div>
      )}

      <div className="card stats-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 32 }}>
          <Stat label="Total casilleros" value={lockers.length} color="var(--text)" />
          <Stat label="Ocupados" value={occupied.length} color="var(--occupied)" />
          <Stat label="Disponibles" value={available.length} color="var(--available)" />
        </div>
        <button
          className="btn btn-accent"
          onClick={() => {
            setPreselectedLockerIds([]);
            setCartOpen(true);
          }}
        >
          <Plus size={16} /> Nueva venta
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : lockers.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          Aún no hay casilleros registrados. Ve a Configuración → Casilleros para crear los primeros.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
          {lockers.map((l) => (
            <div
              key={l.id}
              className="card"
              style={{
                padding: 14,
                minHeight: 118,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: l.occupied ? "var(--occupied-soft)" : "var(--available-soft)",
                border: `1.5px solid ${l.occupied ? "var(--occupied-border)" : "var(--available-border)"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <span className="display" style={{ fontSize: 18 }}>
                  {l.code}
                </span>
                {l.occupied ? <Sun size={17} color="var(--occupied)" /> : <Droplet size={17} color="var(--available)" />}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: l.occupied ? "#c1512f" : "#0e7c8a" }}>
                  {l.occupied ? "Ocupado" : "Disponible"}
                </p>
                {l.occupied && l.customerName && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {l.customerName}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (l.occupied) {
                    setFreeTarget(l);
                  } else {
                    setPreselectedLockerIds([l.id]);
                    setCartOpen(true);
                  }
                }}
                className="btn"
                style={{ marginTop: 8, padding: "7px 0", fontSize: 13, color: "white", background: l.occupied ? "var(--occupied)" : "var(--available)" }}
              >
                {l.occupied ? "Desocupar" : "Ocupar"}
              </button>
            </div>
          ))}
        </div>
      )}

      {cartOpen && (
        <SaleCartModal
          availableLockers={available}
          preselectedLockerIds={preselectedLockerIds}
          onClose={() => setCartOpen(false)}
          onSuccess={load}
        />
      )}
      {freeTarget && <ConfirmFreeModal locker={freeTarget} onClose={() => setFreeTarget(null)} onSuccess={load} />}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{label}</p>
      <p className="display" style={{ fontSize: 24, margin: 0, color }}>
        {value}
      </p>
    </div>
  );
}
