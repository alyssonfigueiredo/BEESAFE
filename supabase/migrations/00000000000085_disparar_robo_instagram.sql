-- O agendamento do GitHub Actions não é cumprido (o robô "a cada 30 min" rodou 4 vezes num dia e
-- o post das 17h de 14/11/2026 só saiu disparado à mão). Aqui o banco chama o workflow
-- "Publicar Instagram" pela API do GitHub a cada 15 minutos, com pg_cron + pg_net.
-- Precisa de um token do GitHub no Vault com o nome `github_dispatch_token` (fine-grained, só o
-- repositório BEESAFE, permissão Actions: Read and write). Sem o token, não faz nada.
-- O token entra pelo SQL Editor, nunca pelo repositório nem por chat:
--   select vault.create_secret('<token>', 'github_dispatch_token');

create or replace function public.ig_disparar_robo()
returns bigint language sql security definer set search_path = public, extensions as $$
  select net.http_post(
    url := 'https://api.github.com/repos/alyssonfigueiredo/BEESAFE/actions/workflows/publicar-instagram.yml/dispatches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept', 'application/vnd.github+json',
      'User-Agent', 'irisa-agendador',
      'X-GitHub-Api-Version', '2022-11-28',
      'Authorization', 'Bearer ' || s.decrypted_secret
    ),
    body := jsonb_build_object('ref', 'claude/ecstatic-darwin-cmf7sw', 'inputs', jsonb_build_object('testar', 'false'))
  )
  from vault.decrypted_secrets s
  where s.name = 'github_dispatch_token' and coalesce(s.decrypted_secret, '') <> '';
$$;
revoke all on function public.ig_disparar_robo() from public, anon, authenticated;

select cron.unschedule('ig-disparar-robo') where exists (select 1 from cron.job where jobname = 'ig-disparar-robo');
select cron.schedule('ig-disparar-robo', '3,18,33,48 * * * *', $$ select public.ig_disparar_robo(); $$);
