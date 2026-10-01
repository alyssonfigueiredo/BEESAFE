-- O "Na Feira Bar" de Curitiba estava em duas fichas: a do Overture (importada em 25/09, endereço
-- Rua Padre Anchieta, sem nenhuma avaliação) e a que o Leandro cadastrou na porta do bar em 30/09
-- (Alameda Princesa Izabel, com 1 avaliação), 3,1 km adiante. É o mesmo bar — confirmado pelo
-- Alysson em 01/10/2026 — com o endereço velho preso na base do Overture.
--
-- Esconde a ficha do Overture e mantém a do usuário, que é a que tem a avaliação. O caminho
-- inverso perderia a nota. 'hidden' não apaga nada: o registro fica no banco, só sai do app.
--
-- As condições são estreitas de propósito (nome exato, cidade, endereço antigo e nenhuma
-- avaliação): se qualquer uma não bater, nada é escondido — melhor não fazer nada do que
-- esconder o lugar errado. Para desfazer: o mesmo update com status = 'active'.
update public.places p
   set status = 'hidden'
 where p.status = 'active'
   and p.name = 'Na Feira Bar'
   and p.address like 'Rua Padre Anchieta%'
   and p.city_id = (select id from public.cities where name = 'Curitiba' and state = 'PR')
   and not exists (
     select 1 from public.place_ratings r
      where r.place_id = p.id and r.status = 'active'
   );
