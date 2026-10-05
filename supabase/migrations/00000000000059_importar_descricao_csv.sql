-- Importar description de lugares por CSV, pelo painel (05/10/2026, pedido do Alysson: ele quer
-- subir pelo admin em vez de colar SQL toda vez). Recebe uma lista {nome, lat, lng, descricao} e
-- casa pelo ponto (mesma tolerância dos scripts avulsos, ~10 m), só em lugar ativo e sem
-- description ainda — nunca sobrescreve o que já foi escrito à mão.
create or replace function public.admin_import_place_descriptions(p_items jsonb)
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare v_total integer := 0;
begin
  perform public.admin_guard(false);
  with achados as (
    select (item->>'lat')::double precision as lat,
           (item->>'lng')::double precision as lng,
           nullif(btrim(item->>'descricao'), '') as descricao
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  ), atualizados as (
    update public.places p
    set description = a.descricao
    from achados a
    where p.status = 'active'
      and p.description is null
      and a.descricao is not null
      and abs(st_y(p.location::geometry) - a.lat) < 0.0001
      and abs(st_x(p.location::geometry) - a.lng) < 0.0001
    returning p.id
  )
  select count(*) into v_total from atualizados;
  return v_total;
end $$;
revoke all on function public.admin_import_place_descriptions(jsonb) from public, anon;
grant execute on function public.admin_import_place_descriptions(jsonb) to authenticated;
