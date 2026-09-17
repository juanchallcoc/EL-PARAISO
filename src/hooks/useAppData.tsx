import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { BusinessSettings, CashRegister } from "../types/database";
import { useAuth } from "./useAuth";

interface AppDataContextValue {
  settings: BusinessSettings | null;
  activeRegister: CashRegister | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  refreshRegister: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshSettings() {
    const { data } = await supabase.from("business_settings").select("*").eq("id", 1).single();
    setSettings(data as BusinessSettings | null);
  }

  async function refreshRegister() {
    const { data } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveRegister((data as CashRegister | null) ?? null);
  }

  useEffect(() => {
    if (!session) {
      setSettings(null);
      setActiveRegister(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([refreshSettings(), refreshRegister()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  return (
    <AppDataContext.Provider value={{ settings, activeRegister, loading, refreshSettings, refreshRegister }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData debe usarse dentro de <AppDataProvider>");
  return ctx;
}
