-- Conquistas sem depender de visualização, ajustes manuais pelo painel e notificação para pessoas
-- escolhidas (06/10/2026, pedido do Leandro).
--
-- 1. Utilidade Pública, Interesse Municipal, Aclamada e Influ do Vale premiavam "pessoas que abriram a
--    ficha depois da sua avaliação" (place_views). Com o volume de hoje ninguém chega lá, e a conta ainda
--    incluía a própria pessoa: quem abre a ficha e avalia no mesmo dia já tinha a visita gravada antes de
--    avaliar. As quatro passam a depender só do que a pessoa faz:
--      Utilidade Pública   5 dicas de segurança no mural
--      Interesse Municipal 20 avaliações na mesma cidade
--      Influ do Vale       60 avaliações, em pelo menos 6 semanas diferentes
--      Aclamada            100 avaliações, em pelo menos 10 semanas diferentes
--    Quem já ganhou alguma delas fica com ela (user_medals não é tocado). O "ajudou" de Suas cores deixa
--    de contar o próprio dia da avaliação.
-- 2. O painel pode liberar ou revogar uma medalha e subir ou descer o nível de uma pessoa. O nível vem dos
--    gomos, então mudar o nível grava um ajuste de gomos (gami_ajustes) que leva a pessoa ao começo do
--    nível escolhido; o que ela fizer depois continua somando. Medalha revogada não volta sozinha.
-- 3. Notificação pode ir para pessoas escolhidas (push_envios.usuarios). A Edge Function antiga só sabe
--    filtrar por cidade: push_pegar_envios (a que ela chama) deixa de entregar envio com pessoas
--    escolhidas, para ele nunca ir para todo mundo por engano; a função nova usa as versões _v2.

-- ---------------------------------------------------------------- 1 + 2: gami_stats com ajustes
create table if not exists public.gami_ajustes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  gomos integer not null default 0 check (gomos between -48 and 48),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users (id) on delete set null
);
alter table public.gami_ajustes enable row level security;  -- sem policy: só pelas funções

create table if not exists public.user_medals_revogadas (
  user_id uuid not null references auth.users (id) on delete cascade,
  medal_id text not null,
  revogada_em timestamptz not null default now(),
  revogada_por uuid references auth.users (id) on delete set null,
  primary key (user_id, medal_id)
);
alter table public.user_medals_revogadas enable row level security;  -- sem policy

-- O cálculo de sempre (migration 48) vira gami_stats_calc; gami_stats passa a ser a camada que aplica as
-- regras novas e os ajustes do painel. Quem chama gami_stats (my_gamification, admin_user, push semanal)
-- não muda.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'gami_stats_calc' and pronamespace = 'public'::regnamespace) then
    alter function public.gami_stats(uuid) rename to gami_stats_calc;
  end if;
end $$;
revoke all on function public.gami_stats_calc(uuid) from public, anon, authenticated;

create or replace function public.gami_stats(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb; v_ajuste int; v_gomos int; v_dicas int; v_cidade int; v_ratings int; v_weeks int; v_med jsonb;
begin
  v := public.gami_stats_calc(p_user);
  select coalesce(max(a.gomos), 0) into v_ajuste from public.gami_ajustes a where a.user_id = p_user;
  v_gomos := least(48, greatest(0, (v->>'gomos')::int + v_ajuste));

  select count(*) into v_dicas from public.support_messages
  where created_by = p_user and status = 'active' and category = 'dica';
  select coalesce(max(n), 0) into v_cidade from (
    select p.city_id, count(*) as n
    from public.place_ratings pr join public.places p on p.id = pr.place_id and p.status = 'active'
    where pr.user_id = p_user and pr.status = 'active'
    group by p.city_id) c;
  v_ratings := coalesce((v->>'avaliacoes')::int, 0);
  select count(distinct date_trunc('week', pr.created_at at time zone 'America/Sao_Paulo')) into v_weeks
  from public.place_ratings pr join public.places p on p.id = pr.place_id and p.status = 'active'
  where pr.user_id = p_user and pr.status = 'active';

  select coalesce(jsonb_agg(
           case when r.medal_id is not null then x || jsonb_build_object('ok', false, 'revogada', true) else x end
           order by e.ord), '[]'::jsonb)
    into v_med
  from jsonb_array_elements(v->'medalhas') with ordinality as e(m, ord)
  cross join lateral (select case e.m->>'id'
      when 'utilidade-publica' then jsonb_build_object('id', 'utilidade-publica', 'valor', least(v_dicas, 5), 'alvo', 5,
                                                     'unidade', 'dicas', 'ok', v_dicas >= 5)
      when 'interesse-municipal' then jsonb_build_object('id', 'interesse-municipal', 'valor', least(v_cidade, 20), 'alvo', 20,
                                                       'unidade', 'avaliações', 'ok', v_cidade >= 20)
      when 'influ-do-vale' then case when v_ratings >= 60 and v_weeks < 6
          then jsonb_build_object('id', 'influ-do-vale', 'valor', v_weeks, 'alvo', 6, 'unidade', 'semanas', 'ok', false)
          else jsonb_build_object('id', 'influ-do-vale', 'valor', least(v_ratings, 60), 'alvo', 60, 'unidade', 'avaliações',
                                  'ok', v_ratings >= 60 and v_weeks >= 6) end
      when 'aclamada' then case when v_ratings >= 100 and v_weeks < 10
          then jsonb_build_object('id', 'aclamada', 'valor', v_weeks, 'alvo', 10, 'unidade', 'semanas', 'ok', false)
          else jsonb_build_object('id', 'aclamada', 'valor', least(v_ratings, 100), 'alvo', 100, 'unidade', 'avaliações',
                                  'ok', v_ratings >= 100 and v_weeks >= 10) end
      when 'patrimonio-cultural' then e.m || jsonb_build_object('valor', v_gomos, 'ok', v_gomos >= 48)
      else e.m end as x) n
  left join public.user_medals_revogadas r on r.user_id = p_user and r.medal_id = e.m->>'id';

  return v || jsonb_build_object(
    'gomos', v_gomos,
    'gomos_ajuste', v_ajuste,
    'nivel', case when v_gomos = 0 then 0 else ceil(v_gomos / 8.0)::int end,
    'medalhas', v_med);
end $$;
revoke all on function public.gami_stats(uuid) from public, anon, authenticated;
grant execute on function public.gami_stats(uuid) to service_role;

-- my_gamification grava a medalha nova; revogada não volta (gami_stats já manda ok = false).
-- O "ajudou" de Suas cores conta só depois do dia da avaliação (a visita da própria pessoa antes de
-- avaliar entrava na conta).
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
                        where v.day > (m.created_at at time zone 'America/Sao_Paulo')::date), 0),
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

-- ---------------------------------------------------------------- 2: ações do painel
-- Ids válidos: os que o cálculo conhece, mais as três que ainda não têm regra (dá para dar à mão).
create or replace function public.gami_medal_ids()
returns setof text language sql stable security definer set search_path = public as $$
  select m->>'id' from jsonb_array_elements(public.gami_stats_calc(auth.uid())->'medalhas') m
  union select unnest(array['favorita', 'serviu-tudo', 'rede-de-apoio']);
$$;
revoke all on function public.gami_medal_ids() from public, anon, authenticated;

create or replace function public.admin_medal_grant(p_user uuid, p_medal text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  if not exists (select 1 from public.gami_medal_ids() i where i = p_medal) then
    raise exception 'Medalha desconhecida: %', p_medal;
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Pessoa não encontrada'; end if;
  delete from public.user_medals_revogadas where user_id = p_user and medal_id = p_medal;
  insert into public.user_medals (user_id, medal_id) values (p_user, p_medal) on conflict do nothing;
end $$;

create or replace function public.admin_medal_revoke(p_user uuid, p_medal text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  delete from public.user_medals where user_id = p_user and medal_id = p_medal;
  insert into public.user_medals_revogadas (user_id, medal_id, revogada_por) values (p_user, p_medal, auth.uid())
  on conflict (user_id, medal_id) do update set revogada_em = now(), revogada_por = auth.uid();
end $$;

-- Nível 1 a 8 (os mesmos degraus de src/lib/niveis.ts: 0/2/5/10/16/24/34/48 gomos). null = volta ao automático.
create or replace function public.admin_set_level(p_user uuid, p_nivel integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_degraus int[] := array[0, 2, 5, 10, 16, 24, 34, 48]; v_base int; v_delta int;
begin
  perform public.admin_guard(true);
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Pessoa não encontrada'; end if;
  if p_nivel is null then
    delete from public.gami_ajustes where user_id = p_user;
  else
    if p_nivel < 1 or p_nivel > 8 then raise exception 'Nível vai de 1 a 8'; end if;
    v_base := (public.gami_stats_calc(p_user)->>'gomos')::int;
    v_delta := v_degraus[p_nivel] - v_base;
    insert into public.gami_ajustes (user_id, gomos, atualizado_por) values (p_user, v_delta, auth.uid())
    on conflict (user_id) do update set gomos = excluded.gomos, atualizado_em = now(), atualizado_por = auth.uid();
  end if;
  return public.gami_stats(p_user);
end $$;

-- A ficha da pessoa no painel ganha o ajuste de gomos e as medalhas revogadas.
create or replace function public.admin_user(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.admin_guard(true);
  select jsonb_build_object(
    'id', p.id, 'email', u.email, 'apelido', p.nickname, 'papel', p.role, 'forma', p.medal_form,
    'cidade', (select c.name || ' · ' || c.state from public.cities c where c.id = p.default_city_id),
    'criado_em', p.created_at, 'ultimo_login', u.last_sign_in_at,
    'avatar', p.avatar_path
  ) into v
  from public.profiles p left join auth.users u on u.id = p.id where p.id = p_id;
  if v is null then raise exception 'Pessoa não encontrada'; end if;
  return v || jsonb_build_object(
    'gamificacao', public.gami_stats(p_id),
    'gomos_calculados', (public.gami_stats_calc(p_id)->>'gomos')::int,
    'ajuste_gomos', coalesce((select gomos from public.gami_ajustes where user_id = p_id), 0),
    'revogadas', coalesce((select jsonb_agg(medal_id) from public.user_medals_revogadas where user_id = p_id), '[]'::jsonb),
    'conquistadas', coalesce((select jsonb_agg(jsonb_build_object('id', medal_id, 'em', unlocked_at, 'visto', seen_at, 'banho', finish) order by unlocked_at)
                              from public.user_medals where user_id = p_id), '[]'::jsonb),
    'dias', coalesce((select jsonb_agg(jsonb_build_object('dia', day, 'consultou', consulted, 'apoiou', supported) order by day desc)
                      from (select * from public.user_days where user_id = p_id order by day desc limit 60) d), '[]'::jsonb),
    'avaliacoes', coalesce((select jsonb_agg(x order by x->>'em' desc) from (
        select jsonb_build_object('id', r.id, 'lugar', l.name, 'lugar_id', l.id, 'nota', coalesce(r.overall, r.stars),
                                  'comentario', r.comment, 'status', r.status, 'em', r.updated_at) as x
        from public.place_ratings r join public.places l on l.id = r.place_id
        where r.user_id = p_id order by r.updated_at desc limit 30) a), '[]'::jsonb),
    'mensagens', coalesce((select jsonb_agg(x order by x->>'em' desc) from (
        select jsonb_build_object('id', m.id, 'conteudo', m.content, 'categoria', m.category, 'status', m.status, 'em', m.created_at) as x
        from public.support_messages m where m.created_by = p_id order by m.created_at desc limit 30) b), '[]'::jsonb),
    'lugares', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'nome', l.name, 'status', l.status, 'em', l.created_at) order by l.created_at desc)
                         from public.places l where l.created_by = p_id), '[]'::jsonb),
    'aparelhos', coalesce((select jsonb_agg(jsonb_build_object('plataforma', platform, 'atualizado', updated_at))
                           from public.push_tokens where user_id = p_id), '[]'::jsonb),
    'pushs_abertos', (select count(*) from public.push_aberturas where user_id = p_id)
  );
end $$;

-- ---------------------------------------------------------------- 3: público da notificação
alter table public.push_envios add column if not exists usuarios uuid[];
alter table public.push_envios drop constraint if exists push_envios_usuarios_tamanho;
alter table public.push_envios add constraint push_envios_usuarios_tamanho
  check (usuarios is null or cardinality(usuarios) between 1 and 5000);

-- A função antiga (só cidade) nunca recebe envio com pessoas escolhidas.
create or replace function public.push_pegar_envios()
returns setof public.push_envios language sql security definer set search_path = public as $$
  update public.push_envios e set status = 'enviando'
  where e.id in (
    select id from public.push_envios
    where status = 'agendada' and enviar_em <= now() and usuarios is null
    order by enviar_em
    for update skip locked
  )
  returning e.*;
$$;

create or replace function public.push_pegar_envios_v2()
returns setof public.push_envios language sql security definer set search_path = public as $$
  update public.push_envios e set status = 'enviando'
  where e.id in (
    select id from public.push_envios
    where status = 'agendada' and enviar_em <= now()
    order by enviar_em
    for update skip locked
  )
  returning e.*;
$$;
revoke all on function public.push_pegar_envios_v2() from public, anon, authenticated;
grant execute on function public.push_pegar_envios_v2() to service_role;

create or replace function public.push_tokens_do_envio_v2(p_envio bigint)
returns table (token text) language sql stable security definer set search_path = public as $$
  select t.token
  from public.push_envios e
  join public.push_tokens t on true
  left join public.profiles p on p.id = t.user_id
  where e.id = p_envio
    and (e.city_id is null or p.default_city_id = e.city_id)
    and (e.usuarios is null or t.user_id = any (e.usuarios));
$$;
revoke all on function public.push_tokens_do_envio_v2(bigint) from public, anon, authenticated;
grant execute on function public.push_tokens_do_envio_v2(bigint) to service_role;

drop function if exists public.admin_push_create(text, text, timestamptz, text, integer);
create or replace function public.admin_push_create(
  p_titulo text, p_corpo text, p_quando timestamptz default now(), p_url text default null,
  p_cidade integer default null, p_usuarios uuid[] default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_quando timestamptz := coalesce(p_quando, now());
begin
  perform public.admin_guard(true);
  if p_usuarios is not null and cardinality(p_usuarios) = 0 then
    raise exception 'Escolha pelo menos uma pessoa.';
  end if;
  insert into public.push_envios (titulo, corpo, enviar_em, url, city_id, usuarios)
  values (p_titulo, p_corpo, v_quando, nullif(p_url, ''), case when p_usuarios is null then p_cidade end, p_usuarios)
  returning id into v_id;
  if v_quando <= now() then perform public.push_disparar(); end if;
  return v_id;
end $$;

drop function if exists public.admin_push_alcance(integer);
create or replace function public.admin_push_alcance(p_cidade integer default null, p_usuarios uuid[] default null)
returns bigint language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  if p_usuarios is not null then
    return (select count(*) from public.push_tokens t where t.user_id = any (p_usuarios));
  end if;
  return (select count(*) from public.push_tokens t left join public.profiles p on p.id = t.user_id
          where p_cidade is null or p.default_city_id = p_cidade);
end $$;

-- A lista mostra "N pessoas escolhidas" no lugar da cidade.
create or replace function public.admin_push_list(p_limite integer default 100)
returns table (
  id bigint, titulo text, corpo text, url text, cidade text, enviar_em timestamptz, status text,
  aparelhos integer, aceitos integer, falhas integer, erro text, criado_em timestamptz, enviado_em timestamptz, aberturas bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return query
  select e.id, e.titulo, e.corpo, e.url,
         case when e.usuarios is not null
              then cardinality(e.usuarios) || case when cardinality(e.usuarios) = 1 then ' pessoa escolhida' else ' pessoas escolhidas' end
              else (select c.name || ' · ' || c.state from public.cities c where c.id = e.city_id) end,
         e.enviar_em, e.status, e.aparelhos, e.aceitos, e.falhas, e.erro, e.criado_em, e.enviado_em,
         (select count(*) from public.push_aberturas a where a.envio_id = e.id)
  from public.push_envios e
  order by e.enviar_em desc
  limit least(greatest(coalesce(p_limite, 100), 1), 500);
end $$;

-- O push semanal mandava o nível para /evolucao, que não existe no app: a Evolução mora no Perfil.
do $$
declare v text;
begin
  select pg_get_functiondef('public.push_nudges_semanais()'::regprocedure) into v;
  if v like '%''/evolucao''%' then
    execute replace(v, '''/evolucao''', '''/perfil''');
  end if;
exception when undefined_function then null;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_medal_grant(uuid, text)', 'admin_medal_revoke(uuid, text)', 'admin_set_level(uuid, integer)',
    'admin_user(uuid)', 'admin_push_create(text, text, timestamptz, text, integer, uuid[])',
    'admin_push_alcance(integer, uuid[])', 'admin_push_list(integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
