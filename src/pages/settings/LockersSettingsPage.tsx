import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../hooks/useToast";
import type { Locker } from "../../types/database";

export default function LockersSettingsPage() {
  const { showToast } = useToast();
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("lockers").select("*").order("code");
    setLockers((data as Locker[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!newCode.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("lockers").insert({ code: newCode.trim().toUpperCase() });
    setCreating(false);
    if (error) {
      showToast(error.code === "23505" ? "Ese código de casillero ya existe." : error.message, "error");
      return;
    }
    setNewCode("");
    load();
    showToast("Casillero creado");
  }

  async function toggleActive(l: Locker) {
    const { error } = await supabase.from("lockers").update({ active: !l.active }).eq("id", l.id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    load();
  }

  return (
    <div>
      <div className="card" style={{ maxWidth: 420, marginBottom: 20 }}>
        <label className="label">Nuevo casillero (código)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" placeholder="Ej: C-25" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          <button className="btn btn-primary" disabled={creating || !newCode.trim()} onClick={handleCreate}>
            <Plus size={16} /> Añadir
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lockers.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.code}</td>
                  <td>
                    <span className={`badge ${l.active ? "badge-open" : "badge-closed"}`}>{l.active ? "Activo" : "Desactivado"}</span>
                  </td>
                  <td>
                    <button className="btn-ghost" style={{ color: "var(--available)", fontSize: 13 }} onClick={() => toggleActive(l)}>
                      {l.active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
        Desactivar un casillero lo oculta de la matriz principal sin borrar sus ventas anteriores. Es la forma segura de "eliminar" un casillero sin perder historial.
      </p>
    </div>
  );
}
