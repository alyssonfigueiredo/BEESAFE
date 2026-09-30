# Fotos dos lugares (Google Places) — com a cota travada no gratuito

O OSM não tem foto. O Google Places (New) tem, dentro de uma cota mensal gratuita por tipo de
chamada. A ideia é usar só o que é grátis: a trava abaixo impede qualquer cobrança. Se a cota
acabar no mês, a foto some e o app mostra o ícone da categoria — nada quebra.

## Regras do Google que o projeto cumpre

- `place_id` pode ficar guardado para sempre. Nome da foto e autor, por 30 dias: a view
  `public_places` esconde a referência vencida, e o script renova a partir do 25º dia.
- A imagem nunca é gravada no nosso banco. O app pede ao Google na hora de exibir.
- Crédito do autor da foto e a palavra Google aparecem sobre a imagem (`PlacePhoto.tsx`).
  Pendência: trocar o texto "Google" pelo logotipo oficial quando o asset for baixado.

## Configuração (uma vez) — Google Cloud

Mesmo projeto do login Google: https://console.cloud.google.com

1. **Faturamento**: cadastrar um cartão (o Google exige, mesmo para uso gratuito).
2. **APIs e serviços → Biblioteca**: ativar **Places API (New)**. Só a "New"; a antiga não serve.
3. **APIs e serviços → Cotas e limites do sistema** → filtrar por Places API (New) e reduzir
   os limites **por dia** para caber no gratuito do mês. Valores de referência (setembro/2026;
   o grátis mensal muda, confira na página de preços antes de fixar):

   | Chamada (SKU) | Grátis/mês (aprox.) | Limite por dia a fixar |
   |---|---|---|
   | Text Search (Pro) | 5.000 | 150 |
   | Place Details (Pro) | 5.000 | 150 |
   | Place Photo | 10.000 | 300 |

   A cota é do projeto inteiro: vale para o script e para o app somados. Estourou o dia, o
   Google devolve 429 e o app cai no ícone da categoria.
4. **Credenciais → Criar credencial → Chave de API**, duas vezes:
   - `irisa-scripts`: restrição de API = só Places API (New). Vai para `.env.scripts` como
     `GOOGLE_MAPS_API_KEY=...`.
   - `irisa-app`: restrição de API = só Places API (New). Vai para o `.env` como
     `EXPO_PUBLIC_GOOGLE_MAPS_KEY=...` e depois `npx eas-cli env:push production --path .env`
     (e `preview`, se for buildar preview).

   A chave do app vai dentro do APK e pode ser extraída. O que limita o dano é a trava de cota,
   não a chave. Restringir por pacote Android exige mandar cabeçalhos extras em cada imagem;
   não vale a complexidade enquanto a cota está travada.

## Rodar

```bash
cd ~/BEESAFE && set -a && source .env.scripts && set +a
node scripts/google-place-photos.mjs --todas       # todas as cidades com lugares
node scripts/google-place-photos.mjs 4106902       # só Curitiba
```

Com o limite de 150 buscas/dia, as sete cidades (~450 lugares) levam três dias na primeira
rodada. Depois, rodar uma vez por mês renova só o que venceu.

O que o script imprime por cidade: casados (achou no Google), renovados, sem foto no Google,
não encontrados (nome ou distância não bateram; tenta de novo em 25 dias), já em dia.

## Critério de casamento

Um lugar do Google só é aceito se estiver a até 250 m do nosso ponto **e** alguma palavra do
nosso nome aparecer no nome dele. Foto errada é pior que nenhuma.

---

# Foto própria: Mapillary + Cloudflare R2 (sem cota, sem vencimento)

A foto do Google resolve pouco: não pode ser baixada, a referência vence em 30 dias e a cota é
de 150 buscas por dia no projeto inteiro — uma capital leva meses. O **Mapillary** (fotos de rua
colaborativas) publica as imagens em **CC BY-SA 4.0**: dá para baixar, guardar e mostrar, desde
que o crédito de quem fotografou apareça. A imagem passa a ser nossa, fica no **Cloudflare R2**
(10 GB grátis, sem custo de tráfego) e nunca mais depende de cota.

Precedência no app: foto própria → foto do Google → azulejo da categoria. Nada quebra se faltar.

## Contas (uma vez)

**Mapillary** — https://www.mapillary.com → criar conta → Dashboard → Developers →
Register application → copiar o token (`MLY|...`). É grátis e não pede cartão.

**Cloudflare R2** — conta própria da Irisa (appirisa@gmail.com, criada em 28/09/2026; separada da
conta pessoal de propósito: cobrança, cota e entrega do projeto ficam limpas).
https://dash.cloudflare.com → R2 → ativar (pede cartão, mas 10 GB/mês são gratuitos e o tráfego de
saída não é cobrado).
1. **Create bucket**, nome `irisa-fotos`, região automática.
2. No bucket → **Settings** → **Public access** → ligar a **Public Development URL** (o domínio
   `r2.dev`). Ela deixa qualquer pessoa **ler** os arquivos pelo link — que é o que o app precisa
   para abrir a foto; escrever e apagar continua só com a chave. Em uso desde 28/09/2026:
   `https://pub-70bc82c84169407ea7e964b1d73cbdc5.r2.dev` (é o `R2_PUBLIC_URL`).
   O `r2.dev` é gratuito mas tem a velocidade limitada pela Cloudflare e não é recomendado para
   uso pesado: quando o app tiver movimento, ligar um domínio próprio em **Connect domain**,
   trocar essa linha do `.env.scripts` e rodar o script de novo para regravar o `photo_url`.
3. **R2 → Manage API tokens → Create API token**: permissão **Object Read & Write**, só nesse
   bucket. Copie `Access Key ID` e `Secret Access Key` — o secret só aparece uma vez.
4. O **Account ID** está na página inicial do R2, na barra da direita.

## Chaves em `.env.scripts` (na máquina dele, nunca no git)

```
MAPILLARY_TOKEN=MLY|...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=irisa-fotos
R2_PUBLIC_URL=https://...
```

## Rodar

```bash
cd ~/BEESAFE && set -a && source .env.scripts && set +a
node scripts/mapillary-photos.mjs --todas --simular    # só conta quantos teriam foto
node scripts/mapillary-photos.mjs --todas              # baixa e sobe para o R2
node scripts/mapillary-photos.mjs 4106902 --limite 50  # só Curitiba, 50 lugares
```

Sem cota diária: dá para rodar tudo de uma vez. Uma imagem de 1024 px pesa ~150 KB, então os
~1.100 lugares sem foto ocupam menos de 200 MB dos 10 GB.

## Critério de escolha

Só entra imagem a até **60 m** do nosso ponto **e** com a câmera apontada para o lugar (desvio
de até **55°**, calculado pelo rumo entre a posição da foto e a do lugar). Entre as que passam,
ganha a mais perto, mais bem apontada e mais recente. Sem candidata, o lugar fica marcado em
`photo_tried_at` e só volta à fila depois de 90 dias — o acervo do Mapillary cresce devagar.

Cobertura real varia: no centro das capitais é boa, em bairro residencial é fraca. O que não
casar continua no azulejo da categoria até alguém enviar foto pelo app.

## O que NÃO fazer

Não raspar foto do Google Maps para guardar. É proibido pelos termos, as fotos pertencem a quem
as tirou, e uma denúncia derruba o app da loja. A cota gratuita do Google continua valendo como
reserva; o que muda é que ela deixa de ser a única fonte.

---

# Foto de quem avalia (migration 24)

A melhor fonte de todas: quem está no lugar manda a foto junto com a avaliação. É atual, é o
lugar como ele é hoje, é da comunidade — e não depende de cota nem de licença de terceiro.

- Arquivo vai para o **Supabase Storage**, bucket público `fotos-lugares`, caminho
  `<place_id>/<user_id>/foto.jpg`. O `user_id` na pasta é o que impede uma pessoa de sobrescrever
  a foto de outra; ele nunca sai do banco para o app.
- A linha vai para `place_photos`, e um trigger põe a mais recente **ativa** em `places.photo_url`
  com `photo_source = 'usuario'`. Escondida pela moderação, o lugar volta sozinho para a foto de
  antes (Mapillary, Google) ou para o azulejo da categoria.
- Limite de 10 fotos por pessoa em 24 h (mesmo rate limit das avaliações) e 5 MB por arquivo.
- Denúncia de foto entra no mesmo fluxo de moderação das avaliações e do mural (`report_target`
  ganhou `photo`).

## Moderação da imagem (nenhuma foto entra no ar sozinha)

Texto ofensivo incomoda; imagem imprópria numa ficha pública é outro patamar — e a Play Store
exige moderação do que o usuário envia. Toda foto nasce `review = 'pendente'` e passa por:

1. **Robô** — a Edge Function `photo-check` (pg_cron, de 5 em 5 min, só quando há foto pendente)
   manda a imagem para o **SafeSearch do Google Cloud Vision** (1.000 análises/mês grátis).
   Só aprova sozinho se adulto, violência e sensual vierem as três em `VERY_UNLIKELY`.
   `LIKELY` ou acima em qualquer uma → `recusada`. Qualquer outra resposta (`UNLIKELY`, `POSSIBLE`,
   `UNKNOWN`) ou erro → `humano`, vai para a fila: qualquer sinal de dúvida passa por uma pessoa. ("medical" fica de fora de
   propósito: farmácia e serviço de saúde caem nele.)
2. **Fila humana** — tela **Moderação** do app mostra a foto, o lugar e o que o robô achou, com
   **Liberar** / **Recusar**. Quem modera não vê quem mandou.
3. **Denúncia** — depois de no ar, a foto segue denunciável como qualquer conteúdo, e três
   denúncias de pessoas diferentes escondem na hora, igual ao resto.

**Sem `VISION_API_KEY` nada é aprovado automaticamente**: tudo espera a fila humana. Falha do
robô nunca publica — o padrão é não publicar.

Aviso: sempre que uma foto cai na fila, a função manda um e-mail pelo Gmail da Irisa para
appirisa@gmail.com (ou para `MODERACAO_EMAIL`, se existir) com quantas fotos esperam decisão.

Secrets da função: `SB_SECRET_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` (os mesmos do
`tester-welcome`) e `VISION_API_KEY` (chave do Google Cloud com a **Cloud Vision API** ativada).
A chave do cron fica só no Vault (`photo_check_secret`, criada pela migration 26); a função
confere pela RPC `photo_check_autorizado`.
- No app: botão **Adicionar uma foto do lugar** dentro do formulário de avaliação
  (`app/lugar/[id].tsx` + `src/hooks/usePlacePhoto.ts`). Recorte 16:9 e qualidade 0.7 no envio,
  para a faixa da ficha e para não subir arquivo gigante.

**Precisa de build nova:** `expo-image-picker` é módulo nativo. Depois do `npm install`, rodar
`npx expo run:ios --device` de novo e gerar build EAS nova para o Android — não basta recarregar
o Metro.

## Ordem final no app

1. Foto de quem avaliou (nossa, sem cota, sempre atual).
2. Mapillary (nossa, CC BY-SA, com crédito).
3. Google (alugada, vence em 30 dias, gasta cota até para exibir).
4. Azulejo da categoria.
