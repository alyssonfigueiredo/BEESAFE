-- Avaliação anônima (13/10/2026, pedido do Alysson): `public_place_ratings` sempre juntava o
-- apelido do perfil ao vivo (`left join profiles`), então pôr um apelido no Perfil fazia TODAS as
-- avaliações antigas, de uma vez, passarem a sair com o nome — mesmo as feitas antes de existir
-- apelido nenhum. Agora a pessoa escolhe por avaliação, igual ao mural (migration 43): o nome
-- publicado é travado na hora de avaliar. O vínculo com a conta nunca sai de `place_ratings.user_id`
-- — continua existindo pra moderação e para fins jurídicos, como sempre foi; só o nome mostrado muda.

alter table public.place_ratings
  add column if not exists is_anonymous boolean not null default false;

create or replace view public.public_place_ratings with (security_invoker = false) as
select r.id, r.place_id, r.stars, r.comment, r.updated_at,
       case when r.is_anonymous then 'Anônimo'
            else coalesce(nullif(pr.nickname, ''), 'Anônimo') end as nickname,
       coalesce(r.user_id = auth.uid(), false) as is_mine,
       r.welcome, r.affection, r.restroom, r.crowd, r.overall,
       r.is_anonymous
from public.place_ratings r
left join public.profiles pr on pr.id = r.user_id
where r.status = 'active'
  and not public.is_blocked(r.user_id);

revoke all on public.public_place_ratings from anon;
grant select on public.public_place_ratings to authenticated;
