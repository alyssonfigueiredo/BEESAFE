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

**Cloudflare R2** — https://dash.cloudflare.com → R2 → ativar (pede cartão, mas 10 GB/mês são
gratuitos e o tráfego de saída não é cobrado).
1. **Create bucket**, nome `irisa-fotos`, região automática.
2. No bucket → **Settings** → **Public access** → **Connect domain** (ou "Allow access" pelo
   domínio `r2.dev` para testar). Guarde o endereço público, é o `R2_PUBLIC_URL`.
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
