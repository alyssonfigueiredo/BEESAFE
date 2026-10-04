-- Notificações push pelo Expo.
-- O app grava o token do aparelho depois do login (register_push_token). O envio sai pelo SQL Editor:
--   select public.enviar_notificacao('A noite colore depois das 22h ✨', 'Confere aqui onde somos bem-vindes 🌈');
-- na hora ou agendado (p_quando), para todo mundo ou só para uma cidade (p_cidade = cities.id).
-- A Edge Function send-push pega os envios vencidos, manda pela API do Expo e grava o resultado aqui.
-- Exemplos prontos em supabase/notificacoes.sql.

create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  user_id uuid references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
-- Sem policy: o app só grava pela RPC abaixo e só a chave de serviço lê.
comment on table public.push_tokens is 'Token de push (Expo) de cada aparelho com a Irisa e notificação permitida. Some com a conta.';

create or replace function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na conta para receber notificações.';
  end if;
  -- O mesmo aparelho pode trocar de conta: o token passa a ser da conta que está logada.
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;
revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

create table public.push_envios (
  id bigint generated always as identity primary key,
  titulo text not null check (char_length(titulo) between 1 and 65),
  corpo text not null check (char_length(corpo) between 1 and 240),
  url text check (url is null or url like '/%'),          -- tela do app ao tocar, ex. '/lugares'
  city_id integer references public.cities (id),           -- null = todo mundo
  enviar_em timestamptz not null default now(),
  status text not null default 'agendada'
    check (status in ('agendada', 'enviando', 'enviada', 'erro', 'cancelada')),
  aparelhos integer,
  aceitos integer,
  falhas integer,
  erro text,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz
);
create index push_envios_fila_idx on public.push_envios (enviar_em) where status = 'agendada';
alter table public.push_envios enable row level security;
-- Sem policy: ninguém do app lê nem escreve. Leitura e envio pelo SQL Editor.
comment on table public.push_envios is 'Notificações push enviadas e agendadas (supabase/notificacoes.sql).';

-- Senha que a Edge Function confere (x-cron-secret). Gerada aqui e guardada só no Vault.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'push_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_secret');
  end if;
end $$;

create or replace function public.push_autorizado(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_secret, '') <> ''
     and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'push_secret');
$$;
revoke all on function public.push_autorizado(text) from public, anon, authenticated;
grant execute on function public.push_autorizado(text) to service_role;

-- Chama a Edge Function. Usada pelo cron e pelo envio imediato.
create or replace function public.push_disparar()
returns bigint language sql security definer set search_path = public, extensions as $$
  select net.http_post(
    url := 'https://ntjirpqulrnieeglpiei.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_secret')
    ),
    body := '{}'::jsonb
  );
$$;
revoke all on function public.push_disparar() from public, anon, authenticated;

create or replace function public.enviar_notificacao(
  p_titulo text,
  p_corpo text,
  p_quando timestamptz default now(),
  p_url text default null,
  p_cidade integer default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
begin
  insert into public.push_envios (titulo, corpo, enviar_em, url, city_id)
  values (p_titulo, p_corpo, p_quando, p_url, p_cidade)
  returning id into v_id;
  -- Na hora: não espera o cron. Agendado: o cron de 5 em 5 minutos pega.
  if p_quando <= now() then
    perform public.push_disparar();
  end if;
  return v_id;
end $$;
revoke all on function public.enviar_notificacao(text, text, timestamptz, text, integer) from public, anon, authenticated;

-- A função pega os envios vencidos de uma vez, sem dois disparos mandarem o mesmo envio.
create or replace function public.push_pegar_envios()
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
revoke all on function public.push_pegar_envios() from public, anon, authenticated;
grant execute on function public.push_pegar_envios() to service_role;

create or replace function public.push_tokens_do_envio(p_city integer)
returns table (token text) language sql stable security definer set search_path = public as $$
  select t.token
  from public.push_tokens t
  left join public.profiles p on p.id = t.user_id
  where p_city is null or p.default_city_id = p_city;
$$;
revoke all on function public.push_tokens_do_envio(integer) from public, anon, authenticated;
grant execute on function public.push_tokens_do_envio(integer) to service_role;

select cron.unschedule('send-push') where exists (select 1 from cron.job where jobname = 'send-push');
select cron.schedule('send-push', '*/5 * * * *', $$
  select public.push_disparar()
  where exists (select 1 from public.push_envios where status = 'agendada' and enviar_em <= now());
$$);
