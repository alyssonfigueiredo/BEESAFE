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

-- ---------------------------------------------------------------------------
-- Cidades de lançamento: Recife, João Pessoa e Joinville (23/09/2026).
-- Contatos levantados nas páginas oficiais das prefeituras e do governo estadual.
-- Telefone em app de segurança tem que estar certo: confirmar por ligação antes de
-- divulgar, e conferir de novo a cada seis meses — esses serviços mudam de endereço.
-- ---------------------------------------------------------------------------

-- Recife
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro Municipal de Referência em Cidadania LGBT', 'acolhimento', '(81) 3231-1553',
       'https://www2.recife.pe.gov.br/servico/centro-de-referencia-em-cidadania-lgbt',
       'Atendimento jurídico, psicológico e social. Rua dos Médicis, 86, Boa Vista. 8h às 18h', id
from public.cities where ibge_code = 2611606
on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Casa de Acolhimento LGBTI+ Roberta Nascimento', 'acolhimento', null,
       'https://www2.recife.pe.gov.br/servico/lgbt',
       'Abrigo da Prefeitura do Recife para pessoas LGBTI+ em situação de violência ou abandono', id
from public.cities where ibge_code = 2611606
on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Movimento Leões do Norte', 'ong', null,
       'https://www.instagram.com/leoesdonorte/',
       'ONG recifense de defesa dos direitos LGBTQIA+ em Pernambuco desde 2001', id
from public.cities where ibge_code = 2611606
on conflict do nothing;

-- João Pessoa
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro de Cidadania LGBT de João Pessoa', 'acolhimento', '(83) 98730-6036',
       'https://www.joaopessoa.pb.gov.br',
       'Coordenadoria municipal: atendimento psicológico, social, jurídico e de saúde. Rua Diogo Velho, 150, Centro', id
from public.cities where ibge_code = 2507507
on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Espaço LGBT da Paraíba', 'acolhimento', null,
       'https://paraiba.pb.gov.br/diretas/secretaria-da-mulher-e-da-diversidade-humana',
       'Atendimento psicossocial e jurídico do Governo da Paraíba', id
from public.cities where ibge_code = 2507507
on conflict do nothing;

-- Joinville: não há centro de referência municipal confirmado. Entram a articulação
-- local e a via jurídica gratuita, que são as que deram para verificar.
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'UNA LGBT Joinville', 'ong', null,
       'https://www.instagram.com/unalgbtjoinville/',
       'Articulação de coletivos LGBTQIA+ de Joinville', id
from public.cities where ibge_code = 4209102
on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Comissão da Diversidade Sexual e de Gênero — OAB Joinville', 'juridico', null,
       'https://www.oabjoinville.org.br/comissoes/52/28-comissao-da-diversidade-sexual-e-genero/',
       'Orientação jurídica em casos de discriminação por orientação sexual ou identidade de gênero', id
from public.cities where ibge_code = 4209102
on conflict do nothing;
