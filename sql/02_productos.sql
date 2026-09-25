-- =====================================================================
-- EL PARAÍSO — Script 2: Módulo de Productos (venta combinada)
-- =====================================================================
-- Este script se ejecuta UNA SOLA VEZ, DESPUÉS del script original
-- (sql/schema.sql). Si ya tienes tu base de datos funcionando, solo
-- necesitas correr este archivo — no vuelvas a correr el schema.sql.
--
-- Qué agrega:
--  - Tabla "products": tu inventario (comida, snacks, alquiler de shorts, etc.)
--  - Tabla "sale_items": los productos que se venden dentro de cada venta
--  - Una función especial "create_sale" que registra la venta completa
--    (casilleros + productos + entrada sin casillero) de una sola vez,
--    de forma segura: si algo falla, no se cobra nada a medias.
--
-- Cómo usarlo: copia TODO este archivo y pégalo en Supabase → SQL Editor
-- → New query → Run.
-- =====================================================================


-- =====================================================================
-- 1) TABLA: products (tu inventario)
-- =====================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('consumable','rental')),
  price numeric(10,2) not null default 0,
  stock_quantity numeric(10,2) not null default 0,
  low_stock_threshold numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.products.type is
  'consumable = se vende y se resta del stock (comida, snacks, bebidas). rental = se alquila y se devuelve (shorts, flotadores, etc.), no se resta permanentemente.';


-- =====================================================================
-- 2) TABLA: sale_items (líneas de producto dentro de una venta)
-- =====================================================================
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  product_type text not null check (product_type in ('consumable','rental','service')),
  quantity int not null default 1,
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null,
  returned_at timestamptz,
  created_at timestamptz not null default now()
);
-- 'service' es un tipo interno reservado para la "Entrada sin casillero"
-- (no está ligado a un producto real, product_id queda en null en ese caso).

-- Un producto de alquiler solo puede tener UNA fila "activa" (sin
-- devolver) por unidad rentada — cada unidad rentada es su propia fila,
-- igual que cada casillero es su propia fila en sale_lockers.
create index if not exists sale_items_active_rentals_idx
  on public.sale_items(product_id) where product_type = 'rental' and returned_at is null;


-- =====================================================================
-- 3) AJUSTES a tablas existentes
-- =====================================================================

-- "sale_lockers" ahora guarda su propio precio (antes vivía en "sales").
alter table public.sale_lockers add column if not exists unit_price numeric(10,2) not null default 0;
update public.sale_lockers set unit_price = coalesce((select locker_price from public.business_settings where id = 1), 0)
  where unit_price = 0;

-- "sales" deja de tener una sola línea (unit_price/quantity/sale_type):
-- ahora una venta puede combinar casilleros + productos + alquileres,
-- así que esos datos ahora viven en sale_lockers y sale_items.
alter table public.sales drop column if exists sale_type;
alter table public.sales drop column if exists unit_price;
alter table public.sales drop column if exists quantity;


-- =====================================================================
-- 4) SEGURIDAD: activar RLS en las tablas nuevas
-- =====================================================================
alter table public.products enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select using (public.get_my_role() in ('admin','staff'));

drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products
  for insert with check (public.get_my_role() in ('admin','staff'));

drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products
  for update using (public.get_my_role() in ('admin','staff'));

drop policy if exists "sale_items_select" on public.sale_items;
create policy "sale_items_select" on public.sale_items
  for select using (public.get_my_role() in ('admin','staff'));

drop policy if exists "sale_items_update" on public.sale_items;
create policy "sale_items_update" on public.sale_items
  for update using (public.get_my_role() in ('admin','staff'));

-- (No se necesita policy de "insert" para sale_items ni sales ni
-- sale_lockers cuando la venta se registra por la función create_sale
-- de más abajo, porque esa función corre con permisos elevados
-- controlados — pero igual la dejamos activada por si se usa en el
-- futuro desde otro lugar.)
drop policy if exists "sale_items_insert" on public.sale_items;
create policy "sale_items_insert" on public.sale_items
  for insert with check (public.get_my_role() in ('admin','staff'));


-- =====================================================================
-- 5) FUNCIÓN: create_sale
--    Registra una venta completa (casilleros + entrada sin casillero +
--    productos) de forma atómica: todo se guarda junto, o no se guarda
--    nada. Evita ventas "a medias" si algo falla en el camino.
-- =====================================================================
create or replace function public.create_sale(
  p_customer_id uuid,
  p_cash_register_id uuid,
  p_discount_percentage numeric,
  p_payment_method text,
  p_locker_ids uuid[],
  p_include_no_locker_fee boolean,
  p_product_lines jsonb
)
returns table (sale_id uuid, sale_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_settings record;
  v_register record;
  v_subtotal numeric := 0;
  v_discount_amount numeric := 0;
  v_total numeric := 0;
  v_sale_id uuid;
  v_sale_number bigint;
  v_locker_id uuid;
  v_line jsonb;
  v_product record;
  v_qty int;
  v_active_rentals int;
  v_discount_pct numeric := coalesce(p_discount_percentage, 0);
begin
  v_role := public.get_my_role();
  if v_role not in ('admin','staff') then
    raise exception 'No tienes permiso para registrar ventas.';
  end if;

  select * into v_register from public.cash_registers
    where id = p_cash_register_id and status = 'open';
  if not found then
    raise exception 'No hay una caja abierta. Abre la caja antes de registrar ventas.';
  end if;

  select * into v_settings from public.business_settings where id = 1;
  if not v_settings.discount_enabled then
    v_discount_pct := 0;
  end if;

  -- Subtotal: casilleros
  v_subtotal := v_subtotal + (coalesce(array_length(p_locker_ids, 1), 0) * v_settings.locker_price);

  -- Subtotal: entrada sin casillero
  if p_include_no_locker_fee then
    v_subtotal := v_subtotal + v_settings.no_locker_price;
  end if;

  -- Subtotal: productos (y validación de que existan y estén activos)
  for v_line in select * from jsonb_array_elements(coalesce(p_product_lines, '[]'::jsonb))
  loop
    select * into v_product from public.products
      where id = (v_line->>'product_id')::uuid and active = true;
    if not found then
      raise exception 'Uno de los productos seleccionados ya no está disponible.';
    end if;
    v_subtotal := v_subtotal + (v_product.price * (v_line->>'quantity')::int);
  end loop;

  v_discount_amount := round(v_subtotal * (v_discount_pct / 100), 2);
  v_total := v_subtotal - v_discount_amount;

  insert into public.sales (customer_id, user_id, cash_register_id, subtotal, discount_percentage, discount_amount, total, payment_method)
  values (p_customer_id, auth.uid(), p_cash_register_id, v_subtotal, v_discount_pct, v_discount_amount, v_total, p_payment_method)
  returning id, sale_number into v_sale_id, v_sale_number;

  -- Casilleros: si alguno ya fue ocupado por otra venta en el mismo
  -- instante, esto falla y se cancela TODA la venta (nada a medias).
  if p_locker_ids is not null then
    foreach v_locker_id in array p_locker_ids loop
      begin
        insert into public.sale_lockers (sale_id, locker_id, unit_price)
        values (v_sale_id, v_locker_id, v_settings.locker_price);
      exception when unique_violation then
        raise exception 'Uno de los casilleros seleccionados ya fue ocupado. Actualiza la pantalla e inténtalo de nuevo.';
      end;
    end loop;
  end if;

  -- Entrada sin casillero
  if p_include_no_locker_fee then
    insert into public.sale_items (sale_id, product_id, product_name, product_type, quantity, unit_price, line_total)
    values (v_sale_id, null, 'Entrada sin casillero', 'service', 1, v_settings.no_locker_price, v_settings.no_locker_price);
  end if;

  -- Productos
  for v_line in select * from jsonb_array_elements(coalesce(p_product_lines, '[]'::jsonb))
  loop
    select * into v_product from public.products where id = (v_line->>'product_id')::uuid;
    v_qty := (v_line->>'quantity')::int;

    if v_product.type = 'consumable' then
      if v_product.stock_quantity < v_qty then
        raise exception 'Stock insuficiente de "%": quedan % y se pidieron %.', v_product.name, v_product.stock_quantity, v_qty;
      end if;
      update public.products set stock_quantity = stock_quantity - v_qty, updated_at = now() where id = v_product.id;
      insert into public.sale_items (sale_id, product_id, product_name, product_type, quantity, unit_price, line_total)
      values (v_sale_id, v_product.id, v_product.name, 'consumable', v_qty, v_product.price, v_product.price * v_qty);

    elsif v_product.type = 'rental' then
      select count(*) into v_active_rentals from public.sale_items
        where product_id = v_product.id and product_type = 'rental' and returned_at is null;
      if (v_active_rentals + v_qty) > v_product.stock_quantity then
        raise exception 'No hay suficientes unidades disponibles de "%": % en uso de % en total.', v_product.name, v_active_rentals, v_product.stock_quantity;
      end if;
      for i in 1..v_qty loop
        insert into public.sale_items (sale_id, product_id, product_name, product_type, quantity, unit_price, line_total)
        values (v_sale_id, v_product.id, v_product.name, 'rental', 1, v_product.price, v_product.price);
      end loop;
    end if;
  end loop;

  return query select v_sale_id, v_sale_number;
end;
$$;

grant execute on function public.create_sale(uuid, uuid, numeric, text, uuid[], boolean, jsonb) to authenticated;

-- =====================================================================
-- FIN DEL SCRIPT 2
-- =====================================================================
