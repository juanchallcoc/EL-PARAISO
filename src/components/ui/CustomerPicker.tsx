import { useEffect, useState } from "react";
import { Search, Plus } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import type { Customer } from "../../types/database";

export default function CustomerPicker({
  selected,
  onSelect,
}: {
  selected: Customer | null;
  onSelect: (c: Customer | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [creating, setCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", document_number: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .or(`full_name.ilike.%${query}%,document_number.ilike.%${query}%`)
        .limit(8);
      setResults((data as Customer[]) ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleCreate() {
    if (!newCustomer.full_name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("customers").insert(newCustomer).select().single();
    setSaving(false);
    if (!error && data) {
      onSelect(data as Customer);
      setCreating(false);
    }
  }

  if (selected) {
    return (
      <div style={{ border: "1.5px solid var(--available)", background: "var(--available-soft)", borderRadius: 12, padding: 12 }}>
        <p style={{ fontWeight: 600, margin: 0 }}>{selected.full_name}</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>
          CI {selected.document_number || "—"} · {selected.phone || "—"}
        </p>
        <button onClick={() => onSelect(null)} className="btn-ghost" style={{ fontSize: 12, padding: "4px 0", marginTop: 4 }}>
          Cambiar cliente
        </button>
      </div>
    );
  }

  if (creating) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          className="input"
          placeholder="Nombre completo"
          value={newCustomer.full_name}
          onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
        />
        <input
          className="input"
          placeholder="CI / documento"
          value={newCustomer.document_number}
          onChange={(e) => setNewCustomer({ ...newCustomer, document_number: e.target.value })}
        />
        <input
          className="input"
          placeholder="Teléfono"
          value={newCustomer.phone}
          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" disabled={saving || !newCustomer.full_name.trim()} onClick={handleCreate}>
            {saving ? "Guardando…" : "Guardar cliente"}
          </button>
          <button className="btn btn-ghost" onClick={() => setCreating(false)}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="input" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Search size={16} color="var(--text-muted)" />
        <input
          style={{ border: "none", outline: "none", width: "100%" }}
          placeholder="Buscar por nombre o CI…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4, maxHeight: 150, overflowY: "auto" }}>
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="btn-outline"
              style={{ textAlign: "left", justifyContent: "flex-start", padding: "8px 12px" }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.full_name}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>CI {c.document_number || "—"}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setCreating(true)} className="btn-ghost" style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "var(--available)", padding: 0 }}>
        <Plus size={14} /> Crear cliente nuevo
      </button>
    </div>
  );
}
