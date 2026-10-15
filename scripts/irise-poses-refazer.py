"""Refaz as poses de busto dos irises originais (menos o Ali, 12) a partir das imagens sem fundo,
sem esticar: as versões antigas tinham sido esticadas à força para 300 × 460 e saíam espremidas.

Uso:  python3 scripts/irise-poses-refazer.py <pasta TODAS_IMAGENS_SEM_FUNDO>

Gera em assets/irise-personagens/: b<pose>-<n>.webp (fundo claro), b<pose>-<n>-escuro.webp e
avatar-card-b<pose>-<n>.png (cartão escuro do Início), e copia a versão clara para docs/admin/.
Molde = as do Ali (entrega v5): cabeça a ~4 px do topo, corpo ocupando ~272 px de largura.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "irise-personagens"
ADMIN = ROOT / "docs" / "admin"

PERSONAGENS = {
    10: "pessoa-nao-binarie-asiatica",  # Kai
    11: "leandro",                       # Léo
    13: "homem-gay-gordo",               # Bento
    14: "homem-gay-urso",                # Dante
    15: "homem-trans-ruivo",             # Rafa
    16: "mulher-bissexual-indigena",     # Yara
    17: "mulher-lesbica-negra",          # Dandara
    18: "mulher-trans",                  # Luna
}
POSES = {
    1: "busto_mao-no-peito",
    2: "expressao_comemorando",
    3: "expressao_preocupado",
    4: "expressao_acolhendo",
    5: "expressao_piscadinha",
    6: "expressao_apoio",
}
W, H = 300, 460
LARGURA_CORPO = 272   # como nas do Ali
ALTURA_MINIMA = 336   # o círculo do avatar mostra até ~y 335: o corpo tem que chegar lá
TOPO = 4


def recorte(src: Image.Image) -> Image.Image:
    im = src.convert("RGBA")
    a = np.array(im.getchannel("A"))
    ys, xs = np.where(a > 24)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def largura_cabeca(im: Image.Image) -> int:
    """Largura da cabeça (cabelo incluído): a faixa contínua que passa pelo centro do topo, até o
    pescoço estreitar. Serve para deixar a cabeça do mesmo tamanho em todas as poses."""
    a = np.array(im.getchannel("A")) > 60
    ys = np.where(a.any(1))[0]
    top, alt = ys[0], ys[-1] - ys[0]
    cx = int(np.where(a[top : top + 6].any(0))[0].mean())
    mx = 0
    for i, y in enumerate(range(top, top + int(alt * 0.45))):
        row = a[y]
        if not row[cx]:
            w = 0
        else:
            l = cx
            while l > 0 and row[l - 1]:
                l -= 1
            r = cx
            while r < len(row) - 1 and row[r + 1]:
                r += 1
            w = r - l + 1
        mx = max(mx, w)
        if mx and w < 0.82 * mx and i > 10:
            break
    return mx


def escalas(srcs: dict) -> dict:
    """Uma escala por pose, com a cabeça do mesmo tamanho em todas. As expressões (2 a 6) vêm todas
    no mesmo enquadramento: usam a mesma escala, a que faz o corpo chegar ao fundo do círculo. O busto
    (1) é enquadrado diferente e ganha a escala que iguala a cabeça à das expressões."""
    exp = [p for p in srcs if p != 1]
    req = [max(LARGURA_CORPO / srcs[p].width, ALTURA_MINIMA / srcs[p].height) for p in exp]
    s_e = float(np.median(req))
    h_e = float(np.median([largura_cabeca(srcs[p]) for p in exp]))
    h_b = largura_cabeca(srcs[1])
    s_b = s_e * h_e / h_b
    if not (0.7 <= (h_b / h_e) / (srcs[1].width / np.median([srcs[p].width for p in exp])) <= 1.6):
        s_b = max(LARGURA_CORPO / srcs[1].width, ALTURA_MINIMA / srcs[1].height)  # medida duvidosa
    return {1: s_b, **{p: s_e for p in exp}}


def busto(im: Image.Image, s: float) -> Image.Image:
    bw, bh = im.size
    nw, nh = round(bw * s), round(bh * s)  # mesma escala nos dois eixos: nada achata
    im = im.resize((nw, nh), Image.LANCZOS)
    a2 = np.array(im.getchannel("A"))
    faixa = a2[: max(8, nh // 8)]
    cx = np.where(faixa.max(0) > 24)[0].mean() if faixa.max() > 24 else nw / 2
    x = round(W / 2 - cx)  # cabeça no centro
    tela = Image.new("RGBA", (W + 2 * nw, H + nh), (0, 0, 0, 0))
    tela.alpha_composite(im, (x + nw, TOPO))
    return tela.crop((nw, 0, nw + W, H))


def escuro(im: Image.Image) -> Image.Image:
    """Para fundo escuro: borda um pouco mais fechada e mais escura (tira o halo claro)."""
    a = im.getchannel("A")
    fechado = a.filter(ImageFilter.MinFilter(3))
    a2 = Image.blend(a, fechado, 0.5)
    rgb = np.array(im.convert("RGB")).astype(float)
    borda = (np.array(a) > 0) & (np.array(a) < 250)
    rgb[borda] *= 0.96
    out = Image.fromarray(rgb.clip(0, 255).astype("uint8"), "RGB").convert("RGBA")
    out.putalpha(a2)
    return out


ANEL = Image.open(OUT / "anel-arcoiris.png").convert("RGBA").resize((220, 220), Image.LANCZOS)


def cartao(esc: Image.Image) -> Image.Image:
    """Cartão do Início (216 × 281): anel arco-íris e o irise saindo por cima (mesma montagem do Ali)."""
    cw, ch, cx, cy, r = 216, 281, 107.5, 172.0, 96.5
    c = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    c.paste(ANEL, (-2, 62), ANEL)
    fig = esc.resize((228, round(228 * H / W)), Image.LANCZOS)
    camada = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    camada.paste(fig.crop((6, 0, 6 + cw, ch)), (0, 0))
    yy, xx = np.mgrid[0:ch, 0:cw]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    disco = np.clip(r + 0.5 - d, 0, 1)
    # acima do arco de cima do disco, nas primeiras linhas, a cabeça sai livre por cima do anel
    arco = cy - np.sqrt(np.clip(r ** 2 - (xx - cx) ** 2, 0, None))
    acima = np.clip((arco + 2 - yy), 0, 1) * np.clip((cy - r + 14 - yy) / 3, 0, 1)
    acima *= np.clip((58 - np.abs(xx - cx)) / 4, 0, 1)  # só a cabeça: punho e ombro não escapam do anel
    m = np.maximum(disco, acima)
    al = np.array(camada.getchannel("A")).astype(float) * m
    # tira pedaço solto (punho levantado fora do anel): fica só o que está ligado ao miolo do disco
    rot, _ = ndimage.label(al > 8)
    miolo = set(np.unique(rot[(d < r - 4) & (al > 8)])) - {0}
    al[~np.isin(rot, list(miolo))] = 0
    camada.putalpha(Image.fromarray(al.astype("uint8")))
    c.alpha_composite(camada)
    return c


for n, nome in PERSONAGENS.items():
    srcs = {pose: recorte(Image.open(SRC / f"{nome}__{arq}.png")) for pose, arq in POSES.items()}
    esc_por_pose = escalas(srcs)
    for pose in POSES:
        claro = busto(srcs[pose], esc_por_pose[pose])
        esc = escuro(claro)
        claro.save(OUT / f"b{pose}-{n}.webp", quality=90, method=4)
        esc.save(OUT / f"b{pose}-{n}-escuro.webp", quality=90, method=4)
        cartao(esc).save(OUT / f"avatar-card-b{pose}-{n}.png", optimize=True)
        claro.save(ADMIN / (f"irise-{n}.webp" if pose == 1 else f"irise-{n}-{pose}.webp"), quality=90, method=4)
    print("ok", n, nome, {p: round(v, 3) for p, v in esc_por_pose.items()}, flush=True)
