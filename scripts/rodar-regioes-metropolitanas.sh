#!/usr/bin/env bash
# Roda import-regiao-metropolitana.mjs para as 9 regiões metropolitanas, uma de cada vez.
# Uso (no Mac, dentro da pasta BEESAFE, com .env.scripts já carregado):
#   nohup bash scripts/rodar-regioes-metropolitanas.sh > import-rm.log 2>&1 &
#   disown
set -e
for r in curitiba recife joao-pessoa joinville natal sao-paulo rio salvador porto-alegre \
  belo-horizonte fortaleza brasilia goiania vitoria manaus belem florianopolis sao-luis \
  aracaju maceio cuiaba teresina; do
  echo "=== $r ==="
  node scripts/import-regiao-metropolitana.mjs "$r"
done
