-- Uso do irise no painel (14/10/2026, pedido do Leandro): quantos tokens o chat gasta por dia, quanto
-- ainda sobra da cota do Groq e quem está usando.
--
-- O que NÃO fica guardado, de propósito (LGPD): o texto das conversas. Quem escreve no chat conta como
-- está, se sofreu violência, às vezes pensa em se machucar — é dado de saúde e de orientação sexual
-- (dado sensível, art. 11), de um público que já corre risco. Guardar "escondido" continua sendo
-- tratamento: vaza num backup, numa chave, numa ordem judicial. Por isso a tabela só tem números:
-- quando, quem, quantos tokens, que tipo de chamada. O histórico da conversa fica no celular.
-- Crise (CVV) entra só como contagem, sem a pessoa.

create table if not exists public.irise_uso (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  dia date not null default (now() at time zone 'America/Sao_Paulo')::date,
  user_id uuid references auth.users (id) on delete cascade,
  provedor text not null check (provedor in ('groq', 'gemini', 'nenhum')),
  tipo text not null check (tipo in ('conversa', 'busca', 'progresso', 'ranking', 'crise', 'limite')),
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  -- Cota real do Groq, lida dos cabeçalhos da resposta (pedidos por dia).
  rl_pedidos_limite integer,
  rl_pedidos_restantes integer
);
create index if not exists irise_uso_dia_idx on public.irise_uso (dia);
create index if not exists irise_uso_user_dia_idx on public.irise_uso (user_id, dia);
alter table public.irise_uso enable row level security;  -- sem policy: só a função e o painel (security definer)

-- Limites (null = sem limite):
--   irise_limite_tokens_dia: referência da cota diária, só para a barra do painel;
--   irise_limite_msgs_pessoa: mensagens por pessoa por dia; passou, o irise responde sem chamar a IA.
insert into public.app_settings (key, value) values
  ('irise_limite_tokens_dia', 'null'::jsonb),
  ('irise_limite_msgs_pessoa', 'null'::jsonb)
on conflict (key) do nothing;

-- Quantas mensagens a pessoa já mandou hoje (só a função usa, com a chave de serviço).
create or replace function public.irise_msgs_hoje(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.irise_uso
  where user_id = p_user and dia = (now() at time zone 'America/Sao_Paulo')::date
    and tipo in ('conversa', 'busca', 'progresso');
$$;
revoke all on function public.irise_msgs_hoje(uuid) from public, anon, authenticated;

create or replace function public.admin_irise_uso(p_dias integer default 14)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_dias integer := least(greatest(coalesce(p_dias, 14), 1), 90);
begin
  perform public.admin_guard(true);
  return jsonb_build_object(
    'hoje', v_hoje,
    'limite_tokens_dia', (select value from public.app_settings where key = 'irise_limite_tokens_dia'),
    'limite_msgs_pessoa', (select value from public.app_settings where key = 'irise_limite_msgs_pessoa'),
    'hoje_resumo', (
      select jsonb_build_object(
        'groq', coalesce(sum(tokens_in + tokens_out) filter (where provedor = 'groq'), 0),
        'gemini', coalesce(sum(tokens_in + tokens_out) filter (where provedor = 'gemini'), 0),
        'mensagens', count(*) filter (where tipo in ('conversa', 'busca', 'progresso')),
        'pessoas', count(distinct user_id) filter (where tipo in ('conversa', 'busca', 'progresso')),
        'buscas', count(*) filter (where tipo = 'busca'),
        'crises', count(*) filter (where tipo = 'crise'),
        'barradas', count(*) filter (where tipo = 'limite'))
      from public.irise_uso where dia = v_hoje),
    'cota_groq', (
      select jsonb_build_object('limite', rl_pedidos_limite, 'restantes', rl_pedidos_restantes, 'em', criado_em)
      from public.irise_uso where provedor = 'groq' and rl_pedidos_limite is not null
      order by criado_em desc limit 1),
    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object('dia', d.dia, 'groq', d.groq, 'gemini', d.gemini, 'mensagens', d.msgs, 'pessoas', d.pessoas) order by d.dia)
      from (
        select dia,
          coalesce(sum(tokens_in + tokens_out) filter (where provedor = 'groq'), 0) as groq,
          coalesce(sum(tokens_in + tokens_out) filter (where provedor = 'gemini'), 0) as gemini,
          count(*) filter (where tipo in ('conversa', 'busca', 'progresso')) as msgs,
          count(distinct user_id) filter (where tipo in ('conversa', 'busca', 'progresso')) as pessoas
        from public.irise_uso where dia > v_hoje - v_dias
        group by dia) d), '[]'::jsonb),
    'quem_hoje', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.user_id, 'nome', q.nome, 'mensagens', q.msgs, 'tokens', q.tokens) order by q.tokens desc)
      from (
        select u.user_id,
          coalesce(nullif(p.nickname, ''), a.email::text, 'sem nome') as nome,
          count(*) filter (where u.tipo in ('conversa', 'busca', 'progresso')) as msgs,
          sum(u.tokens_in + u.tokens_out) as tokens
        from public.irise_uso u
        left join public.profiles p on p.id = u.user_id
        left join auth.users a on a.id = u.user_id
        where u.dia = v_hoje and u.user_id is not null
        group by u.user_id, p.nickname, a.email
        order by tokens desc
        limit 30) q), '[]'::jsonb)
  );
end $$;
revoke all on function public.admin_irise_uso(integer) from public, anon;
grant execute on function public.admin_irise_uso(integer) to authenticated;

create or replace function public.admin_irise_limites_set(p_tokens_dia integer, p_msgs_pessoa integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  if p_tokens_dia is not null and p_tokens_dia < 1 then raise exception 'Limite de tokens inválido'; end if;
  if p_msgs_pessoa is not null and p_msgs_pessoa < 1 then raise exception 'Limite de mensagens inválido'; end if;
  insert into public.app_settings (key, value, updated_at, updated_by) values
    ('irise_limite_tokens_dia', to_jsonb(p_tokens_dia), now(), auth.uid()),
    ('irise_limite_msgs_pessoa', to_jsonb(p_msgs_pessoa), now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end $$;
revoke all on function public.admin_irise_limites_set(integer, integer) from public, anon;
grant execute on function public.admin_irise_limites_set(integer, integer) to authenticated;

-- Uso com mais de 180 dias sai sozinho (só números, mas não há motivo pra guardar para sempre).
select cron.unschedule('irise-uso-limpeza') where exists (select 1 from cron.job where jobname = 'irise-uso-limpeza');
select cron.schedule('irise-uso-limpeza', '17 4 * * *',
  $$ delete from public.irise_uso where dia < (now() at time zone 'America/Sao_Paulo')::date - 180; $$);
