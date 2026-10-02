-- O seletor "Foi em um lugar cadastrado?" do relato filtrava o lote de 1.000 lugares da cidade
-- no celular. Em Curitiba (~10 mil) o bar onde aconteceu podia estar fora do lote. Agora o banco
-- devolve os lugares num raio do ponto, do mais perto para o mais longe.
create or replace function public.places_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 300,
  p_limit integer default 20
)
returns table (
  id uuid,
  name text,
  category text,
  latitude double precision,
  longitude double precision,
  distance_m double precision
)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.name, p.category::text, p.latitude, p.longitude,
         st_distance(
           st_setsrid(st_makepoint(p.longitude, p.latitude), 4326)::geography,
           st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
         ) as distance_m
  from public.public_places p
  where st_dwithin(
          st_setsrid(st_makepoint(p.longitude, p.latitude), 4326)::geography,
          st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
          least(greatest(coalesce(p_radius_m, 300), 1), 2000)
        )
  order by distance_m
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.places_nearby(double precision, double precision, integer, integer) from public, anon;
grant execute on function public.places_nearby(double precision, double precision, integer, integer) to authenticated;
