-- Migration 15: a ficha do bairro.
--
-- Os dois lados do app viviam em telas separadas: relato no Mapa, lugar em Lugares. A tese do
-- projeto — "ninguém no Brasil junta os dois" — não tinha nenhuma tela onde ela se provasse.
-- Esta é ela: uma área, o que aconteceu nela e onde a comunidade se sente bem dentro dela.
--
-- Também é o documento que um coletivo ou um grupo de comerciantes leva à subprefeitura pedindo
-- ronda e iluminação. A mesma informação que, embutida na nota de um bar, seria ameaça; solta,
-- como dado de área, é instrumento.

create or replace function public.neighborhood_summary(p_neighborhood_id integer, p_months integer default 12)
returns table (
  neighborhood_id integer,
  neighborhood text,
  city text,
  state char(2),
  total bigint,
  high bigint,
  last_occurrence date,
  by_type jsonb,
  by_setting jsonb,
  by_period jsonb,
  places_total bigint,
  places_rated bigint
)
language sql stable security definer set search_path = public, extensions as $$
  with janela as (
    select o.*
    from public.occurrences o
    where o.neighborhood_id = p_neighborhood_id
      and o.status = 'active'
      and o.occurrence_date >= current_date - (p_months || ' months')::interval
  )
  select
    n.id, n.name, c.name, c.state,
    (select count(*) from janela),
    (select count(*) from janela where severity = 'alta'),
    (select max(occurrence_date) from janela),
    -- Contagens agrupadas: a tela lê sem precisar de mais três consultas.
    (select coalesce(jsonb_object_agg(t, q), '{}'::jsonb)
       from (select type::text as t, count(*) as q from janela group by type) x),
    (select coalesce(jsonb_object_agg(s, q), '{}'::jsonb)
       from (select setting::text as s, count(*) as q from janela where setting is not null group by setting) x),
    (select coalesce(jsonb_object_agg(p, q), '{}'::jsonb)
       from (select period::text as p, count(*) as q from janela where period is not null group by period) x),
    (select count(*) from public.places pl where pl.neighborhood_id = n.id and pl.status = 'active'),
    (select count(*) from public.places pl
       join public.place_scores ps on ps.place_id = pl.id
      where pl.neighborhood_id = n.id and pl.status = 'active' and ps.rating_count > 0)
  from public.neighborhoods n
  join public.cities c on c.id = n.city_id
  where n.id = p_neighborhood_id;
$$;

revoke all on function public.neighborhood_summary(integer, integer) from anon;
grant execute on function public.neighborhood_summary(integer, integer) to authenticated;

-- Lugares do bairro, os avaliados primeiro. Mesmas colunas de welcoming_ranking, para a tela
-- reaproveitar o PlaceCard sem conversão.
create or replace function public.neighborhood_places(p_neighborhood_id integer, p_limit integer default 20)
returns table (
  id uuid, name text, category public.place_category, neighborhood text,
  score numeric, rating_count integer, flagged boolean, badge text, area_level text,
  score_welcome numeric, score_affection numeric, score_restroom numeric, score_crowd numeric,
  photo_name text, photo_author text, photo_author_uri text
)
language sql stable security invoker as $$
  select id, name, category, neighborhood, score, rating_count, flagged, badge, area_level,
         score_welcome, score_affection, score_restroom, score_crowd,
         photo_name, photo_author, photo_author_uri
  from public.public_places
  where neighborhood_id = p_neighborhood_id
  order by (rating_count > 0) desc, score desc nulls last, rating_count desc, name
  limit p_limit;
$$;

revoke all on function public.neighborhood_places(integer, integer) from anon;
grant execute on function public.neighborhood_places(integer, integer) to authenticated;

-- Relatos do bairro para a tela, já sem created_by (a view cuida disso).
create or replace function public.neighborhood_occurrences(p_neighborhood_id integer, p_limit integer default 30)
returns setof public.public_occurrences
language sql stable security invoker as $$
  select * from public.public_occurrences
  where neighborhood_id = p_neighborhood_id
  order by occurrence_date desc, created_at desc
  limit p_limit;
$$;

revoke all on function public.neighborhood_occurrences(integer, integer) from anon;
grant execute on function public.neighborhood_occurrences(integer, integer) to authenticated;
