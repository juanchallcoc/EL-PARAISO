import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Cliente "desechable": mismo proyecto, misma clave pública (anon key),
 * pero SIN persistir sesión. Se usa únicamente para dar de alta usuarios
 * nuevos (signUp) desde el panel de administración, evitando que la
 * sesión del administrador que está creando el usuario sea reemplazada
 * por la sesión del usuario recién creado.
 *
 * No usa la service_role key en ningún momento.
 */
export const supabaseAdmin = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
