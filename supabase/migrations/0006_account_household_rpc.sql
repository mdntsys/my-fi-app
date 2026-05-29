-- Same WITH CHECK / auth.uid() evaluation quirk that broke
-- INSERT INTO households also breaks INSERT INTO account_household_assignments
-- (its policy has direct auth.uid() in an EXISTS subquery). Route assignment
-- toggles through a SECURITY DEFINER RPC so the auth check runs server-side
-- as a normal function call rather than as an RLS WITH CHECK expression.

create or replace function public.set_account_household_assignment(
  p_account_id uuid,
  p_household_id uuid,
  p_assigned boolean
) returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_user_id uuid;
  v_owns_account boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Caller must own the account they're assigning.
  select exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_user_id
  ) into v_owns_account;
  if not v_owns_account then
    raise exception 'account not owned by caller';
  end if;

  if p_assigned then
    insert into public.account_household_assignments (account_id, household_id)
    values (p_account_id, p_household_id)
    on conflict do nothing;
  else
    delete from public.account_household_assignments
    where account_id = p_account_id and household_id = p_household_id;
  end if;
end;
$$;

revoke execute on function public.set_account_household_assignment(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_account_household_assignment(uuid, uuid, boolean) to authenticated;
