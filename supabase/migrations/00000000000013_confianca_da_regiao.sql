-- Migration 13: a região perde confiabilidade, o estabelecimento não.
--
-- A 12 tirou a penalidade do entorno porque violência na rua não é nota de bar. Mas jogar fora o
-- vínculo inteiro perdia informação útil: quem vai sair à noite precisa saber que aquela quadra
-- teve ocorrência. A saída é separar os sujeitos — o lugar tem nota de acolhimento, a região em
-- volta tem nível de atenção. São duas medidas, lado a lado, e nenhuma julga a outra.
--
-- Peso igual ao de area_risk_ranking (total + 3 × graves), para a cidade e a quadra falarem a
-- mesma língua. Janela de 180 dias e raio de 100 m, os mesmos já usados na ficha.
--
-- Decisão deliberada: NÃO existe nível "tranquila". Com poucos usuários, ausência de relato não é
-- ausência de risco — é ausência de gente registrando. Dizer "região tranquila" seria a falha mais
-- perigosa possível num app de segurança. Sem relato, o app não diz nada.

alter table public.place_scores
  add column if not exists area_score integer not null default 0,
  add column if not exists area_level text;

comment on column public.place_scores.area_level is 'atencao | alerta | null (null = sem relato, NUNCA "seguro")';
comment on column public.place_scores.area_score is 'relatos a 100 m em 180 dias, contando grave 3x';

create or replace function public.compute_place_score(p_place_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_loc geography; v_city integer; v_cat public.place_category;
  v_sum numeric; v_wsum numeric; v_count integer; v_sd numeric;
  v_welcome numeric; v_affection numeric; v_restroom numeric; v_crowd numeric;
  v_occ integer; v_occ_high integer; v_high integer; v_site integer; v_site_recent integer;
  v_area integer; v_area_level text;
  v_prior numeric; v_score numeric; v_raw numeric; v_badge text;
  m constant numeric := 5; -- força do prior: cinco avaliações de "cidade média"
begin
  select location, city_id, category into v_loc, v_city, v_cat
  from public.places where id = p_place_id;

  select
    sum(r.overall * r.w), sum(r.w), count(*), stddev_samp(r.overall),
    sum(r.welcome * r.w) / nullif(sum(r.w) filter (where r.welcome is not null), 0),
    sum(r.affection * r.w) / nullif(sum(r.w) filter (where r.welcome is not null), 0),
    sum(r.restroom * r.w) / nullif(sum(r.w) filter (where r.welcome is not null), 0),
    sum(r.crowd * r.w) / nullif(sum(r.w) filter (where r.welcome is not null), 0)
  into v_sum, v_wsum, v_count, v_sd, v_welcome, v_affection, v_restroom, v_crowd
  from (
    select overall, welcome, affection, restroom, crowd,
           power(0.5, extract(epoch from (now() - updated_at)) / (180 * 86400)) as w
    from public.place_ratings
    where place_id = p_place_id and status = 'active' and overall is not null
  ) r;

  -- Entorno: mede a REGIÃO, não o lugar.
  select count(*), count(*) filter (where severity = 'alta')
  into v_occ, v_occ_high
  from public.occurrences
  where status = 'active'
    and occurrence_date >= current_date - 180
    and (place_id = p_place_id or st_dwithin(location, v_loc, 100));

  v_area := coalesce(v_occ, 0) + 3 * coalesce(v_occ_high, 0);
  v_area_level := case
    when v_area = 0 then null
    when v_area <= 3 then 'atencao'
    else 'alerta'
  end;

  -- Relatos que apontam este lugar: estes, sim, são sobre o lugar.
  select count(*) filter (where severity = 'alta'),
         count(*) filter (where occurrence_date >= current_date - 30)
  into v_site, v_site_recent
  from public.occurrences
  where status = 'active' and place_id = p_place_id and occurrence_date >= current_date - 180;

  v_high := coalesce(v_site, 0);

  if v_count > 0 then
    v_prior := public.rating_prior(v_city, v_cat);
    v_raw := v_sum / nullif(v_wsum, 0);
    v_score := (m * v_prior + v_sum) / (m + v_wsum);
    -- Só o que aponta o lugar desconta da nota do lugar.
    v_score := greatest(1.0, v_score - 1.0 * coalesce(v_site, 0));
  end if;

  v_badge := case
    when v_count < 5 then 'poucas'
    when coalesce(v_site_recent, 0) > 0 or v_score < 2.5 or v_raw < 2.5 then 'atencao'
    when coalesce(v_sd, 0) > 1.3 then 'dividido'
    when v_score >= 4.3 then 'acolhedor'
    when v_score >= 3.8 then 'bem'
    else null
  end;

  insert into public.place_scores (
    place_id, score, rating_count, recent_occurrences, recent_high_occurrences, flagged,
    score_welcome, score_affection, score_restroom, score_crowd, rating_stddev,
    recent_on_site, badge, area_score, area_level, updated_at)
  values (
    p_place_id, round(v_score, 2), coalesce(v_count, 0), coalesce(v_occ, 0), coalesce(v_high, 0),
    coalesce(v_occ, 0) > 0,
    round(v_welcome, 2), round(v_affection, 2), round(v_restroom, 2), round(v_crowd, 2),
    round(v_sd, 2), coalesce(v_site_recent, 0), v_badge, v_area, v_area_level, now())
  on conflict (place_id) do update set
    score = excluded.score, rating_count = excluded.rating_count,
    recent_occurrences = excluded.recent_occurrences,
    recent_high_occurrences = excluded.recent_high_occurrences,
    flagged = excluded.flagged,
    score_welcome = excluded.score_welcome, score_affection = excluded.score_affection,
    score_restroom = excluded.score_restroom, score_crowd = excluded.score_crowd,
    rating_stddev = excluded.rating_stddev, recent_on_site = excluded.recent_on_site,
    badge = excluded.badge, area_score = excluded.area_score, area_level = excluded.area_level,
    updated_at = now();
end $$;

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
       -- Coluna nova de view só pode entrar no fim: create or replace recusa mudança de posição.
       s.area_score, s.area_level
from public.places p
join public.cities c on c.id = p.city_id
left join public.neighborhoods n on n.id = p.neighborhood_id
left join public.place_scores s on s.place_id = p.id
where p.status = 'active';

revoke all on public.public_places from anon;
grant select on public.public_places to authenticated;

do $$
declare r record;
begin
  for r in select place_id from public.place_scores loop
    perform public.compute_place_score(r.place_id);
  end loop;
end $$;

-- O ranking do Início também carrega o nível da região: o cartão é o mesmo componente nas duas telas.
drop function if exists public.welcoming_ranking(integer, integer);
create function public.welcoming_ranking(p_city_id integer, p_limit integer default 10)
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
  where city_id = p_city_id and rating_count >= 5 and score is not null
    and coalesce(badge, '') <> 'atencao'
  order by score desc, rating_count desc
  limit p_limit;
$$;
