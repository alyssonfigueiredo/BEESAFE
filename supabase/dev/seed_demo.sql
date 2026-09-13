-- SOMENTE DESENVOLVIMENTO. Dados fictícios para o app nascer visualmente completo.
-- Nunca rodar em produção. Precisa de cities (import IBGE) e de um usuário existente (:owner).
-- Uso: psql ... -v owner=UUID_DO_USUARIO -f supabase/dev/seed_demo.sql
set role postgres;
with city as (select id, centroid from public.cities where ibge_code = 4314902),
pts as (
  select (array['verbal','fisica','ameaca','discriminacao','vandalismo'])[1 + (g % 5)]::public.occurrence_type as type,
         (array['baixa','media','alta'])[1 + (g % 3)]::public.severity as severity,
         st_setsrid(st_makepoint(st_x(c.centroid) + (random() - 0.5) * 0.12, st_y(c.centroid) + (random() - 0.5) * 0.12), 4326)::geography as location,
         current_date - (g * 7) as occurrence_date
  from city c, generate_series(1, 18) g
)
insert into public.occurrences (type, severity, location, occurrence_date, created_by, description)
select type, severity, location, occurrence_date, :'owner', '[demo] relato fictício'
from pts;
