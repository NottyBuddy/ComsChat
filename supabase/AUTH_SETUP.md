# Supabase Auth foundation

- Login identifiers map to synthetic emails: `<ID>@comschat.invalid`. No personal email or phone is collected.
- Only Supabase publishable/anon credentials belong in Vite client variables. Never expose a service-role key.
- Apply migrations in order: 0001, 0002, then 0003.
- Configure Supabase Auth email confirmation OFF for the ID/password-only flow, because synthetic emails cannot receive confirmation mail.
- The first Super Admin bootstrap RPC is limited to fixed ID `HRH-CA-27558` and only runs if no Super Admin profile exists.
- Admin/employee accounts must be provisioned by a trusted server-side function; public signup and client-side profile inserts must not be used.

Auth UI and data/realtime/storage integration are separate implementation steps; do not use the existing local-storage demo as production data.
