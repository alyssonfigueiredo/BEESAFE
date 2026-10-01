-- Excluir a conta apagava todas as avaliações da pessoa (place_ratings.user_id era
-- `on delete cascade`). Relato, lugar e mensagem do mural já eram `on delete set null`:
-- o conteúdo fica, o vínculo some. Avaliação é conteúdo da comunidade igual aos outros —
-- some a nota do lugar, muda o selo e quem nunca mexeu em nada vê o lugar mudar sozinho.
-- A foto (place_photos) continua em cascade de propósito: imagem pode mostrar a pessoa.

alter table public.place_ratings
  drop constraint if exists place_ratings_user_id_fkey;

alter table public.place_ratings
  alter column user_id drop not null;

alter table public.place_ratings
  add constraint place_ratings_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

comment on column public.place_ratings.user_id is
  'Quem avaliou. Nulo quando a conta foi excluída: a avaliação fica, o vínculo some (igual a occurrences.created_by).';

-- is_mine passa a ser falso, não nulo, quando o autor sumiu.
-- O resto da view é o da migration 20 (filtro de bloqueio incluído).
create or replace view public.public_place_ratings with (security_invoker = false) as
select r.id, r.place_id, r.stars, r.comment, r.updated_at,
       coalesce(nullif(pr.nickname, ''), 'Anônimo') as nickname,
       coalesce(r.user_id = auth.uid(), false) as is_mine,
       r.welcome, r.affection, r.restroom, r.crowd, r.overall
from public.place_ratings r
left join public.profiles pr on pr.id = r.user_id
where r.status = 'active'
  and not public.is_blocked(r.user_id);

revoke all on public.public_place_ratings from anon;
grant select on public.public_place_ratings to authenticated;
