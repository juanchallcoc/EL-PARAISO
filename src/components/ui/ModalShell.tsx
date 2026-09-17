import { X } from "lucide-react";
import type { ReactNode } from "react";

export default function ModalShell({
  title,
  onClose,
  children,
  accent = "#1FA6B8",
  narrow = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  accent?: string;
  narrow?: boolean;
}) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${narrow ? "narrow" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 className="display" style={{ fontSize: 20, margin: 0, color: accent }}>
            {title}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
