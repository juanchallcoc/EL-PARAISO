import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";

export default function DiscountsSettingsPage() {
  const { settings, refreshSettings } = useAppData();
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [pct, setPct] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.discount_enabled);
      setPct(String(settings.discount_default_percentage));
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("business_settings")
      .update({ discount_enabled: enabled, discount_default_percentage: Number(pct) })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    await refreshSettings();
    showToast("Configuración de descuentos actualizada");
  }

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, marginBottom: 16 }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Los descuentos están habilitados en ventas
      </label>

      <label className="label">Porcentaje de descuento predeterminado</label>
      <input className="input" type="number" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} disabled={!enabled} />

      <button className="btn btn-primary" style={{ marginTop: 18 }} disabled={saving} onClick={handleSave}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}
