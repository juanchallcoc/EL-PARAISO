import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { useToast } from "../../hooks/useToast";
import { roleLabels } from "../../lib/format";
import type { Profile, Role } from "../../types/database";

export default function UsersSettingsPage() {
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at");
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateRole(id: string, role: Role) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    load();
    showToast("Rol actualizado");
  }

  async function toggleActive(p: Profile) {
    const { error } = await supabase.from("profiles").update({ active: !p.active }).eq("id", p.id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Nuevo usuario
        </button>
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
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.full_name ?? "—"}</td>
                  <td>
                    <select className="input" style={{ padding: "5px 8px", width: 140 }} value={p.role} onChange={(e) => updateRole(p.id, e.target.value as Role)}>
                      <option value="admin">Administrador</option>
                      <option value="staff">Staff</option>
                      <option value="client">Cliente</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${p.active ? "badge-open" : "badge-closed"}`}>{p.active ? "Activo" : "Inactivo"}</span>
                  </td>
                  <td>
                    <button className="btn-ghost" style={{ color: "var(--available)", fontSize: 13 }} onClick={() => toggleActive(p)}>
                      {p.active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
        Roles: <b>{roleLabels.admin}</b> tiene acceso total, incluida esta sección. <b>{roleLabels.staff}</b> puede operar ventas, caja y clientes, pero no cambiar configuración.
      </p>

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "staff" as Role });
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!form.full_name.trim() || !form.email.trim() || form.password.length < 6) return;
    setSaving(true);

    const { data, error } = await supabaseAdmin.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.full_name } },
    });

    if (error || !data.user) {
      setSaving(false);
      showToast(error?.message || "No se pudo crear el usuario", "error");
      return;
    }

    // El trigger de la base de datos ya creó el perfil con role = 'client'.
    // Ahora lo actualizamos con el nombre completo y el rol elegido.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: form.full_name, role: form.role })
      .eq("id", data.user.id);

    setSaving(false);

    if (profileError) {
      showToast("Usuario creado, pero no se pudo asignar el rol automáticamente: " + profileError.message, "error");
      onCreated();
      return;
    }

    showToast("Usuario creado correctamente");
    onCreated();
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal narrow">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="display" style={{ margin: 0, fontSize: 18 }}>
            Nuevo usuario
          </h2>
          <button onClick={onClose}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <label className="label">Nombre completo</label>
        <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />

        <label className="label" style={{ marginTop: 10 }}>
          Correo electrónico
        </label>
        <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <label className="label" style={{ marginTop: 10 }}>
          Contraseña (mínimo 6 caracteres)
        </label>
        <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <label className="label" style={{ marginTop: 10 }}>
          Rol
        </label>
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          <option value="staff">Staff</option>
          <option value="admin">Administrador</option>
        </select>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={saving || !form.full_name.trim() || !form.email.trim() || form.password.length < 6}
            onClick={handleCreate}
          >
            {saving ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}
