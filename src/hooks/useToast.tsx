import { createContext, useContext, useState, type ReactNode } from "react";
import { Check, AlertTriangle } from "lucide-react";

interface ToastMsg {
  id: number;
  text: string;
  variant: "success" | "error";
}

interface ToastContextValue {
  showToast: (text: string, variant?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  function showToast(text: string, variant: "success" | "error" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 300, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            style={{ position: "static", transform: "none", background: t.variant === "error" ? "#D64545" : "#123B3E" }}
          >
            {t.variant === "error" ? <AlertTriangle size={16} color="#FFD3BC" /> : <Check size={16} color="#8FE3EC" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
