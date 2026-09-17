import { Banknote, QrCode, CreditCard } from "lucide-react";
import type { PaymentMethod } from "../../types/database";

const options: { key: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { key: "cash", label: "Efectivo", icon: Banknote },
  { key: "qr", label: "QR", icon: QrCode },
  { key: "transfer", label: "Transferencia", icon: CreditCard },
];

export default function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={value === o.key ? "btn-outline" : "btn-ghost"}
          style={{
            flex: 1,
            border: value === o.key ? "1.5px solid var(--available)" : "1.5px solid var(--border)",
            color: value === o.key ? "#0e7c8a" : "var(--text-muted)",
          }}
        >
          <o.icon size={15} /> {o.label}
        </button>
      ))}
    </div>
  );
}
