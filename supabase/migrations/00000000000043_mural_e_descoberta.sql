-- Mural novo e descoberta (04/10/2026, protótipo v2 aprovado pelo Leandro).
-- 1. Reações da casa no mural: Te abraço, Arrasou, Tô contigo, Sinto muito, Acendeu, Mais cor. Uma por pessoa
--    por recado. A curtida antiga (support_likes) vira "Te abraço" e continua funcionando para quem está na
--    versão velha do app (trigger espelha).
-- 2. Pergunta da semana: o painel edita em app_settings; o recado que responde guarda a pergunta (prompt).
--    O app mostra só QUANTAS pessoas responderam, nunca quem.
-- 3. Descoberta: tabela de eventos separada, função que escolhe os lugares e função que grava o evento.
--    place_ratings NÃO muda: a origem "home_discovery" vive só em discovery_events.

-- ---------- 1. reações ----------
create table public.support_reactions (
  message_id uuid not null references public.support_messages (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('abraco', 'arrasou', 'contigo', 'sinto', 'acendeu', 'cor')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index support_reactions_message_idx on public.support_reactions (message_id);
alter table public.support_reactions enable row level security;
comment on table public.support_reactions is 'Reações do mural. Ninguém vê quem reagiu: a view só soma.';

insert into public.support_reactions (message_id, user_id, kind, created_at)
select message_id, user_id, 'abraco', created_at from public.support_likes
on conflict do nothing;

-- quem ainda está na versão antiga curte; a curtida vira "Te abraço"
create or replace function public.sync_like_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.support_reactions (message_id, user_id, kind) values (new.message_id, new.user_id, 'abraco')
    on conflict (message_id, user_id) do nothing;
    return new;
  end if;
  delete from public.support_reactions where message_id = old.message_id and user_id = old.user_id and kind = 'abraco';
  return old;
end $$;
create trigger support_likes_sync
  after insert or delete on public.support_likes
  for each row execute function public.sync_like_reaction();

-- reagir (p_kind nulo tira a reação). Reagir conta como apoio do dia, igual a escrever no mural.
create or replace function public.react_support(p_message uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Entre na conta.'; end if;
  if p_kind is null then
    delete from public.support_reactions where message_id = p_message and user_id = v_uid;
    delete from public.support_likes where message_id = p_message and user_id = v_uid;
    return;
  end if;
  if p_kind not in ('abraco', 'arrasou', 'contigo', 'sinto', 'acendeu', 'cor') then raise exception 'Reação inválida'; end if;
  if not exists (select 1 from public.support_messages where id = p_message and status = 'active') then
    raise exception 'Recado não encontrado';
  end if;
  insert into public.support_reactions (message_id, user_id, kind) values (p_message, v_uid, p_kind)
  on conflict (message_id, user_id) do update set kind = excluded.kind, created_at = now();
  insert into public.user_days (user_id, day, supported) values (v_uid, public.irisa_today(), true)
  on conflict (user_id, day) do update set supported = true;
end $$;
revoke all on function public.react_support(uuid, text) from public, anon;
grant execute on function public.react_support(uuid, text) to authenticated;

-- ---------- 2. pergunta da semana ----------
alter table public.support_messages add column if not exists prompt text check (char_length(prompt) <= 40);
comment on column public.support_messages.prompt is 'Id da pergunta da semana que o recado responde (app_settings.pergunta_semana.id).';

insert into public.app_settings (key, value) values
  ('pergunta_semana', '{"ativa": true, "id": "2026-10-a", "texto": "Qual lugar te fez sentir bem-vinde este mês?"}'::jsonb)
on conflict (key) do nothing;

-- coluna nova de view só no fim (create or replace recusa mudar a posição)
create or replace view public.public_support_messages with (security_invoker = false) as
select m.id, m.nickname, m.category, m.content, m.city_id, m.created_at,
       (select count(*) from public.support_reactions r where r.message_id = m.id) as likes,
       exists (select 1 from public.support_reactions r where r.message_id = m.id and r.user_id = auth.uid()) as liked,
       (m.created_by = auth.uid()) as is_mine,
       coalesce((select jsonb_object_agg(kind, n) from (
                   select r.kind, count(*) as n from public.support_reactions r where r.message_id = m.id group by r.kind) k),
                '{}'::jsonb) as reactions,
       (select r.kind from public.support_reactions r where r.message_id = m.id and r.user_id = auth.uid()) as my_reaction,
       m.prompt
from public.support_messages m
where m.status = 'active'
  and not public.is_blocked(m.created_by);

create or replace function public.app_config()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_object_agg(key, value) from public.app_settings where key in ('aviso', 'pergunta_semana')), '{}'::jsonb)
    || jsonb_build_object('pergunta_respostas', (
         select count(distinct m.created_by) from public.support_messages m
         where m.status = 'active' and m.prompt is not null
           and m.prompt = (select value->>'id' from public.app_settings where key = 'pergunta_semana')));
$$;
revoke all on function public.app_config() from public;
grant execute on function public.app_config() to anon, authenticated;

-- ---------- 3. descoberta ----------
create table public.discovery_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  event text not null check (event in ('discovery_impression', 'discovery_place_opened', 'discovery_review_started',
                                       'discovery_review_completed', 'discovery_dismissed', 'discovery_closed')),
  slot smallint,
  source text not null default 'home_discovery',
  created_at timestamptz not null default now()
);
create index discovery_events_user_idx on public.discovery_events (user_id, created_at desc);
create index discovery_events_place_idx on public.discovery_events (place_id);
alter table public.discovery_events enable row level security;
comment on table public.discovery_events is 'Funil da descoberta (cartão "Passou por aqui?"). Só para medir e evitar repetição; nunca muda place_ratings.';

create or replace function public.discovery_log(p_event text, p_place uuid, p_slot smallint default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  -- conclusão só vale se a avaliação existe mesmo (par lugar + pessoa é único em place_ratings)
  if p_event = 'discovery_review_completed'
     and not exists (select 1 from public.place_ratings where place_id = p_place and user_id = v_uid) then
    return;
  end if;
  insert into public.discovery_events (user_id, place_id, event, slot) values (v_uid, p_place, p_event, p_slot);
end $$;
revoke all on function public.discovery_log(text, uuid, smallint) from public, anon;
grant execute on function public.discovery_log(text, uuid, smallint) to authenticated;

-- Escolhe até 2 lugares para o cartão (o segundo só aparece depois de um "Não conheço").
-- Pontos: falta de avaliação, relevância, proximidade, categoria e bairro pouco cobertos, perto do selo,
-- avaliação antiga e um sorteio fixo por pessoa e dia. Fora: o que a pessoa já avaliou, tirou ("Não conheço"
-- em 60 dias), abriu e não terminou (3 dias) ou já viu (7 dias). Fechou no X hoje ou já viu 2 hoje: nada.
create or replace function public.discovery_slate(p_lat double precision default null, p_lng double precision default null,
                                                  p_city integer default null)
returns setof public.public_places
language plpgsql stable security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_hoje timestamptz := public.irisa_today()::timestamp at time zone 'America/Sao_Paulo'; v_city integer;
begin
  if v_uid is null then return; end if;
  if exists (select 1 from public.discovery_events where user_id = v_uid and event = 'discovery_closed' and created_at >= v_hoje)
     or (select count(distinct place_id) from public.discovery_events
         where user_id = v_uid and event = 'discovery_impression' and created_at >= v_hoje) >= 2 then
    return;
  end if;
  select coalesce(p_city, default_city_id) into v_city from public.profiles where id = v_uid;

  return query
  with ponto as (
    select case when p_lat is null or p_lng is null then null
                else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as g
  ), cand as (
    select p.id, p.category::text as cat, p.neighborhood_id, p.prominence,
           case when ponto.g is null then null else st_distance(p.location, ponto.g) end as dist
    from public.places p cross join ponto
    where p.status = 'active'
      and (case when ponto.g is null then p.city_id = v_city else st_dwithin(p.location, ponto.g, 5000) end)
    order by case when ponto.g is null then -p.prominence::double precision else p.location <-> ponto.g end
    limit 400
  ), base as (
    select c.*, coalesce(s.rating_count, 0) as n, coalesce(s.flagged, false) as flagged,
           (select max(r.created_at) from public.place_ratings r where r.place_id = c.id and r.status = 'active') as ultima
    from cand c left join public.place_scores s on s.place_id = c.id
  ), cobertura as (
    select cat, avg((n > 0)::int) as cob from base group by cat
  ), cob_bairro as (
    select neighborhood_id, avg((n > 0)::int) as cob from base where neighborhood_id is not null group by neighborhood_id
  ), livre as (
    select b.* from base b
    where not b.flagged and b.n < 5
      and not exists (select 1 from public.place_ratings r where r.place_id = b.id and r.user_id = v_uid)
      and not exists (select 1 from public.discovery_events e where e.user_id = v_uid and e.place_id = b.id and (
            (e.event = 'discovery_dismissed' and e.created_at > now() - interval '60 days')
         or (e.event = 'discovery_place_opened' and e.created_at > now() - interval '3 days')
         or (e.event = 'discovery_impression' and e.created_at > now() - interval '7 days' and e.created_at < v_hoje)))
  ), pontos as (
    select l.id, l.cat,
           0.30 * (case when l.n = 0 then 1 else (5 - l.n) / 5.0 end)
         + 0.25 * least(l.prominence, 100) / 100.0
         + 0.25 * (case when l.dist is null then 0.5 else exp(-l.dist / 1500.0) end)
         + 0.10 * (1 - coalesce(c.cob, 0))
         + 0.10 * (1 - coalesce(cb.cob, 0.5))
         + 0.10 * (case when l.n in (3, 4) then 1 else 0 end)
         + 0.05 * (case when l.ultima < now() - interval '180 days' then 1 else 0 end)
         + 0.08 * ((hashtext(v_uid::text || public.irisa_today()::text || l.id::text) & 2147483647) % 1000) / 1000.0 as pts
    from livre l
    left join cobertura c on c.cat = l.cat
    left join cob_bairro cb on cb.neighborhood_id = l.neighborhood_id
  ), primeiro as (
    select id, cat from pontos order by pts desc limit 1
  ), segundo as (
    -- variedade: o segundo é de outra categoria quando houver
    select p.id from pontos p, primeiro f
    where p.id <> f.id
    order by (p.cat = f.cat), p.pts desc limit 1
  )
  select pp.* from public.public_places pp join primeiro f on f.id = pp.id
  union all
  select pp.* from public.public_places pp join segundo s on s.id = pp.id;
end $$;
revoke all on function public.discovery_slate(double precision, double precision, integer) from public, anon;
grant execute on function public.discovery_slate(double precision, double precision, integer) to authenticated;

-- painel: funil da descoberta (só números somados)
create or replace function public.admin_discovery(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.admin_guard(true);
  select jsonb_build_object(
    'dias', p_days,
    'impressoes', count(*) filter (where event = 'discovery_impression'),
    'abertas', count(*) filter (where event = 'discovery_place_opened'),
    'comecadas', count(*) filter (where event = 'discovery_review_started'),
    'concluidas', count(*) filter (where event = 'discovery_review_completed'),
    'nao_conheco', count(*) filter (where event = 'discovery_dismissed'),
    'fechadas', count(*) filter (where event = 'discovery_closed'),
    'pessoas', count(distinct user_id),
    'avaliacoes_novas', (select count(*) from public.place_ratings where created_at > now() - make_interval(days => p_days))
  ) into v
  from public.discovery_events where created_at > now() - make_interval(days => p_days);
  return v;
end $$;
revoke all on function public.admin_discovery(integer) from public, anon;
grant execute on function public.admin_discovery(integer) to authenticated;

-- eventos com mais de 180 dias saem sozinhos
select cron.schedule('discovery-limpeza', '17 4 * * *',
  $$delete from public.discovery_events where created_at < now() - interval '180 days'$$);

-- ---------- detalhe da semana e da cidade (Início) ----------
-- Só os dias que contaram nesta semana, com o que rendeu, e as últimas 5 semanas (quantos dias cada).
create or replace function public.my_week()
returns jsonb language sql stable security definer set search_path = public as $$
  with semana as (select date_trunc('week', public.irisa_today())::date as ini)
  select jsonb_build_object(
    'dias', coalesce((
      select jsonb_agg(jsonb_build_object(
               'dia', d.day, 'consultou', d.consulted, 'apoiou', d.supported,
               'avaliacoes', (select count(*) from public.place_ratings r
                              where r.user_id = auth.uid() and r.status = 'active'
                                and (r.created_at at time zone 'America/Sao_Paulo')::date = d.day))
             order by d.day)
      from public.user_days d, semana s where d.user_id = auth.uid() and d.day >= s.ini), '[]'::jsonb),
    'semanas', coalesce((
      select jsonb_agg(jsonb_build_object('inicio', w.ini, 'dias', w.n) order by w.ini)
      from (select date_trunc('week', d.day)::date as ini, count(*) as n
            from public.user_days d, semana s
            where d.user_id = auth.uid() and d.day < s.ini and d.day >= s.ini - 35
            group by 1) w), '[]'::jsonb));
$$;
revoke all on function public.my_week() from public, anon;
grant execute on function public.my_week() to authenticated;

-- Os 100 lugares mais conhecidos da cidade, com quantas avaliações cada (o app separa perto do selo e com selo).
create or replace function public.city_top_places(p_city integer)
returns setof public.public_places
language sql stable security definer set search_path = public as $$
  select pp.* from public.public_places pp
  join (select id from public.places where city_id = p_city and status = 'active'
        order by prominence desc, created_at limit 100) t on t.id = pp.id;
$$;
revoke all on function public.city_top_places(integer) from public, anon;
grant execute on function public.city_top_places(integer) to authenticated;
