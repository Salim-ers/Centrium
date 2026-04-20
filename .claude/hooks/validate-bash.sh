#!/usr/bin/env bash
# Hook pré-exécution bash : bloque les commandes dangereuses.
# Configuré dans .claude/settings.json (hooks.PreToolUse sur Bash)

set -euo pipefail

COMMAND="${CLAUDE_TOOL_INPUT_command:-}"

# Patterns dangereux
BLOCKED_PATTERNS=(
  'rm -rf /'
  'rm -rf /*'
  'rm -rf \$HOME'
  'rm -rf ~'
  'mkfs'
  ':(){:|:&};:'          # fork bomb
  'dd if=/dev/zero'
  '> /dev/sda'
  'chmod -R 777 /'
  'curl.*\|.*sudo.*sh'
  'wget.*\|.*sudo.*sh'
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "🛑 Commande bloquée par validate-bash.sh : pattern \"$pattern\"" >&2
    exit 1
  fi
done

# Forcer lint/type-check avant certains git commits
if echo "$COMMAND" | grep -qE 'git commit'; then
  echo "⚠️  Rappel : lance 'npm run lint && npm run type-check' avant de committer."
fi

exit 0
