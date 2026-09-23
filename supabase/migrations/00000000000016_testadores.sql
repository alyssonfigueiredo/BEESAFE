-- Inscrição de testadores pelo site (docs/index.html).
-- A página pública só consegue CHAMAR a função; ninguém lê a tabela de fora.
-- Quem administra lê no SQL Editor e cola os e-mails na lista de testadores da Play Console.

create table if not exists public.tester_signups (
  id bigint generated always as identity primary key,
  email text not null unique check (char_length(email) between 6 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  platform text not null default 'android' check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  added_at timestamptz            -- preenchido quando o e-mail já foi colado na Play Console
);
comment on table public.tester_signups is 'E-mails de quem pediu para testar pelo site. Só leitura pelo SQL Editor.';

alter table public.tester_signups enable row level security;
-- Sem policy nenhuma: anon e authenticated não leem nem escrevem direto.
revoke all on public.tester_signups from anon, authenticated;

create or replace function public.tester_signup(p_email text, p_platform text default 'android')
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_platform text := case when p_platform = 'ios' then 'ios' else 'android' end;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'E-mail inválido' using errcode = 'P0010';
  end if;
  -- trava contra robô: no máximo 300 inscrições novas por hora no total
  if (select count(*) from public.tester_signups where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Muitas inscrições agora. Tente de novo em alguns minutos.' using errcode = 'P0011';
  end if;
  insert into public.tester_signups (email, platform) values (v_email, v_platform)
  on conflict (email) do update set platform = excluded.platform;
  return 'ok';
end $$;

revoke all on function public.tester_signup(text, text) from public;
grant execute on function public.tester_signup(text, text) to anon, authenticated;
