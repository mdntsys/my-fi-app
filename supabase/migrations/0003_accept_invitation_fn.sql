-- Accept an invitation: SECURITY DEFINER because the invitee is not a household
-- owner and would otherwise be blocked by RLS from inserting into household_members.

create or replace function public.accept_household_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_invitation public.household_invitations;
  v_user_id uuid;
  v_user_email text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  select * into v_invitation
  from public.household_invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  limit 1;

  if v_invitation.id is null then
    raise exception 'invitation not found or expired';
  end if;

  if lower(v_invitation.email) <> lower(v_user_email) then
    raise exception 'invitation email mismatch';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_invitation.household_id, v_user_id, 'member')
  on conflict do nothing;

  update public.household_invitations
  set accepted_at = now()
  where id = v_invitation.id;

  return v_invitation.household_id;
end;
$$;

revoke execute on function public.accept_household_invitation(text) from public, anon;
grant execute on function public.accept_household_invitation(text) to authenticated;
