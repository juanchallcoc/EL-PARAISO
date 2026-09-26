import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import ModalShell from "../ui/ModalShell";
import CustomerPicker from "../ui/CustomerPicker";
import PaymentMethodPicker from "../ui/PaymentMethodPicker";
import ProductLinePicker from "../ui/ProductLinePicker";
import { money } from "../../lib/format";
import { createSale, fetchFullSale } from "../../lib/sales";
import { fetchProductsWithAvailability } from "../../lib/products";
import { generateSaleReceiptPDF, openPdfPlaceholder } from "../../lib/pdf";
import { useAppData } from "../../hooks/useAppData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import type { CartProductLine, Customer, LockerWithStatus, PaymentMethod, ProductWithAvailability } from "../../types/database";

export default function SaleCartModal({
  availableLockers,
  preselectedLockerIds = [],
  onClose,
  onSuccess,
}: {
  availableLockers: LockerWithStatus[];
  preselectedLockerIds?: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { settings, activeRegister } = useAppData();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [selectedLockerIds, setSelectedLockerIds] = useState<string[]>(preselectedLockerIds);
  const [noLockerQty, setNoLockerQty] = useState(0);
  const [consumables, setConsumables] = useState<ProductWithAvailability[]>([]);
  const [rentals, setRentals] = useState<ProductWithAvailability[]>([]);
  const [consumableLines, setConsumableLines] = useState<CartProductLine[]>([]);
  const [rentalLines, setRentalLines] = useState<CartProductLine[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountPct, setDiscountPct] = useState(settings?.discount_default_percentage ?? 0);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProductsWithAvailability().then((all) => {
      setConsumables(all.filter((p) => p.type === "consumable"));
      setRentals(all.filter((p) => p.type === "rental"));
      setLoadingProducts(false);
    });
  }, []);

  const lockerTotal = selectedLockerIds.length * (settings?.locker_price ?? 0);
  const noLockerFeeTotal = noLockerQty * (settings?.no_locker_price ?? 0);
  const consumableTotal = consumableLines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const rentalTotal = rentalLines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const subtotal = lockerTotal + noLockerFeeTotal + consumableTotal + rentalTotal;
  const discountAmount = applyDiscount ? Math.round(subtotal * (discountPct / 100) * 100) / 100 : 0;
  const total = subtotal - discountAmount;

  const hasAnyItem = selectedLockerIds.length > 0 || noLockerQty > 0 || consumableLines.length > 0 || rentalLines.length > 0;
  const canSubmit = !!customer && hasAnyItem && !!activeRegister && !submitting;

  function toggleLocker(id: string) {
    setSelectedLockerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (!customer || !activeRegister || !profile) return;
    const receiptWindow = openPdfPlaceholder();
    setSubmitting(true);
    try {
      const productLines = [...consumableLines, ...rentalLines].map((l) => ({ productId: l.product.id, quantity: l.quantity }));

      const { id: saleId, sale_number } = await createSale({
        customerId: customer.id,
        cashRegisterId: activeRegister.id,
        discountPercentage: applyDiscount ? discountPct : 0,
        paymentMethod: payment,
        lockerIds: selectedLockerIds,
        noLockerQuantity: noLockerQty,
        productLines,
      });

      showToast(`Venta #${sale_number} registrada`);

      if (settings) {
        const fullSale = await fetchFullSale(saleId);
        if (fullSale) await generateSaleReceiptPDF(fullSale, settings, profile.full_name || "—", receiptWindow);
        else receiptWindow?.close();
      } else {
        receiptWindow?.close();
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      receiptWindow?.close();
      showToast(err.message || "No se pudo registrar la venta", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Nueva venta" onClose={onClose}>
      {!activeRegister && (
        <div style={{ background: "#fdeceb", color: "#a33", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          No hay una caja abierta. Debes abrir caja antes de registrar ventas.
        </div>
      )}

      <label className="label">Cliente</label>
      <CustomerPicker selected={customer} onSelect={setCustomer} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 18 }}>
        <div>
          <label className="label">Casilleros ({selectedLockerIds.length} seleccionados)</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, maxHeight: 140, overflowY: "auto" }}>
            {availableLockers.map((l) => (
              <button
                key={l.id}
                onClick={() => toggleLocker(l.id)}
                className="btn"
                style={{
                  padding: "8px 0",
                  fontSize: 13,
                  background: selectedLockerIds.includes(l.id) ? "var(--available)" : "white",
                  color: selectedLockerIds.includes(l.id) ? "white" : "var(--text)",
                  border: "1.5px solid " + (selectedLockerIds.includes(l.id) ? "var(--available)" : "var(--border)"),
                }}
              >
                {l.code}
              </button>
            ))}
            {availableLockers.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No hay casilleros disponibles.</p>}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 14,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Entrada sin casillero</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>{money(settings?.no_locker_price ?? 0)} c/u</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                className="btn-outline"
                style={{ padding: 6, borderRadius: 8 }}
                disabled={noLockerQty <= 0}
                onClick={() => setNoLockerQty((q) => Math.max(0, q - 1))}
              >
                <Minus size={13} />
              </button>
              <span style={{ minWidth: 20, textAlign: "center", fontSize: 13, fontWeight: 600 }}>{noLockerQty}</span>
              <button className="btn-outline" style={{ padding: 6, borderRadius: 8 }} onClick={() => setNoLockerQty((q) => q + 1)}>
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>

        <div>
          {loadingProducts ? (
            <div className="spinner" style={{ margin: "20px auto" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ProductLinePicker
                label="Productos"
                products={consumables}
                lines={consumableLines}
                onChange={setConsumableLines}
                emptyText="No hay productos registrados. Ve a la pestaña Productos para crear el primero."
              />
              <ProductLinePicker
                label="Alquiler"
                products={rentals}
                lines={rentalLines}
                onChange={setRentalLines}
                emptyText="No hay productos de alquiler registrados."
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, background: "var(--bg)", borderRadius: 14, padding: 16 }}>
        {lockerTotal > 0 && <Row label={`Casilleros (${selectedLockerIds.length})`} value={money(lockerTotal)} />}
        {noLockerFeeTotal > 0 && (
          <Row label={`Entrada sin casillero${noLockerQty > 1 ? ` (${noLockerQty})` : ""}`} value={money(noLockerFeeTotal)} />
        )}
        {consumableTotal > 0 && <Row label="Productos" value={money(consumableTotal)} />}
        {rentalTotal > 0 && <Row label="Alquiler" value={money(rentalTotal)} />}
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
