# PLANO — Irisa — "a cidade vista por você"

Evolução do "Aliança Segura" (Base44, Porto Alegre) para um app nacional, publicado nas lojas, com dois lados:
relatos anônimos de LGBTIfobia (o lado do risco) e lugares avaliados com estrelas (o lado do acolhimento).

## 1. Decisões fechadas

| Tema            | Decisão                                                                                                                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escopo MVP      | Relatos + mapa + lugares com estrelas + mural de apoio + emergência                                                                                                                                                                                                                                  |
| Backend         | Supabase (Postgres + PostGIS, Auth, Realtime, RLS, Edge Functions, Storage)                                                                                                                                                                                                                          |
| Frontend        | React Native com Expo (iOS + Android via EAS). Sem versão web no MVP                                                                                                                                                                                                                                 |
| Moderação       | Papel `moderator`, fila de denúncias, rate limit por usuário                                                                                                                                                                                                                                         |
| Anonimato       | Autor nunca sai do banco; RLS garante. Login obrigatório                                                                                                                                                                                                                                             |
| Coordenadas     | Exatas no banco. Exibição pública ofuscada (~100 m) só na janela em que a vítima pode ainda estar no local; depois exata                                                                                                                                                                             |
| Dados fictícios | Só em ambiente de desenvolvimento (seed). Produção nasce vazia                                                                                                                                                                                                                                       |
| Nome            | **Irisa** (verbo irisar: dar cores de arco-íris). INPI: sem processo para IRISA (busca 2026-09-13). "IRIS" seco inviável: Iris BS System (cl. 42, em vigor) e Iris Segurança Inteligente (cl. 45, em vigor). Registrar IRISA nas classes 9, 42 e 45; risco residual de oposição por semelhança na 45 |

Sobre a janela de ofuscação: o app não tem como saber se a vítima ainda está no local. Proxy proposto: relato com
`occurrence_date` nas últimas 24 h aparece ofuscado no mapa público; após 24 h aparece exato. Valor ajustável.

## 2. Stack

### App (Expo)

- Expo SDK atual, TypeScript, Expo Router (rotas por arquivo), EAS Build/Submit/Update.
- Mapa: `@maplibre/maplibre-react-native`. Gratuito, sem chave, aceita os tiles raster da Esri (Canvas Dark Gray)
  já validados no protótipo. Descarta `react-native-maps` porque Android exigiria chave do Google Maps.
- UI: NativeWind (Tailwind para RN) + componentes próprios seguindo o design system "Vibrant Alliance".
  Fontes Oswald e Space Grotesk via `expo-font`.
- Estado/servidor: `@supabase/supabase-js` + TanStack Query. Realtime via canais do Supabase.
- Localização: `expo-location`. Notificações (fase posterior): `expo-notifications`.
- Datas: `date-fns` com locale `pt-BR`. Ícones: `lucide-react-native`.

### Backend (Supabase)

- Postgres com extensões `postgis`, `pg_cron`, `pg_trgm`.
- Auth: e-mail/senha, Google e Apple. Apple Sign In é obrigatório na App Store quando existe login social.
- RLS em todas as tabelas. Views públicas expõem apenas colunas não identificáveis.
- Edge Functions (Deno): geocodificação reversa com cache, cálculo de score, rate limit, exclusão de conta.
- `pg_cron`: recálculo de scores agregados a cada hora.

### Geocodificação (cidade, UF, bairro a partir do ponto)

- Município e UF: malhas do IBGE importadas no PostGIS, resolvido por point-in-polygon, sem chamada externa.
- Bairro: polígonos do OSM importados onde existirem. Fallback: Nominatim via Edge Function com cache por célula
  de ~100 m e respeito ao limite de 1 req/s. Sem bairro resolvido o relato fica no nível de cidade.

## 3. Modelo de dados

```
profiles          id (= auth.users.id), role (user|moderator|admin), default_city_id, created_at
cities            id, ibge_code, name, state (UF), geom (multipolygon), centroid
neighborhoods     id, city_id, name, geom
occurrences       id, type, severity, description, location (geography point), city_id, neighborhood_id,
                  occurrence_date, created_by (nunca exposto), status (active|hidden|removed), created_at
places            id, name, category (bar|restaurante|balada|cafe|hotel|servico|praca|outro), location,
                  address, city_id, neighborhood_id, created_by, verified, status, created_at
place_ratings     id, place_id, user_id, stars (1..5), comment, created_at   -- único (place_id, user_id)
place_scores      place_id, score, rating_count, recent_occurrences, flag, updated_at   -- materializado
support_messages  id, nickname, category, content, likes, created_by, status, created_at
support_likes     message_id, user_id   -- 1 like por usuário, substitui "1 por sessão"
support_services  id, name, kind (policia|saude|direitos|acolhimento|ong), phone, url, city_id (null = nacional),
                  state, description
content_reports   id, target_type (occurrence|place|rating|message), target_id, reason, reporter_id,
                  status (open|accepted|rejected), moderator_id, resolved_at
rate_limits       user_id, action, window_start, count
```

Enums de `occurrences.type`, `severity` e `support_messages.category` e a paleta de cores permanecem os do
documento original.

### Views públicas (o que o app lê)

- `public_occurrences`: sem `created_by`; `location` substituído por `display_location`, ofuscado quando
  `occurrence_date > now() - 24h`.
- `public_places` com join em `place_scores`.
- `public_support_messages` sem `created_by`.

## 4. Regras de negócio

### Ranking de risco (mantido do original, agora por escopo)

- Score da área = nº relatos + 3 × relatos de gravidade alta, janela de 12 meses.
- Nível: ≥ 12 alto (coral), ≥ 6 médio (laranja), abaixo baixo (amarelo).
- Escopo: bairros dentro da cidade selecionada; cidades dentro da UF; UFs no país.
- Zonas de calor no mapa: mesma regra de agrupamento do original, aplicada aos pontos visíveis no viewport.

### Score de lugar

- Média ponderada das estrelas com decaimento exponencial, meia-vida de 6 meses.
- Confiabilidade: exibir sempre `rating_count`; lugares com menos de 3 avaliações mostram "poucas avaliações"
  e não entram no ranking de acolhedores.
- Alerta cruzado: se houver relatos ativos num raio de 100 m nos últimos 6 meses, o lugar recebe `flag` e uma
  penalidade de 0,5 estrela por relato de gravidade alta (mínimo 1,0). O alerta é exibido junto ao score.
- Cor da estrela no mapa: ≥ 4,5 turquesa, ≥ 3,5 amarelo, ≥ 2,5 laranja, abaixo coral.
- Ranking "lugares mais acolhedores" por cidade, ao lado do ranking de risco.

### Anti-abuso

- Rate limit: 5 relatos/dia, 10 avaliações/dia, 20 mensagens/dia por usuário. Aplicado por Edge Function.
- Uma avaliação por usuário por lugar, editável.
- Conta com menos de 24 h de idade não pode criar lugares.
- Denúncia de conteúdo em qualquer item. 3 denúncias ocultam automaticamente até revisão.

## 5. Telas

Tabs: Início, Mapa, Registrar, Apoio, Perfil.

- **Início**: seletor de cidade (padrão: cidade da geolocalização), 4 cartões de estatística, relatos recentes,
  ranking de risco e ranking de acolhedores.
- **Mapa**: camadas alternáveis (relatos, lugares, calor); filtros por tipo de relato e categoria de lugar;
  toque em lugar abre ficha com score, avaliações e botão avaliar; toque em ponto vazio oferece "registrar aqui"
  ou "adicionar lugar".
- **Registrar**: relato (tipo, data, gravidade, ponto no mapa ou GPS, descrição) com cidade/bairro resolvidos
  automaticamente; ou novo lugar (nome, categoria, ponto, endereço).
- **Ficha do lugar**: score, estrelas, alerta cruzado, lista de avaliações anônimas por apelido, avaliar/editar.
- **Apoio**: mural (igual ao original, like por usuário) e serviços de apoio da cidade atual + nacionais.
- **Emergência** (botão pulsante no header): 190, 192, 100, 188 e serviços locais da cidade.
- **Perfil**: cidade padrão, apelido do mural, minhas contribuições, excluir conta (exigência das lojas), sair.
- **Moderação** (só `moderator`): fila de denúncias, ocultar/restaurar/remover, verificar lugar.
- Auth: login, cadastro, esqueci a senha, Google, Apple.

## 6. LGPD e lojas

- Política de privacidade e termos publicados em URL própria (exigência de App Store e Play).
- Exclusão de conta dentro do app: anonimiza `created_by` (mantém agregados) e apaga perfil.
- Nenhum dado de identificação sai do banco. Logs de Edge Functions sem IP retido além de 7 dias.
- Contas: Apple Developer (US$ 99/ano) e Google Play Console (US$ 25 único).

## 7. Fases

| Fase | Entrega                                                                         |
| ---- | ------------------------------------------------------------------------------- |
| 0    | Nome, projeto Supabase, projeto Expo, design tokens, CI (lint, typecheck, EAS)  |
| 1    | Auth, cidades/bairros no PostGIS, relatos, mapa com calor, ranking de risco     |
| 2    | Lugares, avaliações, score, ficha do lugar, ranking de acolhedores              |
| 3    | Mural de apoio, serviços por cidade, emergência, perfil e exclusão de conta     |
| 4    | Moderação, denúncias, rate limit, auto-ocultação                                |
| 5    | TestFlight e Play internal testing, política de privacidade, submissão às lojas |
| 6+   | Notificações de área, rotas seguras, versão web                                 |

## 8. Pendências

- Reservar Instagram (@irisa ocupado; @irisa.app ou @irisaapp livres em busca), registrar irisa.com.br e irisa.app.br (sem DNS), protocolar IRISA no INPI (9, 42, 45). Identidade visual. Bundle id: br.com.irisa.app
- Confirmar janela de ofuscação de 24 h.
- Lista inicial de serviços de apoio por capital.
- Fonte dos polígonos de bairro por cidade (OSM cobre bem as capitais, mal o interior).

## 9. Nomes descartados (pesquisa 2026-09)

Acolhe (projeto All Out), SafeSpot, BeeSafe (5+ apps), Espaço/Lugar/Território Livre (Espaço Livre foi app do nicho),
tudo com "Arco-Íris" (saturado em ONGs, inclusive Resistência Arco-Íris do Dandarah), Estrela Guia (colide com Estrela Bet),
Zona Rosa (nome de bairro). Concorrentes mapeados: Dandarah, TODXS, Espaço Livre, By Concierge, QLIST, The Queer Spot.
