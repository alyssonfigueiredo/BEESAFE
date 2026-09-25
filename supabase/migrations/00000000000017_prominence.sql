-- Sinal de "quão confirmado" é um lugar, vindo da importação (Overture: confiança + site,
-- telefone e redes). Serve SÓ para ordenar a fila de fotos do Google: com milhares de lugares
-- por cidade e 150 buscas por dia, a cota tem que ir primeiro para quem a comunidade conhece.
-- Não aparece no app e não entra em nota nenhuma.
alter table public.places add column if not exists prominence smallint not null default 0;
create index if not exists places_prominence_idx on public.places (city_id, prominence desc);
