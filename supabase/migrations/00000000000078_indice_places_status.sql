-- Visão Geral do painel deu timeout (13/10/2026): `admin_overview` conta
-- `places where status = 'active'` sem índice nenhum pra `status`, e o import nacional em
-- andamento (Brasil inteiro, não só as 27 capitais) fez a tabela crescer bem além dos ~160 mil de
-- antes — a varredura sequencial passou do tempo limite. Índice parcial (só o que entra na conta)
-- cobre esse `count(*)` e o de `lugares_novos_7d`/`lugares_ativos` sem escanear o resto.

create index if not exists places_status_idx on public.places (status);
