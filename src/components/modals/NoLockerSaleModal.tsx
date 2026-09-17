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
import type { Customer, PaymentMethod, Sale } from "../../types/database";

export default function NoLockerSaleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { settings, activeRegister } = useAppData();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountPct, setDiscountPct] = useState(settings?.discount_default_percentage ?? 0);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);

  const unitPrice = settings?.no_locker_price ?? 0;
  const subtotal = unitPrice;
  const discountAmount = applyDiscount ? Math.round(subtotal * (discountPct / 100) * 100) / 100 : 0;
  const total = subtotal - discountAmount;
  const canSubmit = !!customer && !!activeRegister && !submitting;

  async function handleSubmit() {
    if (!customer || !activeRegister || !profile) return;
    setSubmitting(true);
    try {
      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          customer_id: customer.id,
          user_id: profile.id,
          cash_register_id: activeRegister.id,
          sale_type: "no_locker",
          quantity: 1,
          unit_price: unitPrice,
          subtotal,
          discount_percentage: applyDiscount ? discountPct : 0,
          discount_amount: discountAmount,
          total,
          payment_method: payment,
        })
        .select()
        .single();
      if (error || !sale) throw error;

      showToast(`Venta #${sale.sale_number} registrada`);
      if (settings) {
        const fullSale: Sale = { ...(sale as Sale), customer };
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
    <ModalShell title="Venta sin casillero" onClose={onClose} accent="#FF9F5A" narrow>
      {!activeRegister && (
        <div style={{ background: "#fdeceb", color: "#a33", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          No hay una caja abierta. Debes abrir caja antes de registrar ventas.
        </div>
      )}
      <label className="label">Cliente</label>
      <CustomerPicker selected={customer} onSelect={setCustomer} />

      <div style={{ marginTop: 16, background: "var(--bg)", borderRadius: 14, padding: 16 }}>
        {settings?.discount_enabled && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700 }}>
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
        <button className="btn btn-accent" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? "Registrando…" : "Registrar venta"}
        </button>
      </div>
    </ModalShell>
  );
}
