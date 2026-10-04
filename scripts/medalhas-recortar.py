#!/usr/bin/env python3
"""Recorta os ícones 3D das conquistas a partir das folhas (5 objetos por folha, fundo branco).

Uso:  python3 scripts/medalhas-recortar.py
Lê assets/medalhas/folhas/folha-N.(webp|png|jpg) e grava assets/medalhas/<id>.png (transparente, 384 px).
A ordem dos ids em FOLHAS é a ordem dos objetos na folha, da esquerda para a direita.

Fundo: tudo que é claro e quase sem cor e encosta na borda da folha sai (inclui a sombra suave
embaixo do objeto). A borda do recorte é suavizada para não ficar serrilhada.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "assets" / "medalhas"
LADO = 384

FOLHAS = {
    1: ["deu-o-nome", "deu-close", "figurinha", "famosinha", "influ-do-vale"],
    2: ["utilidade-publica", "interesse-municipal", "aclamada", "favorita", "icone-local"],
    3: ["lenda-local", "mala-pronta", "inaugurou", "acendeu-a-luz", "eu-conheco"],
    4: ["pode-entrar", "sabe-onde-ir", "nome-na-lista", "da-casa", "bateu-ponto"],
    5: ["ja-mora-aqui", "serviu-tudo", "agenda-cheia", "ombro-amigo", "bateu-leque"],
    6: ["rede-de-apoio", "olho-vivo", "abre-alas", "patrimonio-cultural", "patrimonio-tombado"],
    7: ["dona-do-pedaco", "resenha-boa", "cartografa", "abraco-coletivo", "tem-opiniao"],
}


def fundo(rgb: np.ndarray) -> np.ndarray:
    """Máscara do fundo: claro, pouco saturado e ligado à borda."""
    mx = rgb.max(axis=2).astype(int)
    mn = rgb.min(axis=2).astype(int)
    candidato = (mn > 200) & (mx - mn < 16)
    rot, _ = ndimage.label(candidato)
    borda = np.unique(np.concatenate([rot[0], rot[-1], rot[:, 0], rot[:, -1]]))
    borda = borda[borda != 0]
    return np.isin(rot, borda)


def grupos(obj: np.ndarray, n: int) -> list[tuple[int, int, int, int]]:
    """Os n objetos da folha: as maiores manchas viram âncoras (da esquerda para a direita) e os
    pedaços soltos (pétalas, brilhos, alça) entram na âncora que encostam ou na mais perto."""
    rot, nrot = ndimage.label(obj)
    objs = ndimage.find_objects(rot)
    areas = ndimage.sum(obj, rot, range(1, nrot + 1))
    ordem = sorted(range(nrot), key=lambda i: -areas[i])
    ancoras: list[list[int]] = []  # [x0, x1, y0, y1]
    for i in ordem:
        sy, sx = objs[i]
        caixa = [sx.start, sx.stop, sy.start, sy.stop]
        cx = (caixa[0] + caixa[1]) / 2
        dentro = [a for a in ancoras if a[0] - 8 <= cx <= a[1] + 8]
        if dentro:
            alvo = dentro[0]
        elif len(ancoras) < n:
            ancoras.append(caixa)
            continue
        else:
            alvo = min(ancoras, key=lambda a: abs((a[0] + a[1]) / 2 - cx))
        alvo[0], alvo[1] = min(alvo[0], caixa[0]), max(alvo[1], caixa[1])
        alvo[2], alvo[3] = min(alvo[2], caixa[2]), max(alvo[3], caixa[3])
    # Dois objetos colados por sombra ou brilho viram uma mancha só: corta a mais larga na coluna
    # mais vazia do miolo até dar n.
    while len(ancoras) < n:
        larga = max(ancoras, key=lambda a: a[1] - a[0])
        x0, x1, y0, y1 = larga
        dens = obj[y0:y1, x0:x1].sum(axis=0)
        w = x1 - x0
        meio = dens[int(w * 0.25) : int(w * 0.75)]
        corte = x0 + int(w * 0.25) + int(np.argmin(meio))
        ancoras.remove(larga)
        for a0, a1 in ((x0, corte), (corte, x1)):
            ys = np.where(obj[:, a0:a1].any(axis=1))[0]
            ancoras.append([a0, a1, int(ys[0]), int(ys[-1]) + 1])
    ancoras.sort(key=lambda a: a[0])
    return [tuple(a) for a in ancoras]


def recortar(arquivo: Path, ids: list[str]):
    im = Image.open(arquivo).convert("RGB")
    rgb = np.asarray(im)
    bg = fundo(rgb)
    obj = ~bg
    # tira ruído: só componentes com área razoável
    rot, nrot = ndimage.label(obj)
    areas = ndimage.sum(obj, rot, range(1, nrot + 1))
    keep = np.isin(rot, [i + 1 for i, a in enumerate(areas) if a > 60])
    obj = keep
    alpha = Image.fromarray((obj * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(1.1))
    rgba = im.copy()
    rgba.putalpha(alpha)
    gs = grupos(obj, len(ids))
    if len(gs) != len(ids):
        raise SystemExit(f"{arquivo.name}: achei {len(gs)} objetos, esperava {len(ids)}")
    for (x0, x1, y0, y1), mid in zip(gs, ids):
        # outro objeto pode invadir a caixa (alça, pétala): zera o alfa do que não é desta âncora
        peca = rgba.crop((x0, y0, x1, y1))
        w, h = peca.size
        lado = int(max(w, h) * 1.08)
        tela = Image.new("RGBA", (lado, lado), (255, 255, 255, 0))
        tela.paste(peca, ((lado - w) // 2, (lado - h) // 2), peca)
        tela = tela.resize((LADO, LADO), Image.LANCZOS)
        tela.save(PASTA / f"{mid}.png", optimize=True)
        print(f"{mid}: {w}x{h}")


def main():
    for n, ids in FOLHAS.items():
        cand = [p for p in (PASTA / "folhas").glob(f"folha-{n}.*")]
        if not cand:
            print(f"folha {n}: arquivo não encontrado, pulei")
            continue
        recortar(cand[0], ids)


if __name__ == "__main__":
    main()
