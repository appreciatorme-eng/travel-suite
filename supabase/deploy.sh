#!/bin/bash

# Deployment script for Travel Suite Supabase Edge Functions
# Usage: ./deploy.sh [function-name]

FUNCTION_NAME=${1:-send-notification}

echo "🚀 Deploying function: $FUNCTION_NAME..."

# Check if logged in
supabase status > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Error: Not logged into Supabase CLI or not in a Supabase project."
    echo "Please run 'supabase login' and 'supabase link --project-ref <project-id>' first."
    exit 1
fi

# Deploy function
supabase functions deploy "$FUNCTION_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "⚠️  Remember to set your environment variables if you haven't already:"
    echo "supabase secrets set FIREBASE_PROJECT_ID=your-project-id"
    echo "supabase secrets set FIREBASE_SERVICE_ACCOUNT='$(cat /path/to/service-account.json)'"
else
    echo "❌ Deployment failed."
    exit 1
fi
