-- Irisa · dados de TESTE para Curitiba (5 lugares cobrindo os 5 selos).
-- Cole no SQL Editor do Supabase e rode. Pode rodar de novo sem duplicar.
-- Para apagar tudo depois, use o bloco de limpeza no fim do arquivo.

-- Confere que Curitiba está importada (os lugares precisam cair dentro do polígono da cidade).
do $$
begin
  if not exists (select 1 from public.cities where name ilike 'curitiba') then
    raise exception 'Curitiba não está na tabela cities — importe os dados geográficos antes de semear.';
  end if;
end $$;

-- ---------- 8 contas de teste ----------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select
  '00000000-0000-0000-0000-000000000000',
  ('11111111-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid,
  'authenticated', 'authenticated', 'seed' || i || '@irisa.test', 'seed-sem-login',
  now(), now(), now(), '{"provider":"seed"}'::jsonb, '{}'::jsonb
from generate_series(1, 8) i
on conflict (id) do nothing;

update public.profiles p
set nickname = (array['Marina','Bruno','Ale','Júlia','Rafa','Dani','Tom','Lia'])[
      (right(p.id::text, 2))::int]
where p.id::text like '11111111-0000-4000-8000-%';

-- ---------- 5 lugares ----------
insert into public.places (id, name, category, address, location, created_by, verified)
values
  ('22222222-0000-4000-8000-000000000001', 'Café Bendita', 'cafe', 'Rua Trajano Reis, 120',
   'SRID=4326;POINT(-49.2733 -25.4284)', '11111111-0000-4000-8000-000000000001', true),
  ('22222222-0000-4000-8000-000000000002', 'Bar Tucano', 'bar', 'Av. do Batel, 1500',
   'SRID=4326;POINT(-49.2900 -25.4400)', '11111111-0000-4000-8000-000000000001', false),
  ('22222222-0000-4000-8000-000000000003', 'Padaria da Praça', 'servico', 'Praça Garibaldi, 40',
   'SRID=4326;POINT(-49.2680 -25.4290)', '11111111-0000-4000-8000-000000000002', false),
  ('22222222-0000-4000-8000-000000000004', 'Boate Vértice', 'balada', 'Rua Água Verde, 900',
   'SRID=4326;POINT(-49.2760 -25.4480)', '11111111-0000-4000-8000-000000000002', false),
  ('22222222-0000-4000-8000-000000000005', 'Restaurante Lume', 'restaurante', 'Rua XV de Novembro, 300',
   'SRID=4326;POINT(-49.2710 -25.4340)', '11111111-0000-4000-8000-000000000003', false)
on conflict (id) do nothing;

-- ---------- avaliações ----------
-- Café Bendita: 8 avaliações ótimas  →  selo "Acolhedor"
insert into public.place_ratings (place_id, user_id, welcome, affection, restroom, crowd)
select '22222222-0000-4000-8000-000000000001',
       ('11111111-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid, 5, 5, 5, 4
from generate_series(1, 8) i
on conflict (place_id, user_id) do nothing;

-- Bar Tucano: 6 avaliações boas  →  selo "Bem avaliado"
insert into public.place_ratings (place_id, user_id, welcome, affection, restroom, crowd)
select '22222222-0000-4000-8000-000000000002',
       ('11111111-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid, 5, 4, 4, 4
from generate_series(1, 6) i
on conflict (place_id, user_id) do nothing;

-- Padaria da Praça: metade adorou, metade passou mal  →  selo "Opiniões divididas"
insert into public.place_ratings (place_id, user_id, welcome, affection, restroom, crowd)
select '22222222-0000-4000-8000-000000000003',
       ('11111111-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid,
       case when i % 2 = 0 then 1 else 5 end, case when i % 2 = 0 then 1 else 5 end,
       case when i % 2 = 0 then 1 else 5 end, case when i % 2 = 0 then 1 else 5 end
from generate_series(1, 6) i
on conflict (place_id, user_id) do nothing;

-- Boate Vértice: avaliações ruins e um relato apontando o lugar  →  selo "Atenção"
insert into public.place_ratings (place_id, user_id, welcome, affection, restroom, crowd)
select '22222222-0000-4000-8000-000000000004',
       ('11111111-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid, 2, 2, 1, 2
from generate_series(1, 6) i
on conflict (place_id, user_id) do nothing;

insert into public.occurrences (id, type, severity, description, location, occurrence_date, created_by, place_id)
values ('33333333-0000-4000-8000-000000000001', 'discriminacao', 'alta',
  'Seguranças barraram um casal na entrada. Dado de teste.',
  'SRID=4326;POINT(-49.2760 -25.4480)', current_date - 5,
  '11111111-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000004')
on conflict (id) do nothing;

-- Restaurante Lume: só 2 avaliações  →  selo "Poucas avaliações"
insert into public.place_ratings (place_id, user_id, welcome, affection, restroom, crowd)
select '22222222-0000-4000-8000-000000000005',
       ('11111111-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid, 5, 5, 5, 5
from generate_series(1, 2) i
on conflict (place_id, user_id) do nothing;

-- Alguns comentários, para a ficha não ficar só de números.
update public.place_ratings set comment =
  'Entrei de mãos dadas com a minha namorada e ninguém piscou. Dado de teste.'
where place_id = '22222222-0000-4000-8000-000000000001'
  and user_id = '11111111-0000-4000-8000-000000000001';
update public.place_ratings set comment =
  'Banheiro único, tranquilo. Só lota muito no sábado. Dado de teste.'
where place_id = '22222222-0000-4000-8000-000000000001'
  and user_id = '11111111-0000-4000-8000-000000000002';
update public.place_ratings set comment =
  'Depende de quem está no caixa. Dado de teste.'
where place_id = '22222222-0000-4000-8000-000000000003'
  and user_id = '11111111-0000-4000-8000-000000000002';

-- ---------- recalcula e mostra o resultado ----------
select public.refresh_rating_priors();
select public.compute_place_score(id) from public.places where status = 'active';

select name, score, rating_count, badge, score_welcome, score_restroom, recent_on_site
from public.public_places
where city_id = (select id from public.cities where name ilike 'curitiba' limit 1)
order by score desc nulls last;

-- ---------- LIMPEZA (rode só quando quiser apagar os dados de teste) ----------
-- delete from public.occurrences where id::text like '33333333-%';
-- delete from public.places     where id::text like '22222222-%';
-- delete from auth.users        where id::text like '11111111-0000-4000-8000-%';
-- select public.refresh_rating_priors();
