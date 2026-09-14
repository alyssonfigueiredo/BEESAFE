-- Irisa · remove TODOS os dados fictícios de `seed/curitiba-teste.sql`.
-- Cole no SQL Editor do Supabase e rode antes do lançamento. Pode rodar de novo sem erro.
-- Só apaga o que tem os prefixos de id do seed; nada criado por gente de verdade é tocado.

begin;

-- Relatos do seed (id 33333333-...). Precisa vir antes dos lugares e dos usuários.
delete from public.occurrences where id::text like '33333333-%';

-- Lugares do seed (id 22222222-...). Cascata leva place_ratings e place_scores junto.
delete from public.places where id::text like '22222222-%';

-- Contas de teste (id 11111111-0000-4000-8000-...). Cascata leva profiles, likes e avaliações.
delete from auth.users where id::text like '11111111-0000-4000-8000-%';

-- Denúncias órfãs que apontavam para o conteúdo apagado.
delete from public.content_reports r
where (r.target_type = 'occurrence' and not exists (select 1 from public.occurrences o where o.id = r.target_id))
   or (r.target_type = 'place'      and not exists (select 1 from public.places p where p.id = r.target_id))
   or (r.target_type = 'rating'     and not exists (select 1 from public.place_ratings pr where pr.id = r.target_id))
   or (r.target_type = 'message'    and not exists (select 1 from public.support_messages m where m.id = r.target_id));

commit;

-- Recalcula priors e scores sem os dados fictícios.
select public.refresh_rating_priors();
select public.compute_place_score(id) from public.places where status = 'active';

-- Conferência: as três linhas têm que voltar 0.
select 'relatos de teste' as o_que, count(*) from public.occurrences where id::text like '33333333-%'
union all
select 'lugares de teste', count(*) from public.places where id::text like '22222222-%'
union all
select 'contas de teste', count(*) from auth.users where id::text like '11111111-0000-4000-8000-%';
