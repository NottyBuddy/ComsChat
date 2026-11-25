-- ComsChat security hardening (safe to run after 0001_initial_schema.sql)
-- This migration tightens read boundaries and makes message edits auditable/immutable.
-- Account/team administration writes must be performed by trusted server-side functions,
-- not by granting broad client-side table writes.

create or replace function public.is_chat_member(target_chat uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1
    from public.chat_members cm
    join public.profiles p on p.id=cm.user_id
    where cm.chat_id=target_chat
      and cm.user_id=auth.uid()
      and p.active=true
      and p.company_id=public.current_company_id()
  );
$$;

create or replace function public.can_monitor_chat(target_chat uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1
    from public.chats c
    join public.team_members tm on tm.team_id=c.team_id
    join public.profiles p on p.id=tm.user_id
    where c.id=target_chat
      and c.chat_type='personal'
      and c.company_id=public.current_company_id()
      and tm.user_id=auth.uid()
      and tm.team_role in ('admin','subadmin')
      and p.active=true
  );
$$;

create or replace function public.can_access_chat(target_chat uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.chats c
    where c.id=target_chat
      and c.company_id=public.current_company_id()
      and (
        public.current_role()='superadmin'
        or public.is_chat_member(c.id)
        or public.can_monitor_chat(c.id)
      )
  );
$$;

create or replace function public.can_view_profile(target_user uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1
    from public.profiles target
    where target.id=target_user
      and target.company_id=public.current_company_id()
      and target.active=true
      and (
        target.id=auth.uid()
        or public.current_role()='superadmin'
        or exists (
          select 1
          from public.team_members mine
          join public.team_members theirs on theirs.team_id=mine.team_id
          where mine.user_id=auth.uid()
            and theirs.user_id=target.id
        )
      )
  );
$$;

-- Replace permissive/overly broad read policies with role- and team-scoped checks.
drop policy if exists "users read company profiles" on public.profiles;
create policy "users read permitted profiles"
on public.profiles for select to authenticated
using (public.can_view_profile(id));

drop policy if exists "chat members and assigned admins read permitted chats" on public.chats;
create policy "permitted users read chats"
on public.chats for select to authenticated
using (public.can_access_chat(id));

drop policy if exists "chat roster visible to chat members" on public.chat_members;
create policy "permitted users read chat roster"
on public.chat_members for select to authenticated
using (public.can_access_chat(chat_id));

drop policy if exists "chat members and assigned admins read permitted messages" on public.messages;
create policy "permitted users read messages"
on public.messages for select to authenticated
using (public.can_access_chat(chat_id));

drop policy if exists "members send messages to their chats" on public.messages;
create policy "active chat members send messages"
on public.messages for insert to authenticated
with check (
  sender_id=auth.uid()
  and public.is_chat_member(chat_id)
  and exists (
    select 1 from public.chats c
    where c.id=chat_id and c.company_id=public.current_company_id()
  )
);

drop policy if exists "authors edit own messages" on public.messages;
create policy "authors edit own active messages"
on public.messages for update to authenticated
using (
  sender_id=auth.uid()
  and deleted_at is null
  and public.is_chat_member(chat_id)
)
with check (
  sender_id=auth.uid()
  and deleted_at is null
  and public.is_chat_member(chat_id)
);

drop policy if exists "authors delete own messages" on public.messages;
create policy "authors delete own messages"
on public.messages for delete to authenticated
using (
  sender_id=auth.uid()
  and public.is_chat_member(chat_id)
);

drop policy if exists "authors and superadmins read audit" on public.message_audit;
create policy "authors monitors and superadmins read audit"
on public.message_audit for select to authenticated
using (
  actor_id=auth.uid()
  or public.current_role()='superadmin'
  or public.can_monitor_chat(chat_id)
);

-- Prevent a client from changing message ownership, destination, attachment, reply target,
-- timestamps, or deletion metadata through the UPDATE policy.
create or replace function public.guard_message_mutation()
returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null or auth.uid() <> old.sender_id then
    raise exception 'Only the message author may change this message';
  end if;

  if tg_op='UPDATE' then
    if new.id is distinct from old.id
      or new.chat_id is distinct from old.chat_id
      or new.sender_id is distinct from old.sender_id
      or new.attachment_path is distinct from old.attachment_path
      or new.reply_to is distinct from old.reply_to
      or new.created_at is distinct from old.created_at
      or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Only message text may be edited';
    end if;

    if new.body is distinct from old.body then
      new.edited_at := now();
    else
      new.edited_at := old.edited_at;
    end if;
    return new;
  elsif tg_op='DELETE' then
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_guard_message_mutation on public.messages;
create trigger trg_guard_message_mutation
before update or delete on public.messages
for each row execute function public.guard_message_mutation();

-- Keep the existing audit trigger. It records edits and hard deletes before the row changes.
-- Recreate it after the guard so both run consistently; the guard is named separately.
drop trigger if exists trg_audit_message_change on public.messages;
create trigger trg_audit_message_change
before update or delete on public.messages
for each row execute function public.audit_message_change();

-- Explicitly keep client permissions limited to chat content. No client-side account,
-- team, role, membership, or company mutations are granted here.
revoke insert, update, delete on public.companies, public.profiles, public.teams,
  public.team_members, public.chats, public.chat_members, public.message_audit
from authenticated;

grant select on public.companies, public.profiles, public.teams, public.team_members,
  public.chats, public.chat_members, public.messages, public.message_audit to authenticated;
grant insert, update, delete on public.messages to authenticated;
