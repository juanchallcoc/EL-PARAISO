import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, Receipt, Wallet, Users, Settings as SettingsIcon, Waves, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAppData } from "../../hooks/useAppData";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { activeRegister, settings } = useAppData();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const navItems = [
    { to: "/", label: "Casilleros", icon: LayoutGrid, end: true },
    { to: "/ventas", label: "Ventas del día", icon: Receipt },
    { to: "/caja", label: "Caja", icon: Wallet },
    { to: "/clientes", label: "Clientes", icon: Users },
  ];
  if (profile?.role === "admin") {
    navItems.push({ to: "/configuracion", label: "Configuración", icon: SettingsIcon });
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ background: "linear-gradient(135deg, #EFFBFC 0%, #FFF6EE 100%)" }}>
        <div className="container" style={{ paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--available)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Waves size={22} color="white" />
            </div>
            <div>
              <h1 className="display" style={{ fontSize: 22, margin: 0, lineHeight: 1 }}>
                {settings?.business_name || "El Paraíso"}
              </h1>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>Gestión de casilleros y ventas</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`badge ${activeRegister ? "badge-open" : "badge-closed"} hide-mobile`}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: activeRegister ? "var(--success)" : "var(--danger)", display: "inline-block" }} />
              {activeRegister ? "Caja abierta" : "Caja cerrada"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", borderRadius: 999, padding: "5px 14px 5px 5px" }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: "var(--accent)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                {profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500 }} className="hide-mobile">
                {profile?.full_name ?? "Usuario"}
              </span>
            </div>
            <button onClick={handleSignOut} className="btn-ghost" title="Cerrar sesión" style={{ padding: 8 }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <nav className="container nav-scroll" style={{ display: "flex", gap: 4, marginTop: 18 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 16px",
                borderRadius: "12px 12px 0 0",
                fontWeight: 500,
                fontSize: 14,
                whiteSpace: "nowrap",
                background: isActive ? "white" : "transparent",
                color: isActive ? "var(--text)" : "var(--text-muted)",
              })}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
        {children}
      </main>
    </div>
  );
}
