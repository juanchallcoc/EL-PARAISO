import { useEffect, useState } from "react";
import { Plus, X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { money, formatDateTime } from "../lib/format";
import { generateCashClosePDF } from "../lib/pdf";
import type { CashMovement, MovementType } from "../types/database";

export default function CashRegisterPage() {
  const { activeRegister, refreshRegister, settings } = useAppData();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [openingAmount, setOpeningAmount] = useState("0");
  const [opening, setOpening] = useState(false);

  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [totals, setTotals] = useState({ cash: 0, qr: 0, transfer: 0 });
  const [loadingTotals, setLoadingTotals] = useState(true);
  const [movementModal, setMovementModal] = useState<MovementType | null>(null);
  const [closeModal, setCloseModal] = useState(false);

  async function loadRegisterData() {
    if (!activeRegister) return;
    setLoadingTotals(true);
    const [{ data: sales }, { data: mv }] = await Promise.all([
      supabase.from("sales").select("total, payment_method").eq("cash_register_id", activeRegister.id),
      supabase
        .from("cash_movements")
        .select("*, user:profiles(full_name)")
        .eq("cash_register_id", activeRegister.id)
        .order("created_at", { ascending: false }),
    ]);
    const t = { cash: 0, qr: 0, transfer: 0 };
    (sales ?? []).forEach((s: any) => {
      if (s.payment_method === "cash") t.cash += Number(s.total);
      if (s.payment_method === "qr") t.qr += Number(s.total);
      if (s.payment_method === "transfer") t.transfer += Number(s.total);
    });
    setTotals(t);
    setMovements((mv as CashMovement[]) ?? []);
    setLoadingTotals(false);
  }

  useEffect(() => {
    loadRegisterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRegister?.id]);

  async function handleOpen() {
    if (!profile) return;
    setOpening(true);
    const { error } = await supabase.from("cash_registers").insert({
      opened_by: profile.id,
      opening_amount: Number(openingAmount) || 0,
      status: "open",
    });
    setOpening(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Caja abierta");
    refreshRegister();
  }

  const totalIncome = movements.filter((m) => m.type === "income").reduce((s, m) => s + Number(m.amount), 0);
  const totalExpense = movements.filter((m) => m.type === "expense").reduce((s, m) => s + Number(m.amount), 0);

  if (!activeRegister) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div className="card">
          <h2 className="display" style={{ fontSize: 20, marginTop: 0 }}>
            Abrir caja
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Antes de comenzar a vender, registra el fondo inicial con el que arranca la caja hoy.
          </p>
          <label className="label">Monto inicial (fondo de caja)</label>
          <input className="input" type="number" min="0" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} />
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} disabled={opening} onClick={handleOpen}>
            {opening ? "Abriendo…" : "Abrir caja"}
          </button>
        </div>
        {profile?.role === "admin" && (
          <p style={{ textAlign: "center", marginTop: 12 }}>
            <Link to="/caja/historial" style={{ fontSize: 13, color: "var(--available)" }}>
              Ver historial de cierres
            </Link>
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <h2 className="display" style={{ margin: 0, fontSize: 22 }}>
          Caja abierta
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setMovementModal("income")}>
            <ArrowUpCircle size={16} color="var(--success)" /> Ingreso
          </button>
          <button className="btn btn-outline" onClick={() => setMovementModal("expense")}>
            <ArrowDownCircle size={16} color="var(--danger)" /> Egreso
          </button>
          <button className="btn btn-danger" onClick={() => setCloseModal(true)}>
            Cerrar caja
          </button>
        </div>
      </div>

      <div className="card stats-row" style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat label="Fondo inicial" value={money(activeRegister.opening_amount)} />
        <Stat label="Ventas efectivo" value={money(totals.cash)} />
        <Stat label="Ventas QR" value={money(totals.qr)} />
        <Stat label="Ventas transferencia" value={money(totals.transfer)} />
        <Stat label="Otros ingresos" value={money(totalIncome)} />
        <Stat label="Egresos" value={money(totalExpense)} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px 0" }}>
          <h3 className="display" style={{ fontSize: 16, margin: 0 }}>
            Movimientos manuales
          </h3>
        </div>
        {loadingTotals ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : movements.length === 0 ? (
          <p style={{ padding: 20, color: "var(--text-muted)" }}>Todavía no se registraron ingresos o egresos manuales.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{formatDateTime(m.created_at)}</td>
                  <td style={{ color: m.type === "income" ? "var(--success)" : "var(--danger)" }}>{m.type === "income" ? "Ingreso" : "Egreso"}</td>
                  <td>{m.concept}</td>
                  <td>{money(m.amount)}</td>
                  <td>{m.user?.full_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {movementModal && (
        <MovementModal
          type={movementModal}
          registerId={activeRegister.id}
          onClose={() => setMovementModal(null)}
          onSaved={() => {
            setMovementModal(null);
            loadRegisterData();
          }}
        />
      )}

      {closeModal && settings && (
        <CloseRegisterModal
          register={activeRegister}
          totals={totals}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          movements={movements}
          onClose={() => setCloseModal(false)}
          onClosed={() => {
            setCloseModal(false);
            refreshRegister();
          }}
        />
      )}
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

function MovementModal({
  type,
  registerId,
  onClose,
  onSaved,
}: {
  type: MovementType;
  registerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!concept.trim() || !amount || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("cash_movements").insert({
      cash_register_id: registerId,
      type,
      concept,
      amount: Number(amount),
      user_id: profile.id,
    });
    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    onSaved();
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal narrow">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="display" style={{ margin: 0, fontSize: 18 }}>
            Registrar {type === "income" ? "ingreso" : "egreso"}
          </h2>
          <button onClick={onClose}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>
        <label className="label">Concepto</label>
        <input className="input" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej: compra de insumos" />
        <label className="label" style={{ marginTop: 10 }}>
          Monto
        </label>
        <input className="input" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={saving || !concept.trim() || !amount} onClick={handleSave}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseRegisterModal({
  register,
  totals,
  totalIncome,
  totalExpense,
  movements,
  onClose,
  onClosed,
}: {
  register: any;
  totals: { cash: number; qr: number; transfer: number };
  totalIncome: number;
  totalExpense: number;
  movements: CashMovement[];
  onClose: () => void;
  onClosed: () => void;
}) {
  const { profile } = useAuth();
  const { settings } = useAppData();
  const { showToast } = useToast();
  const [closing, setClosing] = useState(false);

  const closingBalance = Number(register.opening_amount) + totals.cash + totalIncome - totalExpense;

  async function handleClose() {
    if (!profile) return;
    setClosing(true);
    const payload = {
      status: "closed",
      closed_by: profile.id,
      closed_at: new Date().toISOString(),
      total_cash: totals.cash,
      total_qr: totals.qr,
      total_transfer: totals.transfer,
      total_other_income: totalIncome,
      total_expenses: totalExpense,
      closing_balance: closingBalance,
    };
    const { data, error } = await supabase.from("cash_registers").update(payload).eq("id", register.id).select().single();
    setClosing(false);
    if (error || !data) {
      showToast(error?.message || "No se pudo cerrar la caja", "error");
      return;
    }
    if (settings) {
      generateCashClosePDF(
        { ...register, ...data },
        movements,
        settings,
        profile.full_name ?? "—",
        profile.full_name ?? "—"
      );
    }
    showToast("Caja cerrada correctamente");
    onClosed();
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal narrow">
        <h2 className="display" style={{ margin: "0 0 16px", fontSize: 18 }}>
          Confirmar cierre de caja
        </h2>
        <Row label="Fondo inicial" value={money(register.opening_amount)} />
        <Row label="Ventas efectivo" value={money(totals.cash)} />
        <Row label="Ventas QR" value={money(totals.qr)} />
        <Row label="Ventas transferencia" value={money(totals.transfer)} />
        <Row label="Otros ingresos" value={money(totalIncome)} />
        <Row label="Egresos" value={"- " + money(totalExpense)} />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 8 }}>
          <span>Saldo final en caja</span>
          <span>{money(closingBalance)}</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
          Al confirmar se generará automáticamente el PDF del cierre y no podrás registrar más ventas hasta abrir una nueva caja.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-danger" disabled={closing} onClick={handleClose}>
            {closing ? "Cerrando…" : "Confirmar cierre"}
          </button>
        </div>
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
