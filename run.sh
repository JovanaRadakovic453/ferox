#!/usr/bin/env bash
# Ferox — lokalno pokretanje
# Korišćenje: ./run.sh            (dev server, http://localhost:3000)
#             ./run.sh build      (production build)
#             ./run.sh start       (production server, posle build-a)
set -euo pipefail

cd "$(dirname "$0")"

# .env.local provera
if [ ! -f .env.local ]; then
  echo "⚠️  Nedostaje .env.local — kopiram šablon iz .env.example."
  echo "    Popuni vrednosti (bar Supabase URL/ključ) pre pokretanja."
  cp .env.example .env.local
fi

# Instaliraj zavisnosti ako fale
if [ ! -d node_modules ]; then
  echo "📦 Instaliram zavisnosti..."
  npm install
fi

cmd="${1:-dev}"

case "$cmd" in
  dev)   echo "🚀 Dev server → http://localhost:3000"; npm run dev ;;
  build) echo "🏗️  Production build..."; npm run build ;;
  start) echo "▶️  Production server → http://localhost:3000"; npm run start ;;
  *)     echo "Nepoznata komanda: $cmd (koristi: dev | build | start)"; exit 1 ;;
esac
