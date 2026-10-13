create or replace function public.city_centroids_for_cnpj()
returns table(city_id integer, lon double precision, lat double precision)
language sql stable security definer
set search_path = public, extensions
as $$
  select id, st_x(centroid)::double precision, st_y(centroid)::double precision
  from cities
  where centroid is not null;
$$;
