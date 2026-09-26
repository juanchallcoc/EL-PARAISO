-- =====================================================================
-- EL PARAÍSO — Script 3: corrección de create_sale
-- =====================================================================
-- Corrige dos cosas:
--  1) El error "column reference sale_number is ambiguous" al registrar
--     una venta.
--  2) La "Entrada sin casillero" ahora acepta CANTIDAD (antes solo
--     permitía 0 o 1, con un simple check).
--
-- Pega TODO este archivo en Supabase → SQL Editor → New query → Run.
-- No hace falta volver a correr los scripts 1 ni 2.
-- =====================================================================

-- Hay que borrar la función vieja primero, porque cambia uno de sus
-- parámetros (de boolean a entero) y Postgres la trataría como una
-- función distinta si no la borramos antes.
drop function if exists public.create_sale(uuid, uuid, numeric, text, uuid[], boolean, jsonb);

create or replace function public.create_sale(
  p_customer_id uuid,
  p_cash_register_id uuid,
  p_discount_percentage numeric,
  p_payment_method text,
  p_locker_ids uuid[],
  p_no_locker_quantity int,
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
  v_new_sale_id uuid;
  v_new_sale_number bigint;
  v_locker_id uuid;
  v_line jsonb;
  v_product record;
  v_qty int;
  v_active_rentals int;
  v_discount_pct numeric := coalesce(p_discount_percentage, 0);
  v_no_locker_qty int := coalesce(p_no_locker_quantity, 0);
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

  -- Subtotal: entrada sin casillero (por cantidad)
  if v_no_locker_qty > 0 then
    v_subtotal := v_subtotal + (v_settings.no_locker_price * v_no_locker_qty);
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
  returning sales.id, sales.sale_number into v_new_sale_id, v_new_sale_number;

  -- Casilleros: si alguno ya fue ocupado por otra venta en el mismo
  -- instante, esto falla y se cancela TODA la venta (nada a medias).
  if p_locker_ids is not null then
    foreach v_locker_id in array p_locker_ids loop
      begin
        insert into public.sale_lockers (sale_id, locker_id, unit_price)
        values (v_new_sale_id, v_locker_id, v_settings.locker_price);
      exception when unique_violation then
        raise exception 'Uno de los casilleros seleccionados ya fue ocupado. Actualiza la pantalla e inténtalo de nuevo.';
      end;
    end loop;
  end if;

  -- Entrada sin casillero (una sola línea con la cantidad indicada)
  if v_no_locker_qty > 0 then
    insert into public.sale_items (sale_id, product_id, product_name, product_type, quantity, unit_price, line_total)
    values (v_new_sale_id, null, 'Entrada sin casillero', 'service', v_no_locker_qty, v_settings.no_locker_price, v_settings.no_locker_price * v_no_locker_qty);
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
      values (v_new_sale_id, v_product.id, v_product.name, 'consumable', v_qty, v_product.price, v_product.price * v_qty);

    elsif v_product.type = 'rental' then
      select count(*) into v_active_rentals from public.sale_items
        where product_id = v_product.id and product_type = 'rental' and returned_at is null;
      if (v_active_rentals + v_qty) > v_product.stock_quantity then
        raise exception 'No hay suficientes unidades disponibles de "%": % en uso de % en total.', v_product.name, v_active_rentals, v_product.stock_quantity;
      end if;
      for i in 1..v_qty loop
        insert into public.sale_items (sale_id, product_id, product_name, product_type, quantity, unit_price, line_total)
        values (v_new_sale_id, v_product.id, v_product.name, 'rental', 1, v_product.price, v_product.price);
      end loop;
    end if;
  end loop;

  return query select v_new_sale_id, v_new_sale_number;
end;
$$;

grant execute on function public.create_sale(uuid, uuid, numeric, text, uuid[], int, jsonb) to authenticated;

-- =====================================================================
-- FIN DEL SCRIPT 3
-- =====================================================================
