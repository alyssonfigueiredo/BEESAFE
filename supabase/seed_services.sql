-- Serviços nacionais de apoio. Locais por cidade entram por moderação ou por este seed.
insert into public.support_services (name, kind, phone, url, description) values
('Polícia Militar', 'policia', '190', null, 'Risco imediato à vida ou integridade'),
('SAMU', 'saude', '192', null, 'Emergência médica'),
('Disque 100 — Direitos Humanos', 'direitos', '100', 'https://www.gov.br/mdh/pt-br/ondh', 'Denúncia de violações, incluindo LGBTIfobia. 24h, gratuito'),
('CVV — Centro de Valorização da Vida', 'acolhimento', '188', 'https://cvv.org.br', 'Apoio emocional 24h, gratuito e sigiloso'),
('Acolhe LGBT+ (All Out)', 'acolhimento', null, 'https://acolhelgbt.org', 'Apoio psicológico gratuito com profissionais voluntários'),
('ANTRA — Associação Nacional de Travestis e Transexuais', 'ong', null, 'https://antrabrasil.org', 'Rede nacional de apoio a pessoas trans'),
('ABGLT — Aliança Nacional LGBTI+', 'ong', null, 'https://abglt.org.br', 'Articulação nacional de organizações LGBTI+'),
('Defensoria Pública da União', 'juridico', null, 'https://www.dpu.def.br', 'Assistência jurídica gratuita')
on conflict do nothing;

-- Curitiba (cidade de referência do projeto)
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Grupo Dignidade', 'ong', null, 'https://www.grupodignidade.org.br', 'ONG de Curitiba pela cidadania LGBTI+ desde 1992', id
from public.cities where ibge_code = 4106902
on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro de Cidadania LGBTQIA+ de Curitiba', 'acolhimento', null, 'https://www.instagram.com/centrocidadanialgbtqia/', 'Acolhimento e encaminhamento para a população LGBTQIA+', id
from public.cities where ibge_code = 4106902
on conflict do nothing;

-- Porto Alegre
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Nuances — Grupo Pela Livre Expressão Sexual', 'ong', null, 'https://nuances.com.br', 'ONG de Porto Alegre desde 1991', id
from public.cities where ibge_code = 4314902
on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro de Referência LGBTI+ de Porto Alegre', 'acolhimento', null, 'https://prefeitura.poa.br', 'Atendimento psicossocial e jurídico da Prefeitura', id
from public.cities where ibge_code = 4314902
on conflict do nothing;
