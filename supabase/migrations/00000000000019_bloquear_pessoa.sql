-- Fase 4b: bloquear pessoa (regra 1.2 da Apple).
-- Quem bloqueia deixa de ver relato, avaliação e mensagem de quem foi bloqueado.
-- O app nunca aprende quem é o autor: o bloqueio é pedido pelo conteúdo, e o banco resolve o autor.

create table public.user_blocks (
  blocker_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;
create policy "blocks: os meus" on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "blocks: desbloquear" on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));
-- Insert só pela RPC: o app não sabe (e não pode saber) o uuid do autor.

create or replace function public.is_blocked(p_author uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_author is not null and exists (
    select 1 from public.user_blocks b
    where b.blocker_id = (select auth.uid()) and b.blocked_id = p_author
  );
$$;

-- Autor de um conteúdo, só para uso interno.
create or replace function public.content_author(p_type public.report_target, p_id uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_author uuid;
begin
  case p_type
    when 'occurrence' then select o.created_by into v_author from public.occurrences o where o.id = p_id;
    when 'place' then select p.created_by into v_author from public.places p where p.id = p_id;
    when 'rating' then select r.user_id into v_author from public.place_ratings r where r.id = p_id;
    when 'message' then select m.created_by into v_author from public.support_messages m where m.id = p_id;
  end case;
  return v_author;
end $$;
revoke execute on function public.content_author(public.report_target, uuid) from anon, authenticated;

-- Bloqueia o autor do conteúdo. Devolve o apelido só para a confirmação na tela.
create or replace function public.block_content_author(p_type public.report_target, p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_nick text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para bloquear.' using errcode = '42501'; end if;
  v_author := public.content_author(p_type, p_id);
  if v_author is null then
    raise exception 'Este conteúdo não tem mais autor: não há quem bloquear.' using errcode = 'P0004';
  end if;
  if v_author = auth.uid() then
    raise exception 'Este conteúdo é seu.' using errcode = 'P0005';
  end if;
  insert into public.user_blocks (blocker_id, blocked_id) values (auth.uid(), v_author)
    on conflict do nothing;
  select nullif(pr.nickname, '') into v_nick from public.profiles pr where pr.id = v_author;
  return coalesce(v_nick, 'Anônimo');
end $$;

create or replace function public.unblock_user(p_blocked uuid)
returns void language sql security invoker set search_path = public as $$
  delete from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_blocked;
$$;

-- Lista de bloqueados para a tela de Perfil (apelido, nunca e-mail).
create or replace function public.my_blocks()
returns table (blocked_id uuid, nickname text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.blocked_id, coalesce(nullif(pr.nickname, ''), 'Anônimo'), b.created_at
  from public.user_blocks b
  left join public.profiles pr on pr.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

-- ---------- views: esconder o conteúdo de quem eu bloqueei ----------
-- Só o conteúdo de pessoa (relato, avaliação, mensagem). Lugar é estabelecimento, não vira invisível.

create or replace view public.public_occurrences
with (security_invoker = false) as
select
  o.id,
  o.type,
  o.severity,
  o.description,
  o.city_id,
  o.neighborhood_id,
  n.name as neighborhood,
  c.name as city,
  c.state,
  o.occurrence_date,
  o.created_at,
  (o.occurrence_date >= current_date - 1) as is_obfuscated,
  case when o.occurrence_date >= current_date - 1
       then st_y(st_snaptogrid(o.location::geometry, 0.001))
       else st_y(o.location::geometry) end as latitude,
  case when o.occurrence_date >= current_date - 1
       then st_x(st_snaptogrid(o.location::geometry, 0.001))
       else st_x(o.location::geometry) end as longitude,
  -- Coluna nova de view só pode entrar no fim: create or replace recusa mudança de posição.
  o.setting,
  o.period
from public.occurrences o
join public.cities c on c.id = o.city_id
left join public.neighborhoods n on n.id = o.neighborhood_id
where o.status = 'active'
  and not public.is_blocked(o.created_by);

create or replace view public.public_place_ratings with (security_invoker = false) as
select r.id, r.place_id, r.stars, r.comment, r.updated_at,
       coalesce(nullif(pr.nickname, ''), 'Anônimo') as nickname,
       (r.user_id = auth.uid()) as is_mine,
       r.welcome, r.affection, r.restroom, r.crowd, r.overall
from public.place_ratings r
left join public.profiles pr on pr.id = r.user_id
where r.status = 'active'
  and not public.is_blocked(r.user_id);

create or replace view public.public_support_messages with (security_invoker = false) as
select m.id, m.nickname, m.category, m.content, m.city_id, m.created_at,
       (select count(*) from public.support_likes l where l.message_id = m.id) as likes,
       exists (select 1 from public.support_likes l where l.message_id = m.id and l.user_id = auth.uid()) as liked
from public.support_messages m
where m.status = 'active'
  and not public.is_blocked(m.created_by);
