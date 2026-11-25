create extension if not exists pgcrypto;
create table if not exists public.companies (
 id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now()
);
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 display_name text not null, employee_code text not null,
 role text not null check (role in ('superadmin','admin','subadmin','employee')),
 active boolean not null default true, must_change_password boolean not null default false,
 created_at timestamptz not null default now(), unique(company_id, employee_code)
);
create table if not exists public.teams (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 name text not null, created_at timestamptz not null default now(), unique(company_id,name)
);
create table if not exists public.team_members (
 team_id uuid not null references public.teams(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 team_role text not null check(team_role in ('admin','subadmin','employee')),
 created_at timestamptz not null default now(), primary key(team_id,user_id)
);
create table if not exists public.chats (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 team_id uuid not null references public.teams(id) on delete cascade,
 chat_type text not null check(chat_type in ('personal','group','admin')), title text,
 created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.chat_members (
 chat_id uuid not null references public.chats(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, primary key(chat_id,user_id)
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(), chat_id uuid not null references public.chats(id) on delete cascade,
 sender_id uuid not null references public.profiles(id), body text not null default '', attachment_path text,
 reply_to uuid references public.messages(id) on delete set null, edited_at timestamptz, deleted_at timestamptz,
 created_at timestamptz not null default now(),
 constraint message_has_content check(length(trim(body))>0 or attachment_path is not null)
);
create table if not exists public.message_audit (
 id uuid primary key default gen_random_uuid(), message_id uuid not null, chat_id uuid not null,
 actor_id uuid not null references public.profiles(id), action text not null check(action in ('edit','delete')),
 old_body text, new_body text, created_at timestamptz not null default now()
);
create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_chats_team on public.chats(team_id,created_at desc);
create index if not exists idx_chat_members_user on public.chat_members(user_id);
create index if not exists idx_messages_chat_created on public.messages(chat_id,created_at);
create or replace function public.current_company_id() returns uuid language sql stable security definer set search_path=public
as $$ select company_id from public.profiles where id=auth.uid() and active=true $$;
create or replace function public.current_role() returns text language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and active=true $$;
create or replace function public.is_team_member(target_team uuid) returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.team_members tm join public.profiles p on p.id=tm.user_id
 where tm.team_id=target_team and tm.user_id=auth.uid() and p.active=true and p.company_id=public.current_company_id()) $$;
create or replace function public.is_chat_member(target_chat uuid) returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.chat_members where chat_id=target_chat and user_id=auth.uid()) $$;
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_audit enable row level security;
create policy "company members read own company" on public.companies for select to authenticated using(id=public.current_company_id());
create policy "users read company profiles" on public.profiles for select to authenticated using(company_id=public.current_company_id());
create policy "users read assigned teams" on public.teams for select to authenticated using(company_id=public.current_company_id() and (public.current_role()='superadmin' or public.is_team_member(id)));
create policy "team members read team roster" on public.team_members for select to authenticated using(user_id=auth.uid() or public.current_role()='superadmin' or public.is_team_member(team_id));
create policy "chat members read own chats" on public.chats for select to authenticated using(company_id=public.current_company_id() and public.is_chat_member(id));
create policy "chat roster visible to chat members" on public.chat_members for select to authenticated using(public.is_chat_member(chat_id));
create policy "chat members read messages" on public.messages for select to authenticated using(public.is_chat_member(chat_id));
create policy "members send messages to their chats" on public.messages for insert to authenticated with check(sender_id=auth.uid() and public.is_chat_member(chat_id) and exists(select 1 from public.chats c where c.id=chat_id and c.company_id=public.current_company_id()));
create policy "authors edit own messages" on public.messages for update to authenticated using(sender_id=auth.uid() and deleted_at is null) with check(sender_id=auth.uid());
create policy "authors delete own messages" on public.messages for delete to authenticated using(sender_id=auth.uid());
create policy "authors and superadmins read audit" on public.message_audit for select to authenticated using(actor_id=auth.uid() or public.current_role()='superadmin');
grant select on public.companies,public.profiles,public.teams,public.team_members,public.chats,public.chat_members,public.messages,public.message_audit to authenticated;
grant insert,update,delete on public.messages to authenticated;
do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; when undefined_object then null; end $$;
