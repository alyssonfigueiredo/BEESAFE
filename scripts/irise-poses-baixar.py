"""Baixa fotos de personagem do irise que já estão no Storage (o que o painel mostra).

Contraparte do irise-poses-upload.py. O bucket `irise` é de leitura pública, então não
precisa de chave nenhuma — só a URL pública.

Uso: python3 scripts/irise-poses-baixar.py <n> [pasta_destino] [pose ...]
  n = id do personagem
  pasta_destino = onde salvar (padrão: pasta atual)
  pose = uma ou mais poses (0 a 6); sem nenhuma, baixa as 7
"""
import sys
from pathlib import Path

import requests

SUPABASE_URL = "https://ntjirpqulrnieeglpiei.supabase.co"


def baixar(n: str, pose: str, destino: Path):
    url = f"{SUPABASE_URL}/storage/v1/object/public/irise/{n}/{pose}.webp"
    r = requests.get(url, timeout=30)
    if r.status_code != 200:
        print(f"falhou  irise/{n}/{pose}.webp  HTTP {r.status_code}")
        return
    caminho = destino / f"{n}-{pose}.webp"
    caminho.write_bytes(r.content)
    print(f"ok  {caminho}  ({len(r.content)} bytes)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    n = sys.argv[1]
    resto = sys.argv[2:]
    if resto and not resto[0].isdigit():
        destino = Path(resto[0])
        poses = resto[1:]
    else:
        destino = Path(".")
        poses = resto
    destino.mkdir(parents=True, exist_ok=True)
    if not poses:
        poses = [str(p) for p in range(7)]
    for pose in poses:
        baixar(n, pose, destino)
