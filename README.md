# Iceberg

## Requirements
Node.js 18 or newer, plus npm.

## Run
1. npm install
2. npm run dev
3. Open the localhost URL it prints

The included .env holds the public Supabase URL and anon key this build used.
Swap them if you point the app at a different project.

## Build
npm run build
npm run preview

## AI
Decompositions run through the Supabase Edge Functions in supabase/functions/.
Deploy them with the Supabase CLI, then either set INTEGRATIONS_API_KEY or
configure an external provider from the in-app developer panel
(hold both Shift keys to reveal it).

## History
history.json holds your past queries, most recent first.
