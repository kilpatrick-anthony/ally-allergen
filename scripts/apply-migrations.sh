#!/bin/bash
# Apply database migrations to Supabase

echo "📊 Applying database migrations..."

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: Missing environment variables"
  echo "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')
echo "🔗 Project: $PROJECT_REF"

# Function to run SQL via Supabase REST API
run_sql() {
  local sql_file=$1
  local sql_content=$(cat "$sql_file")
  
  echo "🔄 Running: $(basename $sql_file)"
  
  curl -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": $(echo "$sql_content" | jq -Rs .)}" \
    --silent --show-error
  
  if [ $? -eq 0 ]; then
    echo "✅ Success: $(basename $sql_file)"
  else
    echo "❌ Failed: $(basename $sql_file)"
  fi
}

# Run migrations in order
cd /workspaces/codespaces-blank/ally-allergen

for migration in supabase/migrations/*.sql; do
  if [ -f "$migration" ]; then
    run_sql "$migration"
    echo ""
  fi
done

echo "🎉 Migration complete!"
echo ""
echo "📝 Next steps:"
echo "1. Go to Supabase Dashboard SQL Editor"
echo "2. Copy and paste each migration file"
echo "3. Run them in order:"
echo "   - 20260124_businesses.sql"
echo "   - 20260124_device_monitoring.sql"
echo "   - 20260125_datasheets.sql"
echo "   - 20260126_user_businesses.sql"
