import { useState } from "react";
import ModalShell from "../ui/ModalShell";
import CustomerPicker from "../ui/CustomerPicker";
import PaymentMethodPicker from "../ui/PaymentMethodPicker";
import { supabase } from "../../lib/supabaseClient";
import { money } from "../../lib/format";
import { generateSaleReceiptPDF } from "../../lib/pdf";
import { useAppData } from "../../hooks/useAppData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import type { Customer, LockerWithStatus, PaymentMethod, Sale } from "../../types/database";

export default function OccupyModal({
  availableLockers,
  preselectedIds,
  onClose,
  onSuccess,
}: {
  availableLockers: LockerWithStatus[];
  preselectedIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { settings, activeRegister } = useAppData();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(preselectedIds);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountPct, setDiscountPct] = useState(settings?.discount_default_percentage ?? 0);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);

  const unitPrice = settings?.locker_price ?? 0;
  const qty = selectedIds.length;
  const subtotal = qty * unitPrice;
  const discountAmount = applyDiscount ? Math.round(subtotal * (discountPct / 100) * 100) / 100 : 0;
  const total = subtotal - discountAmount;
  const canSubmit = !!customer && qty > 0 && !!activeRegister && !submitting;

  function toggleLocker(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (!customer || !activeRegister || !profile) return;
    setSubmitting(true);
    try {
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          customer_id: customer.id,
          user_id: profile.id,
          cash_register_id: activeRegister.id,
          sale_type: "locker",
          quantity: qty,
          unit_price: unitPrice,
          subtotal,
          discount_percentage: applyDiscount ? discountPct : 0,
          discount_amount: discountAmount,
          total,
          payment_method: payment,
        })
        .select()
        .single();

      if (saleError || !sale) throw saleError;

      const rows = selectedIds.map((locker_id) => ({ sale_id: sale.id, locker_id }));
      const { error: slError } = await supabase.from("sale_lockers").insert(rows);
      if (slError) throw slError;

      showToast(`Venta #${sale.sale_number} registrada · ${qty} casillero(s)`);

      if (settings) {
        const soldLockers = availableLockers.filter((l) => selectedIds.includes(l.id));
        const fullSale: Sale = {
          ...(sale as Sale),
          customer,
          sale_lockers: soldLockers.map((l) => ({
            id: l.id,
            sale_id: sale.id,
            locker_id: l.id,
            released_at: null,
            created_at: sale.created_at,
            locker: { id: l.id, code: l.code, active: l.active, created_at: l.created_at, updated_at: l.updated_at },
          })),
        };
        generateSaleReceiptPDF(fullSale, settings, profile.full_name || "—");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || "No se pudo registrar la venta", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Registrar venta de casillero(s)" onClose={onClose}>
      {!activeRegister && (
        <div style={{ background: "#fdeceb", color: "#a33", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          No hay una caja abierta. Debes abrir caja antes de registrar ventas.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <label className="label">Cliente</label>
          <CustomerPicker selected={customer} onSelect={setCustomer} />
        </div>

        <div>
          <label className="label">Casilleros disponibles ({selectedIds.length} seleccionados)</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, maxHeight: 160, overflowY: "auto" }}>
            {availableLockers.map((l) => (
              <button
                key={l.id}
                onClick={() => toggleLocker(l.id)}
                className="btn"
                style={{
                  padding: "8px 0",
                  fontSize: 13,
                  background: selectedIds.includes(l.id) ? "var(--available)" : "white",
                  color: selectedIds.includes(l.id) ? "white" : "var(--text)",
                  border: "1.5px solid " + (selectedIds.includes(l.id) ? "var(--available)" : "var(--border)"),
                }}
              >
                {l.code}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, background: "var(--bg)", borderRadius: 14, padding: 16 }}>
        <Row label="Cantidad de casilleros" value={String(qty)} />
        <Row label="Precio unitario" value={money(unitPrice)} />
        <Row label="Subtotal" value={money(subtotal)} />

        {settings?.discount_enabled && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={applyDiscount} onChange={(e) => setApplyDiscount(e.target.checked)} />
              Aplicar descuento
            </label>
            {applyDiscount && (
              <input
                type="number"
                className="input"
                style={{ width: 70, textAlign: "right", padding: "4px 8px" }}
                value={discountPct}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
              />
            )}
          </div>
        )}
        <Row label="Descuento" value={"- " + money(discountAmount)} muted />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4 }}>
          <span>Total</span>
          <span>{money(total)}</span>
        </div>

        <div style={{ marginTop: 12 }}>
          <PaymentMethodPicker value={payment} onChange={setPayment} />
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? "Registrando…" : "Registrar venta"}
        </button>
      </div>
    </ModalShell>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: muted ? "#c1512f" : "inherit" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
