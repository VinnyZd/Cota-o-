#!/usr/bin/env bash
# Roda o bot localmente: instala dependências, carrega o .env e inicia.
set -e
cd "$(dirname "$0")"
[ -f .env ] || { cp .env.example .env; echo "Criei o .env. Preencha (STEAM_*, etc.) e rode de novo."; exit 0; }
[ -d node_modules ] || npm install
set -a; . ./.env; set +a
exec node src/index.js
