#!/usr/bin/env bash
# Carga de dados no banco de PRODUÇÃO: bandas (catalog:seed), capas, fotos (images:seed) e, se pedido,
# a playlist de clipes (clips:seed). Pode ser repetida: nada é duplicado.
#
#   backend/scripts/carga-producao.sh --env-file ~/amplifica-prod.env --dry-run   # só mostra o plano
#   backend/scripts/carga-producao.sh --env-file ~/amplifica-prod.env             # executa
#
# As credenciais ficam num arquivo SÓ SEU (permissão 600), fora do repositório, que você apaga no fim.
# Veja docs/carga-producao.md para saber quais variáveis o arquivo precisa ter.
set -uo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

ENV_FILE=""; DRY_RUN=0; SKIP_MIGRATE=0; SKIP_COVERS=0; SKIP_IMAGES=0; WITH_CLIPS=0
SINCE=""; ONLY=""; CONFIRM_HOST=""; IMAGES_ONLY=0; REPLACE_IMAGES=""; SHOWS_ONLY=0; SHOWS_FILE=""; CLIPS_ONLY=0
UPDATE_SLUGS="antipoetica,aurora-rules,becold"   # já existem em produção: o arquivo manda (--update)
PROD_API="https://amplifica.onrender.com/api/v1"

usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; cat <<'TXT'

Opções:
  --env-file ARQ        arquivo com as variáveis de produção (obrigatório)
  --dry-run             mostra o que seria feito e não toca no banco
  --skip-migrate        não roda as migrations (o Render já roda a cada deploy)
  --skip-covers         não baixa capas do Cover Art Archive
  --skip-images         não grava as fotos do manifesto (band-images.json)
  --images-only         só grava as fotos do manifesto (não mexe nas bandas nem roda migrations)
  --replace-images a,b  troca a foto já existente destas bandas pela do manifesto (use junto de
                        --images-only; as outras fotos ficam como estão)
  --shows-only ARQ      só grava os shows de um arquivo (ex.: prisma/data/shows/2027.json); não mexe
                        nas bandas, nas fotos nem nas migrations
  --clips-only          só grava os clipes fixos da playlist (prisma/data/clips/clips.json); não mexe
                        nas bandas, nas fotos nem nas migrations
  --clips               também roda a carga da playlist de clipes, junto com o resto
  --since REF           só os arquivos de bandas alterados desde o commit/tag REF
  --only a,b,c          só estas bandas (nomes dos arquivos, sem .json)
  --update a,b|all      bandas que já existem em produção e devem ser atualizadas pelo arquivo
                        ("all" vale para todas as escolhidas; padrão: antipoetica,aurora-rules,becold)
  --confirm-host HOST   confirma sem perguntar (para uso sem terminal); deve ser o host do banco
  --api URL             API de produção para a conferência final
TXT
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --skip-migrate) SKIP_MIGRATE=1; shift ;;
    --skip-covers) SKIP_COVERS=1; shift ;;
    --skip-images) SKIP_IMAGES=1; shift ;;
    --images-only) IMAGES_ONLY=1; shift ;;
    --replace-images) REPLACE_IMAGES="${2:-}"; shift 2 ;;
    --shows-only) SHOWS_ONLY=1; SHOWS_FILE="${2:-}"; shift 2 ;;
    --clips-only) CLIPS_ONLY=1; shift ;;
    --clips) WITH_CLIPS=1; shift ;;
    --since) SINCE="${2:-}"; shift 2 ;;
    --only) ONLY="${2:-}"; shift 2 ;;
    --update) UPDATE_SLUGS="${2:-}"; shift 2 ;;
    --confirm-host) CONFIRM_HOST="${2:-}"; shift 2 ;;
    --api) PROD_API="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opção desconhecida: $1" >&2; usage >&2; exit 2 ;;
  esac
done

die() { echo "ERRO: $*" >&2; exit 1; }
host_of() { sed -E 's#^[a-z]+://[^@]*@([^/:?]+).*#\1#' <<<"$1"; }

# ---- 1. Credenciais -----------------------------------------------------------------------------
[[ -n "$ENV_FILE" ]] || die "informe --env-file (veja docs/carga-producao.md)."
[[ -f "$ENV_FILE" ]] || die "arquivo não encontrado: $ENV_FILE"
mode="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || echo 600)"
if [[ "${mode: -2}" != "00" ]]; then
  die "o arquivo $ENV_FILE está legível por outras contas (permissão $mode). Rode: chmod 600 $ENV_FILE"
fi

# O ambiente do shell não pode vazar para a produção: só vale o que está no arquivo.
for var in DATABASE_URL DATABASE_URL_UNPOOLED JWT_ACCESS_SECRET NODE_ENV STORAGE_S3_ENDPOINT \
  STORAGE_S3_BUCKET STORAGE_S3_ACCESS_KEY_ID STORAGE_S3_SECRET_ACCESS_KEY STORAGE_PUBLIC_URL; do
  unset "$var"
done
set -a; # shellcheck disable=SC1090
source "$ENV_FILE"; set +a

[[ "${DATABASE_URL:-}" == postgresql://* ]] || die "DATABASE_URL ausente ou fora do formato postgresql://"
export NODE_ENV=production
PROD_HOST="$(host_of "$DATABASE_URL")"

# O banco de desenvolvimento nunca pode ser o alvo por engano.
if [[ -f .env ]]; then
  DEV_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')"
  if [[ -n "$DEV_URL" && "$(host_of "$DEV_URL")" == "$PROD_HOST" ]]; then
    die "o banco do arquivo ($PROD_HOST) é o MESMO do backend/.env (desenvolvimento). Confira as credenciais."
  fi
fi

HAVE_STORAGE=1
for var in STORAGE_S3_ENDPOINT STORAGE_S3_BUCKET STORAGE_S3_ACCESS_KEY_ID STORAGE_S3_SECRET_ACCESS_KEY STORAGE_PUBLIC_URL; do
  [[ -n "${!var:-}" ]] || HAVE_STORAGE=0
done
if [[ $HAVE_STORAGE -eq 0 ]]; then
  echo "AVISO: o armazenamento de imagens (STORAGE_*) não está completo no arquivo: capas e fotos serão puladas."
  SKIP_COVERS=1; SKIP_IMAGES=1
fi
[[ $SKIP_MIGRATE -eq 1 || -n "${DATABASE_URL_UNPOOLED:-}" ]] || die "para as migrations, o arquivo precisa de DATABASE_URL_UNPOOLED (ou use --skip-migrate)."
[[ -n "${JWT_ACCESS_SECRET:-}" ]] || export JWT_ACCESS_SECRET="carga-sem-login-$(date +%s)-xxxxxxxxxxxxxxxxxxxx"

# ---- 2. Quais bandas ----------------------------------------------------------------------------
declare -a FILES=()
if [[ $CLIPS_ONLY -eq 1 ]]; then
  [[ -f prisma/data/clips/clips.json ]] || die "não achei prisma/data/clips/clips.json."
  SKIP_MIGRATE=1; SKIP_IMAGES=1; SKIP_COVERS=1; IMAGES_ONLY=1; WITH_CLIPS=1
elif [[ $SHOWS_ONLY -eq 1 ]]; then
  [[ -n "$SHOWS_FILE" && -f "$SHOWS_FILE" ]] || die "--shows-only exige um arquivo existente (ex.: prisma/data/shows/2027.json)."
  SKIP_MIGRATE=1; SKIP_IMAGES=1; SKIP_COVERS=1; IMAGES_ONLY=1
elif [[ $IMAGES_ONLY -eq 1 ]]; then
  SKIP_MIGRATE=1; SKIP_IMAGES=0
  [[ $HAVE_STORAGE -eq 1 ]] || die "--images-only exige as cinco variáveis STORAGE_* no arquivo."
elif [[ -n "$ONLY" ]]; then
  IFS=',' read -ra names <<<"$ONLY"
  for n in "${names[@]}"; do
    [[ -f "prisma/data/$n.json" ]] || die "não existe prisma/data/$n.json"
    FILES+=("prisma/data/$n.json")
  done
elif [[ -n "$SINCE" ]]; then
  while IFS= read -r f; do
    f="${f#backend/}"; [[ "$f" =~ ^prisma/data/[^/]+\.json$ && -f "$f" ]] && FILES+=("$f")
  done < <(git diff --name-only --diff-filter=AMR "$SINCE" -- prisma/data | sort)
else
  while IFS= read -r f; do FILES+=("$f"); done < <(ls prisma/data/*.json | sort)
fi
[[ $IMAGES_ONLY -eq 1 || ${#FILES[@]} -gt 0 ]] || die "nenhum arquivo de banda para carregar."

TS="$(date +%Y%m%d-%H%M%S)"; LOG="${TMPDIR:-/tmp}/carga-producao-$TS.log"

echo "=== Carga em PRODUÇÃO ==="
echo "Banco (host): $PROD_HOST"
if [[ $CLIPS_ONLY -eq 1 ]]; then echo "Modo: só os clipes fixos da playlist (bandas, fotos e migrations ficam de fora)"; elif [[ $SHOWS_ONLY -eq 1 ]]; then echo "Modo: só os shows de $SHOWS_FILE (bandas, fotos e migrations ficam de fora)"; elif [[ $IMAGES_ONLY -eq 1 ]]; then echo "Modo: só as fotos do manifesto (bandas e migrations ficam de fora)"; else echo "Bandas: ${#FILES[@]} arquivos | atualizar pelo arquivo: ${UPDATE_SLUGS:-nenhuma}"; fi
echo "Trocar fotos de: ${REPLACE_IMAGES:-nenhuma}"
echo "Migrations: $([[ $SKIP_MIGRATE -eq 1 ]] && echo não || echo sim) | Capas: $([[ $SKIP_COVERS -eq 1 ]] && echo não || echo sim) | Fotos do manifesto: $([[ $SKIP_IMAGES -eq 1 ]] && echo não || echo sim) | Clipes: $([[ $WITH_CLIPS -eq 1 ]] && echo sim || echo não)"
echo "Registro: $LOG"
if [[ $DRY_RUN -eq 1 ]]; then
  echo; echo "[dry-run] Nada foi executado."
  [[ $IMAGES_ONLY -eq 1 ]] || { echo "Arquivos que seriam carregados:"; printf '  %s\n' "${FILES[@]}"; }
  exit 0
fi

# ---- 3. Confirmação -----------------------------------------------------------------------------
if [[ -n "$CONFIRM_HOST" ]]; then
  [[ "$CONFIRM_HOST" == "$PROD_HOST" ]] || die "--confirm-host ($CONFIRM_HOST) não bate com o banco ($PROD_HOST)."
else
  echo; read -r -p "Isto grava no banco de PRODUÇÃO. Digite o host acima para continuar: " typed
  [[ "$typed" == "$PROD_HOST" ]] || die "confirmação diferente do host. Nada foi feito."
fi

# ---- 4. Preparo ---------------------------------------------------------------------------------
if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then # shellcheck disable=SC1091
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh" >/dev/null 2>&1; nvm use 24 >/dev/null 2>&1 || true
fi
echo "Compilando…"; npx nest build >>"$LOG" 2>&1 || die "a compilação falhou (veja $LOG)."

FAILED=(); CREATED_A=0; UPDATED_A=0; KEPT_A=0; REL_NEW=0; REL_UPD=0; COVERS=0

if [[ $SKIP_MIGRATE -eq 0 ]]; then
  echo "Migrations…"
  DATABASE_URL="$DATABASE_URL_UNPOOLED" npx prisma migrate deploy --config prisma7.config.ts >>"$LOG" 2>&1 \
    || npx prisma migrate deploy >>"$LOG" 2>&1 || die "as migrations falharam (veja $LOG)."
fi

# ---- 5. Bandas ----------------------------------------------------------------------------------
IFS=',' read -ra upd <<<"$UPDATE_SLUGS"
i=0
for f in "${FILES[@]:-}"; do
  [[ -n "$f" ]] || continue
  i=$((i+1)); slug="$(basename "$f" .json)"; flags=()
  [[ $SKIP_COVERS -eq 0 ]] && flags+=(--covers)
  for u in "${upd[@]}"; do [[ "$u" == "$slug" || "$u" == "all" ]] && { flags+=(--update); break; }; done
  ok=0
  for attempt in 1 2 3; do
    out="$(node dist/scripts/seed-catalog.js "$f" "${flags[@]}" 2>&1)"; code=$?
    echo "--- $f (tentativa $attempt, saída $code)"$'\n'"$out" >>"$LOG"
    if [[ $code -eq 0 ]]; then ok=1; break; fi
    sleep $((attempt * 5))
  done
  if [[ $ok -eq 0 ]]; then FAILED+=("$slug"); printf '[%d/%d] %s: FALHOU\n' "$i" "${#FILES[@]}" "$slug"; continue; fi
  grep -q "criado\." <<<"$out" && CREATED_A=$((CREATED_A+1))
  grep -q "atualizado\." <<<"$out" && UPDATED_A=$((UPDATED_A+1))
  grep -q "mantido\." <<<"$out" && KEPT_A=$((KEPT_A+1))
  n="$(grep -oE 'Lançamentos: [0-9]+ criado' <<<"$out" | grep -oE '[0-9]+' | head -1)"; REL_NEW=$((REL_NEW+${n:-0}))
  c="$(grep -oE 'Capas: [0-9]+ gravada' <<<"$out" | grep -oE '[0-9]+' | head -1)"; COVERS=$((COVERS+${c:-0}))
  printf '[%d/%d] %s ok\n' "$i" "${#FILES[@]}" "$slug"
done

# ---- 6. Fotos e clipes --------------------------------------------------------------------------
if [[ $SKIP_IMAGES -eq 0 ]]; then
  echo "Fotos do manifesto…"
  if [[ -d ../frontend/img/bandasimgaens ]]; then
    img_args=()
    [[ -n "$REPLACE_IMAGES" ]] && img_args=(--replace --only "$REPLACE_IMAGES")
    node dist/scripts/seed-images.js prisma/data/images/band-images.json --dir ../frontend/img/bandasimgaens ${img_args[@]+"${img_args[@]}"} >>"$LOG" 2>&1 \
      && echo "  ok: $(grep -E 'Imagens:' "$LOG" | tail -1)" || { echo "  FALHOU (veja $LOG)"; FAILED+=("images:seed"); }
  else
    echo "  pulado: a pasta frontend/img/bandasimgaens não existe neste computador."
  fi
fi
if [[ $SHOWS_ONLY -eq 1 ]]; then
  echo "Shows de $SHOWS_FILE…"
  show_out="$(node dist/scripts/seed-shows.js "$SHOWS_FILE" 2>&1)"; show_code=$?
  echo "$show_out" >>"$LOG"
  if [[ $show_code -eq 0 ]]; then echo "  ok: $(grep -E 'Shows?:|criado|atualizado|mantido' <<<"$show_out" | tail -2 | tr '\n' ' ')"; else echo "  FALHOU (veja $LOG)"; FAILED+=("shows:seed"); fi
fi
if [[ $WITH_CLIPS -eq 1 ]]; then
  echo "Clipes…"
  node dist/scripts/seed-clips.js prisma/data/clips/clips.json >>"$LOG" 2>&1 && echo "  ok" || { echo "  FALHOU (veja $LOG)"; FAILED+=("clips:seed"); }
fi

# ---- 7. Conferência e resumo --------------------------------------------------------------------
echo; echo "=== Resumo ==="
echo "Artistas: $CREATED_A criados, $UPDATED_A atualizados, $KEPT_A já existiam"
echo "Lançamentos novos: $REL_NEW | Capas gravadas: $COVERS"
if command -v curl >/dev/null; then
  total="$(curl -s -m 60 "$PROD_API/artists?limit=1" | grep -oE '"total":[0-9]+' | head -1 | cut -d: -f2)"
  echo "API de produção responde com ${total:-?} artistas ($PROD_API)"
fi
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "FALHARAM (${#FAILED[@]}): ${FAILED[*]}"
  echo "Para repetir só essas: $0 --env-file $ENV_FILE --only $(IFS=,; echo "${FAILED[*]}")"
  echo "Registro completo: $LOG"; exit 1
fi
echo "Tudo certo. Registro: $LOG"
echo "LEMBRETE: apague o arquivo de credenciais agora: rm $ENV_FILE"
