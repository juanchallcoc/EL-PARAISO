import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import SalesPage from "../pages/SalesPage";
import SaleReceiptPage from "../pages/SaleReceiptPage";
import CustomersPage from "../pages/CustomersPage";
import CashRegisterPage from "../pages/CashRegisterPage";
import CashHistoryPage from "../pages/CashHistoryPage";
import SettingsLayout from "../pages/settings/SettingsLayout";
import BusinessSettingsPage from "../pages/settings/BusinessSettingsPage";
import SalesSettingsPage from "../pages/settings/SalesSettingsPage";
import DiscountsSettingsPage from "../pages/settings/DiscountsSettingsPage";
import LockersSettingsPage from "../pages/settings/LockersSettingsPage";
import UsersSettingsPage from "../pages/settings/UsersSettingsPage";
import ProtectedRoute from "../components/layout/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/ventas",
    element: (
      <ProtectedRoute>
        <SalesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/ventas/:id",
    element: (
      <ProtectedRoute>
        <SaleReceiptPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/clientes",
    element: (
      <ProtectedRoute>
        <CustomersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/caja",
    element: (
      <ProtectedRoute>
        <CashRegisterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/caja/historial",
    element: (
      <ProtectedRoute requireRole={["admin"]}>
        <CashHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/configuracion",
    element: (
      <ProtectedRoute requireRole={["admin"]}>
        <SettingsLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <BusinessSettingsPage /> },
      { path: "negocio", element: <BusinessSettingsPage /> },
      { path: "ventas", element: <SalesSettingsPage /> },
      { path: "descuentos", element: <DiscountsSettingsPage /> },
      { path: "casilleros", element: <LockersSettingsPage /> },
      { path: "usuarios", element: <UsersSettingsPage /> },
    ],
  },
]);
