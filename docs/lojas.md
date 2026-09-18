# Ficha para as lojas

## Nome

Irisa — a cidade vista por você

## Descrição curta (80 caracteres)

Mapa colaborativo de segurança e lugares acolhedores para pessoas LGBTQIA+.

## Descrição completa

A Irisa é feita pela comunidade LGBTQIA+ para a comunidade. Registre, de forma 100% anônima, ocorrências de LGBTIfobia e veja no mapa as áreas que pedem atenção na sua cidade. Avalie bares, restaurantes, baladas, cafés e serviços em quatro eixos — atendimento, afeto, banheiro e clientela — e descubra os lugares mais acolhedores perto de você.

- Relatos anônimos: seu nome e e-mail nunca aparecem, nem para moderadores.
- Mapa com zonas de atenção e ranking de bairros, atualizado em tempo real.
- Lugares avaliados pela comunidade, com alerta quando há relatos por perto.
- Mural de apoio: mensagens de acolhimento, dicas e pedidos de ajuda.
- Botão de emergência: 190, 192, Disque 100 e CVV 188, mais serviços da sua cidade.
- Funciona em todo o Brasil.

Em risco imediato, ligue 190.

## Categoria

Google Play: Social. App Store: Social Networking (secundária: Navigation).

## Classificação

Google Play: questionário IARC, marcar "conteúdo gerado por usuários" e "referências a violência" (relatos). Esperado: 16+.
App Store: 17+ (User Generated Content, Infrequent/Mild Mature Themes).

## Segurança dos dados (Google Play Data Safety)

- Coleta: e-mail (conta), localização aproximada e precisa (funcionalidade do app, só quando o usuário marca um ponto), conteúdo gerado pelo usuário.
- Dados criptografados em trânsito: sim.
- Usuário pode solicitar exclusão: sim, dentro do app.
- Não compartilhados com terceiros para publicidade.

## Privacidade (App Store)

- Data Linked to You: Email Address, User Content, Precise Location (funcionalidade).
- Data Not Collected: tudo o mais.

## URLs obrigatórias

Publicadas pelo GitHub Pages (workflow `.github/workflows/pages.yml`, fonte `docs/*.md` → `site/`):

- Site: https://alyssonfigueiredo.github.io/BEESAFE/
- Política de privacidade: https://alyssonfigueiredo.github.io/BEESAFE/privacidade.html
- Termos: https://alyssonfigueiredo.github.io/BEESAFE/termos.html
- Suporte: e-mail de contato appirisa@gmail.com.

## Play Console — o que colar em cada tela

> Os **valores** abaixo são do projeto e estão corretos. Os **nomes de menu e a ordem das telas** são
> aproximados: a Google reorganiza o Console com frequência. Quando a tela não bater com o texto,
> vale o que está na tela. Verificado em 18/09/2026 apenas no que a documentação pública confirma.

**Painel → Configurar o app**

| Campo | Valor |
|---|---|
| Nome do app | Irisa |
| Idioma padrão | Português (Brasil) |
| App ou jogo | App |
| Gratuito ou pago | Gratuito |
| E-mail de contato | appirisa@gmail.com |
| Categoria | Social |
| Tags | Comunidade, Segurança, LGBTQIA+ |

**Política de privacidade**: https://alyssonfigueiredo.github.io/BEESAFE/privacidade.html

**Acesso ao app**: "Todas as funcionalidades estão disponíveis sem restrições especiais" não vale: exige login. Marcar "Todo o app ou parte dele é restrito" e informar credenciais de teste (criar usuário teste@irisa.app com senha só para o Google, sem dados reais).

**Anúncios**: não contém anúncios.

**Classificação de conteúdo (IARC)**: categoria "Rede social, comunicação, conteúdo gerado pelo usuário". Respostas: violência = "referências a violência" (relatos descrevem agressões, sem imagens); sexualidade = não; drogas = não; linguagem = pode conter (conteúdo de usuários); conteúdo gerado por usuários = sim, com moderação; compartilha localização = sim, com consentimento (ponto escolhido pelo usuário). Resultado esperado: 16+ / "Classificação L" varia por região.

**Público-alvo**: são caixas de seleção por faixa etária, não um valor único. Marcar apenas **18 anos ou mais**
(ou 16-17 junto, se quiser alcançar essa faixa). Nenhuma faixa abaixo de 16 — marcar criança puxa a Política
Familiar, que o app não cumpre. Depois o Console pergunta se o app pode atrair crianças mesmo assim: responder que não.

**Aplicativos de notícias**: não.

**Rastreamento de contatos / COVID**: não.

**Segurança dos dados** (formulário):

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha dados do usuário? | Sim |
| Dados criptografados em trânsito? | Sim |
| Permite solicitar exclusão dos dados? | Sim (dentro do app: Perfil → Excluir minha conta) |
| URL de exclusão de conta | https://alyssonfigueiredo.github.io/BEESAFE/privacidade.html (seção 7) |

Tipos de dados: marcar exatamente estes.

| Categoria | Tipo | Coletado | Compartilhado | Obrigatório | Finalidade |
|---|---|---|---|---|---|
| Informações pessoais | Endereço de e-mail | Sim | Não | Sim | Gerenciamento da conta, prevenção a fraude |
| Localização | Localização precisa | Sim | Não | Não (opcional) | Funcionalidade do app |
| Localização | Localização aproximada | Sim | Não | Não | Funcionalidade do app |
| Mensagens | Outras mensagens no app | Sim | Não | Não | Funcionalidade do app |
| Conteúdo gerado pelo usuário | Outro conteúdo | Sim | Não | Não | Funcionalidade do app |

Tudo o mais: não coletado. Nada é usado para publicidade ou analytics.

**Recursos gráficos da página da loja**

- Ícone 512×512 PNG: `assets/icon.png` (já em 1024, redimensionar).
- Gráfico de recursos 1024×500: `node scripts/gen-feature-graphic.mjs` gera `assets/feature-graphic.png`.
- Screenshots (mín. 2, 16:9 ou 9:16, 320–3840 px): `bash scripts/screenshots.sh` captura Início, Mapa, Ficha do lugar, Registrar e Apoio no Simulador do iPhone e salva em `screenshots/` (pausa uma vez para o login).

**Teste fechado (obrigatório para conta pessoal criada depois de 13/11/2023)**: faixa "Teste fechado" →
lista de e-mails com 12+ testadores → eles aceitam o link e instalam pela Play → **12 testadores opted-in por
14 dias seguidos** → "Solicitar acesso à produção" e responder o questionário.

Detalhes que derrubam a contagem: quem entra e sai antes dos 14 dias não conta; quem sai e volta recomeça a
contagem; o que vale é estar opted-in no momento do pedido, com os 14 dias anteriores contínuos. Convide uns 18
para sobrar margem.

## App Store Connect — o que colar

| Campo | Valor |
|---|---|
| Nome | Irisa |
| Subtítulo (30) | Segurança e acolhimento LGBTQIA+ |
| Categoria primária | Social Networking |
| Categoria secundária | Navigation |
| Palavras-chave (100) | lgbt,lgbtqia,segurança,mapa,acolhimento,lgbtfobia,denúncia,comunidade,bar,curitiba |
| URL de suporte | https://alyssonfigueiredo.github.io/BEESAFE/ |
| URL de privacidade | https://alyssonfigueiredo.github.io/BEESAFE/privacidade.html |
| Classificação | 17+ (Conteúdo gerado por usuário; Temas maduros infrequentes/leves) |
| Login para revisão | usuário de teste com senha; explicar em "Notes" que relatos são anônimos e ocultados após 3 denúncias |

App Privacy: Email Address (Account management, linked); Precise Location (App functionality, linked); User Content (App functionality, linked). Tracking: no.

## Conteúdo gerado por usuário (exigências das lojas)

- Denúncia de conteúdo: sim (botão Denunciar em todo conteúdo).
- Bloqueio/ocultação: 3 denúncias ocultam automaticamente; moderação remove.
- Moderação com tempo de resposta: 72 h, declarado no item 5 dos Termos de Uso.
