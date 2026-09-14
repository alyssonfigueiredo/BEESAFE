-- Fase 5: serviços de apoio viram lista mantida. Sem chave única, rodar seed_services.sql duas vezes duplicava tudo
-- (`on conflict do nothing` sem índice não dispara). Aqui deduplica o que já existe e cria a chave.

-- Mantém o menor id de cada (nome, cidade) e reaponta nada — support_services não é referenciada por outra tabela.
delete from public.support_services a
using public.support_services b
where a.id > b.id
  and lower(a.name) = lower(b.name)
  and coalesce(a.city_id, 0) = coalesce(b.city_id, 0);

create unique index if not exists support_services_name_city_key
  on public.support_services (lower(name), coalesce(city_id, 0));
