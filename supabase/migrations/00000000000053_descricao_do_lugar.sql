-- Resumo/descrição do lugar, escrito por vocês (Alysson/Leandro) — nunca raspado de fora, nunca
-- gerado por IA sem revisão. Serve pra dar contexto real num lugar sem nota (a maioria hoje) e
-- vira mais um dado de verdade pro Gemini explicar o motivo de uma sugestão no Irise.
--
-- Pra preencher, uma por uma, pelo SQL Editor:
--   update public.places set description = 'Bar de esquina, ambiente intimista, música ao vivo às sextas.'
--   where id = '00000000-0000-0000-0000-000000000000';
-- Em lote: quando tiver um arquivo (CSV/planilha) com nome + cidade + resumo, me manda uma amostra
-- que eu escrevo o script de import casando pelo nome (mesma lógica do anti-duplicata).

alter table public.places add column description text check (char_length(description) <= 600);
comment on column public.places.description is
  'Resumo escrito por nós (nunca raspado, nunca gerado por IA sem revisão humana). Opcional.';

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
       p.photo_url, p.photo_source, p.photo_credit, p.photo_credit_uri,
       p.description
from public.places p
join public.cities c on c.id = p.city_id
left join public.neighborhoods n on n.id = p.neighborhood_id
left join public.place_scores s on s.place_id = p.id
where p.status = 'active';

revoke all on public.public_places from anon;
grant select on public.public_places to authenticated;

-- As três funções que devolvem lugar com coluna explícita (não "setof public_places") ganham
-- description no fim, pelo mesmo motivo de sempre: create or replace recusa mudar o retorno.
drop function if exists public.welcoming_ranking(integer, integer);
create function public.welcoming_ranking(p_city_id integer, p_limit integer default 10)
returns table (
  id uuid, name text, category public.place_category, neighborhood text,
  score numeric, rating_count integer, flagged boolean, badge text, area_level text,
  score_welcome numeric, score_affection numeric, score_restroom numeric, score_crowd numeric,
  photo_name text, photo_author text, photo_author_uri text,
  photo_url text, photo_source text, photo_credit text, photo_credit_uri text,
  description text
)
language sql stable security invoker as $$
  select id, name, category, neighborhood, score, rating_count, flagged, badge, area_level,
         score_welcome, score_affection, score_restroom, score_crowd,
         photo_name, photo_author, photo_author_uri,
         photo_url, photo_source, photo_credit, photo_credit_uri, description
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
  photo_url text, photo_source text, photo_credit text, photo_credit_uri text,
  description text
)
language sql stable security invoker as $$
  select id, name, category, neighborhood, score, rating_count, flagged, badge, area_level,
         score_welcome, score_affection, score_restroom, score_crowd,
         photo_name, photo_author, photo_author_uri,
         photo_url, photo_source, photo_credit, photo_credit_uri, description
  from public.public_places
  where neighborhood_id = p_neighborhood_id
  order by (rating_count > 0) desc, score desc nulls last, rating_count desc, name
  limit p_limit;
$$;
revoke all on function public.neighborhood_places(integer, integer) from anon;
grant execute on function public.neighborhood_places(integer, integer) to authenticated;

drop function if exists public.irise_suggest_places(integer, public.place_category[], boolean, integer);
create function public.irise_suggest_places(
  p_city_id integer,
  p_categories public.place_category[] default null,
  p_sem_nota boolean default false,
  p_limit integer default 3
)
returns table (
  id uuid, name text, category public.place_category, neighborhood text,
  score numeric, rating_count integer, flagged boolean, badge text, area_level text,
  score_welcome numeric, score_affection numeric, score_restroom numeric, score_crowd numeric,
  photo_name text, photo_author text, photo_author_uri text,
  photo_url text, photo_source text, photo_credit text, photo_credit_uri text,
  description text
)
language sql stable security invoker as $$
  select id, name, category, neighborhood, score, rating_count, flagged, badge, area_level,
         score_welcome, score_affection, score_restroom, score_crowd,
         photo_name, photo_author, photo_author_uri, photo_url, photo_source, photo_credit, photo_credit_uri,
         description
  from public.public_places
  where city_id = p_city_id
    and (p_categories is null or category = any(p_categories))
    and coalesce(badge, '') <> 'atencao'
    and (
      (not p_sem_nota and score is not null)
      or (p_sem_nota and score is null)
    )
  order by (case when p_sem_nota then random() else 0 end),
           score desc nulls last,
           rating_count desc nulls last
  limit least(greatest(coalesce(p_limit, 3), 1), 10);
$$;
revoke all on function public.irise_suggest_places(integer, public.place_category[], boolean, integer) from public, anon;
grant execute on function public.irise_suggest_places(integer, public.place_category[], boolean, integer) to authenticated;
