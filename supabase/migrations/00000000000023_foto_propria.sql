-- Foto própria do lugar (Mapillary agora, usuário depois), guardada no nosso storage.
--
-- Por que não basta o Google: a foto do Google não pode ser baixada nem republicada, e a
-- referência vence em 30 dias — por isso a migration 9 só guarda o ponteiro e o app pede a
-- imagem ao Google na hora, dentro de uma cota diária. Uma capital inteira leva meses de cota.
--
-- O Mapillary (fotos de rua colaborativas, hoje da Meta) publica as imagens em CC-BY-SA 4.0:
-- pode baixar, guardar e mostrar, desde que o crédito apareça. Então aqui a URL é nossa
-- (Cloudflare R2, bucket público), não vence, não gasta cota e continua valendo offline do
-- Google. `photo_source` diz de onde veio para o app escrever o crédito certo.
--
-- Precedência no app: foto própria primeiro; sem ela, cai na do Google; sem as duas, o azulejo
-- da categoria. Quem preenche é scripts/mapillary-photos.mjs, na máquina do mantenedor.

alter table public.places
  add column photo_url text,
  -- 'mapillary' | 'usuario' (quando o envio pelo app existir) | 'wikimedia'
  add column photo_source text check (photo_source in ('mapillary', 'usuario', 'wikimedia')),
  add column photo_credit text,
  add column photo_credit_uri text,
  add column photo_at timestamptz,
  -- Guarda o que já foi tentado: sem isso o script repete os mesmos lugares sem foto por perto.
  add column photo_tried_at timestamptz;

comment on column public.places.photo_url is
  'Foto que é nossa de verdade (R2). Não vence: ao contrário da do Google, pode ficar guardada.';

create index places_sem_foto_idx on public.places (city_id)
  where status = 'active' and photo_url is null;

create or replace view public.public_places with (security_invoker = false) as
select p.id, p.name, p.category, p.address, p.city_id, p.neighborhood_id,
       n.name as neighborhood, c.name as city, c.state, p.verified, p.created_at,
       st_y(p.location::geometry) as latitude, st_x(p.location::geometry) as longitude,
       s.score, s.rating_count, s.recent_occurrences, s.recent_high_occurrences, s.flagged,
       s.score_welcome, s.score_affection, s.score_restroom, s.score_crowd,
       s.rating_stddev, s.recent_on_site, s.badge,
       case when p.google_photo_at > now() - interval '30 days' then p.google_photo_name end as photo_name,
       case when p.google_photo_at > now() - interval '30 days' then p.google_photo_author end as photo_author,
       case when p.google_photo_at > now() - interval '30 days' then p.google_photo_author_uri end as photo_author_uri,
       s.area_score, s.area_level,
       -- Coluna nova de view só pode entrar no fim: create or replace recusa mudança de posição.
       p.photo_url, p.photo_source, p.photo_credit, p.photo_credit_uri
from public.places p
join public.cities c on c.id = p.city_id
left join public.neighborhoods n on n.id = p.neighborhood_id
left join public.place_scores s on s.place_id = p.id
where p.status = 'active';

revoke all on public.public_places from anon;
grant select on public.public_places to authenticated;

-- As duas funções que alimentam o PlaceCard carregam as colunas novas junto.
drop function if exists public.welcoming_ranking(integer, integer);
create function public.welcoming_ranking(p_city_id integer, p_limit integer default 10)
returns table (
  id uuid, name text, category public.place_category, neighborhood text,
  score numeric, rating_count integer, flagged boolean, badge text, area_level text,
  score_welcome numeric, score_affection numeric, score_restroom numeric, score_crowd numeric,
  photo_name text, photo_author text, photo_author_uri text,
  photo_url text, photo_source text, photo_credit text, photo_credit_uri text
)
language sql stable security invoker as $$
  select id, name, category, neighborhood, score, rating_count, flagged, badge, area_level,
         score_welcome, score_affection, score_restroom, score_crowd,
         photo_name, photo_author, photo_author_uri,
         photo_url, photo_source, photo_credit, photo_credit_uri
  from public.public_places
  where city_id = p_city_id and rating_count >= 5 and score is not null
    and coalesce(badge, '') <> 'atencao'
  order by score desc, rating_count desc
  limit p_limit;
$$;

revoke all on function public.welcoming_ranking(integer, integer) from anon;
grant execute on function public.welcoming_ranking(integer, integer) to authenticated;

drop function if exists public.neighborhood_places(integer, integer);
create function public.neighborhood_places(p_neighborhood_id integer, p_limit integer default 20)
returns table (
  id uuid, name text, category public.place_category, neighborhood text,
  score numeric, rating_count integer, flagged boolean, badge text, area_level text,
  score_welcome numeric, score_affection numeric, score_restroom numeric, score_crowd numeric,
  photo_name text, photo_author text, photo_author_uri text,
  photo_url text, photo_source text, photo_credit text, photo_credit_uri text
)
language sql stable security invoker as $$
  select id, name, category, neighborhood, score, rating_count, flagged, badge, area_level,
         score_welcome, score_affection, score_restroom, score_crowd,
         photo_name, photo_author, photo_author_uri,
         photo_url, photo_source, photo_credit, photo_credit_uri
  from public.public_places
  where neighborhood_id = p_neighborhood_id
  order by (rating_count > 0) desc, score desc nulls last, rating_count desc, name
  limit p_limit;
$$;

revoke all on function public.neighborhood_places(integer, integer) from anon;
grant execute on function public.neighborhood_places(integer, integer) to authenticated;
