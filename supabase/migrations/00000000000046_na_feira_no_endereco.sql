-- O "Na Feira Bar" que o Leandro cadastrou ficou no ponto do GPS dele (Rebouças), não no endereço
-- que ele escreveu (Alameda Princesa Izabel, Mercês). O formulário só transformava o endereço em
-- ponto quando a pessoa tocava em "Achar esse endereço no mapa"; sem isso, valia o alfinete do GPS.
-- O app agora confere o endereço no envio (PlaceForm), e isto corrige a ficha que já entrou errada.
--
-- Ponto do OpenStreetMap para "Na Feira Bar, 465, Alameda Princesa Izabel, Mercês" (Nominatim,
-- 04/10/2026). Só mexe na ficha ativa com esse nome em Curitiba que esteja a mais de 300 m dele:
-- se já estiver no lugar certo, ou se o nome não bater, nada muda. O bairro sai de novo pelo
-- trigger places_resolve_area (update of location).
update public.places p
   set location = st_setsrid(st_makepoint(-49.2822280, -25.4298373), 4326)::geography
 where p.status = 'active'
   and p.name ilike 'na feira%'
   and p.city_id = (select id from public.cities where name = 'Curitiba' and state = 'PR')
   and st_distance(p.location, st_setsrid(st_makepoint(-49.2822280, -25.4298373), 4326)::geography) > 300;
