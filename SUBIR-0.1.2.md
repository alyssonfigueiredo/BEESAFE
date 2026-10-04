# Irisa 0.1.2: testar e subir nas lojas

Escrito em 04/10/2026. Tudo que entrou hoje já está no repositório e o banco já foi atualizado sozinho
(migrations até a 48). Falta só gerar as builds e enviar. Cada passo é um comando para colar no Terminal
do Mac, na pasta BEESAFE.

## O que vai nesta versão

- Gamificação completa: Sua evolução (8 níveis com ícone sobre a íris de 48 gomos), 32 conquistas,
  semana acesa, caixinha, comemorações calmas.
- Início novo: Sua semana, Suas cores (o que você coloriu e quantas pessoas abriram a ficha depois
  da sua avaliação), Quase lá e a sugestão "Passou por aqui?" uma vez por dia.
- Mapa novo (painel Mapa/Lista, lugares agrupados, relato como área) e lugares perto de você de verdade.
- Mural novo: uma coluna, seis reações da casa, pergunta da semana, publicar como Anônimo.
- Tour de boas-vindas em cima das telas reais.
- Visual igual no app todo (seletores, campos, botões).
- Cadastro de lugar confere o endereço escrito antes de gravar (o caso do Na Feira Bar).
- Notificações (push).

## 1. Leandro testar hoje (sem build nova)

A build 10 (0.1.2) já está no App Store Connect, então dá para testar pelo TestFlight com o código de
hoje chegando por atualização:

```bash
git pull origin claude/laughing-keller-my8t7c
npm install
npx eas-cli update --branch production --message "0.1.2: evolução, 32 conquistas, Suas cores, mural e mapa novos"
```

1. No iPhone, abra o **TestFlight** e instale a Irisa 0.1.2 (build 10). Quem é administrador da conta
   da Apple entra como testador interno sem revisão.
2. Abra o app, espere uns 10 segundos, **feche de vez** (deslizar para cima) e abra de novo. A
   atualização baixa na primeira abertura e entra na segunda.
3. Confira: Perfil → cartão **Sua evolução** → toque para ver a trilha; Início → **Suas cores**;
   avaliar um lugar mostra a comemoração calma.

A mesma atualização chega em quem já tem a 0.1.2 instalada. Quem está na 0.1.1 só recebe depois de
atualizar pela loja.

## 2. Alysson: build nova e envio

A build 10 foi feita antes das mudanças de hoje. Para a revisão da Apple e do Google verem tudo já na
primeira abertura, vale gerar uma build nova dos dois lados (o número da build sobe sozinho).

### iPhone

```bash
git pull origin claude/laughing-keller-my8t7c
npm install
npx eas-cli build -p ios --profile production --auto-submit
```

Quando o e-mail da Apple disser que a build terminou de processar (uns 15 a 30 min depois):

1. https://appstoreconnect.apple.com → Apps → **Irisa** → no topo da coluna da esquerda, **+ Versão**
   (ou **Adicionar versão**) → `0.1.2`.
2. Em **Build**, escolha a build nova (a de número maior, 11 ou mais).
3. Em **Novidades nesta versão**, cole o texto da seção 3.
4. **Adicionar para revisão** → **Enviar para revisão**.

### Android

Antes da build, o Android precisa do Firebase para as notificações. Se isso ainda não foi feito, o app
funciona igual, só não recebe notificação no Android; dá para fazer depois numa próxima build.

Com o Firebase pronto (passo a passo no CLAUDE.md, item "Notificações push"):

```bash
npx eas-cli build -p android --profile production
```

1. Quando terminar, baixe o arquivo `.aab` pelo link que o EAS mostra.
2. https://play.google.com/console → Irisa → **Teste fechado** → **Criar nova versão** → envie o `.aab`.
3. Em **Notas da versão**, cole o texto curto da seção 3.
4. **Avançar** → **Salvar** → **Enviar mudanças para análise** (em Visão geral da publicação).
   A resposta do IARC não muda nesta versão.

**No dia em que o Android for para produção:** no painel (https://appirisa.com.br/admin/) grave a data
do Abre-Alas, para a medalha parar de ser dada a quem entrar depois.

## 3. Textos das lojas

**App Store (Novidades nesta versão):**

> Sua evolução: cada contribuição acende um gomo da sua íris, e você sobe de nível, de Curiose a
> Patrimônio LGBTQIA+. São 32 conquistas para desbloquear, todas só suas.
> Início novo, com a sua semana e as cores que você deixou pelo mapa.
> Mapa e lista mais fáceis de ler, e lugares perto de onde você está.
> Mural de apoio renovado: reações da casa, pergunta da semana e opção de publicar como Anônimo.
> Notificações para as novidades da sua cidade.
> Relato continua anônimo e nunca conta ponto.

**Google Play (Notas da versão, até 500 caracteres):**

> Sua evolução: cada contribuição acende um gomo da sua íris e você sobe de nível. 32 conquistas, só
> suas. Início, mapa e mural renovados, lugares perto de você e notificações. Relato continua anônimo
> e nunca conta ponto.

## 4. Depois de aprovado

Correção de tela ou texto não precisa de build: `npx eas-cli update --branch production --message "..."`
chega em todo mundo que tem a 0.1.2. Build nova só quando mudar algo nativo (biblioteca nova, ícone,
permissão, `app.config.ts`).
