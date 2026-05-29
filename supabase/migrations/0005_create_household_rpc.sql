-- Workaround for an RLS WITH CHECK issue on INSERT INTO households where
-- `created_by = auth.uid()` rejects valid authenticated INSERTs. The same
-- auth.uid() works in SELECT contexts (e.g. profiles RLS), so we bypass the
-- WITH CHECK by routing creation through a SECURITY DEFINER RPC that reads
-- auth.uid() itself and inserts the row. The existing AFTER INSERT trigger
-- still fires inside the function to add the creator as owner.

create or replace function public.create_household(p_name text) returns uuid
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_user_id uuid;
  v_household_id uuid;
  v_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  v_name := trim(p_name);
  if v_name is null or length(v_name) = 0 then
    raise exception 'name required';
  end if;

  insert into public.households (name, created_by)
  values (v_name, v_user_id)
  returning id into v_household_id;

  return v_household_id;
end;
$$;

revoke execute on function public.create_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
