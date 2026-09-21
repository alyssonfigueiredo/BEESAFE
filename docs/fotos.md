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
