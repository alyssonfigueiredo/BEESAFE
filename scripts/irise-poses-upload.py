"""Sobe fotos de personagem do irise pro Storage sem precisar do painel web.

Caminho alternativo pra quando não dá pra clicar no painel (ex.: sessão sem navegador):
faz exatamente o que o `paraWebp` do docs/admin/admin.js faz no navegador (mesma escala,
mesmo centro pela cabeça, mesmo tamanho de tela) e sobe pro bucket `irise` pela
API do Storage com a chave de serviço — nunca colada em chat, só como secret do GitHub
Actions (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, os mesmos de `importar-cidade.yml`).

Uso: python3 scripts/irise-poses-upload.py <n> <pose>:<arquivo>[:raw] [<pose>:<arquivo> ...]
  n = id do personagem (o mesmo número da tabela irise_personagens)
  pose = 0 (corpo inteiro) a 6; arquivo = caminho do .webp/.png sem fundo
  (os pares pose:arquivo também podem vir todos juntos num argumento só, separados
  por espaço ou quebra de linha — como chega do campo multilinha do GitHub Actions)
  ":raw" no final sobe o arquivo direto, sem recortar/escalar — pra quando o arquivo
  já É o busto pronto (900×1380), como os personagens embutidos no app (Ali): usado pra
  destravar o Storage ficar igual ao que está no repositório, sem reprocessar de novo.

Precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.
"""
import os
import sys

import numpy as np
import requests
from PIL import Image

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
K = 3  # igual ao BUSTO_K do admin.js


def bbox(im: Image.Image):
    a = np.array(im.getchannel("A"))
    ys, xs = np.where(a > 24)
    if len(xs) == 0:
        raise ValueError("imagem vazia (toda transparente)")
    return xs.min(), ys.min(), xs.max(), ys.max()


def centro_cabeca(a_bool: np.ndarray, x0: int, x1: int, faixa_y0: int, faixa_y1: int) -> float:
    """Centro horizontal da cabeça (faixa de cima do recorte), igual ao admin.js: nunca
    pelo meio do recorte inteiro, que descentraliza quando um braço se estende de um
    lado só (achado pelo Alysson, 20/10/2026)."""
    sub = a_bool[faixa_y0:faixa_y1, x0 : x1 + 1]
    cols = np.where(sub.any(0))[0]
    return float(cols.mean()) if len(cols) else (x1 - x0) / 2


def busto(im: Image.Image) -> Image.Image:
    a = np.array(im.getchannel("A")) > 24
    x0, y0, x1, y1 = bbox(im)
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    # cresce até PREENCHER a caixa de 272 × 410 (o maior dos dois fatores vence), igual
    # ao admin.js: a figura vai até a borda (um braço bem estendido pode perder a ponta
    # pro corte do quadro), nunca fica menor com sobra vazia embaixo (padrão confirmado
    # pelo Alysson comparando com o Léo, que preenche 100% da altura, 20/10/2026). Altura
    # subida de 340 pra 410 no mesmo dia: com 340, poses de gesto bem aberto (Acolhendo,
    # Apoio) nunca venciam o suficiente pra encostar embaixo.
    s = max((272 * K) / bw, (410 * K) / bh)
    dw, dh = round(bw * s), round(bh * s)
    faixa = max(8, round(bh / 8))
    cx = centro_cabeca(a, x0, x1, y0, y0 + faixa) * s
    recorte = im.crop((x0, y0, x1 + 1, y1 + 1)).resize((dw, dh), Image.LANCZOS)
    tela = Image.new("RGBA", (300 * K, 460 * K), (0, 0, 0, 0))
    tela.alpha_composite(recorte, (round(150 * K - cx), 4 * K))
    return tela


def corpo_inteiro(im: Image.Image) -> Image.Image:
    x0, y0, x1, y1 = bbox(im)
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    s = min(1, 1600 / bh)
    recorte = im.crop((x0, y0, x1 + 1, y1 + 1))
    if s < 1:
        recorte = recorte.resize((round(bw * s), round(bh * s)), Image.LANCZOS)
    return recorte


def upload(n: str, pose: str, caminho: str, raw: bool = False):
    if not SUPABASE_URL or not SERVICE_KEY:
        raise SystemExit("faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no ambiente")
    if raw:
        with open(caminho, "rb") as f:
            data = f.read()
    else:
        im = Image.open(caminho).convert("RGBA")
        out = corpo_inteiro(im) if pose == "0" else busto(im)
        buf = __import__("io").BytesIO()
        out.save(buf, format="WEBP", quality=92, method=4)
        data = buf.getvalue()
    if len(data) > 2 * 1024 * 1024:
        raise SystemExit(f"{caminho}: ficou com mais de 2 MB convertido ({len(data)} bytes)")
    url = f"{SUPABASE_URL}/storage/v1/object/irise/{n}/{pose}.webp"
    r = requests.post(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "apikey": SERVICE_KEY,
            "Content-Type": "image/webp",
            "x-upsert": "true",
        },
        timeout=30,
    )
    if r.status_code >= 300:
        raise SystemExit(f"{caminho} -> {url}: HTTP {r.status_code} {r.text}")
    print(f"ok  irise/{n}/{pose}.webp  <-  {caminho}  ({len(data)} bytes)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    n = sys.argv[1]
    itens = " ".join(sys.argv[2:]).split()
    for item in itens:
        pose, _, resto = item.partition(":")
        if not resto:
            raise SystemExit(f"argumento inválido (esperado pose:arquivo): {item}")
        raw = resto.endswith(":raw")
        caminho = resto[: -len(":raw")] if raw else resto
        upload(n, pose, caminho, raw=raw)
