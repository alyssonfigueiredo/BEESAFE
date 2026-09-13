-- Usado só por scripts/import-cities.mjs com service_role. Não exposto a usuários.
create or replace function public.upsert_cities(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.cities (ibge_code, name, state, geom, centroid)
  select (r->>'ibge_code')::integer,
         r->>'name',
         r->>'state',
         st_multi(st_setsrid(st_geomfromgeojson(r->'geom'), 4326)),
         st_pointonsurface(st_setsrid(st_geomfromgeojson(r->'geom'), 4326))
  from jsonb_array_elements(p_rows) r
  on conflict (ibge_code) do update
    set name = excluded.name, state = excluded.state, geom = excluded.geom, centroid = excluded.centroid;
end $$;

revoke all on function public.upsert_cities(jsonb) from public, anon, authenticated;
