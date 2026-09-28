-- Bloqueio por usuário (regra 1.2 da App Store / questionário IARC do Google Play).
-- Quem bloqueia deixa de ver o que a outra conta publica com autoria visível: mensagens do mural
-- e avaliações de lugares. Relatos são anônimos e não têm autoria visível, então não entram aqui.
-- O app nunca recebe o id do autor (created_by não sai do banco): o bloqueio é pedido pelo id do
-- CONTEÚDO (block_author) e o banco resolve quem escreveu. Só quem bloqueou vê e desfaz os seus.

create table public.blocked_users (
  blocker_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocked_users_blocked_idx on public.blocked_users (blocked_id);
comment on table public.blocked_users is 'Quem (blocker) escolheu não ver mais o que outra conta (blocked) publica. Só o próprio blocker lê e apaga.';

alter table public.blocked_users enable row level security;
create policy "blocks: os meus" on public.blocked_users for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "blocks: bloquear" on public.blocked_users for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "blocks: desbloquear" on public.blocked_users for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- Verdadeiro quando o usuário atual bloqueou o autor informado. Autor nulo (conta excluída) nunca está bloqueado.
create or replace function public.is_blocked(p_author uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_author is not null and exists (
    select 1 from public.blocked_users b where b.blocker_id = auth.uid() and b.blocked_id = p_author
  );
$$;
revoke all on function public.is_blocked(uuid) from public, anon;
grant execute on function public.is_blocked(uuid) to authenticated;

create or replace function public.block_user(p_blocked_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado' using errcode = '42501'; end if;
  if p_blocked_id is null then raise exception 'Autor não encontrado' using errcode = 'P0020'; end if;
  if p_blocked_id = auth.uid() then raise exception 'Não dá para bloquear a si mesmo' using errcode = 'P0021'; end if;
  insert into public.blocked_users (blocker_id, blocked_id) values (auth.uid(), p_blocked_id)
  on conflict do nothing;
end $$;

create or replace function public.unblock_user(p_blocked_id uuid)
returns void language sql security invoker set search_path = public as $$
  delete from public.blocked_users where blocker_id = auth.uid() and blocked_id = p_blocked_id;
$$;

-- Bloqueia o autor de uma mensagem do mural ou de uma avaliação sem revelar quem é.
-- security definer só para ler o autor; a gravação passa pelo block_user com a RLS normal.
create or replace function public.block_author(p_type public.report_target, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  if auth.uid() is null then raise exception 'Não autenticado' using errcode = '42501'; end if;
  case p_type
    when 'message' then select created_by into v_author from public.support_messages where id = p_id;
    when 'rating' then select user_id into v_author from public.place_ratings where id = p_id;
    else raise exception 'Esse conteúdo não tem autor visível' using errcode = 'P0022';
  end case;
  if v_author is null then raise exception 'Autor não encontrado (conta excluída?)' using errcode = 'P0020'; end if;
  perform public.block_user(v_author);
end $$;

revoke all on function public.block_user(uuid), public.unblock_user(uuid),
  public.block_author(public.report_target, uuid) from public, anon;
grant execute on function public.block_user(uuid), public.unblock_user(uuid),
  public.block_author(public.report_target, uuid) to authenticated;

-- Views: o que vem de quem eu bloqueei some para mim (e só para mim). Ganham is_mine para
-- o app não oferecer "bloquear" na própria mensagem.
create or replace view public.public_support_messages with (security_invoker = false) as
select m.id, m.nickname, m.category, m.content, m.city_id, m.created_at,
       (select count(*) from public.support_likes l where l.message_id = m.id) as likes,
       exists (select 1 from public.support_likes l where l.message_id = m.id and l.user_id = auth.uid()) as liked,
       (m.created_by = auth.uid()) as is_mine
from public.support_messages m
where m.status = 'active'
  and not public.is_blocked(m.created_by);

create or replace view public.public_place_ratings with (security_invoker = false) as
select r.id, r.place_id, r.stars, r.comment, r.updated_at,
       coalesce(nullif(pr.nickname, ''), 'Anônimo') as nickname,
       (r.user_id = auth.uid()) as is_mine,
       r.welcome, r.affection, r.restroom, r.crowd, r.overall
from public.place_ratings r
left join public.profiles pr on pr.id = r.user_id
where r.status = 'active'
  and not public.is_blocked(r.user_id);

revoke all on public.public_support_messages, public.public_place_ratings from anon;
grant select on public.public_support_messages, public.public_place_ratings to authenticated;
-- Regra 5.1.1 da App Store: quem oferece "Entrar com a Apple" tem que revogar o token da Apple
-- quando a conta é excluída. Para revogar precisamos do refresh token, que só existe trocando o
-- authorization code do login (vale 5 minutos) na API da Apple. A Edge Function apple-token faz
-- essa troca no login e guarda aqui; a Edge Function delete-account lê, revoga na Apple e só
-- então apaga o usuário. Nenhum papel do app lê nem escreve esta tabela: só a chave de serviço.

create table public.apple_refresh_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  client_id text not null,          -- App ID (bundle id) usado no login; o mesmo vai na revogação
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.apple_refresh_tokens is 'Refresh token do Sign in with Apple, só para revogar ao excluir a conta. Acesso exclusivo das Edge Functions.';

alter table public.apple_refresh_tokens enable row level security;
-- Sem policy nenhuma: anon e authenticated não leem nem escrevem.
revoke all on public.apple_refresh_tokens from anon, authenticated;
