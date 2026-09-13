-- Usado só por scripts/import-cities.mjs com service_role. Não exposto a usuários.
create or replace function public.upsert_cities(p_rows jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into public.cities (ibge_code, name, state, geom, centroid)
  select (r->>'ibge_code')::integer,
         r->>'name',
         r->>'state',
         st_multi(st_setsrid(st_geomfromgeojson((r->'geom')::text), 4326)),
         st_pointonsurface(st_setsrid(st_geomfromgeojson((r->'geom')::text), 4326))
  from jsonb_array_elements(p_rows) r
  on conflict (ibge_code) do update
    set name = excluded.name, state = excluded.state, geom = excluded.geom, centroid = excluded.centroid;
end $$;

revoke all on function public.upsert_cities(jsonb) from public, anon, authenticated;

-- Bairros vindos do OSM. Só grava bairros cujo polígono cai dentro do município (evita lixo do Overpass).
create or replace function public.upsert_neighborhoods(p_city_ibge integer, p_rows jsonb)
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare v_city_id integer; v_count integer;
begin
  select id into v_city_id from public.cities where ibge_code = p_city_ibge;
  if v_city_id is null then
    raise exception 'Município % não importado. Rode scripts/import-cities.mjs antes.', p_city_ibge;
  end if;
  with src as (
    select r->>'name' as name,
           st_multi(st_makevalid(st_setsrid(st_geomfromgeojson((r->'geom')::text), 4326))) as geom
    from jsonb_array_elements(p_rows) r
  ), ok as (
    select s.name, s.geom from src s
    join public.cities c on c.id = v_city_id
    where st_intersects(c.geom, st_pointonsurface(s.geom))
  ), ins as (
    insert into public.neighborhoods (city_id, name, geom)
    select v_city_id, name, geom from ok
    on conflict (city_id, name) do update set geom = excluded.geom
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end $$;

revoke all on function public.upsert_neighborhoods(integer, jsonb) from public, anon, authenticated;
