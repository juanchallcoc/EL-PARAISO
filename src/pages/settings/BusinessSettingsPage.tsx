import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";

export default function BusinessSettingsPage() {
  const { settings, refreshSettings } = useAppData();
  const { showToast } = useToast();
  const [form, setForm] = useState({ business_name: "", address: "", phone: "", email: "", logo_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        business_name: settings.business_name ?? "",
        address: settings.address ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        logo_url: settings.logo_url ?? "",
      });
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("business_settings").update(form).eq("id", 1);
    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    await refreshSettings();
    showToast("Datos del negocio actualizados");
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
    if (error) {
      showToast("No se pudo subir el logo. Verifica que el bucket 'business-assets' exista.", "error");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
    setForm((f) => ({ ...f, logo_url: data.publicUrl }));
    setUploading(false);
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {form.logo_url ? (
            <img src={form.logo_url} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sin logo</span>
          )}
        </div>
        <div>
          <label className="btn btn-outline" style={{ display: "inline-flex", cursor: "pointer" }}>
            {uploading ? "Subiendo…" : "Subir logo"}
            <input type="file" accept="image/*" hidden onChange={handleLogoUpload} />
          </label>
        </div>
      </div>

      <Field label="Nombre del negocio" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
      <Field label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      <Field label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
      <Field label="Correo electrónico" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />

      <button className="btn btn-primary" style={{ marginTop: 8 }} disabled={saving} onClick={handleSave}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
