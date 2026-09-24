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

-- ---------------------------------------------------------------------------
-- São Paulo, Rio de Janeiro e Natal (24/09/2026). Contatos das páginas oficiais
-- (prefeitura.sp.gov.br, rj.gov.br, natal.rn.gov.br). NÃO confirmados por ligação.
-- ---------------------------------------------------------------------------

-- São Paulo: cinco Centros de Cidadania LGBTI da Prefeitura, um por região.
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro de Cidadania LGBTI Luiz Carlos Ruas (Centro)', 'acolhimento', '(11) 3225-0019',
       'https://prefeitura.sp.gov.br/web/lgbti/w/rede_de_atendimento/271098',
       'Atendimento jurídico, psicológico e social da Prefeitura. Rua Visconde de Ouro Preto, 118, Consolação', id
from public.cities where ibge_code = 3550308 on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro de Cidadania LGBTI Claudia Wonder (Zona Oeste)', 'acolhimento', '(11) 3832-7507',
       'https://prefeitura.sp.gov.br/web/lgbti/w/rede_de_atendimento/271098',
       'Atendimento jurídico, psicológico e social. Av. Ricardo Medina Filho, 603, Lapa', id
from public.cities where ibge_code = 3550308 on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro de Cidadania LGBTI Edson Néris (Zona Sul)', 'acolhimento', '(11) 5523-0413',
       'https://prefeitura.sp.gov.br/web/lgbti/w/rede_de_atendimento/271098',
       'Atendimento jurídico, psicológico e social. Rua Conde de Itu, 673, Santo Amaro', id
from public.cities where ibge_code = 3550308 on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro de Cidadania LGBTI Laura Vermont (Zona Leste)', 'acolhimento', '(11) 2032-3737',
       'https://prefeitura.sp.gov.br/web/lgbti/w/rede_de_atendimento/271098',
       'Atendimento jurídico, psicológico e social. Av. Nordestina, 496, São Miguel Paulista', id
from public.cities where ibge_code = 3550308 on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro de Cidadania LGBTI Luana Barbosa dos Reis (Zona Norte)', 'acolhimento', '(11) 2924-5225',
       'https://prefeitura.sp.gov.br/web/lgbti/w/rede_de_atendimento/271098',
       'Atendimento jurídico, psicológico e social. Rua Plínio Pasqui, 186, Parada Inglesa', id
from public.cities where ibge_code = 3550308 on conflict do nothing;

-- Rio de Janeiro: serviço estadual 24 h e o centro da capital.
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Disque Cidadania LGBT (Governo do RJ)', 'direitos', '0800 023 4567',
       'https://www.rj.gov.br/secsocial/politicas_publicas_lgbtqi',
       'Denúncia e orientação em caso de LGBTIfobia. 24 h, gratuito. WhatsApp (21) 97706-2831', id
from public.cities where ibge_code = 3304557 on conflict do nothing;
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro de Cidadania LGBTI Capital I', 'acolhimento', '(21) 2334-9577',
       'https://www.rj.gov.br/secsocial/politicas_publicas_lgbtqi',
       'Atendimento social, psicológico e jurídico. Central do Brasil, 7º andar, Centro', id
from public.cities where ibge_code = 3304557 on conflict do nothing;

-- Natal
insert into public.support_services (name, kind, phone, url, description, city_id)
select 'Centro Municipal de Cidadania LGBT de Natal', 'acolhimento', '(84) 3232-8075',
       'https://www.natal.rn.gov.br/news/post2/43477',
       'Atendimento psicossocial e sociojurídico da Prefeitura. Av. Nascimento de Castro, 1982, Lagoa Nova. Seg a sex, 8h às 16h. WhatsApp (84) 99633-1575', id
from public.cities where ibge_code = 2408102 on conflict do nothing;
