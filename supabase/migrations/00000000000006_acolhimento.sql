-- Fase 1 do acolhimento: a avaliação deixa de ser uma estrela e passa a ter quatro eixos,
-- o score ganha média bayesiana (para poucos votos não liderarem a cidade) e cada lugar
-- recebe um selo legível em vez de só um número.

-- ---------- eixos da avaliação ----------
alter table public.place_ratings
  add column welcome smallint check (welcome between 1 and 5),
  add column affection smallint check (affection between 1 and 5),
  add column restroom smallint check (restroom between 1 and 5),
  add column crowd smallint check (crowd between 1 and 5);

comment on column public.place_ratings.welcome is 'A equipe te tratou bem?';
comment on column public.place_ratings.affection is 'Dava para ficar à vontade com quem você ama?';
comment on column public.place_ratings.restroom is 'Usou o banheiro sem ser questionade?';
comment on column public.place_ratings.crowd is 'E as outras pessoas no ambiente?';

-- Ou os quatro eixos, ou nenhum: meia avaliação não vira nota.
alter table public.place_ratings add constraint place_ratings_axes_complete check (
  num_nonnulls(welcome, affection, restroom, crowd) in (0, 4)
);

-- Nota da avaliação: os eixos pesam onde o risco é maior. Avaliações antigas (só estrela)
-- continuam valendo pelo valor que têm.
alter table public.place_ratings add column overall numeric(3, 2)
  generated always as (
    case
      when welcome is not null
        then round((0.30 * welcome + 0.30 * affection + 0.25 * restroom + 0.15 * crowd)::numeric, 2)
      else stars::numeric
    end
  ) stored;

-- `stars` segue existindo como o arredondamento da nota, para o que ainda lê essa coluna.
alter table public.place_ratings alter column stars drop not null;
alter table public.place_ratings add constraint place_ratings_has_value check (
  stars is not null or welcome is not null
);

create or replace function public.fill_rating_stars()
returns trigger language plpgsql as $$
begin
  if new.welcome is not null then
    new.stars := greatest(1, least(5, round(
      0.30 * new.welcome + 0.30 * new.affection + 0.25 * new.restroom + 0.15 * new.crowd
    )::smallint));
  end if;
  return new;
end $$;

create trigger place_ratings_fill_stars before insert or update on public.place_ratings
  for each row execute function public.fill_rating_stars();

-- ---------- relato ligado ao lugar ----------
-- Sem isso o raio de 100 m pune igual o bar e a calçada da esquina.
alter table public.occurrences
  add column place_id uuid references public.places (id) on delete set null;
create index occurrences_place_idx on public.occurrences (place_id) where place_id is not null;

-- ---------- prior das categorias ----------
-- A média bayesiana precisa de um ponto de partida: a média da categoria naquela cidade,
-- com a média geral e 3.5 como reservas.
create table public.rating_priors (
  scope text primary key, -- 'global' ou '<city_id>:<category>'
  prior numeric(3, 2) not null,
  sample_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.refresh_rating_priors()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.rating_priors;

  insert into public.rating_priors (scope, prior, sample_count)
  select 'global', round(avg(r.overall), 2), count(*)
  from public.place_ratings r
  where r.status = 'active' and r.overall is not null
  having count(*) > 0;

  insert into public.rating_priors (scope, prior, sample_count)
  select p.city_id || ':' || p.category, round(avg(r.overall), 2), count(*)
  from public.place_ratings r
  join public.places p on p.id = r.place_id
  where r.status = 'active' and r.overall is not null and p.city_id is not null
  group by p.city_id, p.category;
end $$;

create or replace function public.rating_prior(p_city_id integer, p_category public.place_category)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(
    (select prior from public.rating_priors
      where scope = p_city_id || ':' || p_category and sample_count >= 20),
    (select prior from public.rating_priors where scope = 'global'),
    3.5
  );
$$;

-- ---------- score e selo ----------
alter table public.place_scores
  add column score_welcome numeric(3, 2),
  add column score_affection numeric(3, 2),
  add column score_restroom numeric(3, 2),
  add column score_crowd numeric(3, 2),
  add column rating_stddev numeric(3, 2),
  add column recent_on_site integer not null default 0,
  add column badge text;

comment on column public.place_scores.badge is 'acolhedor | bem | dividido | atencao | poucas | null';

create or replace function public.compute_place_score(p_place_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_loc geography; v_city integer; v_cat public.place_category;
  v_sum numeric; v_wsum numeric; v_count integer; v_sd numeric;
  v_welcome numeric; v_affection numeric; v_restroom numeric; v_crowd numeric;
  v_occ integer; v_high integer; v_site integer; v_site_recent integer;
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

  -- Relatos no entorno (100 m) e, separadamente, os que apontam este lugar.
  select count(*), count(*) filter (where severity = 'alta')
  into v_occ, v_high
  from public.occurrences
  where status = 'active'
    and occurrence_date >= current_date - 180
    and (place_id = p_place_id or st_dwithin(location, v_loc, 100));

  select count(*) filter (where severity = 'alta'),
         count(*) filter (where occurrence_date >= current_date - 30)
  into v_site, v_site_recent
  from public.occurrences
  where status = 'active' and place_id = p_place_id and occurrence_date >= current_date - 180;

  if v_count > 0 then
    v_prior := public.rating_prior(v_city, v_cat);
    -- média bayesiana: dois votos 5 não viram o topo da cidade
    v_raw := v_sum / nullif(v_wsum, 0);
    v_score := (m * v_prior + v_sum) / (m + v_wsum);
    -- violência grave pesa; no próprio lugar, pesa em dobro
    v_score := greatest(1.0, v_score - 0.5 * v_high - 0.5 * v_site);
  end if;

  -- Assimetria proposital: o elogio usa o score encolhido (difícil de conquistar), o alerta
  -- usa a média crua (cinco pessoas dizendo que foi ruim já bastam para avisar).
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
    recent_on_site, badge, updated_at)
  values (
    p_place_id, round(v_score, 2), coalesce(v_count, 0), coalesce(v_occ, 0), coalesce(v_high, 0),
    coalesce(v_occ, 0) > 0,
    round(v_welcome, 2), round(v_affection, 2), round(v_restroom, 2), round(v_crowd, 2),
    round(v_sd, 2), coalesce(v_site_recent, 0), v_badge, now())
  on conflict (place_id) do update set
    score = excluded.score, rating_count = excluded.rating_count,
    recent_occurrences = excluded.recent_occurrences,
    recent_high_occurrences = excluded.recent_high_occurrences,
    flagged = excluded.flagged,
    score_welcome = excluded.score_welcome, score_affection = excluded.score_affection,
    score_restroom = excluded.score_restroom, score_crowd = excluded.score_crowd,
    rating_stddev = excluded.rating_stddev, recent_on_site = excluded.recent_on_site,
    badge = excluded.badge, updated_at = now();
end $$;

-- Relato que aponta um lugar recalcula esse lugar também.
create or replace function public.on_occurrence_affects_places()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare p record;
begin
  for p in
    select id from public.places
    where id = new.place_id or st_dwithin(location, new.location, 100)
  loop
    perform public.compute_place_score(p.id);
  end loop;
  return new;
end $$;

-- ---------- RLS das novas tabelas ----------
alter table public.rating_priors enable row level security;
create policy "priors: leitura" on public.rating_priors for select to authenticated using (true);

-- ---------- views ----------
create or replace view public.public_places with (security_invoker = false) as
select p.id, p.name, p.category, p.address, p.city_id, p.neighborhood_id,
       n.name as neighborhood, c.name as city, c.state, p.verified, p.created_at,
       st_y(p.location::geometry) as latitude, st_x(p.location::geometry) as longitude,
       s.score, s.rating_count, s.recent_occurrences, s.recent_high_occurrences, s.flagged,
       s.score_welcome, s.score_affection, s.score_restroom, s.score_crowd,
       s.rating_stddev, s.recent_on_site, s.badge
from public.places p
join public.cities c on c.id = p.city_id
left join public.neighborhoods n on n.id = p.neighborhood_id
left join public.place_scores s on s.place_id = p.id
where p.status = 'active';

create or replace view public.public_place_ratings with (security_invoker = false) as
select r.id, r.place_id, r.stars, r.comment, r.updated_at,
       coalesce(nullif(pr.nickname, ''), 'Anônimo') as nickname,
       (r.user_id = auth.uid()) as is_mine,
       r.welcome, r.affection, r.restroom, r.crowd, r.overall
from public.place_ratings r
left join public.profiles pr on pr.id = r.user_id
where r.status = 'active';

revoke all on public.public_places, public.public_place_ratings from anon;
grant select on public.public_places, public.public_place_ratings to authenticated;

-- ---------- ranking ----------
-- Entram lugares com cinco avaliações (o mínimo do selo) e nunca os marcados como atenção.
drop function if exists public.welcoming_ranking(integer, integer);
create function public.welcoming_ranking(p_city_id integer, p_limit integer default 10)
returns table (
  id uuid, name text, category public.place_category, neighborhood text,
  score numeric, rating_count integer, flagged boolean, badge text,
  score_welcome numeric, score_affection numeric, score_restroom numeric, score_crowd numeric
)
language sql stable security invoker as $$
  select id, name, category, neighborhood, score, rating_count, flagged, badge,
         score_welcome, score_affection, score_restroom, score_crowd
  from public.public_places
  where city_id = p_city_id and rating_count >= 5 and score is not null
    and coalesce(badge, '') <> 'atencao'
  order by score desc, rating_count desc
  limit p_limit;
$$;

-- ---------- agenda ----------
select cron.schedule('refresh-rating-priors', '7 * * * *',
  $$ select public.refresh_rating_priors() $$);

-- Recalcula o que já existe com a nova fórmula.
select public.refresh_rating_priors();
select public.compute_place_score(id) from public.places where status = 'active';
