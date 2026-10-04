-- Lugares perto de quem está usando, em qualquer cidade (04/10/2026, achado pelo Leandro em Pinhais).
-- A aba Lugares carregava os 1.000 lugares da cidade escolhida (os com nota primeiro) e só depois
-- ordenava pela distância: em Pinhais, com Curitiba escolhida, a lista vinha do centro de Curitiba.
-- Aqui o banco devolve os mais próximos do ponto, de qualquer município, pelo índice espacial
-- (places_location_gix): raio de até 30 km, no máximo 200.

create or replace function public.places_near(
  p_lat double precision,
  p_lng double precision,
  p_category text default null,
  p_limit integer default 150
)
returns setof public.public_places
language sql stable security definer set search_path = public, extensions as $$
  with ponto as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g)
  select pp.*
  from public.places p
  cross join ponto
  join public.public_places pp on pp.id = p.id
  where p.status = 'active'
    and st_dwithin(p.location, ponto.g, 30000)
    and (p_category is null or p.category::text = p_category)
  order by p.location <-> ponto.g
  limit least(greatest(coalesce(p_limit, 150), 1), 200);
$$;

revoke all on function public.places_near(double precision, double precision, text, integer) from public, anon;
grant execute on function public.places_near(double precision, double precision, text, integer) to authenticated;
