-- TybyrIA v2.2 (04/10/2026): o "terceiro cérebro" da Irise, do projeto Código Não Binário
-- (Veronyka/tybyria-v2.2 no Hugging Face) — NÃO é um analisador de sentimento de avaliação (o
-- modelo não faz isso). É um classificador de discurso de ódio anti-LGBTQIA+ em português.
-- Por isso entra como moderação, não como "inteligência da comunidade": escaneia avaliações e
-- mensagens do mural atrás de discurso de ódio, SEM atrasar a publicação (avaliação continua
-- aparecendo na hora, decisão de 04/10/2026) — só sinaliza pra fila de moderação que já existe.
--
-- A Edge Function tybyria-check (pg_cron, 10 em 10 min) pega o que ainda não foi checado, manda
-- pra Inference API do Hugging Face (Veronyka/tybyria-v2.2) e grava o resultado aqui. Score ≥ 0,40
-- (limiar que o próprio modelo recomenda) vira denúncia automática — igual a uma pessoa denunciando,
-- cai na mesma fila (moderation_queue) e passa por revisão humana. Nunca esconde sozinho.
-- Secret: HF_API_TOKEN (grátis, huggingface.co → Settings → Access Tokens, nível "read" basta).

create table public.tybyria_checks (
  target_type public.report_target not null check (target_type in ('rating', 'message')),
  target_id uuid not null,
  score numeric not null check (score between 0 and 1),
  flagged boolean not null,
  checked_at timestamptz not null default now(),
  primary key (target_type, target_id)
);
alter table public.tybyria_checks enable row level security;
-- Sem policy: só a Edge Function (chave de serviço) grava e lê.
comment on table public.tybyria_checks is
  'Resultado da checagem de discurso de ódio (TybyrIA v2.2) em avaliações e mensagens do mural.
   Score ≥ 0,40 também vira uma linha em content_reports, pra entrar na fila de moderação normal.';

create or replace function public.tybyria_pendentes(p_limit integer default 50)
returns table (target_type public.report_target, target_id uuid, texto text)
language sql stable security definer set search_path = public as $$
  (
    select 'rating'::public.report_target, pr.id, pr.comment
    from public.place_ratings pr
    where pr.status = 'active'
      and coalesce(char_length(pr.comment), 0) > 0
      and not exists (
        select 1 from public.tybyria_checks c where c.target_type = 'rating' and c.target_id = pr.id
      )
    order by pr.created_at desc
    limit p_limit
  )
  union all
  (
    select 'message'::public.report_target, m.id, m.content
    from public.support_messages m
    where m.status = 'active'
      and coalesce(char_length(m.content), 0) > 0
      and not exists (
        select 1 from public.tybyria_checks c where c.target_type = 'message' and c.target_id = m.id
      )
    order by m.created_at desc
    limit p_limit
  )
  limit p_limit;
$$;
revoke all on function public.tybyria_pendentes(integer) from public, anon, authenticated;
grant execute on function public.tybyria_pendentes(integer) to service_role;

create or replace function public.tybyria_registrar(
  p_type public.report_target, p_id uuid, p_score numeric, p_flagged boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.tybyria_checks (target_type, target_id, score, flagged)
  values (p_type, p_id, p_score, p_flagged)
  on conflict (target_type, target_id) do update
    set score = excluded.score, flagged = excluded.flagged, checked_at = now();

  if p_flagged then
    insert into public.content_reports (target_type, target_id, reason, reporter_id, status)
    values (p_type, p_id, 'TybyrIA: sinal de discurso de ódio detectado automaticamente', null, 'open');
  end if;
end $$;
revoke all on function public.tybyria_registrar(public.report_target, uuid, numeric, boolean) from public, anon, authenticated;
grant execute on function public.tybyria_registrar(public.report_target, uuid, numeric, boolean) to service_role;

-- Senha que a Edge Function confere (x-cron-secret), do mesmo jeito que push_secret/photo_check.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'tybyria_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'tybyria_secret');
  end if;
end $$;

create or replace function public.tybyria_autorizado(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_secret, '') <> ''
     and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'tybyria_secret');
$$;
revoke all on function public.tybyria_autorizado(text) from public, anon, authenticated;
grant execute on function public.tybyria_autorizado(text) to service_role;

select cron.unschedule('tybyria-check') where exists (select 1 from cron.job where jobname = 'tybyria-check');
select cron.schedule('tybyria-check', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://ntjirpqulrnieeglpiei.supabase.co/functions/v1/tybyria-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'tybyria_secret')
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from public.place_ratings pr where pr.status = 'active' and coalesce(char_length(pr.comment), 0) > 0
                  and not exists (select 1 from public.tybyria_checks c where c.target_type = 'rating' and c.target_id = pr.id))
     or exists (select 1 from public.support_messages m where m.status = 'active' and coalesce(char_length(m.content), 0) > 0
                  and not exists (select 1 from public.tybyria_checks c where c.target_type = 'message' and c.target_id = m.id));
$$);
