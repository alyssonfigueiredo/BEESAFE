-- Mapa por área visível (15/10/2026, análise de ponta a ponta do Leandro).
-- O mapa carregava o mesmo lote de até 1.000 lugares da cidade que a aba Lugares (usePlaces,
-- ordenado por nota e data), sem olhar pra onde a câmera está. Em Curitiba, com ~10.700 lugares
-- depois do Overture, o mapa sempre mostrava o mesmo recorte de 1.000, não importa pra onde a
-- pessoa navegasse. Esta função devolve os lugares dentro do retângulo visível da câmera (bbox),
-- então o app pode recarregar ao mover/dar zoom, como mapa de verdade. Mesmo índice espacial
-- geography de places_near (places_location_gix).

create or replace function public.places_in_bbox(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer default 500
)
returns setof public.public_places
language sql stable security definer set search_path = public, extensions as $$
  select pp.*
  from public.places p
  join public.public_places pp on pp.id = p.id
  where p.status = 'active'
    and p.location && st_makeenvelope(
      least(p_west, p_east), least(p_south, p_north),
      greatest(p_west, p_east), greatest(p_south, p_north),
      4326
    )::geography
  order by pp.rating_count desc nulls last, pp.created_at desc
  limit least(greatest(coalesce(p_limit, 500), 1), 800);
$$;

revoke all on function public.places_in_bbox(double precision, double precision, double precision, double precision, integer) from public, anon;
grant execute on function public.places_in_bbox(double precision, double precision, double precision, double precision, integer) to authenticated;
