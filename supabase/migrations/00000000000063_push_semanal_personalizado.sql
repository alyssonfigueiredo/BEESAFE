-- Push semanal personalizado (05/10/2026, pedido do Alysson): três tipos de aviso, um só por
-- pessoa por rodada, em ordem de prioridade — nível perto de subir, medalha quase pronta, ou (sem
-- nenhum dos dois) um lugar sem nota na cidade salva do perfil. Nunca usa localização em tempo real
-- (o banco não guarda isso, de propósito) — "perto de você" aqui é a cidade do perfil, não GPS.
-- Reaproveita gami_stats (migration 48), que já calcula o progresso de cada uma das 32 medalhas.

grant execute on function public.gami_stats(uuid) to service_role;

create or replace function public.push_nudges_semanais()
returns table (user_id uuid, token text, titulo text, corpo text, url text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_niveis int[] := array[2, 5, 10, 16, 24, 34, 48];
begin
  -- Sem admin_guard: quem chama é a Edge Function com a chave de serviço, sem JWT de usuário
  -- (auth.uid() viria nulo e admin_guard sempre recusaria). O grant abaixo já restringe a chamada
  -- só ao service_role.
  return query
  with alvo as (
    select pt.user_id, pt.token, p.default_city_id,
           public.gami_stats(pt.user_id) as stats
    from public.push_tokens pt
    join public.profiles p on p.id = pt.user_id
  ), nivel as (
    select a.*, (select min(n) from unnest(v_niveis) as n where n > (stats->>'gomos')::int) as proximo
    from alvo a
  ), medalha as (
    select n.*, (
      select m.alvo - m.valor
      from jsonb_to_recordset(n.stats->'medalhas') as m(id text, valor numeric, alvo numeric, ok boolean, unidade text)
      where m.ok = false
      order by (m.alvo - m.valor) asc
      limit 1
    ) as gap_medalha
    from nivel n
  ), lugar as (
    select m.*,
      (select pp.id from public.public_places pp
        where pp.city_id = m.default_city_id and pp.score is null
          and not exists (select 1 from public.place_ratings r where r.place_id = pp.id and r.user_id = m.user_id)
        order by random() limit 1) as lugar_id
    from medalha m
  )
  select l.user_id, l.token,
    case
      when l.proximo is not null and l.proximo - (l.stats->>'gomos')::int <= 2
        then 'Quase lá!'
      when l.gap_medalha is not null and l.gap_medalha <= 2
        then 'Uma medalha por perto'
      when l.lugar_id is not null
        then 'Um lugar esperando sua nota'
      else null
    end as titulo,
    case
      when l.proximo is not null and l.proximo - (l.stats->>'gomos')::int <= 2
        then 'Faltam ' || (l.proximo - (l.stats->>'gomos')::int) || ' gomos pro seu próximo nível na Irisa.'
      when l.gap_medalha is not null and l.gap_medalha <= 2
        then 'Você está perto de desbloquear uma conquista nova. Dá uma olhada.'
      when l.lugar_id is not null
        then 'Tem um lugar na sua cidade que ainda não tem nota nenhuma — seja quem avalia primeiro.'
      else null
    end as corpo,
    case
      when l.proximo is not null and l.proximo - (l.stats->>'gomos')::int <= 2 then '/evolucao'
      when l.gap_medalha is not null and l.gap_medalha <= 2 then '/conquistas'
      when l.lugar_id is not null then '/lugar/' || l.lugar_id
      else null
    end as url
  from lugar l
  where (l.proximo is not null and l.proximo - (l.stats->>'gomos')::int <= 2)
     or (l.gap_medalha is not null and l.gap_medalha <= 2)
     or l.lugar_id is not null;
end $$;
revoke all on function public.push_nudges_semanais() from public, anon, authenticated;
grant execute on function public.push_nudges_semanais() to service_role;

-- Dispara a Edge Function (mesmo secret do push_autorizado). Agendado 1x por semana — toda
-- segunda-feira às 13h UTC (10h em Brasília), mesmo horário das pílulas.
create or replace function public.weekly_nudge_disparar()
returns bigint language sql security definer set search_path = public, extensions as $$
  select net.http_post(
    url := 'https://ntjirpqulrnieeglpiei.supabase.co/functions/v1/weekly-nudge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_secret')
    ),
    body := '{}'::jsonb
  );
$$;
revoke all on function public.weekly_nudge_disparar() from public, anon, authenticated;

select cron.unschedule('weekly-nudge') where exists (select 1 from cron.job where jobname = 'weekly-nudge');
select cron.schedule('weekly-nudge', '0 13 * * 1', $$ select public.weekly_nudge_disparar(); $$);
