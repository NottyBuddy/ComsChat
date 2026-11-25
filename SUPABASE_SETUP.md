# Supabase setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. In Supabase Dashboard → SQL Editor, run `supabase/migrations/0001_initial_schema.sql`.
4. Configure Auth providers and redirect URLs before enabling user sign-in.

Important:
- Never put a Supabase service-role/secret key in browser code or Git.
- This migration creates the initial company/team/chat data model and enables RLS.
- Privileged account provisioning and team administration still require trusted server-side functions. Do not use client-side role switches or localStorage as authorization.
- The current `src/App.tsx` remains the local demo UI. This setup alone does not convert it into live multi-user messaging or update the deployed website.
