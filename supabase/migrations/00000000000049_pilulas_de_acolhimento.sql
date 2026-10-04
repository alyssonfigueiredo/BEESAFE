-- Pílulas de acolhimento (04/10/2026): gatilho de conforto DENTRO do app, não conteúdo pro Instagram.
-- Um banco de frases de apoio (guia de marca: "bem-vinde", nunca "seguro"/"tranquila"). A cada
-- `pilula_intervalo_dias` sem receber uma, a pessoa ganha uma por push — sorteada sem repetir até
-- esgotar o banco, aí recomeça. Também dá pra pedir uma a qualquer hora pelo atalho no Perfil.
-- A pessoa pode compartilhar a frase como imagem de story (CompartilharSheet, já usado pelas
-- medalhas) — só a frase e a marca, nenhum dado dela.

create table public.comfort_pills (
  id bigint generated always as identity primary key,
  line1 text not null check (char_length(line1) between 1 and 60),
  line2 text not null check (char_length(line2) between 1 and 60),
  body text not null check (char_length(body) between 0 and 160),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.comfort_pills is
  'Banco de frases das pílulas de acolhimento. Editar/adicionar linhas aqui, nunca pelo app.';

-- Frases do guia de marca (irisa-posts/SKILL.md, lista de "frases de apoio já aprovadas") que
-- funcionam soltas, sem contexto de produto. As duas últimas são novas, propostas em 04/10/2026 —
-- o Alysson pode apagar ou reescrever antes de ir ao ar.
insert into public.comfort_pills (line1, line2, body) values
  ('Bem-vinde', 'aqui.', 'Você não precisa explicar nada pra merecer um lugar que te acolha.'),
  ('Não é fase.', 'É endereço.', 'Quem você é não é passageiro — é onde você mora.'),
  ('A rua também', 'é nossa.', 'Ocupar espaço em público também é um jeito de existir.'),
  ('Ninguém solta', 'a mão de ninguém.', 'Em grupo ou sozinhe, a gente se cuida — e se cuida junto.'),
  ('Fora do armário.', 'Dentro do mapa.', 'Sem pedir permissão pra existir, com lugar marcado por quem já esteve lá.'),
  ('Estamos aqui.', 'E no mapa.', 'Visíveis, acolhides, juntes.'),
  ('Silêncio', 'não é nota.', 'Quem não fala também merece ser lembrade.'),
  ('Aquenda', 'esse lugar.', 'Toda avaliação sua ajuda a próxima pessoa a escolher melhor.'),
  ('Seu jeito de existir', 'não precisa de permissão.', 'Você já é suficiente do jeito que chegou.'),
  ('Respira.', 'Você está onde devia estar.', '')
on conflict do nothing;

-- Histórico do que já foi mostrado a cada pessoa: evita repetir até esgotar o banco.
create table public.user_comfort_pills (
  user_id uuid not null references auth.users (id) on delete cascade,
  pill_id bigint not null references public.comfort_pills (id) on delete cascade,
  shown_at timestamptz not null default now(),
  source text not null default 'app' check (source in ('app', 'push'))
);
create index user_comfort_pills_user_idx on public.user_comfort_pills (user_id, shown_at desc);
alter table public.user_comfort_pills enable row level security;
create policy "usuário lê seu próprio histórico de pílulas"
  on public.user_comfort_pills for select using (auth.uid() = user_id);
-- Sem insert/update/delete por policy: só entra pelas funções abaixo (security definer).
comment on table public.user_comfort_pills is
  'Quais pílulas cada pessoa já recebeu (app ou push), para não repetir. Some com a conta.';

-- Sorteia e grava a próxima pílula ainda não vista por p_user. Esgotado o banco, mantém fora só a
-- última mostrada (pra não repetir a mesmíssima de novo) e recomeça o ciclo.
create or replace function public._next_comfort_pill_for(p_user uuid, p_source text)
returns table (id bigint, line1 text, line2 text, body text)
language plpgsql security definer set search_path = public as $$
declare
  v_pill record;
begin
  select cp.id, cp.line1, cp.line2, cp.body into v_pill
  from public.comfort_pills cp
  where cp.active
    and cp.id not in (
      select ucp.pill_id from public.user_comfort_pills ucp where ucp.user_id = p_user
    )
  order by random()
  limit 1;

  if v_pill.id is null then
    delete from public.user_comfort_pills ucp
    where ucp.user_id = p_user
      and ucp.pill_id <> (
        select pill_id from public.user_comfort_pills
        where user_id = p_user order by shown_at desc limit 1
      );
    select cp.id, cp.line1, cp.line2, cp.body into v_pill
    from public.comfort_pills cp
    where cp.active
      and cp.id not in (
        select ucp.pill_id from public.user_comfort_pills ucp where ucp.user_id = p_user
      )
    order by random() limit 1;
  end if;

  if v_pill.id is not null then
    insert into public.user_comfort_pills (user_id, pill_id, source) values (p_user, v_pill.id, p_source);
  end if;

  return query select v_pill.id, v_pill.line1, v_pill.line2, v_pill.body;
end $$;
revoke all on function public._next_comfort_pill_for(uuid, text) from public, anon, authenticated;
grant execute on function public._next_comfort_pill_for(uuid, text) to service_role;

-- Uso pelo app: a própria pessoa logada pede uma pílula (atalho no Perfil).
create or replace function public.next_comfort_pill()
returns table (id bigint, line1 text, line2 text, body text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na conta para receber uma pílula.';
  end if;
  return query select * from public._next_comfort_pill_for(auth.uid(), 'app');
end $$;
revoke all on function public.next_comfort_pill() from public, anon;
grant execute on function public.next_comfort_pill() to authenticated;

-- A última pílula recebida (app ou push) — a tela abre com ela em vez de sortear de novo na hora,
-- então tocar na notificação mostra exatamente a frase que chegou.
create or replace function public.my_last_comfort_pill()
returns table (id bigint, line1 text, line2 text, body text, shown_at timestamptz)
language sql stable security definer set search_path = public as $$
  select cp.id, cp.line1, cp.line2, cp.body, ucp.shown_at
  from public.user_comfort_pills ucp
  join public.comfort_pills cp on cp.id = ucp.pill_id
  where ucp.user_id = auth.uid()
  order by ucp.shown_at desc
  limit 1;
$$;
revoke all on function public.my_last_comfort_pill() from public, anon;
grant execute on function public.my_last_comfort_pill() to authenticated;

-- ---------- push a cada N dias, alternando ----------
insert into public.app_settings (key, value) values
  ('pilula_intervalo_dias', '4'::jsonb)
on conflict (key) do nothing;

-- Quem tem token de push e não recebeu pílula nos últimos N dias. Chamada só pela Edge Function.
create or replace function public.comfort_pill_push_eligible(p_intervalo_dias integer)
returns table (user_id uuid, token text)
language sql stable security definer set search_path = public as $$
  select distinct pt.user_id, pt.token
  from public.push_tokens pt
  where pt.user_id is not null
    and not exists (
      select 1 from public.user_comfort_pills ucp
      where ucp.user_id = pt.user_id
        and ucp.shown_at > now() - make_interval(days => greatest(p_intervalo_dias, 1))
    );
$$;
revoke all on function public.comfort_pill_push_eligible(integer) from public, anon, authenticated;
grant execute on function public.comfort_pill_push_eligible(integer) to service_role;

-- Mesmo sorteio de next_comfort_pill(), mas para um usuário escolhido pela Edge Function (push).
create or replace function public.next_comfort_pill_for(p_user uuid)
returns table (id bigint, line1 text, line2 text, body text)
language sql security definer set search_path = public as $$
  select * from public._next_comfort_pill_for(p_user, 'push');
$$;
revoke all on function public.next_comfort_pill_for(uuid) from public, anon, authenticated;
grant execute on function public.next_comfort_pill_for(uuid) to service_role;

-- Dispara a Edge Function (mesmo secret do push_autorizado). Agendada 1x por dia; a própria função
-- decide quem é elegível pelo intervalo configurado.
create or replace function public.comfort_pill_disparar()
returns bigint language sql security definer set search_path = public, extensions as $$
  select net.http_post(
    url := 'https://ntjirpqulrnieeglpiei.supabase.co/functions/v1/comfort-pill-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_secret')
    ),
    body := '{}'::jsonb
  );
$$;
revoke all on function public.comfort_pill_disparar() from public, anon, authenticated;

select cron.unschedule('comfort-pill-push') where exists (select 1 from cron.job where jobname = 'comfort-pill-push');
-- Uma vez por dia, às 13h UTC (10h em Brasília) — nem de manhã cedo nem de madrugada.
select cron.schedule('comfort-pill-push', '0 13 * * *', $$ select public.comfort_pill_disparar(); $$);
