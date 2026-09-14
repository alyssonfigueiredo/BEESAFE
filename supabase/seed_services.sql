-- Serviços de apoio: nacionais + por capital. Idempotente (chave única de migrations/00000000000008).
-- Rode depois de importar os municípios (scripts/import-cities.mjs). Cidade ainda não importada é ignorada em silêncio.
-- Rodar de novo atualiza telefone, site e descrição dos que já existem.

-- ---------- nacionais (city_id null) ----------
insert into public.support_services (name, kind, phone, url, description) values
('Polícia Militar', 'policia', '190', null, 'Risco imediato à vida ou integridade'),
('SAMU', 'saude', '192', null, 'Emergência médica'),
('Disque 100 — Direitos Humanos', 'direitos', '100', 'https://www.gov.br/mdh/pt-br/ondh', 'Denúncia de violações, incluindo LGBTIfobia. 24h, gratuito'),
('CVV — Centro de Valorização da Vida', 'acolhimento', '188', 'https://cvv.org.br', 'Apoio emocional 24h, gratuito e sigiloso'),
('Acolhe LGBT+ (All Out)', 'acolhimento', null, 'https://acolhelgbt.org', 'Apoio psicológico gratuito com profissionais voluntários'),
('ANTRA — Associação Nacional de Travestis e Transexuais', 'ong', null, 'https://antrabrasil.org', 'Rede nacional de apoio a pessoas trans'),
('ABGLT — Aliança Nacional LGBTI+', 'ong', null, 'https://abglt.org.br', 'Articulação nacional de organizações LGBTI+'),
('Mapa da Cidadania (ABGLT)', 'direitos', null, 'https://www.abglt.org/mapa-da-cidadania', 'Busca de serviços LGBTI+ por estado'),
('Defensoria Pública da União', 'juridico', null, 'https://www.dpu.def.br', 'Assistência jurídica gratuita')
on conflict (lower(name), coalesce(city_id, 0)) do update
  set kind = excluded.kind, phone = excluded.phone, url = excluded.url,
      description = excluded.description, active = true;

-- ---------- por capital ----------
-- Cada linha: (código IBGE, nome, tipo, telefone, site, descrição).
insert into public.support_services (name, kind, phone, url, description, city_id)
select s.name, s.kind::public.service_kind, s.phone, s.url, s.description, c.id
from (values
  -- Curitiba (cidade de referência do projeto)
  (4106902, 'Grupo Dignidade', 'ong', null, 'https://www.grupodignidade.org.br',
   'ONG de Curitiba pela cidadania LGBTI+ desde 1992'),
  (4106902, 'Centro de Cidadania LGBTQIA+ de Curitiba', 'acolhimento', null,
   'https://www.instagram.com/centrocidadanialgbtqia/',
   'Acolhimento e encaminhamento para a população LGBTQIA+'),
  -- Porto Alegre
  (4314902, 'Nuances — Grupo Pela Livre Expressão Sexual', 'ong', null, 'https://nuances.com.br',
   'ONG de Porto Alegre desde 1991'),
  (4314902, 'Centro de Referência LGBTI+ de Porto Alegre', 'acolhimento', null, 'https://prefeitura.poa.br',
   'Atendimento psicossocial e jurídico da Prefeitura'),
  -- São Paulo
  (3550308, 'Centro de Cidadania LGBTI Luiz Carlos Ruas', 'acolhimento', '(11) 3225-0019',
   'https://prefeitura.sp.gov.br/web/lgbti/w/rede_de_atendimento/271098',
   'Apoio jurídico, psicológico e social a vítimas de violência e discriminação. Seg a sex, 9h-18h'),
  (3550308, 'Núcleo de Diversidade Sexual e de Gênero — Defensoria de SP', 'juridico', null,
   'https://www.defensoria.sp.def.br/nucleos-especializados/pagina-inicial-nucleos-especializados/nucleo-de-defesa-da-diversidade-sexual-e-de-genero/redes',
   'Defesa jurídica gratuita em casos de LGBTIfobia'),
  -- Rio de Janeiro
  (3304557, 'Centro de Cidadania LGBT Capital', 'acolhimento', '(21) 2334-9577',
   'https://www.rj.gov.br/secsocial/politicas_publicas_lgbtqi',
   'Atendimento jurídico, social e psicológico. Seg a sex, 9h-17h'),
  (3304557, 'Disque Cidadania RJ', 'direitos', '0800 023 4567',
   'https://www.rj.gov.br/secsocial/politicas_publicas_lgbtqi',
   'Orientação inicial e encaminhamento aos Centros de Cidadania LGBT'),
  -- Belo Horizonte
  (3106200, 'Centro de Referência LGBT de Belo Horizonte', 'acolhimento', '(31) 3277-4128',
   'https://prefeitura.pbh.gov.br/direitos-humanos/equipamentos/crlgbt',
   'Atendimento psicossocial, grupos de apoio e orientação a vítimas de preconceito'),
  -- Salvador
  (2927408, 'Centro Municipal de Referência LGBT de Salvador', 'acolhimento', null,
   'http://conecta.salvador.ba.gov.br',
   'Atendimento psicossocial e orientação jurídica a vítimas de violência'),
  (2927408, 'Grupo Gay da Bahia', 'ong', null, 'https://grupogaydabahia.com.br',
   'A mais antiga organização LGBTI+ do Brasil, fundada em 1980'),
  -- Recife
  (2611606, 'Centro de Referência em Cidadania LGBT do Recife', 'acolhimento', null,
   'https://www2.recife.pe.gov.br/servico/centro-de-referencia-em-cidadania-lgbt',
   'Rede municipal de proteção e garantia de direitos da população LGBT'),
  -- Fortaleza
  (2304400, 'Centro Estadual de Referência LGBT+ Thina Rodrigues', 'acolhimento', '(85) 98993-3884',
   'https://www.diversidade.ce.gov.br/cerlgbt-thina-rodrigues/',
   'Acolhimento social, psicológico e jurídico do Governo do Ceará. Seg a sex, 8h-17h'),
  -- Brasília
  (5300108, 'Creas Diversidade — DF', 'acolhimento', '(61) 3224-4898',
   'https://www.sedes.df.gov.br/referencia-no-enfrentamento-a-lgbtfobia/',
   'Escuta qualificada e encaminhamento para a população LGBT+ em vulnerabilidade')
) as s(ibge, name, kind, phone, url, description)
join public.cities c on c.ibge_code = s.ibge
on conflict (lower(name), coalesce(city_id, 0)) do update
  set kind = excluded.kind, phone = excluded.phone, url = excluded.url,
      description = excluded.description, active = true;

-- Conferência.
select coalesce(c.name, 'NACIONAL') as cidade, s.name, s.kind, s.phone
from public.support_services s
left join public.cities c on c.id = s.city_id
where s.active
order by c.name nulls first, s.name;
