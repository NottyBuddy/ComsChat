# ComsChat

Private, number-free company messaging for teams.

## Product rules

- Employees belong to exactly one team.
- Employees sign in with a company-issued Employee ID and a temporary password; first sign-in must force a password change.
- Employee workspace has three areas: Personal Chat, Group Chat and Admin Chat.
- Personal Chat is employee-to-employee and text-only.
- Group Chat and Admin Chat support text, images, video, voice notes and documents.
- Team admins can review only employee-to-employee personal conversations in their assigned teams. Group and Admin conversations are not included in this monitoring view.
- Team admins and sub-admins can manage employee accounts and reset passwords, but cannot delete employee IDs.
- Super Admin controls admin accounts, team assignments and role grants. An admin can be assigned to multiple teams; sub-admin rights are scoped per team.
- All access boundaries must be enforced server-side / in database policies, not only in the UI.

## Current status

This repository currently contains the initial responsive UI scaffold only. Login, messaging, file uploads, roles, permissions and monitoring are **not connected to a backend yet**. Do not use real employee data in this preview.

## Development

Requirements: Node.js 20+

```bash
npm install
npm run dev
npm run build
```

## Planned backend

The intended low-cost architecture is Supabase Auth + Postgres + Realtime + Storage, subject to free-tier limits. Employee IDs will be login identifiers mapped to internal auth identities; passwords will never be stored in application tables or exposed to admins. Database migrations and Row Level Security policies must be implemented and tested before real use.

## Environment

No secrets belong in Git. Add local values to `.env.local` and keep it untracked. A public repository must never contain Supabase service-role keys, database passwords or employee credentials.
