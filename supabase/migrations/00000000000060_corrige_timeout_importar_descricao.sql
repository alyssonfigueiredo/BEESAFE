-- Corrige timeout do admin_import_place_descriptions (migration 59): a comparação por
-- abs(st_y(...)) não usa o índice espacial (places_location_gix) e varre a tabela inteira
-- (~154 mil lugares) pra cada linha do CSV — deu "canceling statement due to statement timeout"
-- com 563 linhas. st_dwithin usa o índice GiST (geography), é o mesmo padrão de places_near.
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
      and st_dwithin(p.location, st_setsrid(st_makepoint(a.lng, a.lat), 4326)::geography, 15)
    returning p.id
  )
  select count(*) into v_total from atualizados;
  return v_total;
end $$;
