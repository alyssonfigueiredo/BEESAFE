-- "Festval Batel" entrou do Overture classificado como balada (categoria errada da fonte), mas é
-- o mercado Festval (R. Cel. Dulcídio, 880, Batel) — não existe categoria "mercado" no app, e
-- supermercado não é tipo de lugar que a Irisa avalia. As 2 avaliações existentes são do Alysson e
-- do Leandro testando o app (5/5/5/5, sem comentário), não avaliação de comunidade.
--
-- Mesmo critério de esconder (não apagar) das migrations 32 e 35: condição estreita por nome,
-- cidade e categoria. Desfaz com status = 'active'.
update public.places p
   set status = 'hidden'
 where p.status = 'active'
   and p.name = 'Festval Batel'
   and p.category = 'balada'
   and p.city_id = (select id from public.cities where name = 'Curitiba');
