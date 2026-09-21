-- Foto do estabelecimento via Google Places (New).
--
-- O OSM não tem foto. O Google tem, dentro de uma cota mensal gratuita, com duas regras de uso
-- que este esquema respeita:
--   1. o place_id pode ficar guardado para sempre; o resto (nome da foto, autor) só por 30 dias.
--      A view abaixo esconde a foto vencida, então o app nunca mostra referência velha, mesmo
--      que o script de atualização atrase.
--   2. a imagem em si nunca é gravada aqui: o app pede ao Google na hora de exibir, com o
--      crédito do autor ao lado.
-- Quem preenche é scripts/google-place-photos.mjs, na máquina do mantenedor.

alter table public.places
  add column google_place_id text,
  add column google_photo_name text,
  add column google_photo_author text,
  add column google_photo_author_uri text,
  add column google_photo_at timestamptz;

create index places_google_place_idx on public.places (google_place_id) where google_place_id is not null;

create or replace view public.public_places with (security_invoker = false) as
select p.id, p.name, p.category, p.address, p.city_id, p.neighborhood_id,
       n.name as neighborhood, c.name as city, c.state, p.verified, p.created_at,
       st_y(p.location::geometry) as latitude, st_x(p.location::geometry) as longitude,
       s.score, s.rating_count, s.recent_occurrences, s.recent_high_occurrences, s.flagged,
       s.score_welcome, s.score_affection, s.score_restroom, s.score_crowd,
       s.rating_stddev, s.recent_on_site, s.badge,
       -- Referência de foto só enquanto está dentro dos 30 dias permitidos.
       case when p.google_photo_at > now() - interval '30 days' then p.google_photo_name end as photo_name,
       case when p.google_photo_at > now() - interval '30 days' then p.google_photo_author end as photo_author,
       case when p.google_photo_at > now() - interval '30 days' then p.google_photo_author_uri end as photo_author_uri
from public.places p
join public.cities c on c.id = p.city_id
left join public.neighborhoods n on n.id = p.neighborhood_id
left join public.place_scores s on s.place_id = p.id
where p.status = 'active';

revoke all on public.public_places from anon;
grant select on public.public_places to authenticated;

drop function if exists public.welcoming_ranking(integer, integer);
create function public.welcoming_ranking(p_city_id integer, p_limit integer default 10)
returns table (
  id uuid, name text, category public.place_category, neighborhood text,
  score numeric, rating_count integer, flagged boolean, badge text,
  score_welcome numeric, score_affection numeric, score_restroom numeric, score_crowd numeric,
  photo_name text, photo_author text, photo_author_uri text
)
language sql stable security invoker as $$
  select id, name, category, neighborhood, score, rating_count, flagged, badge,
         score_welcome, score_affection, score_restroom, score_crowd,
         photo_name, photo_author, photo_author_uri
  from public.public_places
  where city_id = p_city_id and rating_count >= 5 and score is not null
    and coalesce(badge, '') <> 'atencao'
  order by score desc, rating_count desc
  limit p_limit;
$$;
