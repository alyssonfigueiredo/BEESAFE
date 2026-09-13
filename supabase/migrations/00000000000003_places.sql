-- Fase 2: lugares avaliados com estrelas e score composto.

create type public.place_category as enum ('bar', 'restaurante', 'balada', 'cafe', 'hotel', 'servico', 'praca', 'outro');

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  category public.place_category not null default 'outro',
  address text check (char_length(address) <= 200),
  location geography(Point, 4326) not null,
  city_id integer references public.cities (id),
  neighborhood_id integer references public.neighborhoods (id),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  verified boolean not null default false,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now()
);
create index places_location_gix on public.places using gist (location);
create index places_city_idx on public.places (city_id);
create index places_name_trgm on public.places using gin (name gin_trgm_ops);

create table public.place_ratings (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 500),
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, user_id)
);
create index place_ratings_place_idx on public.place_ratings (place_id);

-- Score materializado por lugar: média ponderada por recência (meia-vida 6 meses) com penalidade por relatos próximos.
create table public.place_scores (
  place_id uuid primary key references public.places (id) on delete cascade,
  score numeric(3, 2),
  rating_count integer not null default 0,
  recent_occurrences integer not null default 0,
  recent_high_occurrences integer not null default 0,
  flagged boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Mesmo trigger de resolução de área dos relatos.
create trigger places_resolve_area
  before insert or update of location on public.places
  for each row execute function public.resolve_occurrence_area();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger place_ratings_touch before update on public.place_ratings
  for each row execute function public.touch_updated_at();

-- ---------- cálculo do score ----------
create or replace function public.compute_place_score(p_place_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_score numeric; v_count integer; v_occ integer; v_high integer; v_loc geography;
begin
  select location into v_loc from public.places where id = p_place_id;

  select
    sum(stars * w) / nullif(sum(w), 0),
    count(*)
  into v_score, v_count
  from (
    select stars, power(0.5, extract(epoch from (now() - updated_at)) / (180 * 86400)) as w
    from public.place_ratings
    where place_id = p_place_id and status = 'active'
  ) r;

  select count(*), count(*) filter (where severity = 'alta')
  into v_occ, v_high
  from public.occurrences
  where status = 'active'
    and occurrence_date >= current_date - 180
    and st_dwithin(location, v_loc, 100);

  if v_score is not null then
    v_score := greatest(1.0, v_score - 0.5 * v_high);
  end if;

  insert into public.place_scores (place_id, score, rating_count, recent_occurrences, recent_high_occurrences, flagged, updated_at)
  values (p_place_id, round(v_score, 2), coalesce(v_count, 0), coalesce(v_occ, 0), coalesce(v_high, 0), coalesce(v_occ, 0) > 0, now())
  on conflict (place_id) do update set
    score = excluded.score, rating_count = excluded.rating_count,
    recent_occurrences = excluded.recent_occurrences, recent_high_occurrences = excluded.recent_high_occurrences,
    flagged = excluded.flagged, updated_at = now();
end $$;

create or replace function public.on_rating_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.compute_place_score(coalesce(new.place_id, old.place_id));
  return coalesce(new, old);
end $$;

create trigger place_ratings_recompute
  after insert or update or delete on public.place_ratings
  for each row execute function public.on_rating_change();

create or replace function public.on_place_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.compute_place_score(new.id);
  return new;
end $$;

create trigger places_init_score after insert on public.places
  for each row execute function public.on_place_created();

-- Relatos novos afetam lugares num raio de 100 m.
create or replace function public.on_occurrence_affects_places()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare p record;
begin
  for p in select id from public.places where st_dwithin(location, new.location, 100) loop
    perform public.compute_place_score(p.id);
  end loop;
  return new;
end $$;

create trigger occurrences_affect_places
  after insert or update of status on public.occurrences
  for each row execute function public.on_occurrence_affects_places();

-- Recalcula tudo de hora em hora (decaimento por recência muda com o tempo).
select cron.schedule('recompute-place-scores', '17 * * * *',
  $$ select public.compute_place_score(id) from public.places where status = 'active' $$);

-- ---------- RLS ----------
alter table public.places enable row level security;
alter table public.place_ratings enable row level security;
alter table public.place_scores enable row level security;

create policy "places: leitura de ativos" on public.places for select to authenticated
  using (status = 'active' or public.is_moderator());
create policy "places: criar como si mesmo" on public.places for insert to authenticated
  with check (created_by = auth.uid());
create policy "places: moderação edita" on public.places for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

create policy "ratings: leitura de ativas" on public.place_ratings for select to authenticated
  using (status = 'active' or user_id = auth.uid() or public.is_moderator());
create policy "ratings: criar a própria" on public.place_ratings for insert to authenticated
  with check (user_id = auth.uid());
create policy "ratings: editar a própria" on public.place_ratings for update to authenticated
  using (user_id = auth.uid() or public.is_moderator()) with check (user_id = auth.uid() or public.is_moderator());
create policy "ratings: apagar a própria" on public.place_ratings for delete to authenticated
  using (user_id = auth.uid());

create policy "scores: leitura" on public.place_scores for select to authenticated using (true);

-- ---------- views públicas ----------
-- Sem created_by. Coordenada exata: lugar é público por natureza.
create view public.public_places with (security_invoker = false) as
select p.id, p.name, p.category, p.address, p.city_id, p.neighborhood_id,
       n.name as neighborhood, c.name as city, c.state, p.verified, p.created_at,
       st_y(p.location::geometry) as latitude, st_x(p.location::geometry) as longitude,
       s.score, s.rating_count, s.recent_occurrences, s.recent_high_occurrences, s.flagged
from public.places p
join public.cities c on c.id = p.city_id
left join public.neighborhoods n on n.id = p.neighborhood_id
left join public.place_scores s on s.place_id = p.id
where p.status = 'active';

-- Avaliações sem user_id; apelido do perfil (ou "Anônimo"). Marca a própria avaliação para o app.
create view public.public_place_ratings with (security_invoker = false) as
select r.id, r.place_id, r.stars, r.comment, r.updated_at,
       coalesce(nullif(pr.nickname, ''), 'Anônimo') as nickname,
       (r.user_id = auth.uid()) as is_mine
from public.place_ratings r
left join public.profiles pr on pr.id = r.user_id
where r.status = 'active';

revoke all on public.public_places, public.public_place_ratings from anon;
grant select on public.public_places, public.public_place_ratings to authenticated;

-- ---------- ranking de acolhedores ----------
create or replace function public.welcoming_ranking(p_city_id integer, p_limit integer default 10)
returns table (id uuid, name text, category public.place_category, neighborhood text, score numeric, rating_count integer, flagged boolean)
language sql stable security invoker as $$
  select id, name, category, neighborhood, score, rating_count, flagged
  from public.public_places
  where city_id = p_city_id and rating_count >= 3 and score is not null
  order by score desc, rating_count desc
  limit p_limit;
$$;
