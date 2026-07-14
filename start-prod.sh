#!/usr/bin/env bash
# Start the production Express server (node server.mjs) with credentials
# sourced from the workspace .env file.
#
# Usage (from the site/ directory):
#   ./start-prod.sh
#   PORT=8080 ./start-prod.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env"
KEY_FILE="$SCRIPT_DIR/../secrets/jwt-key.pem"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[start-prod] ERROR: workspace .env not found at $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$KEY_FILE" ]]; then
  echo "[start-prod] ERROR: JWT private key not found at $KEY_FILE" >&2
  exit 1
fi

# Extract LUMINUS_* vars from the workspace .env (last assignment wins for dupes)
_val() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- ; }

export SF_INSTANCE_URL="$(_val LUMINUS_INSTANCE_URL)"
export SF_CDP_URL="$(_val LUMINUS_CDP_TENANT_URL)"
export SF_CLIENT_ID="$(_val LUMINUS_CLIENT_ID)"
export SF_USERNAME="epic.out.6663ec9f3a0f@orgfarm.salesforce.com"
export SF_PRIVATE_KEY="$(cat "$KEY_FILE")"

if [[ -z "$SF_INSTANCE_URL" || -z "$SF_CDP_URL" || -z "$SF_CLIENT_ID" ]]; then
  echo "[start-prod] ERROR: one or more LUMINUS_* vars are blank in $ENV_FILE" >&2
  exit 1
fi

echo "[start-prod] org:  $SF_INSTANCE_URL"
echo "[start-prod] cdp:  $SF_CDP_URL"
echo "[start-prod] user: $SF_USERNAME"
echo "[start-prod] port: ${PORT:-8080}"
echo ""

cd "$SCRIPT_DIR"
exec node --max-http-header-size=65536 server.mjs
