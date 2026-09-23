-- Migration 14: onde e quando, no relato.
--
-- Até aqui o relato era um ponto no mapa: sabia-se a coordenada, não o tipo de lugar nem a hora.
-- "Nessa praça, depois das 22h" é informação diferente de "nessa praça", e é a que muda o
-- comportamento de quem lê. Campo que não existe na hora do registro não pode ser preenchido
-- depois — ninguém volta e lembra se foi de madrugada no ponto de ônibus.
--
-- Os dois são OPCIONAIS de propósito. Quem registra acabou de passar por violência; exigir
-- classificação nesse momento é atrito no pior momento possível.

create type public.occurrence_setting as enum (
  'rua', 'praca', 'transporte', 'estabelecimento', 'servico', 'outro'
);
comment on type public.occurrence_setting is
  'rua=rua ou calçada | praca=praça ou parque | transporte=transporte, ponto ou estação | estabelecimento=dentro de um lugar | servico=serviço público (hospital, escola, repartição)';

create type public.day_period as enum ('madrugada', 'manha', 'tarde', 'noite');
comment on type public.day_period is 'madrugada=0-6h | manha=6-12h | tarde=12-18h | noite=18-24h';

alter table public.occurrences
  add column if not exists setting public.occurrence_setting,
  add column if not exists period public.day_period;

create index if not exists occurrences_setting_idx on public.occurrences (city_id, setting)
  where setting is not null;
create index if not exists occurrences_period_idx on public.occurrences (city_id, period)
  where period is not null;

-- A view pública ganha os dois. Continuam sem created_by e com a mesma ofuscação de coordenada.
create or replace view public.public_occurrences
with (security_invoker = false) as
select
  o.id,
  o.type,
  o.severity,
  o.description,
  o.city_id,
  o.neighborhood_id,
  n.name as neighborhood,
  c.name as city,
  c.state,
  o.occurrence_date,
  o.created_at,
  o.setting,
  o.period,
  (o.occurrence_date >= current_date - 1) as is_obfuscated,
  case when o.occurrence_date >= current_date - 1
       then st_y(st_snaptogrid(o.location::geometry, 0.001))
       else st_y(o.location::geometry) end as latitude,
  case when o.occurrence_date >= current_date - 1
       then st_x(st_snaptogrid(o.location::geometry, 0.001))
       else st_x(o.location::geometry) end as longitude
from public.occurrences o
join public.cities c on c.id = o.city_id
left join public.neighborhoods n on n.id = o.neighborhood_id
where o.status = 'active';

revoke all on public.public_occurrences from anon;
grant select on public.public_occurrences to authenticated;
