# PLANO — Irisa — "quanta cor tem aqui?"

Evolução do "Aliança Segura" (Base44, Porto Alegre) para um app nacional com Curitiba como cidade de referência, publicado nas lojas, com dois lados:
relatos anônimos de LGBTIfobia (o lado do risco) e lugares com nota de acolhimento (o lado do acolhimento).

## 1. Decisões fechadas

| Tema            | Decisão                                                                                                                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escopo MVP      | Relatos + mapa + lugares com nota de acolhimento + mural de apoio + emergência                                                                                                                                                                                                                       |
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
place_ratings     id, place_id, user_id, welcome/affection/restroom/crowd (1..5), overall (gerada),
                  stars (derivada), comment, created_at   -- único (place_id, user_id)
place_scores      place_id, score, rating_count, score_* por eixo, rating_stddev, badge,
                  recent_occurrences, recent_on_site, flag, updated_at   -- materializado
rating_priors     scope ('global' | '<city_id>:<category>'), prior, sample_count   -- base da média bayesiana
support_messages  id, nickname, category, content, likes, created_by, status, created_at
support_likes     message_id, user_id   -- 1 like por usuário, substitui "1 por sessão"
support_services  id, name, kind (policia|saude|direitos|acolhimento|ong), phone, url, city_id (null = nacional),
                  state, description
content_reports   id, target_type (occurrence|place|rating|message), target_id, reason, reporter_id,
                  status (open|accepted|rejected), moderator_id, resolved_at
rate_limits       user_id, action, window_start, count
```

Enums de `occurrences.type`, `severity` e `support_messages.category` permanecem os do documento original.
A paleta foi para o claro: fundo papel `#FAF9F6`, cartões brancos, o azul-noite `#1E2340` como texto e como
fundo do mapa. Cada acento tem duas versões — clara para preenchimento e escura para texto sobre papel.
O símbolo é a íris-radar: anel em degradê, varredura de 95° e blips (`scripts/gen-icons.mjs`).

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

### Score de acolhimento

Uma nota só não diz se dá para usar o banheiro ou andar de mãos dadas. Cada avaliação responde
quatro eixos de 1 a 5, e é a combinação deles que vira a nota:

`0,30 atendimento + 0,30 afeto + 0,25 banheiro + 0,15 clientela`

- Média ponderada por recência (decaimento exponencial, meia-vida de 6 meses).
- Média bayesiana com `m = 5` e prior da categoria naquela cidade (reservas: média geral, 3,5), para que
  duas notas 5 não liderem a cidade. Priors ficam em `rating_priors`, recalculados de hora em hora.
- Alerta cruzado: relatos ativos num raio de 100 m nos últimos 6 meses dão `flag` e penalidade de 0,5 por
  relato grave; relato que aponta o próprio lugar (`occurrences.place_id`, escolhido no formulário de relato
  entre os lugares num raio de 300 m) penaliza em dobro e aparece na fila de moderação com o nome do lugar.
- Selo (`place_scores.badge`), que é o que a pessoa lê antes do número:
  `poucas` (< 5 avaliações) · `atencao` (relato no local nos últimos 30 dias, ou nota abaixo de 2,5) ·
  `dividido` (desvio > 1,3 — costuma depender de quem está no turno) · `acolhedor` (≥ 4,3) · `bem` (≥ 3,8).
  O elogio usa o score encolhido, o alerta usa a média crua: é assim que se erra para o lado seguro.
- Marcador: `Rainbow` (o anel da marca em cinco faixas) na lista e nos eixos, `IrisScore` (o anel) na ficha.
  A cor é identidade, não juízo — quem carrega bom/ruim é o número e o selo.
- Ranking "lugares mais acolhedores" por cidade: mínimo de 5 avaliações, nunca inclui `atencao`.

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
- **Ficha do lugar**: score, selo, quatro eixos, alerta cruzado, avaliações anônimas por apelido, avaliar/editar.
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

| Fase | Entrega                                                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Nome, projeto Supabase, projeto Expo, design tokens, CI. **Feito**                                                                                         |
| 1    | Auth (e-mail, Google, Apple), cidades/bairros no PostGIS, relatos, mapa, ranking. **Feito no código**; falta você configurar Google/Apple e importar dados |
| 2    | Lugares, avaliações em quatro eixos, score bayesiano, selos, ficha, ranking. **Feito**                                                                     |
| 3    | Mural de apoio, serviços por cidade, emergência, perfil e exclusão de conta. **Feito**                                                                     |
| 4    | Moderação, denúncias, rate limit, auto-ocultação. **Feito**                                                                                                |
| 5    | Política, termos e site publicados (GitHub Pages), ficha das lojas, APK Android via EAS, app rodando no iPhone. **Faltam**: conta Play Console, teste fechado, Apple Developer |
| 6+   | Notificações de área, rotas seguras, versão web                                                                                                            |

## 8. Pendências

- Reservar Instagram @irisapp (livre), registrar irisa.com.br e irisa.app.br, protocolar IRISA no INPI (9, 42, 45). Bundle id: br.com.irisa.app. Contato: appirisa@gmail.com.
- Layout do Início: decidido manter o painel (opção A). Mockup A/B: `docs/mockup.html`. Pitch: `docs/pitch.html` (publicados no site).
- Antes do lançamento: apagar os dados de teste do banco com `supabase/seed/limpar-curitiba-teste.sql`. O login Google usa o navegador do sistema via Supabase (PKCE, cliente OAuth do tipo Aplicativo da Web), então **não existe passo de SHA-1**. Bairros das capitais importados; São Paulo saiu pelo nível 9 do OSM. Falta fonte para Brasília, São Luís e Palmas.
- Confirmar janela de ofuscação de 24 h.
- Lista inicial de serviços de apoio por capital.
- Fonte dos polígonos de bairro por cidade (OSM cobre bem as capitais, mal o interior).

## 9. Nomes descartados (pesquisa 2026-09)

Acolhe (projeto All Out), SafeSpot, BeeSafe (5+ apps), Espaço/Lugar/Território Livre (Espaço Livre foi app do nicho),
tudo com "Arco-Íris" (saturado em ONGs, inclusive Resistência Arco-Íris do Dandarah), Estrela Guia (colide com Estrela Bet),
Zona Rosa (nome de bairro). Concorrentes mapeados: Dandarah, TODXS, Espaço Livre, By Concierge, QLIST, The Queer Spot.

## 10. E os estabelecimentos? (decidido em 23/09/2026, não implementar ainda)

A pergunta aparece sozinha na primeira conversa com ONG ou com dono de bar: *se a região é perigosa,
o lugar não deveria perder nota, nem que fosse para empurrar o comércio a cobrar iluminação e ronda?*

**A resposta é não, e o motivo não é delicadeza.** Um bar não instala policiamento nem troca poste:
punir por algo sem agência gera ressentimento, não ação. O sinal também não chega — dono de
estabelecimento não é usuário do app, então a punição existiria sem destinatário. E o viés seria
sistemático contra quem o app quer proteger: relato se concentra em centro e região de vida noturna,
que é onde está a cena LGBTQIA+; o ranking acabaria recomendando o restaurante de shopping em bairro
nobre onde ninguém registra nada. Pior: bairro sem usuário não tem relato, logo não tem desconto — o
app recompensaria a ausência de dados.

Por isso a migration 12 tirou a penalidade do entorno da nota, e a 13 criou `area_level`: o lugar tem
nota de acolhimento, a região tem nível de atenção, lado a lado, sem uma julgar a outra.

**Os dois caminhos legítimos, para quando houver usuário:**

1. **Selos de compromisso** — atributos que o estabelecimento *controla* e pode conquistar: entrada e
   calçada iluminadas, equipe orientada, banheiro de uso livre, política escrita contra discriminação
   visível no local. O lugar declara, a comunidade confirma ou desmente nas avaliações. É o arco-íris
   da vitrine, só que auditado por quem esteve lá em vez de comprado numa gráfica. Não implementar
   antes de existir gente para conferir: auto-declaração sem confirmação é vitrine de novo.
2. **Ficha do bairro** — tela que junta, numa área, os relatos e os lugares acolhedores dela. É o
   documento que um grupo de comerciantes leva à subprefeitura pedindo ronda e iluminação. A mesma
   informação que, como desconto, seria ameaça e faria inimigo; como dado público, é instrumento e
   faz aliado. Também é o que recompõe o acoplamento entre os dois lados do app, que a 12 afrouxou,
   e o que sustenta a promessa de "dados agregados para organizações e poder público" da apresentação.

**Se algum dia o risco da região tiver que influir na lista de lugares, que seja escolha do usuário**
— um filtro ou uma ordenação que ele liga, vê o que sumiu e desliga — nunca ajuste silencioso dentro
da nota. Um número que responde duas perguntas não responde nenhuma: ninguém saberia se 3.2 significa
"a equipe foi fria" ou "a quadra é perigosa".
