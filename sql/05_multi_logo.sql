-- =====================================================================
-- EL PARAÍSO — Script 5: tres logos distintos
-- =====================================================================
-- Antes había un solo logo para todo. Ahora se pueden subir tres,
-- cada uno para su propio uso:
--  - logo_url          → el que ya tenías, se usa en el encabezado
--                         de la app (pantalla principal).
--  - logo_receipt_url   → el que aparece en los comprobantes PDF.
--  - favicon_url        → el ícono chiquito en la pestaña del navegador.
--
-- Pega TODO este archivo en Supabase → SQL Editor → New query → Run.
-- =====================================================================

alter table public.business_settings add column if not exists logo_receipt_url text;
alter table public.business_settings add column if not exists favicon_url text;

-- =====================================================================
-- FIN DEL SCRIPT 5
-- =====================================================================
