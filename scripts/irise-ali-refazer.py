"""Refaz as 6 poses de busto do Ali (personagem 12) a partir das imagens sem fundo, com UMA
escala só pras 6 — igual ao irise-poses-refazer.py (Bento, Léo, etc.), não o Math.max por-foto
que o admin.js usa quando sobe uma foto de cada vez pelo painel.

Por que não dá pra só usar LARGURA_CORPO/ALTURA_MINIMA direto (como o irise-poses-refazer.py
faz): as fotos do Ali têm o corpo mais estreito em relação à altura do que as de outros
personagens, então `max(LARGURA_CORPO/largura, ALTURA_MINIMA/altura)` zoomava demais e cortava
no início da coxa (achado pelo Alysson, 20/10/2026, comparando com o Bento). A correção usa a
razão corpo-visível/largura-da-cabeça MEDIDA no Bento (`RAZAO_CORPO_CABECA`) pra calibrar a
escala do Ali direto, em vez de confiar nos alvos de largura/altura fixos.

Uso: python3 scripts/irise-ali-refazer.py <pose1.webp> <pose2.webp> <pose3.webp> <pose4.webp>
     <pose5.webp> <pose6.webp>
  (sem fundo, nessa ordem: mão no peito, comemorando, preocupado, acolhendo, piscadinha, apoio)

Gera em assets/irise-personagens/: b<pose>-12.webp, b<pose>-12-escuro.webp e
avatar-card-b<pose>-12.png, e copia a versão clara pra docs/admin/.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "irise-personagens"
ADMIN = ROOT / "docs" / "admin"

W, H = 900, 1380       # canvas do busto do Ali (300 × 460 em 3×)
LARGURA_CORPO = 816    # 272 × 3 — só usado na pose 1 se a medida da cabeça for duvidosa
ALTURA_MINIMA = 1008   # 336 × 3 — idem
TOPO = 12              # 4 × 3
RAZAO_CORPO_CABECA = 4.89  # medido no Bento (personagem 13): altura visível do corpo / largura da cabeça


def recorte(src: Image.Image) -> Image.Image:
    im = src.convert("RGBA")
    a = np.array(im.getchannel("A"))
    ys, xs = np.where(a > 24)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def largura_cabeca(im: Image.Image) -> int:
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
    """Uma escala só pras poses 2 a 6 (calibrada pela razão corpo/cabeça do Bento); a pose 1
    (busto, enquadramento diferente) ganha a escala que iguala sua cabeça à das outras — a menos
    que a medida da cabeça dela pareça duvidosa (ex.: foto de ângulo/corte muito diferente), caso
    em que cai de volta no alvo de largura/altura fixo."""
    exp = [p for p in srcs if p != 1]
    h_e = float(np.median([largura_cabeca(srcs[p]) for p in exp]))
    s_e = ((H - TOPO) / RAZAO_CORPO_CABECA) / h_e
    h_b = largura_cabeca(srcs[1])
    s_b = s_e * h_e / h_b
    if not (0.7 <= (h_b / h_e) / (srcs[1].width / np.median([srcs[p].width for p in exp])) <= 1.6):
        # medida da cabeça "duvidosa" pra essa foto específica (um fio de cabelo solto acima da
        # cabeça de verdade confunde a faixa de topo). LARGURA_CORPO/ALTURA_MINIMA fixos também
        # zoomavam demais (achado 20/10/2026, pedido do Alysson "se baseie pelas pernas"): essa
        # foto é BEM mais fechada que as outras 5 (corpo quase não aparece, só uma tira de calça
        # bem no fim do recorte), então a única forma de bater com elas é calibrar pelo ponto
        # exato onde a calça aparece. Isso é específico dessa foto da mao-no-peito.webp da v8 —
        # com foto nova, provavelmente a medida de cabeça normal já funciona; conferir visualmente
        # antes de confiar no valor abaixo pra outra foto.
        s_b = 0.5376
    return {1: s_b, **{p: s_e for p in exp}}


def busto(im: Image.Image, s: float) -> Image.Image:
    bw, bh = im.size
    a = np.array(im.getchannel("A")) > 60
    ys = np.where(a.any(1))[0]
    top = ys[0]
    cols = np.where(a[top : top + 6].any(0))[0]
    cx0 = float(cols.mean()) if len(cols) else bw / 2
    nw, nh = round(bw * s), round(bh * s)
    im = im.resize((nw, nh), Image.LANCZOS)
    cx = cx0 * s
    x = round(W / 2 - cx)
    tela = Image.new("RGBA", (W + 2 * nw, H + nh), (0, 0, 0, 0))
    tela.alpha_composite(im, (x + nw, TOPO))
    return tela.crop((nw, 0, nw + W, H))


def escuro(im: Image.Image) -> Image.Image:
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
    """Cartão redondo do avatar com efeito de profundidade (pedido do Alysson, 29/10/2026): além
    da cabeça poder passar por cima da borda (`acima`, já existia), braço/punho erguido também pode
    escapar pelos LADOS do anel — mesma lógica (arco do círculo + faixa de altura + sombra suave
    nos pixels que escaparam), só que na horizontal. Sem gesto largo (a maioria das poses), as
    janelas de escape nunca são alcançadas e o resultado é igual ao de antes."""
    cw, ch, cx, cy, r = 216, 281, 107.5, 172.0, 96.5
    c = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    c.paste(ANEL, (-2, 62), ANEL)
    fig = esc.resize((228, round(228 * H / W)), Image.LANCZOS)
    camada = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    camada.paste(fig.crop((6, 0, 6 + cw, ch)), (0, 0))
    yy, xx = np.mgrid[0:ch, 0:cw]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    disco = np.clip(r + 0.5 - d, 0, 1)
    arco = cy - np.sqrt(np.clip(r ** 2 - (xx - cx) ** 2, 0, None))
    acima = np.clip((arco + 2 - yy), 0, 1) * np.clip((cy - r + 14 - yy) / 3, 0, 1)
    acima *= np.clip((58 - np.abs(xx - cx)) / 4, 0, 1)
    # escape lateral: faixa de altura por volta do ombro/punho erguido
    y_banda, meia_banda = cy - r * 0.42, r * 0.62
    arco_dir = cx + np.sqrt(np.clip(r ** 2 - (yy - cy) ** 2, 0, None))
    arco_esq = cx - np.sqrt(np.clip(r ** 2 - (yy - cy) ** 2, 0, None))
    banda = np.clip((meia_banda - np.abs(yy - y_banda)) / 10, 0, 1)
    lado_dir = np.clip((xx - (arco_dir - 2)) / 3, 0, 1) * banda
    lado_esq = np.clip(((arco_esq + 2) - xx) / 3, 0, 1) * banda
    mscr = np.maximum(np.maximum(disco, acima), np.maximum(lado_dir, lado_esq))
    al = np.array(camada.getchannel("A")).astype(float) * mscr
    rot, _ = ndimage.label(al > 8)
    miolo = set(np.unique(rot[(d < r - 4) & (al > 8)])) - {0}
    al[~np.isin(rot, list(miolo))] = 0
    camada.putalpha(Image.fromarray(al.astype("uint8")))
    # sombra suave só na parte que escapou do disco, pra "flutuar" na frente do anel
    fora = (d > r - 2) & (al > 8)
    sombra_alpha = np.where(fora, al * 0.55, 0).astype("uint8")
    sombra = Image.new("RGBA", (cw, ch), (10, 12, 20, 0))
    sombra.putalpha(Image.fromarray(sombra_alpha).filter(ImageFilter.GaussianBlur(3)))
    deslocada = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    deslocada.alpha_composite(sombra, (2, 3))
    c.alpha_composite(deslocada)
    c.alpha_composite(camada)
    return c


if __name__ == "__main__":
    if len(sys.argv) != 7:
        raise SystemExit(__doc__)
    srcs = {p: recorte(Image.open(sys.argv[p])) for p in range(1, 7)}
    esc = escalas(srcs)
    for p in srcs:
        claro = busto(srcs[p], esc[p])
        escuro_im = escuro(claro)
        claro.save(OUT / f"b{p}-12.webp", quality=92, method=4)
        escuro_im.save(OUT / f"b{p}-12-escuro.webp", quality=90, method=4)
        cartao(escuro_im).save(OUT / f"avatar-card-b{p}-12.png", optimize=True)
        nome_admin = "irise-12.webp" if p == 1 else f"irise-12-{p}.webp"
        claro.save(ADMIN / nome_admin, quality=92, method=4)
        print("ok", p, round(esc[p], 4))
