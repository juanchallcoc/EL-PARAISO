import { useEffect, useState } from "react";
import { Plus, X, Package, Shirt, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fetchProductsWithAvailability } from "../lib/products";
import { money, formatDateTime } from "../lib/format";
import { useToast } from "../hooks/useToast";
import type { Product, ProductType, ProductWithAvailability } from "../types/database";

export default function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<ProductWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewingRentals, setViewingRentals] = useState<ProductWithAvailability | null>(null);

  async function load() {
    setLoading(true);
    setProducts(await fetchProductsWithAvailability());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const consumables = products.filter((p) => p.type === "consumable");
  const rentals = products.filter((p) => p.type === "rental");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 className="display" style={{ margin: 0, fontSize: 22 }}>
          Productos
        </h2>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <Section
            icon={Package}
            title="Productos (comida, snacks, bebidas)"
            products={consumables}
            emptyText="Todavía no registraste productos. Presiona “Nuevo producto” para agregar el primero."
            onEdit={setEditing}
            onViewRentals={undefined}
          />
          <Section
            icon={Shirt}
            title="Alquiler (shorts, flotadores, etc.)"
            products={rentals}
            emptyText="Todavía no registraste productos de alquiler."
            onEdit={setEditing}
            onViewRentals={setViewingRentals}
          />
        </>
      )}

      {(creating || editing) && (
        <ProductFormModal
          product={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {viewingRentals && (
        <ActiveRentalsModal
          product={viewingRentals}
          onClose={() => setViewingRentals(null)}
          onReturned={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  products,
  emptyText,
  onEdit,
  onViewRentals,
}: {
  icon: typeof Package;
  title: string;
  products: ProductWithAvailability[];
  emptyText: string;
  onEdit: (p: Product) => void;
  onViewRentals?: (p: ProductWithAvailability) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_COUNT = 8;

  const isRentalSection = !!onViewRentals;

  const sorted = [...products].sort((a, b) => {
    if (isRentalSection) {
      // Primero los que tienen unidades pendientes de devolver, luego los más nuevos.
      if (a.activeRentals > 0 !== b.activeRentals > 0) return a.activeRentals > 0 ? -1 : 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filtered = query.trim()
    ? sorted.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : sorted;

  const visible = query.trim() || expanded ? filtered : filtered.slice(0, PREVIEW_COUNT);
  const hiddenCount = filtered.length - visible.length;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <h3 className="display" style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <Icon size={17} color="var(--available)" /> {title}
        </h3>
        {products.length > PREVIEW_COUNT && (
          <input
            className="input"
            style={{ maxWidth: 220, padding: "6px 10px", fontSize: 13 }}
            placeholder="Buscar producto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </div>

      {products.length === 0 ? (
        <div className="card" style={{ color: "var(--text-muted)", fontSize: 14 }}>
          {emptyText}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Sin resultados para “{query}”.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {visible.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: 14,
                  background: p.lowStock ? "var(--occupied-soft)" : "var(--available-soft)",
                  border: `1.5px solid ${p.lowStock ? "var(--occupied-border)" : "var(--available-border)"}`,
                }}
              >
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{p.name}</p>
                <p style={{ margin: "2px 0 8px", fontSize: 13, color: "var(--text-muted)" }}>{money(p.price)}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: p.lowStock ? "var(--occupied)" : "var(--available)" }}>
                  {p.type === "rental" ? `${p.available} disponibles de ${p.stock_quantity}` : `${p.available} en stock`}
                  {p.lowStock ? " · Stock bajo" : ""}
                </p>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button className="btn-outline" style={{ flex: 1, fontSize: 12, padding: "6px 0" }} onClick={() => onEdit(p)}>
                    Editar
                  </button>
                  {onViewRentals && p.activeRentals > 0 && (
                    <button className="btn-outline" style={{ flex: 1, fontSize: 12, padding: "6px 0" }} onClick={() => onViewRentals(p)}>
                      <RotateCcw size={12} /> Devolver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!query.trim() && hiddenCount > 0 && (
            <button
              className="btn-ghost"
              style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: "var(--available)", display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => setExpanded(true)}
            >
              <ChevronDown size={14} /> Ver {hiddenCount} más
            </button>
          )}
          {!query.trim() && expanded && filtered.length > PREVIEW_COUNT && (
            <button
              className="btn-ghost"
              style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => setExpanded(false)}
            >
              <ChevronUp size={14} /> Ver menos
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ProductFormModal({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: product?.name ?? "",
    type: (product?.type ?? "consumable") as ProductType,
    price: String(product?.price ?? 0),
    stock_quantity: String(product?.stock_quantity ?? 0),
    low_stock_threshold: String(product?.low_stock_threshold ?? 0),
    active: product?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      price: Number(form.price) || 0,
      stock_quantity: Number(form.stock_quantity) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 0,
      active: form.active,
    };
    const query = product ? supabase.from("products").update(payload).eq("id", product.id) : supabase.from("products").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast(product ? "Producto actualizado" : "Producto creado");
    onSaved();
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal narrow">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="display" style={{ margin: 0, fontSize: 18 }}>
            {product ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button onClick={onClose}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <label className="label">Nombre</label>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Popcorn, Short talla M" />

        <label className="label" style={{ marginTop: 10 }}>
          Tipo
        </label>
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ProductType })}>
          <option value="consumable">Producto (se vende y resta del stock)</option>
          <option value="rental">Alquiler (se presta y se devuelve)</option>
        </select>

        <label className="label" style={{ marginTop: 10 }}>
          Precio
        </label>
        <input className="input" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />

        <label className="label" style={{ marginTop: 10 }}>
          {form.type === "rental" ? "Unidades totales que tienes para alquilar" : "Stock actual (unidades disponibles)"}
        </label>
        <input
          className="input"
          type="number"
          min="0"
          value={form.stock_quantity}
          onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
        />

        <label className="label" style={{ marginTop: 10 }}>
          Avisar cuando queden menos de
        </label>
        <input
          className="input"
          type="number"
          min="0"
          value={form.low_stock_threshold}
          onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
        />

        {product && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 14 }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Producto activo (visible para la venta)
          </label>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={saving || !form.name.trim()} onClick={handleSave}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveRentalsModal({
  product,
  onClose,
  onReturned,
}: {
  product: ProductWithAvailability;
  onClose: () => void;
  onReturned: () => void;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("sale_items")
      .select("id, created_at, sale:sales(sale_number, customer:customers(full_name))")
      .eq("product_id", product.id)
      .eq("product_type", "rental")
      .is("returned_at", null)
      .order("created_at");
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReturn(id: string) {
    const { error } = await supabase.from("sale_items").update({ returned_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Unidad devuelta");
    load();
    onReturned();
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal narrow">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="display" style={{ margin: 0, fontSize: 18 }}>
            Alquileres activos: {product.name}
          </h2>
          <button onClick={onClose}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>
        {loading ? (
          <div className="spinner" style={{ margin: "20px auto" }} />
        ) : rows.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No quedan unidades pendientes de devolver.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{r.sale?.customer?.full_name ?? "—"}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                    Venta #{r.sale?.sale_number} · {formatDateTime(r.created_at)}
                  </p>
                </div>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => handleReturn(r.id)}>
                  Devolver
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
