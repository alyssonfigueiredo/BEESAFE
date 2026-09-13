-- Fase 3: mural de apoio, serviços de apoio por cidade, perfil e exclusão de conta.

create type public.support_category as enum ('acolhimento', 'dica', 'pedido_ajuda');
create type public.service_kind as enum ('policia', 'saude', 'direitos', 'acolhimento', 'ong', 'juridico');

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  nickname text not null default 'Anônimo' check (char_length(nickname) between 1 and 40),
  category public.support_category not null default 'acolhimento',
  content text not null check (char_length(content) between 1 and 1000),
  city_id integer references public.cities (id),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now()
);
create index support_messages_created_idx on public.support_messages (created_at desc);

create table public.support_likes (
  message_id uuid not null references public.support_messages (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.support_services (
  id serial primary key,
  name text not null,
  kind public.service_kind not null,
  phone text,
  url text,
  description text,
  city_id integer references public.cities (id),   -- null = nacional
  state char(2) references public.states (code),   -- null = nacional
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index support_services_city_idx on public.support_services (city_id);

alter table public.support_messages enable row level security;
alter table public.support_likes enable row level security;
alter table public.support_services enable row level security;

create policy "messages: criar como si mesmo" on public.support_messages for insert to authenticated
  with check (created_by = auth.uid());
create policy "messages: moderação lê" on public.support_messages for select to authenticated
  using (public.is_moderator());
create policy "messages: moderação edita" on public.support_messages for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

create policy "likes: os meus" on public.support_likes for select to authenticated using (user_id = auth.uid());
create policy "likes: curtir" on public.support_likes for insert to authenticated with check (user_id = auth.uid());
create policy "likes: descurtir" on public.support_likes for delete to authenticated using (user_id = auth.uid());

create policy "services: leitura" on public.support_services for select to authenticated using (active);
create policy "services: moderação edita" on public.support_services for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- Mural sem created_by, com contagem de likes e se eu curti.
create view public.public_support_messages with (security_invoker = false) as
select m.id, m.nickname, m.category, m.content, m.city_id, m.created_at,
       (select count(*) from public.support_likes l where l.message_id = m.id) as likes,
       exists (select 1 from public.support_likes l where l.message_id = m.id and l.user_id = auth.uid()) as liked
from public.support_messages m
where m.status = 'active';

revoke all on public.public_support_messages from anon;
grant select on public.public_support_messages to authenticated;

-- Serviços da cidade + da UF + nacionais, numa chamada.
create or replace function public.support_services_for(p_city_id integer)
returns setof public.support_services language sql stable security invoker as $$
  select s.* from public.support_services s
  left join public.cities c on c.id = p_city_id
  where s.active and (s.city_id = p_city_id or (s.city_id is null and (s.state is null or s.state = c.state)))
  order by (s.city_id is not null) desc, (s.state is not null) desc, s.kind, s.name;
$$;

-- Perfil: apelido e cidade padrão editáveis pelo próprio usuário (role protegida pela policy).
create or replace function public.update_my_profile(p_nickname text, p_default_city_id integer)
returns void language sql security invoker as $$
  update public.profiles set nickname = nullif(trim(p_nickname), ''), default_city_id = p_default_city_id
  where id = auth.uid();
$$;

-- Exclusão de conta pelo próprio usuário. Conteúdo fica anonimizado (created_by -> null via FK), likes e avaliações somem.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
