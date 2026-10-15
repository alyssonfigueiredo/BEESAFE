-- Eventos mínimos de produto (15/10/2026, análise de ponta a ponta do Leandro): zero observabilidade
-- hoje — os únicos sinais de uso são o painel admin e alguém reclamando. Tabela própria, sem
-- terceiro nenhum (coerente com a arquitetura de privacidade do resto do banco): só "aconteceu algo",
-- nunca o quê (sem texto livre, sem place_id/occurrence_id). Serve pra enxergar se o app está sendo
-- usado e se está quebrando, não pra analytics de comportamento.

create table public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  kind text not null check (kind in ('abriu', 'avaliou', 'cadastrou_lugar', 'relatou', 'erro')),
  created_at timestamptz not null default now()
);

create index app_events_kind_created_idx on public.app_events (kind, created_at desc);

alter table public.app_events enable row level security;

-- Cada um só grava o próprio evento; ninguém lê pelo app (nem o próprio dono) — só o painel, via RPC.
create policy app_events_insert on public.app_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Resumo pro painel: quantos eventos de cada tipo, por dia, nos últimos 30 dias. A tabela não tem
-- policy de select nenhuma — só esta função enxerga, e só depois de confirmar o papel admin.
create function public.admin_eventos_resumo()
returns table (dia date, kind text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return query
  select date_trunc('day', created_at)::date as dia, kind, count(*) as total
  from public.app_events
  where created_at > now() - interval '30 days'
  group by 1, 2
  order by 1 desc, 2;
end;
$$;

revoke all on function public.admin_eventos_resumo() from public, anon;
grant execute on function public.admin_eventos_resumo() to authenticated;
