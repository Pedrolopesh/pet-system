#!/usr/bin/env bash
# Varredura básica de dados sensíveis nos arquivos versionados e de dependências vulneráveis.
# Roda localmente (pnpm run security) e no CI. Falha (exit 1) se achar algo.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

fail=0
files=$(git ls-files -co --exclude-standard | grep -v -E '^pnpm-lock\.yaml$|^scripts/security-scan\.sh$')

echo "==> Segredos em arquivos"
secret_re='(npm_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|(password|passwd|secret|token|api[_-]?key)[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"' ]{8,})'
# Linhas com "scan-allow" (dado falso de teste, claramente marcado) são ignoradas.
if echo "$files" | xargs grep -n -I -E -i "$secret_re" 2>/dev/null | grep -v "scan-allow"; then fail=1; fi

echo "==> Arquivos sensíveis versionados"
if echo "$files" | grep -E '(^|/)\.env($|\.)|\.pem$|\.p12$|id_rsa|id_ed25519|credentials' | grep -v -E '\.env\.(example|production)$'; then fail=1; fi

echo "==> IPs e hosts de infraestrutura"
if echo "$files" | xargs grep -n -I -E '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' 2>/dev/null | grep -v -E '127\.0\.0\.1|0\.0\.0\.0|172\.17\.0\.1'; then fail=1; fi

echo "==> Vulnerabilidades em dependências (pnpm audit)"
pnpm audit --prod --audit-level=high || fail=1

if [ "$fail" -ne 0 ]; then echo "FALHOU: revise os itens acima antes de abrir o PR."; exit 1; fi
echo "OK: nada encontrado."
