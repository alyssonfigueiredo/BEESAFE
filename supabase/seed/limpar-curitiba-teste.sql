-- Irisa · apaga os dados de TESTE de Curitiba (o que supabase/seed/curitiba-teste.sql criou).
-- Cole no SQL Editor do Supabase e rode. Pode rodar de novo sem erro.
-- Só mexe nos ids do seed (11111111-/22222222-/33333333-); dados reais não são tocados.

begin;

-- Relato de teste (o ligado à Boate Vértice).
delete from public.occurrences where id::text like '33333333-%';

-- Lugares de teste. Em cascata levam place_ratings e place_scores.
delete from public.places where id::text like '22222222-%';

-- Contas de teste. Em cascata levam profiles, avaliações e apoios que sobrarem.
delete from auth.users where id::text like '11111111-0000-4000-8000-%';

-- Priors do ranking voltam a refletir só os dados reais.
select public.refresh_rating_priors();

commit;

-- Conferência: as três linhas têm que voltar 0 (o SQL Editor não mostra contagem de DELETE).
select 'usuarios_teste' as item, count(*) from auth.users where id::text like '11111111-0000-4000-8000-%'
union all
select 'lugares_teste', count(*) from public.places where id::text like '22222222-%'
union all
select 'relatos_teste', count(*) from public.occurrences where id::text like '33333333-%';
