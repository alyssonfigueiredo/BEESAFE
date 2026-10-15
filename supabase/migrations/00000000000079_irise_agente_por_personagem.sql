-- Agente de cada personagem do irise (14/10/2026, pedido do Leandro): o chat passa a falar com o
-- nome, os pronomes e a personalidade do irise que a pessoa escolheu, e cada personagem tem a sua
-- configuração de conversa editável no painel web e na tela de admin do app.
--
-- Fica numa tabela à parte (sem policy nenhuma: só as funções admin_* e a Edge Function, com a chave
-- de serviço, leem) porque `irise_personagens` é catálogo público — o texto de voz é instrução do
-- agente e não precisa ir para o celular de ninguém.
--   voz   = jeito de falar e personalidade, em texto livre (somado às regras fixas do código)
--   giria = 0 quase nenhuma · 1 na medida · 2 bastante
--   emoji = 0 nunca · 1 no máximo um · 2 à vontade (até dois)
-- Nome, pronomes, classe, bio e os quatro atributos continuam em `irise_personagens` e também
-- entram no agente (atributo alto ou baixo vira traço de personalidade).

create table public.irise_agentes (
  n smallint primary key references public.irise_personagens (n) on delete cascade,
  voz text not null default '' check (length(voz) <= 1500),
  giria smallint not null default 1 check (giria between 0 and 2),
  emoji smallint not null default 1 check (emoji between 0 and 2),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users (id) on delete set null
);
alter table public.irise_agentes enable row level security;
comment on table public.irise_agentes is
  'Configuração de conversa de cada personagem do irise. Sem policy: só admin_* e a Edge Function irise-orchestrator leem.';

-- Traz o texto que já estava em app_settings.irise_voz_personagens (migration 74).
insert into public.irise_agentes (n, voz)
select (e.key)::smallint, left(btrim(e.value #>> '{}'), 1500)
from public.app_settings s, jsonb_each(coalesce(s.value, '{}'::jsonb)) e
where s.key = 'irise_voz_personagens'
  and e.key ~ '^[0-9]+$'
  and exists (select 1 from public.irise_personagens p where p.n = (e.key)::smallint)
on conflict (n) do update set voz = excluded.voz;

create or replace function public.admin_irise_agentes()
returns setof public.irise_agentes
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return query select * from public.irise_agentes order by n;
end $$;
revoke all on function public.admin_irise_agentes() from public, anon;
grant execute on function public.admin_irise_agentes() to authenticated;

create or replace function public.admin_irise_agente_set(p_n smallint, p_voz text, p_giria smallint, p_emoji smallint)
returns public.irise_agentes
language plpgsql security definer set search_path = public as $$
declare v public.irise_agentes;
begin
  perform public.admin_guard(true);
  if not exists (select 1 from public.irise_personagens where n = p_n) then
    raise exception 'Personagem inválido: %', p_n;
  end if;
  insert into public.irise_agentes (n, voz, giria, emoji, atualizado_em, atualizado_por)
  values (p_n, left(btrim(coalesce(p_voz, '')), 1500), coalesce(p_giria, 1), coalesce(p_emoji, 1), now(), auth.uid())
  on conflict (n) do update set voz = excluded.voz, giria = excluded.giria, emoji = excluded.emoji,
    atualizado_em = now(), atualizado_por = auth.uid()
  returning * into v;
  return v;
end $$;
revoke all on function public.admin_irise_agente_set(smallint, text, smallint, smallint) from public, anon;
grant execute on function public.admin_irise_agente_set(smallint, text, smallint, smallint) to authenticated;

-- A função antiga (migration 74) continua respondendo, agora gravando no lugar novo.
create or replace function public.admin_personagem_voz_set(p_personagem smallint, p_voz text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  if p_personagem is null or not exists (select 1 from public.irise_personagens where n = p_personagem) then
    raise exception 'Personagem inválido: %', p_personagem;
  end if;
  insert into public.irise_agentes (n, voz, atualizado_em, atualizado_por)
  values (p_personagem, left(btrim(coalesce(p_voz, '')), 1500), now(), auth.uid())
  on conflict (n) do update set voz = excluded.voz, atualizado_em = now(), atualizado_por = auth.uid();
end $$;
revoke all on function public.admin_personagem_voz_set(smallint, text) from public, anon;
grant execute on function public.admin_personagem_voz_set(smallint, text) to authenticated;
