import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/configuracion/negocio", label: "Negocio" },
  { to: "/configuracion/ventas", label: "Ventas y precios" },
  { to: "/configuracion/descuentos", label: "Descuentos" },
  { to: "/configuracion/casilleros", label: "Casilleros" },
  { to: "/configuracion/usuarios", label: "Usuarios" },
];

export default function SettingsLayout() {
  return (
    <div>
      <h2 className="display" style={{ fontSize: 22, marginTop: 0, marginBottom: 16 }}>
        Configuración
      </h2>
      <div className="nav-scroll" style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1.5px solid var(--border)" }}>
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            style={({ isActive }) => ({
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: "nowrap",
              color: isActive ? "var(--available)" : "var(--text-muted)",
              borderBottom: isActive ? "2.5px solid var(--available)" : "2.5px solid transparent",
              marginBottom: -2,
            })}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
