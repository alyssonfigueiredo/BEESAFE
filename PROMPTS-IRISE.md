# Prompts de imagem — Irise (arte final, pronta pra publicar)

Objetivo: gerar o Irise **dentro da cena**, não recortado colado do lado. Cada estado é uma
ilustração única e completa (fundo, luz, elementos do app todos desenhados juntos), no mesmo
padrão de qualidade do moodboard que você mandou.

## 0. Caminho recomendado pra consistência

Prompt sozinho (Midjourney/Ideogram/Firefly direto) **não segura consistência** do mesmo
personagem em 15-20 cenas diferentes — a cara muda um pouco a cada geração. Pra ficar pronto pra
publicar, dois caminhos, do mais barato ao mais sólido:

1. **Referência de imagem** (`--cref` no Midjourney v6, ou "character reference" no Ideogram/Firefly):
   usar os 7 recortes que você já mandou como imagem de referência em TODA geração nova, junto com o
   prompt de cena. Funciona bem pra ilustração solta, mas ainda varia um pouco rosto a rosto.
2. **LoRA por personagem** (recomendado se o Irise vai aparecer em produção de verdade): treinar uma
   LoRA leve (SDXL ou Flux) pra cada um dos 7 Irisis, usando 10-15 imagens de referência por
   personagem (a pose que você já tem + variações geradas com `--cref` como material de treino).
   Isso trava rosto, corpo e estilo entre todas as cenas — é o que qualquer mascote de app faz
   (Duolingo, Nubank etc. têm guia de personagem fechado, não geram solto toda vez).

Os prompts abaixo servem pros dois caminhos: direto com referência de imagem, ou como legenda de
treino da LoRA.

## 1. Prompt-base de estilo (colar em TODA geração)

```
semi-realistic stylized 3D character illustration, Pixar-meets-editorial rendering style,
soft cinematic studio lighting with warm rim light, naturalistic warm skin shading, slightly
stylized facial proportions (not cartoonish, not photoreal), fashion-forward streetwear,
diverse body types and features, visible tattoos where noted, detailed hair texture,
signature rainbow light ribbon motif (coral #FF6964, orange #FFA353, yellow #FFD066,
turquoise #49DCC0, blue #59A7FF, lilac #A889FF) flowing as a glowing trail of light,
clean color grading, high detail, 4k illustration, vertical composition, no text, no logo
```

Paleta de apoio (fundo/ambiente, quando pedir "tom da marca"): papel claro `#F5F4F1`, azul-noite
`#141829`, mais os seis acentos acima.

## 2. Ficha de cada Irise (descrição fixa — usar sempre a mesma)

Use estas descrições — tiradas do moodboard que você mandou — em toda cena daquele personagem,
pra ajudar o modelo (ou o treino da LoRA) a repetir os mesmos traços:

| | Descrição fixa |
|---|---|
| **Irise 01** | young man, light-brown skin, dark brown medium-length curly hair, slim-athletic build, black tank top, olive green cargo pants, layered chain necklaces, small tattoo on left forearm, white sneakers, confident relaxed urban energy |
| **Irise 02** | woman, medium-brown skin, voluminous dark curly hair past shoulders, curvy athletic build, olive cropped tank top, cargo pants, tattoos on arm, layered gold jewelry, backpack straps, playful energetic expression |
| **Irise 03** | androgynous person, light skin, short blonde curly hair, headphones resting around neck, slim build, black tank top, olive cargo shorts, striped socks, white sneakers, tattoos, creative alternative style |
| **Irise 04** | plus-size woman, dark skin, large voluminous curly afro-textured hair, purple cropped top, wide-leg dark trousers, cross-body bag strap, tattoo on arm, warm confident smile, soft embracing posture |
| **Irise 05** | man, light-medium skin, short wavy brown hair, round glasses, light stubble, layered white t-shirt under open shirt, denim shorts, backpack, necklace, curious analytical expression |
| **Irise 06** | woman, medium skin, short tight curly hair, backwards cap, sporty cropped top, denim shorts, striped knee-high socks, sneakers, tattoos, adventurous playful energy |
| **Irise 07** | androgynous person, medium-dark skin, short dark curly hair, graphic tank top, dark cargo pants, tattoos on arm and chest, small earrings, confident smirky irreverent expression |

Prompt de ficha de referência (gerar antes de tudo, pra fixar o personagem antes das cenas):

```
[DESCRIÇÃO FIXA DO IRISE],
character reference turnaround sheet, front view + three-quarter view + back view,
neutral standing pose, plain light gray studio background, consistent lighting,
[PROMPT-BASE DE ESTILO]
```

## 3. Cenas integradas, por estado (o personagem DENTRO da cena, fundo pintado junto)

Cada uma já é a ilustração completa — não um recorte colado. Troque `[IRISE X]` pela ficha fixa do
personagem escolhido. Formato recomendado: vertical 1080×1920 (tela cheia) ou 1200×1500 (cartão).

### Boas-vindas / saudação
```
[IRISE X], warmly waving at the viewer with one raised hand, gentle welcoming smile,
standing in a softly glowing gradient space in the app's paper and aurora tones
(soft turquoise, coral and lilac color washes blending in the background),
thin rainbow light ribbon curling around their shoulder,
[PROMPT-BASE DE ESTILO], full body, vertical composition
```

### Ganha vida (transição da escolha)
```
[IRISE X], standing at the center of a swirling ring of rainbow light that wraps around their
body like a portal, light particles drifting upward, eyes catching a soft colorful glow,
joyful awakening expression, dark soft-focus background fading to black at the edges,
dramatic rim lighting, [PROMPT-BASE DE ESTILO], full body, vertical composition
```

### Tour · Mapa
```
[IRISE X] leaning over a large glowing holographic 3D city map floating in front of them at
waist height, buildings rendered as soft glowing blocks, colorful location pins lighting up
across the map, pointing at one glowing pin with a curious smile, rainbow light trail
connecting the pins like a constellation, soft indoor glow lighting,
[PROMPT-BASE DE ESTILO], full body, vertical composition
```

### Tour · Avaliações / comunidade
```
[IRISE X] holding up a large translucent glass-like card floating in their hands, the card
showing soft glowing star and heart icons and gentle colorful bar indicators, warm
encouraging expression, soft particles of light drifting around the card,
[PROMPT-BASE DE ESTILO], three-quarter body, vertical composition
```

### Tour · Radar / progressão
```
[IRISE X] with a glowing segmented ring of rainbow light orbiting around one raised hand like
a halo, some segments bright and lit, others dim and waiting to light up, looking at the ring
with a proud satisfied smile, soft dark gradient background,
[PROMPT-BASE DE ESTILO], three-quarter body, vertical composition
```

### Tour · Conquistas
```
[IRISE X] holding a glowing medal with both hands close to their chest, medal emitting soft
rainbow light rays outward, delighted anticipatory expression with raised eyebrow, tiny drifting
sparkle particles, warm dark background, [PROMPT-BASE DE ESTILO], three-quarter body, vertical
composition
```

### Fim do tour (pose clássica)
```
[IRISE X] extending one open hand toward the viewer as an invitation, warm confident smile,
a thin rainbow light ribbon flowing from their hand toward the camera, soft bright gradient
background in paper and aurora tones, [PROMPT-BASE DE ESTILO], full body, vertical composition
```

### Descoberta ("qual vai ser hoje?")
```
[IRISE X] sitting cross-legged as if floating in soft space, surrounded by a loose constellation
of small glowing icons orbiting them — a fork, a cocktail glass, a disco ball, a coffee cup, a
map pin — each icon softly lit in a brand accent color, playful curious expression, soft gradient
background, [PROMPT-BASE DE ESTILO], full body, square or vertical composition
```

### Sugestões / recomendação
```
[IRISE X] presenting three glowing translucent cards fanned out in front of them like tarot
cards, each card showing a soft glowing building icon, confident presenting gesture with one
hand, warm knowing smile, soft colorful backlight, [PROMPT-BASE DE ESTILO], three-quarter body,
vertical composition
```

### Poucos dados / "ainda sei pouco"
```
[IRISE X] peeking playfully from behind a large translucent foggy card with a faint question
mark glowing on it, one eye visible over the edge, curious mischievous half-smile, soft muted
background, [PROMPT-BASE DE ESTILO], close three-quarter body, vertical composition
```

### Convite pra avaliar
```
[IRISE X] holding a glowing quill or stylus, about to stamp a translucent rating card floating
in front of them with a soft burst of star-shaped light, encouraging warm expression, soft
glow lighting, [PROMPT-BASE DE ESTILO], three-quarter body, vertical composition
```

### Conquista desbloqueada
```
[IRISE X] triumphantly lifting a glowing medal above their head with both hands, radiant burst
of rainbow light exploding softly behind them, joyful open-mouthed smile, dynamic pose, dark
navy background with colorful glow, [PROMPT-BASE DE ESTILO], full body, vertical composition
```

### Subida de nível
```
[IRISE X] in a dynamic celebratory pose, one fist raised, confetti-like streaks of rainbow
light flying around them, radiant energetic expression, dark navy background glowing with
soft rainbow light at the edges, [PROMPT-BASE DE ESTILO], full body, vertical composition
```

### Quase lá
```
[IRISE X] peeking in from the side of frame, leaning into view with a sly knowing half-smile,
one finger raised as if saying "almost", soft warm lighting, plenty of empty space in the
frame, [PROMPT-BASE DE ESTILO], three-quarter body entering from one side, vertical composition
```

### Loading / processando
```
[IRISE X] looking down thoughtfully with both palms open and facing up, a small swirling
rainbow radar/portal of light hovering just above their hands as if conjuring it, calm
focused expression, soft ambient glow lighting, [PROMPT-BASE DE ESTILO], three-quarter body,
vertical composition
```

### Erro / fallback
```
[IRISE X] with a playful exasperated expression, one hand resting on forehead, eyebrow raised,
comedic "oops" energy, a small rainbow light ribbon near them flickering and glitching apart
into soft fading particles, soft muted background, [PROMPT-BASE DE ESTILO], three-quarter body,
vertical composition
```

### Perfil · "Meu Irise" (retrato limpo)
```
[IRISE X], relaxed three-quarter body portrait, natural confident expression, soft plain
studio background in a single soft accent color wash matching their outfit accent,
even soft lighting, no dramatic props, [PROMPT-BASE DE ESTILO], vertical composition
```

### Bolha/ícone da Home (retrato pequeno, recorte fácil)
```
[IRISE X], close-up head-and-shoulders portrait, friendly warm smile looking at camera,
soft plain light gray background, even frontal lighting, designed to be cropped into a
small circle, [PROMPT-BASE DE ESTILO], square composition
```

## 4. Especificações técnicas

- **Cena completa** (onboarding, tour, celebrações, loading, erro): vertical 1080×1920, fundo
  pintado junto na própria imagem — é tela cheia do app, não precisa ficar "recortável".
- **Retrato limpo** (Meu Irise, bolha da Home, avatar em bolha de fala): fundo liso simples,
  fácil de cortar em círculo depois sem sobrar fundo estranho.
- Exportar em WebP (ou PNG se precisar transparência real em algum caso específico), nunca a
  imagem bruta do gerador — recomprimir/redimensionar por tamanho de uso (ver tabela abaixo).
- **Nomenclatura**, seguindo a estrutura já proposta (`IRISE_VARIANT + STATE`):
  `assets/irise/irise_01/welcome.webp`, `assets/irise/irise_01/tour_mapa.webp`,
  `assets/irise/irise_01/achievement.webp` etc. — uma pasta por variante, um arquivo por estado,
  mesmo nome de estado em todas as pastas.
- Tamanho de arquivo alvo: cena completa ≤ 180 KB, retrato pequeno ≤ 40 KB (WebP qualidade ~80),
  com versão @2x para telas retina.
- 7 variantes × ~16 estados = **112 imagens** no catálogo completo. Sugestão pra não travar a
  produção: lançar com 2-3 variantes completas primeiro (ex. Irise 01, 04, 06 — cobrindo a
  diversidade de corpo/estilo mais ampla) e completar as outras 4 depois, já que trocar de Irise
  nunca é obrigatório nem bloqueante.

## 5. O que isso NÃO resolve sozinho

Prompt nenhum aqui garante 100% de consistência sem um humano aprovando cada imagem antes de ir
pro app — é esperado gerar 3-6 variações por cena e escolher/ajustar a melhor. Se o volume
(112 imagens × variações) for inviável gerar à mão, vale cotar um ilustrador pra fechar a ficha
de cada personagem (como as já prontas do moodboard) e produzir as cenas em cima dela — ou treinar
a LoRA da seção 0 para gerar o catálogo inteiro com consistência real.
