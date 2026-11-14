-- Aprovação dos posts do Instagram pelo painel (14/11/2026, pedido do Leandro).
-- Até aqui a aprovação morava num artefato do Claude da conta do Alysson: só uma sessão daquela
-- conta conseguia publicar a página e ler as decisões. Agora a tela "Instagram" do painel
-- (docs/admin) lê docs/legendas/fila.json direto do repositório e grava cada decisão aqui; o
-- workflow "Publicar Instagram" roda scripts/ig-decisoes-sync.mjs a cada meia hora, aplica as
-- decisões no fila.json e marca `aplicado_em`. O fila.json continua sendo a fonte única do robô.
--
-- Tabela sem policy nenhuma: só as funções admin_* (security definer, com admin_guard) e o
-- script do workflow (conexão do banco) leem e escrevem.

create table if not exists public.ig_decisoes (
  id bigint generated always as identity primary key,
  peca text not null check (length(peca) between 1 and 120),
  acao text not null check (acao in (
    'aprovar', 'desaprovar', 'arquivar', 'reaproveitar', 'publicar_agora', 'publicado', 'pedido'
  )),
  -- Só para 'pedido': o que mudar na peça.
  texto text check (texto is null or length(texto) <= 2000),
  por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  -- Preenchido pelo script quando a decisão entrou no fila.json. Em 'pedido', quando foi resolvido.
  aplicado_em timestamptz,
  -- O que o script fez (ex.: "recusado: a versão sem adesivo já está aprovada").
  resultado text
);
create index if not exists ig_decisoes_pendentes on public.ig_decisoes (id) where aplicado_em is null;
alter table public.ig_decisoes enable row level security;

create or replace function public.admin_ig_decidir(p_peca text, p_acao text, p_texto text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_texto text := nullif(btrim(coalesce(p_texto, '')), '');
begin
  perform public.admin_guard(true);
  if p_acao = 'pedido' and v_texto is null then
    raise exception 'Escreva o que precisa mudar.' using errcode = '22023';
  end if;
  insert into public.ig_decisoes (peca, acao, texto, por)
  values (btrim(p_peca), p_acao, case when p_acao = 'pedido' then v_texto end, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- O que a tela precisa além do fila.json: decisões que ainda não entraram na fila (para mostrar
-- "esperando sincronizar"), pedidos de alteração abertos e as últimas decisões aplicadas.
create or replace function public.admin_ig_estado()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return jsonb_build_object(
    'pendentes', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'peca', d.peca, 'acao', d.acao, 'criado_em', d.criado_em) order by d.id)
      from public.ig_decisoes d where d.aplicado_em is null and d.acao <> 'pedido'), '[]'::jsonb),
    'pedidos', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'peca', d.peca, 'texto', d.texto, 'criado_em', d.criado_em) order by d.id)
      from public.ig_decisoes d where d.aplicado_em is null and d.acao = 'pedido'), '[]'::jsonb),
    'ultimas', coalesce((
      select jsonb_agg(x order by (x->>'id')::bigint desc) from (
        select jsonb_build_object('id', d.id, 'peca', d.peca, 'acao', d.acao, 'aplicado_em', d.aplicado_em,
                                  'resultado', d.resultado) as x
        from public.ig_decisoes d where d.aplicado_em is not null and d.acao <> 'pedido'
        order by d.id desc limit 15) s), '[]'::jsonb)
  );
end $$;

create or replace function public.admin_ig_pedido_resolver(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  update public.ig_decisoes set aplicado_em = now(), resultado = 'resolvido no painel'
  where id = p_id and acao = 'pedido' and aplicado_em is null;
end $$;

revoke all on function public.admin_ig_decidir(text, text, text) from public, anon;
revoke all on function public.admin_ig_estado() from public, anon;
revoke all on function public.admin_ig_pedido_resolver(bigint) from public, anon;
grant execute on function public.admin_ig_decidir(text, text, text) to authenticated;
grant execute on function public.admin_ig_estado() to authenticated;
grant execute on function public.admin_ig_pedido_resolver(bigint) to authenticated;
