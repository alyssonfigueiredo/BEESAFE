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
update public.profiles set created_at = now() - interval '2 days';  -- contas novas não criam lugares
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
-- reações (migration 43): a curtida virou "Te abraço"; trocar de reação não soma duas
select public.react_support((select id from public.public_support_messages where nickname = 'Lu'), 'arrasou');
select likes as reacoes_2, my_reaction, reactions from public.public_support_messages where nickname = 'Lu';
select name, kind, phone from public.support_services_for((select id from public.cities limit 1)) limit 3;
select count(*) as services_total from public.support_services_for((select id from public.cities limit 1));
select public.update_my_profile('  Cacau ', (select id from public.cities limit 1));
select nickname, default_city_id is not null as has_city from public.profiles where id = auth.uid();
select nickname from public.public_place_ratings where is_mine; -- deve ser Cacau
-- ---------- bloqueio (migration 18) ----------
-- usuário 3 bloqueia o autor da mensagem de Lu (usuário 2): mensagem e avaliação dele somem só para o 3
select public.block_author('message', (select id from public.public_support_messages where nickname = 'Lu'));
select count(*) as msgs_after_block_0 from public.public_support_messages;  -- as duas são do usuário 2
select count(*) as ratings_after_block_1 from public.public_place_ratings;  -- só a minha (Cacau)
select count(*) as my_blocks_1 from public.blocked_users;
do $$ begin
  perform public.block_author('rating', (select id from public.public_place_ratings where is_mine));
  raise exception 'NAO DEVERIA';
exception when sqlstate 'P0021' then raise notice 'auto-bloqueio rejeitado ok'; end $$;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as other_unaffected_2 from public.public_support_messages;
select count(*) as other_blocks_0 from public.blocked_users;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.unblock_user((select blocked_id from public.blocked_users));
select count(*) as msgs_after_unblock_2 from public.public_support_messages;
select public.delete_my_account();
reset role;
select count(*) as users_left from auth.users;
select count(*) as ratings_left from public.place_ratings;  -- avaliação do usuário excluído some
select likes from public.public_support_messages where nickname = 'Lu';  -- like some: 1

-- ---------- fase 4: moderação ----------
insert into auth.users (id, email) values
  ('44444444-4444-4444-4444-444444444444','d@d.com'),
  ('55555555-5555-5555-5555-555555555555','e@e.com'),
  ('66666666-6666-6666-6666-666666666666','f@f.com');
update public.profiles set created_at = now() - interval '2 days';
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
-- rate limit: 5 relatos/dia
do $$ begin
  for i in 1..5 loop
    insert into public.occurrences (type, location, occurrence_date) values ('verbal', st_setsrid(st_makepoint(-51.2234,-30.0412),4326)::geography, current_date);
  end loop;
  begin
    insert into public.occurrences (type, location, occurrence_date) values ('verbal', st_setsrid(st_makepoint(-51.2234,-30.0412),4326)::geography, current_date);
    raise exception 'NAO DEVERIA';
  exception when sqlstate 'P0002' then raise notice 'rate limit ok: %', sqlerrm; end;
end $$;
-- denúncias: 3 pessoas diferentes escondem a mensagem
select id as msg from public.public_support_messages where nickname = 'Lu' \gset
insert into public.content_reports (target_type, target_id, reason) values ('message', :'msg', 'conteúdo ofensivo');
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
insert into public.content_reports (target_type, target_id, reason) values ('message', :'msg', 'spam');
select count(*) as still_visible from public.public_support_messages where id = :'msg';
set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
insert into public.content_reports (target_type, target_id, reason) values ('message', :'msg', 'spam de novo');
select count(*) as hidden_now_0 from public.public_support_messages where id = :'msg';
-- não moderador não vê fila
do $$ begin
  perform * from public.moderation_queue();
  raise exception 'NAO DEVERIA';
exception when insufficient_privilege then raise notice 'fila protegida ok'; end $$;
reset role;
update public.profiles set role = 'moderator' where id = '66666666-6666-6666-6666-666666666666';
set role authenticated;
select target_type, reports, summary, current_status from public.moderation_queue();
select public.moderate('message', :'msg', 'restore');
select count(*) as restored_1 from public.public_support_messages where id = :'msg';
select count(*) as open_reports_0 from public.content_reports where status = 'open';
select public.verify_place('aaaaaaaa-0000-0000-0000-000000000001', true);
select verified from public.public_places;
reset role;

-- ---------- gamificação e painel (migration 39) ----------
set role authenticated;
set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select public.track_day('open');
select public.track_day('consult');
select public.track_day('open');
reset role;
select count(*) as um_dia_1, bool_and(consulted) as consultou from public.user_days where user_id = '66666666-6666-6666-6666-666666666666';
set role authenticated;
select (public.my_gamification()) ? 'medalhas' as tem_medalhas;
select jsonb_array_length(public.my_gamification()->'conquistadas') > 0 as abre_alas_desbloqueada;
-- migration 48: segunda leva, 32 medalhas
select public.track_day('bairro');
select jsonb_array_length(public.my_gamification()->'medalhas') as medalhas_n;
-- migration 47: suas cores e aberturas de ficha
select public.log_place_view((select id from public.places limit 1));
select (public.my_cores() ? 'ajudou') and (public.my_cores() ? 'itens') as cores_ok;
-- migration 45: meus avaliados entre ids
select count(*) >= 0 as meus_ok from public.my_rated_places(array(select id from public.places limit 5));
-- migration 43: reações, pergunta da semana e descoberta
select (public.app_config() ? 'pergunta_semana') as tem_pergunta;
select count(*) >= 0 as slate_ok from public.discovery_slate(-25.43, -49.27, null);
select count(*) >= 0 as slate_sem_gps from public.discovery_slate(null, null, null);
select public.my_week() ? 'dias' as semana_ok;
select count(*) >= 0 as top_ok from public.city_top_places((select id from public.cities limit 1));
-- migration 42: Deu Close pede 10 e Nome na Lista 6
select (select (m->>'alvo')::int from jsonb_array_elements(public.my_gamification()->'medalhas') m where m->>'id' = 'nome-na-lista') = 6 as bairros_6;
-- migration 41: lugares perto de um ponto, de qualquer cidade
select count(*) >= 0 as perto_ok from public.places_near(-25.43, -49.27);
-- migration 40: gomos da semana e unidade em toda medalha de contagem
select (public.my_gamification()->>'gomos_semana_max')::int = 4 as teto_semana_4;
select bool_and(m ? 'unidade') as figurinha_tem_unidade
  from jsonb_array_elements(public.my_gamification()->'medalhas') m where m->>'id' in ('figurinha', 'famosinha');
select public.set_medal_form(0::smallint);
select public.mark_medals_seen(array['abre-alas']);
select public.app_config() ? 'aviso' as tem_aviso;
-- caixinha sem faísca: recusa
do $$ begin
  perform public.open_box();
  raise exception 'NAO DEVERIA';
exception when raise_exception then raise notice 'caixinha fechada ok: %', sqlerrm; end $$;
-- usuário comum não entra no painel
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
do $$ begin
  perform public.admin_overview();
  raise exception 'NAO DEVERIA';
exception when insufficient_privilege then raise notice 'painel protegido ok'; end $$;
set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
reset role;
update public.profiles set role = 'admin' where id = '66666666-6666-6666-6666-666666666666';
set role authenticated;
select public.admin_overview() ? 'serie' as overview_ok;
select count(*) > 0 as lista_pessoas from public.admin_users();
select public.admin_user('66666666-6666-6666-6666-666666666666') ? 'gamificacao' as detalhe_ok;
select count(*) >= 0 as avaliacoes_ok from public.admin_ratings();
select count(*) >= 0 as mensagens_ok from public.admin_messages();
select count(*) >= 0 as relatos_ok from public.admin_occurrences();
select count(*) > 0 as lugares_ok from public.admin_places();
select public.admin_place_save(null, 'Bar da Equipe', 'bar', 'Rua Teste, 1', -30.045, -51.225) is not null as lugar_criado;
select public.admin_place_photo((select id from public.places where name = 'Bar da Equipe'), 'https://exemplo/equipe/x.jpg', 'Equipe Irisa');
select photo_source from public.places where name = 'Bar da Equipe';
select public.admin_setting_set('aviso', '{"ativo": true, "titulo": "Oi", "texto": "Teste", "url": null}');
select public.app_config()->'aviso'->>'ativo' as aviso_ativo;
select public.admin_push_create('Teste', 'Corpo', now() + interval '1 day') as envio \gset
select public.admin_push_cancel(:envio);
select status from public.admin_push_list() limit 1;
select count(*) >= 0 as servicos_ok from public.admin_services();
-- migration 64: liberar/revogar medalha, mudar nível e notificação para pessoas escolhidas
select public.admin_medal_grant('66666666-6666-6666-6666-666666666666', 'aclamada');
select exists (select 1 from jsonb_array_elements(public.admin_user('66666666-6666-6666-6666-666666666666')->'conquistadas') c
               where c->>'id' = 'aclamada') as liberada_ok;
select public.admin_medal_revoke('66666666-6666-6666-6666-666666666666', 'abre-alas');
select (select (m->>'ok')::boolean from jsonb_array_elements(public.gami_stats('66666666-6666-6666-6666-666666666666')->'medalhas') m
        where m->>'id' = 'abre-alas') = false as revogada_nao_volta;
select (public.admin_set_level('66666666-6666-6666-6666-666666666666', 4)->>'gomos')::int = 10 as nivel_4_dez_gomos;
select (public.admin_set_level('66666666-6666-6666-6666-666666666666', null)->>'gomos_ajuste')::int = 0 as nivel_automatico;
do $$ begin
  perform public.admin_medal_grant('66666666-6666-6666-6666-666666666666', 'nao-existe');
  raise exception 'NAO DEVERIA';
exception when raise_exception then
  if sqlerrm = 'NAO DEVERIA' then raise; end if;
  raise notice 'medalha desconhecida recusada ok';
end $$;
select (select m->>'unidade' from jsonb_array_elements(public.gami_stats('66666666-6666-6666-6666-666666666666')->'medalhas') m
        where m->>'id' = 'utilidade-publica') = 'dicas' as utilidade_por_dicas;
select public.admin_push_alcance(null, array['66666666-6666-6666-6666-666666666666'::uuid]) >= 0 as alcance_pessoas_ok;
select public.admin_push_create('Só pra você', 'Corpo', now() + interval '1 day', null, null,
                                array['66666666-6666-6666-6666-666666666666'::uuid]) as envio2 \gset
select cidade from public.admin_push_list() where id = :envio2;
select public.admin_push_cancel(:envio2);
reset role;

