# Prompts pra gerar as irises em cenas novas (Gemini / nano banana)

Fluxo igual ao das medalhas: você gera, me manda as folhas, eu recorto e componho as peças.

## Como usar (cada geração)

1. Anexe a **imagem de referência** do personagem (corpo inteiro, fundo transparente):
   `assets/irise-personagens/p1-10.webp` (Kai), `p1-11` (Léo), `p1-12` (Ali), `p1-13` (Bento),
   `p1-14` (Dante), `p1-15` (Rafa), `p1-16` (Yara), `p1-17` (Dandara). (Luna, `p1-18`, está fora do ar no app — fica de fora por enquanto.)
   (Estão na pasta do projeto no Mac depois do `git pull`.)
2. Cole o **prompt base** + a **cena** escolhida (abaixo).
3. Gere em alta (1024 px ou mais), **um personagem por imagem**.
4. Confira no checklist antes de me mandar.

## Prompt base (cola junto com a referência, trocando o nome)

> Mesmo personagem da imagem de referência: {NOME}. Mantenha IDÊNTICOS o rosto, o tom de pele,
> o cabelo, a roupa e todos os acessórios da referência (pins, pulseira arco-íris, colar, brinco),
> no mesmo estilo 3D estilizado de animação, mesmas proporções e mesma idade.
> Corpo inteiro, câmera na altura dos olhos, leve 3/4. Iluminação suave de estúdio, sombras macias.
> Fundo liso branco (sem cenário, sem chão desenhado — só uma sombra suave de contato).
> Sem texto, sem logo, sem marca d'água, sem bandeira como objeto principal. O colar/pingente
> fica PEQUENO e discreto como na referência — nunca vira cruz nem outro símbolo religioso.
> CENA: {uma das cenas abaixo}

**Variação com cenário** (pra peça-herói): troque a linha do fundo por
> Cenário: {descrição}, desfocado de leve atrás do personagem, paleta clara e quente.

## Cenas genéricas (servem pra qualquer irise)

- andando pela calçada com um sorriso tranquilo, uma mão no bolso
- acenando pra câmera com a mão aberta, simpátique
- sentade numa cadeira de café, relaxade, uma caneca na mesa
- apontando pra frente e pro lado, como quem mostra um caminho
- segurando um celular na mão, mostrando a tela pra câmera (tela em branco)
- de costas meio viradas, olhando por cima do ombro pra câmera
- pulando de alegria, braços pra cima
- de braços cruzados, confiante, sorrindo de canto

## Cenas da personalidade (uma peça por irise)

| Irise | Classe | Cena |
|---|---|---|
| Kai | DJ do Rolê | atrás de uma cabine de DJ, fones no pescoço, uma mão no disco, luz de pista suave |
| Léo | Guardião | encostado numa parede, braços cruzados, olhar atento e acolhedor |
| Ali | Conselheiro | sentado de frente pra câmera, inclinado pra frente, ouvindo com atenção, mãos entrelaçadas |
| Bento | Anfitrião | braços abertos num gesto de boas-vindas, meio curvado como quem recebe alguém na porta |
| Dante | Protetor | parado sob a luz de um poste à noite, mãos nos bolsos, expressão serena |
| Rafa | Cartógrafo | segurando um mapa de papel aberto, apontando um ponto nele, óculos escorregando |
| Yara | Exploradora | caminhando pra frente com mochila pequena, olhando o horizonte, vento no cabelo |
| Dandara | Matriarca | FEITA (13/10): braços cruzados fundo branco + sofá com livro. Não gerar de novo |
| ~~Luna~~ | Confidente | FORA DO AR no app (13/10) — não gerar por enquanto |

## Grupo

Gerar as nove juntas numa imagem só NÃO costuma manter a identidade de cada uma — o jeito certo é
gerar cada uma separada (mesma luz, mesmo fundo branco) e eu componho o grupo na montagem.

## Checklist antes de mandar

- [ ] Rosto é a mesma pessoa da referência (não "parecide" — igual).
- [ ] Roupa e acessórios idênticos: pins do Kai, pulseira arco-íris do Dante, jaqueta verde da Dandara…
- [ ] Mãos com 5 dedos, sem deformação.
- [ ] Fundo liso claro, sem texto/logo/marca d'água.
- [ ] Estilo 3D igual (nada realista, nada 2D).
- [ ] 1024 px ou mais.

O que recusar: mudou penteado/roupa, envelheceu/rejuvenesceu, virou foto realista, bandeira gigante
como cenário, qualquer texto na imagem. Gerou bom: manda a folha inteira (pode vir com várias
tentativas) que eu recorto pelo mesmo caminho das medalhas.
