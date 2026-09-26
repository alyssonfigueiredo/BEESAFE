-- Notificação por e-mail (via Make) de novo cadastro no app e de novo pedido de teste pelo site.
-- Aplicado direto no banco em 2026-09-25 (20260925225909); este arquivo só sincroniza o repositório.

-- pg_net só existe no Supabase; localmente (db-smoke.sh) o stub net.http_post cobre as triggers abaixo.
do $$ begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net indisponível neste ambiente, seguindo com o stub: %', sqlerrm;
end $$;

create table public.tester_signups (
  id bigint generated always as identity primary key,
  email text not null unique check (
    char_length(email) between 6 and 254
    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  platform text not null default 'android' check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  added_at timestamptz -- quando o e-mail foi acrescentado à lista de testadores do Play Console.
);

-- Sem policy: só postgres/service_role inserem (Alysson cola no SQL Editor quando alguém topa testar).
alter table public.tester_signups enable row level security;
revoke all on public.tester_signups from anon, authenticated;

create or replace function public.notificar_novo_cadastro()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://hook.us2.make.com/9fv38doiflqu47vfc5sij5qviieuwcwo',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('email', new.email, 'created_at', new.created_at)
  );
  return new;
end $$;

create trigger on_auth_user_created_notify
  after insert on auth.users
  for each row execute function public.notificar_novo_cadastro();

create or replace function public.notificar_novo_testador()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://hook.us2.make.com/zkio4j4v9xbb4uii4wh3i0n2gwps7vwy',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('email', new.email, 'platform', new.platform, 'created_at', new.created_at)
  );
  return new;
end $$;

create trigger on_tester_signup_notify
  after insert on public.tester_signups
  for each row execute function public.notificar_novo_testador();
