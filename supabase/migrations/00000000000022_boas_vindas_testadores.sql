-- E-mail automático para testadores (Edge Function tester-welcome).
-- Quem se inscreveu no site recebe o link de instalação quando é marcado como adicionado
-- (added_at), que só deve acontecer DEPOIS que a lista foi aprovada na Play Console.
-- O pg_cron chama a função a cada 10 minutos, mas só quando há alguém esperando.

alter table public.tester_signups add column if not exists welcomed_at timestamptz;
comment on column public.tester_signups.welcomed_at is 'Quando o e-mail com o link de instalação saiu.';

create extension if not exists pg_net;

-- A senha que a função confere fica no Vault: vault.create_secret('<senha>', 'tester_welcome_secret').
select cron.unschedule('tester-welcome') where exists (select 1 from cron.job where jobname = 'tester-welcome');
select cron.schedule('tester-welcome', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://ntjirpqulrnieeglpiei.supabase.co/functions/v1/tester-welcome',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'tester_welcome_secret')
    ),
    body := '{}'::jsonb
  )
  where exists (
    select 1 from public.tester_signups where added_at is not null and welcomed_at is null
  );
$$);
