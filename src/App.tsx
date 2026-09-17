import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { AppDataProvider } from "./hooks/useAppData";
import { ToastProvider } from "./hooks/useToast";
import { router } from "./routes/router";

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AppDataProvider>
    </AuthProvider>
  );
}
