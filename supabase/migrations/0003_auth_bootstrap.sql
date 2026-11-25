-- ComsChat auth bootstrap foundation
-- Synthetic email identifiers allow ID + password sign-in without collecting email.
-- Admin and employee provisioning will be server-side only.

create or replace function public.bootstrap_superadmin(
  p_display_name text,
  p_company_name text,
  p_employee_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if upper(trim(p_employee_code)) <> 'HRH-CA-27558' then
    raise exception 'Invalid Super Admin ID';
  end if;
  if length(trim(p_display_name)) < 2 or length(trim(p_company_name)) < 2 then
    raise exception 'Name and company are required';
  end if;
  if exists (select 1 from public.profiles where role='superadmin') then
    raise exception 'Super Admin has already been initialized';
  end if;
  if exists (select 1 from public.profiles where id=v_uid) then
    raise exception 'This Auth user already has a profile';
  end if;

  insert into public.companies(name) values(trim(p_company_name))
  returning id into v_company;

  insert into public.profiles(
    id, company_id, display_name, employee_code, role, active, must_change_password
  ) values (
    v_uid, v_company, trim(p_display_name), 'HRH-CA-27558', 'superadmin', true, false
  ) returning * into v_profile;

  return jsonb_build_object(
    'id', v_profile.id,
    'company_id', v_profile.company_id,
    'display_name', v_profile.display_name,
    'employee_code', v_profile.employee_code,
    'role', v_profile.role
  );
end;
$$;

revoke all on function public.bootstrap_superadmin(text,text,text) from public, anon;
grant execute on function public.bootstrap_superadmin(text,text,text) to authenticated;
