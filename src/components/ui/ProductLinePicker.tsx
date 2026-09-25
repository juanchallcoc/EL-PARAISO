import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { money } from "../../lib/format";
import type { CartProductLine, ProductWithAvailability } from "../../types/database";

export default function ProductLinePicker({
  label,
  products,
  lines,
  onChange,
  emptyText,
}: {
  label: string;
  products: ProductWithAvailability[];
  lines: CartProductLine[];
  onChange: (lines: CartProductLine[]) => void;
  emptyText: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  );

  function quantityInCart(productId: string) {
    return lines.find((l) => l.product.id === productId)?.quantity ?? 0;
  }

  function setQuantity(product: ProductWithAvailability, qty: number) {
    const clamped = Math.max(0, Math.min(qty, product.available));
    const others = lines.filter((l) => l.product.id !== product.id);
    onChange(clamped > 0 ? [...others, { product, quantity: clamped }] : others);
  }

  return (
    <div>
      <label className="label">{label}</label>
      {products.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{emptyText}</p>
      ) : (
        <>
          <input
            className="input"
            placeholder="Buscar producto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
            {filtered.map((p) => {
              const qty = quantityInCart(p.id);
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: p.available <= 0 ? "#f6f6f6" : "white",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{p.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: p.lowStock ? "var(--occupied)" : "var(--text-muted)" }}>
                      {money(p.price)} · disponibles: {p.available}
                      {p.lowStock && p.available > 0 ? " (stock bajo)" : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      className="btn-outline"
                      style={{ padding: 6, borderRadius: 8 }}
                      disabled={qty <= 0}
                      onClick={() => setQuantity(p, qty - 1)}
                    >
                      <Minus size={13} />
                    </button>
                    <span style={{ minWidth: 20, textAlign: "center", fontSize: 13, fontWeight: 600 }}>{qty}</span>
                    <button
                      className="btn-outline"
                      style={{ padding: 6, borderRadius: 8 }}
                      disabled={qty >= p.available}
                      onClick={() => setQuantity(p, qty + 1)}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin resultados.</p>}
          </div>
        </>
      )}
    </div>
  );
}
