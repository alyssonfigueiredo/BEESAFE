#!/usr/bin/env python3
"""Monta o protótipo navegável do app inteiro num arquivo só.

Uso:  python3 scripts/prototipo-app.py
Lê docs/prototipo-app.html (o molde), os dados das conquistas e dos níveis (src/lib/medals.ts e
src/lib/niveis.ts) e os ícones 3D (assets/medalhas, assets/niveis), e grava docs/Irisa-prototipo-app.html
com tudo embutido (abre sozinho, sem internet além das fontes).
"""
import base64
import io
import json
import re
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
LADO = 192


def uri(png: Path) -> str:
    im = Image.open(png).convert("RGBA").resize((LADO, LADO), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=82, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def campo(bloco: str, nome: str):
    m = re.search(rf'\n\s+{nome}: "((?:[^"\\]|\\.)*)"', bloco)
    return m.group(1) if m else None


def medalhas():
    src = (RAIZ / "src/lib/medals.ts").read_text()
    corpo = src[src.index("export const MEDALHAS"):src.index("export const getMedalha")]
    out = []
    for bloco in re.findall(r"\{\s*\n\s+id: .*?\n\s+story: [^\n]+\n", corpo, re.S):
        flex = re.search(r'flex: \[([^\]]+)\]', bloco)
        out.append({
            "id": campo(bloco, "id"), "t": campo(bloco, "t"), "cat": campo(bloco, "cat"),
            "cond": campo(bloco, "cond"), "copy": campo(bloco, "copy"), "story": campo(bloco, "story"),
            "flex": json.loads("[" + flex.group(1) + "]") if flex else None,
        })
    ordem = re.findall(r'"([a-z-]+)"', src[src.index("export const LANCAMENTO"):].split("];")[0])
    return out, ordem


def niveis():
    src = (RAIZ / "src/lib/niveis.ts").read_text()
    corpo = src[src.index("const TEXTO"):].split("];")[0]
    out = []
    for bloco in re.findall(r"\{\s*\n\s+f: .*?\n\s+s: [^\n]+\n", corpo, re.S):
        f = json.loads(re.search(r"f: (\[[^\]]+\])", bloco).group(1))
        out.append({"f": f, "g": int(re.search(r"g: (\d+)", bloco).group(1)),
                    "t": campo(bloco, "t"), "s": campo(bloco, "s")})
    return out


def main():
    meds, ordem = medalhas()
    img = {p.stem: uri(p) for p in sorted((RAIZ / "assets/medalhas").glob("*.png"))}
    nimg = [uri(RAIZ / f"assets/niveis/nivel-{i}.png") for i in range(8)]
    dados = {"medalhas": meds, "ordem": ordem, "niveis": niveis(), "img": img, "nimg": nimg}
    molde = (RAIZ / "docs/prototipo-app.html").read_text()
    js = "const DADOS = " + json.dumps(dados, ensure_ascii=False) + ";"
    final = molde.replace("/*__DADOS__*/", js)
    destino = RAIZ / "docs/Irisa-prototipo-app.html"
    destino.write_text(final)
    print(f"{len(meds)} medalhas, {len(dados['niveis'])} níveis, {destino.stat().st_size // 1024} KB → {destino}")
    # Proposta "Quero ir" (06/10/2026): o mesmo protótipo com o coração ligado, abrindo em Lugares.
    fav = RAIZ / "docs/Irisa-prototipo-quero-ir.html"
    fav.write_text(final.replace("/*__FAV__*/false", "true").replace("<title>Irisa · protótipo</title>", "<title>Irisa · Quero ir</title>"))
    print(f"proposta Quero ir → {fav}")


if __name__ == "__main__":
    main()
