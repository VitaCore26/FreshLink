#!/bin/bash

echo "🔍 SYNTAX VALIDATION OF CORRECTED FILES"
echo "=========================================="
echo ""

FILES=(
  "app/api/data/upsert/route.ts"
  "app/api/auth/signin/route.ts"
  "app/api/admin/verify/route.ts"
  "app/api/health/route.ts"
  "app/admin/users/page.tsx"
  "lib/store.ts"
  "lib/auth/supabaseAuth.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(wc -l < "$file")
    BRACES_OPEN=$(grep -o '{' "$file" | wc -l)
    BRACES_CLOSE=$(grep -o '}' "$file" | wc -l)
    
    if [ "$BRACES_OPEN" -eq "$BRACES_CLOSE" ]; then
      STATUS="✅"
    else
      STATUS="⚠️ "
    fi
    
    echo "$STATUS $file ($SIZE lines, braces: $BRACES_OPEN/$BRACES_CLOSE)"
  else
    echo "❌ $file (NOT FOUND)"
  fi
done
