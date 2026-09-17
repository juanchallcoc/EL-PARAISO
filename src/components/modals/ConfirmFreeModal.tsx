import { useState } from "react";
import ModalShell from "../ui/ModalShell";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../hooks/useToast";
import type { LockerWithStatus } from "../../types/database";

export default function ConfirmFreeModal({
  locker,
  onClose,
  onSuccess,
}: {
  locker: LockerWithStatus;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!locker.saleLockerId) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("sale_lockers")
      .update({ released_at: new Date().toISOString() })
      .eq("id", locker.saleLockerId);
    setSubmitting(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast(`${locker.code} desocupado`);
    onSuccess();
    onClose();
  }

  return (
    <ModalShell title="Confirmar" onClose={onClose} accent="#FF7A50" narrow>
      <p style={{ fontSize: 15, lineHeight: 1.6 }}>
        ¿Está seguro de desocupar <b>{locker.code}</b>
        {locker.customerName ? (
          <>
            , actualmente asignado a <b>{locker.customerName}</b>
          </>
        ) : null}
        ?
      </p>
      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-danger" disabled={submitting} onClick={handleConfirm}>
          {submitting ? "Desocupando…" : "Sí, desocupar"}
        </button>
      </div>
    </ModalShell>
  );
}
