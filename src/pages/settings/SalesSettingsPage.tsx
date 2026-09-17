import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";

export default function SalesSettingsPage() {
  const { settings, refreshSettings } = useAppData();
  const { showToast } = useToast();
  const [lockerPrice, setLockerPrice] = useState("0");
  const [noLockerPrice, setNoLockerPrice] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setLockerPrice(String(settings.locker_price));
      setNoLockerPrice(String(settings.no_locker_price));
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("business_settings")
      .update({ locker_price: Number(lockerPrice), no_locker_price: Number(noLockerPrice) })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    await refreshSettings();
    showToast("Precios actualizados");
  }

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>
        Estos precios se aplicarán a las próximas ventas. Las ventas ya registradas conservan el precio con el que se vendieron.
      </p>
      <label className="label">Precio de casillero (por unidad)</label>
      <input className="input" type="number" min="0" value={lockerPrice} onChange={(e) => setLockerPrice(e.target.value)} />

      <label className="label" style={{ marginTop: 14 }}>
        Precio de venta sin casillero
      </label>
      <input className="input" type="number" min="0" value={noLockerPrice} onChange={(e) => setNoLockerPrice(e.target.value)} />

      <button className="btn btn-primary" style={{ marginTop: 18 }} disabled={saving} onClick={handleSave}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}
