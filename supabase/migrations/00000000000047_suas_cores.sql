-- "Suas cores" no lugar de "Sua cidade" (04/10/2026, pedido do Leandro): o cartão do Início mostra
-- o que a PESSOA fez, nunca o placar da cidade ("1 de 100" parecia que o app tinha flopado).

-- ---------- quantas vezes alguém abriu a ficha ----------
-- Só contagem somada por lugar e dia: não guarda quem abriu (histórico de lugares vistos é dado
-- sensível num app LGBTQIA+). O app conta cada lugar uma vez por aparelho, então n ≈ pessoas.
create table if not exists public.place_views (
  place_id uuid not null references public.places (id) on delete cascade,
  day date not null,
  n integer not null default 0 check (n >= 0),
  primary key (place_id, day)
);
alter table public.place_views enable row level security;  -- sem policy: só pelas funções
revoke all on public.place_views from anon, authenticated;

create or replace function public.log_place_view(p_place uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  -- quem avaliou o lugar não conta como alguém ajudado pela própria avaliação
  if exists (select 1 from public.place_ratings where place_id = p_place and user_id = auth.uid()) then
    return;
  end if;
  insert into public.place_views (place_id, day, n) values (p_place, public.irisa_today(), 1)
  on conflict (place_id, day) do update set n = public.place_views.n + 1;
exception when foreign_key_violation then
  return;  -- lugar que não existe: ignora
end $$;
revoke all on function public.log_place_view(uuid) from public, anon;
grant execute on function public.log_place_view(uuid) to authenticated;

-- ---------- o resumo do cartão ----------
-- lugares: quantos a pessoa avaliou; primeiras: em quantos foi a primeira cor; selos: em quantos a
-- avaliação dela foi a 5ª (a que deu o selo); bairros: bairros diferentes; ajudou: aberturas da ficha
-- desses lugares desde o dia da avaliação dela. `itens` alimenta o mapinha da folha.
create or replace function public.my_cores()
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  with minhas as (
    select r.place_id, r.created_at, r.stars, p.name, p.category::text as cat, p.neighborhood_id,
           nb.name as bairro, st_y(p.location::geometry) as lat, st_x(p.location::geometry) as lng,
           (select count(*) from public.place_ratings o
             where o.place_id = r.place_id and o.status = 'active' and o.created_at < r.created_at) as antes
    from public.place_ratings r
    join public.places p on p.id = r.place_id and p.status = 'active'
    left join public.neighborhoods nb on nb.id = p.neighborhood_id
    where r.user_id = auth.uid() and r.status = 'active'
  )
  select jsonb_build_object(
    'lugares', (select count(*) from minhas),
    'primeiras', (select count(*) from minhas where antes = 0),
    'selos', (select count(*) from minhas where antes = 4),
    'bairros', (select count(distinct neighborhood_id) from minhas where neighborhood_id is not null),
    'ajudou', coalesce((select sum(v.n) from public.place_views v join minhas m on m.place_id = v.place_id
                        where v.day >= (m.created_at at time zone 'America/Sao_Paulo')::date), 0),
    'ultimo_selo', (select name from minhas where antes = 4 order by created_at desc limit 1),
    'ultima_primeira', (select name from minhas where antes = 0 order by created_at desc limit 1),
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
               'id', place_id, 'nome', name, 'categoria', cat, 'bairro', bairro, 'lat', lat, 'lng', lng,
               'nota', stars, 'primeira', antes = 0, 'selo', antes = 4) order by created_at desc)
             from minhas), '[]'::jsonb)
  );
$$;
revoke all on function public.my_cores() from public, anon;
grant execute on function public.my_cores() to authenticated;

-- aberturas com mais de 2 anos saem sozinhas
select cron.schedule('place-views-limpeza', '23 4 * * 0',
  $$delete from public.place_views where day < current_date - 730$$);
