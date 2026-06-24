#!/usr/bin/env bash
# Ferox — lokalno pokretanje
# Korišćenje: ./run.sh            (dev server, http://localhost:3000)
#             ./run.sh build      (production build)
#             ./run.sh start       (production server, posle build-a)
set -euo pipefail

cd "$(dirname "$0")"

# .env.local provera
if [ ! -f .env.local ]; then
  echo "⚠️  Nedostaje .env.local — kopiram primer iz CLAUDE.md varijabli."
  echo "    Popuni SUPABASE_SERVICE_ROLE_KEY i ANTHROPIC_API_KEY pre pokretanja."
  cat > .env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://scwsifonygvfxiixaiak.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DLpcNCKEMKoUIHrL1pzDKA_ftfNdn9T
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
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
