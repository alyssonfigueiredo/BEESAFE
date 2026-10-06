-- Quero ir (06/10/2026, aprovado pelo Leandro no protótipo docs/Irisa-prototipo-quero-ir.html).
-- A pessoa marca com o coração os lugares que quer conhecer. Só ela vê a lista (RLS: cada um, as suas
-- linhas). Quando avalia um lugar da lista, ele passa sozinho para "Já fui" (visitado_em). Não entra
-- em gomo, faísca nem medalha: favoritar é de graça e não pode virar coisa para farmar.

create table if not exists public.place_favorites (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  place_id uuid not null references public.places (id) on delete cascade,
  created_at timestamptz not null default now(),
  visitado_em timestamptz,
  primary key (user_id, place_id)
);
create index if not exists place_favorites_user_idx on public.place_favorites (user_id, created_at desc);
alter table public.place_favorites enable row level security;

drop policy if exists "favoritos: os meus" on public.place_favorites;
create policy "favoritos: os meus" on public.place_favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.place_favorites to authenticated;

-- Teto generoso para ninguém encher a tabela por script.
create or replace function public.place_favorites_limite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.place_favorites where user_id = new.user_id) >= 1000 then
    raise exception 'Sua lista Quero ir chegou a 1.000 lugares. Tire alguns para salvar outros.';
  end if;
  return new;
end $$;
drop trigger if exists place_favorites_limite on public.place_favorites;
create trigger place_favorites_limite before insert on public.place_favorites
  for each row execute function public.place_favorites_limite();

-- Avaliou um lugar da lista: vai para Já fui.
create or replace function public.place_favorites_visitou()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.place_favorites set visitado_em = now()
  where user_id = new.user_id and place_id = new.place_id and visitado_em is null;
  return new;
end $$;
drop trigger if exists place_favorites_visitou on public.place_ratings;
create trigger place_favorites_visitou after insert on public.place_ratings
  for each row execute function public.place_favorites_visitou();
