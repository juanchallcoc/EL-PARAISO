import { useEffect, useState } from "react";
import { Search, Plus, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { money, formatDateTime, describeSale } from "../lib/format";
import { useToast } from "../hooks/useToast";
import type { Customer, Sale } from "../types/database";

export default function CustomersPage() {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Customer | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase.from("customers").select("*").order("full_name");
    if (query.trim()) q = q.or(`full_name.ilike.%${query}%,document_number.ilike.%${query}%`);
    const { data } = await q;
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <h2 className="display" style={{ margin: 0, fontSize: 22 }}>
          Clientes
        </h2>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      <div className="input" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, maxWidth: 360 }}>
        <Search size={16} color="var(--text-muted)" />
        <input style={{ border: "none", outline: "none", width: "100%" }} placeholder="Buscar por nombre o CI…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : customers.length === 0 ? (
          <p style={{ padding: 24, color: "var(--text-muted)", margin: 0 }}>No se encontraron clientes.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>CI / documento</th>
                <th>Teléfono</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button className="btn-ghost" style={{ padding: 0, fontWeight: 600, color: "var(--text)" }} onClick={() => setViewing(c)}>
                      {c.full_name}
                    </button>
                  </td>
                  <td>{c.document_number || "—"}</td>
                  <td>{c.phone || "—"}</td>
                  <td>
                    <button className="btn-ghost" style={{ color: "var(--available)", fontSize: 13 }} onClick={() => setEditing(c)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(creating || editing) && (
        <CustomerFormModal
          customer={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
            showToast("Cliente guardado");
          }}
        />
      )}

      {viewing && <CustomerHistoryModal customer={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function CustomerFormModal({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: customer?.full_name ?? "",
    document_number: customer?.document_number ?? "",
    phone: customer?.phone ?? "",
    notes: customer?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function handleSave() {
    if (!form.full_name.trim()) return;
    setSaving(true);
    const query = customer ? supabase.from("customers").update(form).eq("id", customer.id) : supabase.from("customers").insert(form);
    const { error } = await query;
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
            {customer ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <button onClick={onClose}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">CI / documento</label>
            <input className="input" value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Observaciones</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={saving || !form.full_name.trim()} onClick={handleSave}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerHistoryModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("sales")
      .select("*, sale_lockers(id), sale_items(product_type, quantity)")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSales((data as Sale[]) ?? []);
        setLoading(false);
      });
  }, [customer.id]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 className="display" style={{ margin: 0, fontSize: 18 }}>
              {customer.full_name}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>
              CI {customer.document_number || "—"} · {customer.phone || "—"}
            </p>
          </div>
          <button onClick={onClose}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>
        {loading ? (
          <div className="spinner" style={{ margin: "20px auto" }} />
        ) : sales.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Este cliente aún no tiene ventas registradas.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>{formatDateTime(s.created_at)}</td>
                  <td>{describeSale(s)}</td>
                  <td>{money(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
