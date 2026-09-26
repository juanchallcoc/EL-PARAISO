import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";

type LogoField = "logo_url" | "logo_receipt_url" | "favicon_url";

export default function BusinessSettingsPage() {
  const { settings, refreshSettings } = useAppData();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    business_name: "",
    address: "",
    phone: "",
    email: "",
    logo_url: "",
    logo_receipt_url: "",
    favicon_url: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        business_name: settings.business_name ?? "",
        address: settings.address ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        logo_url: settings.logo_url ?? "",
        logo_receipt_url: settings.logo_receipt_url ?? "",
        favicon_url: settings.favicon_url ?? "",
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

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <p className="label" style={{ marginBottom: 10 }}>
        Logos
      </p>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <LogoUploader
          field="logo_url"
          label="Logo principal (encabezado)"
          hint="Rectangular, ej. 300 × 200 px"
          shape="rect"
          value={form.logo_url}
          onUploaded={(url) => setForm((f) => ({ ...f, logo_url: url }))}
        />
        <LogoUploader
          field="logo_receipt_url"
          label="Logo para comprobantes"
          hint="Rectangular, funciona bien en blanco y negro"
          shape="rect"
          value={form.logo_receipt_url}
          onUploaded={(url) => setForm((f) => ({ ...f, logo_receipt_url: url }))}
        />
        <LogoUploader
          field="favicon_url"
          label="Ícono de la pestaña"
          hint="Cuadrado, ej. 64 × 64 px"
          shape="square"
          value={form.favicon_url}
          onUploaded={(url) => setForm((f) => ({ ...f, favicon_url: url }))}
        />
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

function LogoUploader({
  field,
  label,
  hint,
  shape,
  value,
  onUploaded,
}: {
  field: LogoField;
  label: string;
  hint: string;
  shape: "rect" | "square";
  value: string;
  onUploaded: (url: string) => void;
}) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${field}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
    if (error) {
      showToast("No se pudo subir la imagen. Verifica que el bucket 'business-assets' exista.", "error");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
    onUploaded(data.publicUrl);
    setUploading(false);
  }

  const boxStyle = shape === "rect" ? { width: 96, height: 64 } : { width: 64, height: 64 };

  return (
    <div style={{ width: 150 }}>
      <div
        style={{
          ...boxStyle,
          borderRadius: 12,
          background: "var(--bg)",
          border: "1.5px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        {value ? (
          <img src={value} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", padding: 4 }}>Sin imagen</span>
        )}
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px" }}>{hint}</p>
      <label className="btn btn-outline" style={{ display: "inline-flex", cursor: "pointer", fontSize: 12, padding: "6px 10px" }}>
        {uploading ? "Subiendo…" : "Subir imagen"}
        <input type="file" accept="image/*" hidden onChange={handleUpload} />
      </label>
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
