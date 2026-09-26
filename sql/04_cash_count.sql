-- =====================================================================
-- EL PARAÍSO — Script 4: arqueo de caja al cerrar
-- =====================================================================
-- Agrega dos columnas para poder anotar cuánto efectivo se contó
-- físicamente al cerrar la caja, y la diferencia contra lo esperado.
--
-- Pega TODO este archivo en Supabase → SQL Editor → New query → Run.
-- =====================================================================

alter table public.cash_registers add column if not exists counted_cash_amount numeric(10,2);
alter table public.cash_registers add column if not exists cash_difference numeric(10,2);

-- =====================================================================
-- FIN DEL SCRIPT 4
-- =====================================================================
