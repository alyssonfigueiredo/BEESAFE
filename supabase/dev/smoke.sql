-- Teste de fumaça: RLS, ofuscação da view, rankings, broadcast e exclusão de conta. Rodado por scripts/db-smoke.sh.
\set ON_ERROR_STOP on
-- cidade fake via upsert_cities (Polygon vira MultiPolygon)
select public.upsert_cities('[{"ibge_code":4314902,"name":"Porto Alegre","state":"RS","geom":{"type":"Polygon","coordinates":[[[-51.30,-30.25],[-51.05,-30.25],[-51.05,-29.95],[-51.30,-29.95],[-51.30,-30.25]]]}}]'::jsonb);
insert into public.neighborhoods (city_id, name, geom) select id, 'Cidade Baixa', st_multi(st_geomfromtext('POLYGON((-51.24 -30.05,-51.21 -30.05,-51.21 -30.03,-51.24 -30.03,-51.24 -30.05))',4326)) from public.cities;
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111','a@a.com');
select count(*) as profiles_auto from public.profiles;

-- como usuário autenticado
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.occurrences (type, severity, location, occurrence_date) values
 ('fisica','alta', st_setsrid(st_makepoint(-51.2234567,-30.0412345),4326)::geography, current_date),
 ('verbal','media', st_setsrid(st_makepoint(-51.2234567,-30.0412345),4326)::geography, current_date - 10),
 ('ameaca','alta', st_setsrid(st_makepoint(-51.2200000,-30.0400000),4326)::geography, current_date - 40);
-- fora do município: deve falhar
do $$ begin
  insert into public.occurrences (type, location, occurrence_date) values ('verbal', st_setsrid(st_makepoint(-46.6,-23.5),4326)::geography, current_date);
  raise exception 'NAO DEVERIA INSERIR';
exception when others then raise notice 'rejeitado ok: %', sqlerrm; end $$;
-- leitura direta da tabela deve vir vazia (sem policy de select para user comum)
select count(*) as direct_select_should_be_0 from public.occurrences;
select type, severity, neighborhood, city, is_obfuscated, latitude, longitude from public.public_occurrences order by occurrence_date desc;
select * from public.area_risk_ranking((select id from public.cities), 12, 5);
select * from public.city_stats((select id from public.cities));
select * from public.city_at(-30.04, -51.22);
select * from public.city_search('porto', null);
reset role;
select topic, event, payload from realtime.messages;
-- moderador vê a tabela
update public.profiles set role = 'moderator' where id = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select count(*) as moderator_sees from public.occurrences;
reset role;
-- exclusão da conta mantém o relato
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select count(*) as kept, count(created_by) as with_author from public.occurrences;

-- bairros via upsert_neighborhoods: um dentro, um fora do município
select public.upsert_neighborhoods(4314902, '[
 {"name":"Bom Fim","geom":{"type":"Polygon","coordinates":[[[-51.21,-30.04],[-51.19,-30.04],[-51.19,-30.02],[-51.21,-30.02],[-51.21,-30.04]]]}},
 {"name":"Fora","geom":{"type":"Polygon","coordinates":[[[-46.7,-23.6],[-46.6,-23.6],[-46.6,-23.5],[-46.7,-23.5],[-46.7,-23.6]]]}}
]'::jsonb) as gravados_deve_ser_1;

-- ---------- fase 2: lugares ----------
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222','b@b.com'), ('33333333-3333-3333-3333-333333333333','c@c.com');
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.places (id, name, category, location) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Bar da Esquina', 'bar', st_setsrid(st_makepoint(-51.2234000,-30.0412000),4326)::geography);
select score, rating_count, recent_occurrences, recent_high_occurrences, flagged from public.place_scores; -- sem avaliação, 3 relatos perto, 2 graves
insert into public.place_ratings (place_id, stars, comment) values ('aaaaaaaa-0000-0000-0000-000000000001', 5, 'Ótimo');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.place_ratings (place_id, stars) values ('aaaaaaaa-0000-0000-0000-000000000001', 4);
-- avaliar duas vezes deve falhar
do $$ begin
  insert into public.place_ratings (place_id, stars) values ('aaaaaaaa-0000-0000-0000-000000000001', 1);
  raise exception 'NAO DEVERIA';
exception when unique_violation then raise notice 'duplicata rejeitada ok'; end $$;
select name, score, rating_count, flagged, recent_high_occurrences from public.public_places; -- média 4.5 - 0.5*2 = 3.5
select stars, nickname, is_mine from public.public_place_ratings order by stars desc;
select count(*) as welcoming_needs_3_ratings from public.welcoming_ranking((select id from public.cities limit 1));
reset role;

-- ---------- fase 3: apoio ----------
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.support_messages (nickname, category, content) values ('Lu', 'dica', 'Evitem a rua X à noite');
insert into public.support_messages (category, content) values ('acolhimento', 'Vocês não estão sozinhes');
select count(*) as direct_messages_should_be_0 from public.support_messages;
insert into public.support_likes (message_id) select id from public.public_support_messages where nickname = 'Lu';
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.support_likes (message_id) select id from public.public_support_messages where nickname = 'Lu';
select nickname, category, likes, liked from public.public_support_messages order by created_at;
select name, kind, phone from public.support_services_for((select id from public.cities limit 1)) limit 3;
select count(*) as services_total from public.support_services_for((select id from public.cities limit 1));
select public.update_my_profile('  Cacau ', (select id from public.cities limit 1));
select nickname, default_city_id is not null as has_city from public.profiles where id = auth.uid();
select nickname from public.public_place_ratings where is_mine; -- deve ser Cacau
select public.delete_my_account();
reset role;
select count(*) as users_left from auth.users;
select count(*) as ratings_left from public.place_ratings;  -- avaliação do usuário excluído some
select likes from public.public_support_messages where nickname = 'Lu';  -- like some: 1
