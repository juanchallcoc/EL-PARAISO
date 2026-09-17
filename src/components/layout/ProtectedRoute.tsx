import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import type { Role } from "../../types/database";
import Layout from "./Layout";

export default function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: Role[];
}) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!profile || profile.role === "client" || (requireRole && !requireRole.includes(profile.role))) {
    return (
      <Layout>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <h2>Acceso no disponible</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Tu usuario no tiene permisos para ver esta sección. Si crees que es un error, contacta a un administrador.
          </p>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}
