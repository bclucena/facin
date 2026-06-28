#!/bin/bash
# Verifica se os dois schemas Prisma do monorepo estão em sincronia.
# Retorna exit code 1 se houver divergência.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$WEB_DIR")")"

DB_SCHEMA="$ROOT_DIR/packages/db/prisma/schema.prisma"
WEB_SCHEMA="$WEB_DIR/prisma/schema.prisma"

if ! diff -q "$DB_SCHEMA" "$WEB_SCHEMA" > /dev/null 2>&1; then
  echo ""
  echo "ERRO: Os schemas Prisma estão divergentes!"
  echo ""
  echo "  packages/db/prisma/schema.prisma"
  echo "  apps/web/prisma/schema.prisma"
  echo ""
  echo "Diferenças:"
  diff "$DB_SCHEMA" "$WEB_SCHEMA"
  echo ""
  echo "Sincronize os schemas antes de continuar."
  exit 1
else
  echo "OK: Schemas Prisma em sincronia."
  exit 0
fi
