-- Fase 1: cidades, bairros, perfis e relatos.
-- Regra central: created_by nunca sai do banco. Leitura pública só pela view public_occurrences.

-- ---------- tipos ----------
create type public.occurrence_type as enum ('verbal', 'fisica', 'ameaca', 'discriminacao', 'vandalismo');
create type public.severity as enum ('baixa', 'media', 'alta');
create type public.user_role as enum ('user', 'moderator', 'admin');
create type public.content_status as enum ('active', 'hidden', 'removed');

-- ---------- geografia ----------
create table public.states (
  code char(2) primary key,
  name text not null
);

create table public.cities (
  id serial primary key,
  ibge_code integer unique not null,
  name text not null,
  state char(2) not null references public.states (code),
  geom geometry(MultiPolygon, 4326),
  centroid geometry(Point, 4326),
  created_at timestamptz not null default now()
);
create index cities_geom_gix on public.cities using gist (geom);
create index cities_name_trgm on public.cities using gin (name gin_trgm_ops);

create table public.neighborhoods (
  id serial primary key,
  city_id integer not null references public.cities (id) on delete cascade,
  name text not null,
  geom geometry(MultiPolygon, 4326),
  unique (city_id, name)
);
create index neighborhoods_geom_gix on public.neighborhoods using gist (geom);

-- ---------- perfis ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'user',
  nickname text check (char_length(nickname) <= 40),
  default_city_id integer references public.cities (id),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user'::public.user_role);
$$;

create or replace function public.is_moderator()
returns boolean language sql stable as $$
  select public.my_role() in ('moderator', 'admin');
$$;

-- ---------- relatos ----------
create table public.occurrences (
  id uuid primary key default gen_random_uuid(),
  type public.occurrence_type not null,
  severity public.severity not null default 'media',
  description text check (char_length(description) <= 2000),
  location geography(Point, 4326) not null,
  city_id integer references public.cities (id),
  neighborhood_id integer references public.neighborhoods (id),
  occurrence_date date not null check (occurrence_date <= current_date),
  -- Nulo só quando a conta é excluída: o relato fica, o vínculo some.
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now()
);
create index occurrences_location_gix on public.occurrences using gist (location);
create index occurrences_city_date_idx on public.occurrences (city_id, occurrence_date desc);
create index occurrences_created_by_idx on public.occurrences (created_by);

-- Resolve cidade e bairro a partir do ponto. Ponto fora de município cadastrado é rejeitado.
create or replace function public.resolve_occurrence_area()
returns trigger language plpgsql as $$
declare pt geometry := new.location::geometry;
begin
  select id into new.city_id from public.cities where st_contains(geom, pt) limit 1;
  if new.city_id is null then
    raise exception 'Ponto fora de um município cadastrado' using errcode = 'P0001';
  end if;
  select id into new.neighborhood_id
    from public.neighborhoods where city_id = new.city_id and st_contains(geom, pt) limit 1;
  return new;
end $$;

create trigger occurrences_resolve_area
  before insert or update of location on public.occurrences
  for each row execute function public.resolve_occurrence_area();

-- ---------- RLS ----------
alter table public.states enable row level security;
alter table public.cities enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.profiles enable row level security;
alter table public.occurrences enable row level security;

create policy "geo: leitura para autenticados" on public.states for select to authenticated using (true);
create policy "geo: leitura para autenticados" on public.cities for select to authenticated using (true);
create policy "geo: leitura para autenticados" on public.neighborhoods for select to authenticated using (true);

create policy "profiles: próprio perfil" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: editar próprio" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- occurrences: usuário comum só insere. Nunca lê a tabela direto (a view abaixo é o caminho).
create policy "occurrences: inserir como si mesmo" on public.occurrences for insert to authenticated
  with check (created_by = auth.uid());
create policy "occurrences: moderação lê tudo" on public.occurrences for select to authenticated
  using (public.is_moderator());
create policy "occurrences: moderação edita status" on public.occurrences for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- ---------- view pública ----------
-- Sem created_by. Coordenada ofuscada (~100 m, grade fixa) enquanto o relato for de hoje ou ontem;
-- depois, exata. Grade fixa em vez de ruído aleatório: ruído por consulta permitiria triangular o ponto.
create view public.public_occurrences
with (security_invoker = false) as
select
  o.id,
  o.type,
  o.severity,
  o.description,
  o.city_id,
  o.neighborhood_id,
  n.name as neighborhood,
  c.name as city,
  c.state,
  o.occurrence_date,
  o.created_at,
  (o.occurrence_date >= current_date - 1) as is_obfuscated,
  case when o.occurrence_date >= current_date - 1
       then st_y(st_snaptogrid(o.location::geometry, 0.001))
       else st_y(o.location::geometry) end as latitude,
  case when o.occurrence_date >= current_date - 1
       then st_x(st_snaptogrid(o.location::geometry, 0.001))
       else st_x(o.location::geometry) end as longitude
from public.occurrences o
join public.cities c on c.id = o.city_id
left join public.neighborhoods n on n.id = o.neighborhood_id
where o.status = 'active';

revoke all on public.public_occurrences from anon;
grant select on public.public_occurrences to authenticated;

-- ---------- ranking e estatísticas ----------
-- score = relatos + 3 × relatos de gravidade alta, janela de p_months meses.
create or replace function public.area_risk_ranking(p_city_id integer, p_months integer default 12, p_limit integer default 10)
returns table (neighborhood_id integer, neighborhood text, total bigint, high bigint, score bigint)
language sql stable security invoker as $$
  select n.id, n.name,
         count(*) as total,
         count(*) filter (where o.severity = 'alta') as high,
         count(*) + 3 * count(*) filter (where o.severity = 'alta') as score
  from public.public_occurrences o
  join public.neighborhoods n on n.id = o.neighborhood_id
  where o.city_id = p_city_id
    and o.occurrence_date >= current_date - (p_months || ' months')::interval
  group by n.id, n.name
  order by score desc, total desc
  limit p_limit;
$$;

create or replace function public.city_risk_ranking(p_state char(2) default null, p_months integer default 12, p_limit integer default 10)
returns table (city_id integer, city text, state char(2), total bigint, high bigint, score bigint)
language sql stable security invoker as $$
  select c.id, c.name, c.state,
         count(*) as total,
         count(*) filter (where o.severity = 'alta') as high,
         count(*) + 3 * count(*) filter (where o.severity = 'alta') as score
  from public.public_occurrences o
  join public.cities c on c.id = o.city_id
  where (p_state is null or c.state = p_state)
    and o.occurrence_date >= current_date - (p_months || ' months')::interval
  group by c.id, c.name, c.state
  order by score desc, total desc
  limit p_limit;
$$;

create or replace function public.city_stats(p_city_id integer)
returns table (total bigint, last_30_days bigint, top_type public.occurrence_type, top_neighborhood text)
language sql stable security invoker as $$
  with base as (select * from public.public_occurrences where city_id = p_city_id)
  select
    (select count(*) from base),
    (select count(*) from base where occurrence_date >= current_date - 30),
    (select type from base group by type order by count(*) desc limit 1),
    (select neighborhood from public.area_risk_ranking(p_city_id, 12, 1));
$$;

-- Cidade que contém um ponto (para centralizar o app na cidade do usuário).
create or replace function public.city_at(p_lat double precision, p_lng double precision)
returns table (id integer, name text, state char(2), lat double precision, lng double precision)
language sql stable security invoker as $$
  select id, name, state, st_y(centroid), st_x(centroid)
  from public.cities
  where st_contains(geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326))
  limit 1;
$$;

-- ---------- tempo real ----------
-- Broadcast com payload seguro (sem created_by). O app invalida a query ao receber.
create or replace function public.broadcast_occurrence()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(
    jsonb_build_object('id', new.id, 'city_id', new.city_id, 'type', new.type, 'severity', new.severity),
    'occurrence_changed',
    'occurrences:city:' || new.city_id,
    true
  );
  return new;
end $$;

create trigger occurrences_broadcast
  after insert or update of status on public.occurrences
  for each row execute function public.broadcast_occurrence();

create policy "realtime: autenticados leem tópicos de cidade" on realtime.messages
  for select to authenticated using (realtime.topic() like 'occurrences:city:%');

create or replace function public.city_search(p_name text, p_state char(2) default null)
returns table (id integer, name text, state char(2), lat double precision, lng double precision)
language sql stable security invoker as $$
  select id, name, state, st_y(centroid), st_x(centroid)
  from public.cities
  where unaccent(name) ilike unaccent(p_name) || '%'
    and (p_state is null or state = p_state)
  order by similarity(unaccent(name), unaccent(p_name)) desc, name
  limit 10;
$$;
