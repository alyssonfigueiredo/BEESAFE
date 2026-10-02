-- O "Basuko Sushi" de Itapeva/SP entrou duas vezes na importação do Overture de 02/10/2026, com o
-- mesmo endereço (Rua Higino Rodrigues Garcia, 480) e pontos a ~2,8 km um do outro. A rua fica no
-- Jardim Europa (Nominatim: -23.991, -48.886), então o ponto certo é o de lá; o outro, perto do
-- Parque Vista Alegre (-23.970, -48.872), é o repetido.
--
-- Mesmo critério da 32: condições estreitas (nome, cidade, ponto ao norte da rua de verdade e
-- nenhuma avaliação). Se algo não bater, nada é escondido. Desfaz com status = 'active'.
update public.places p
   set status = 'hidden'
 where p.status = 'active'
   and p.name = 'Basuko Sushi'
   and p.city_id = (select id from public.cities where name = 'Itapeva' and state = 'SP')
   and extensions.st_y(p.location::extensions.geometry) > -23.98
   and not exists (
     select 1 from public.place_ratings r
      where r.place_id = p.id and r.status = 'active'
   );
