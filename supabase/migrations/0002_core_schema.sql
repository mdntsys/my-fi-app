-- Core schema for v1: households, members, invitations, accounts, transactions,
-- Plaid sync state, and budgets. RLS enabled on all tables.

-- ── Tables ─────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.households enable row level security;

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members(user_id);
alter table public.household_members enable row level security;

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index household_invitations_email_idx on public.household_invitations(email);
alter table public.household_invitations enable row level security;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  plaid_item_id uuid not null references public.plaid_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_account_id text not null unique,
  name text not null,
  official_name text,
  type text,
  subtype text,
  mask text,
  current_balance numeric(15, 2),
  available_balance numeric(15, 2),
  iso_currency_code text default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_user_idx on public.accounts(user_id);
create index accounts_plaid_item_idx on public.accounts(plaid_item_id);
alter table public.accounts enable row level security;

create table public.account_household_assignments (
  account_id uuid not null references public.accounts(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (account_id, household_id)
);
alter table public.account_household_assignments enable row level security;

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_transaction_id text not null unique,
  amount numeric(15, 2) not null,
  iso_currency_code text default 'USD',
  date date not null,
  authorized_date date,
  name text not null,
  merchant_name text,
  pending boolean not null default false,
  payment_channel text,
  category_primary text,
  category_detailed text,
  category_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions(user_id, date desc);
create index transactions_account_idx on public.transactions(account_id);
alter table public.transactions enable row level security;

create table public.plaid_sync_state (
  item_id uuid primary key references public.plaid_items(id) on delete cascade,
  cursor text,
  last_synced_at timestamptz,
  last_error text
);
alter table public.plaid_sync_state enable row level security;

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_primary text not null,
  monthly_limit numeric(15, 2) not null check (monthly_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, category_primary)
);
alter table public.budgets enable row level security;

-- ── Helper functions ───────────────────────────────────────────────

create or replace function public.is_household_member(p_household uuid) returns boolean
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household and user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(p_household uuid) returns boolean
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household and user_id = auth.uid() and role = 'owner'
  );
$$;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;

-- ── Triggers ───────────────────────────────────────────────────────

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_new_household() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists on_household_created on public.households;
create trigger on_household_created
  after insert on public.households
  for each row execute function public.handle_new_household();

-- ── Policies ───────────────────────────────────────────────────────

create policy "profiles self select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "households member select" on public.households for select to authenticated using (public.is_household_member(id));
create policy "households create" on public.households for insert to authenticated with check (created_by = auth.uid());
create policy "households owner update" on public.households for update to authenticated using (public.is_household_owner(id)) with check (public.is_household_owner(id));
create policy "households owner delete" on public.households for delete to authenticated using (public.is_household_owner(id));

create policy "household_members select" on public.household_members for select to authenticated using (public.is_household_member(household_id));
create policy "household_members owner insert" on public.household_members for insert to authenticated with check (public.is_household_owner(household_id));
create policy "household_members owner or self delete" on public.household_members for delete to authenticated using (public.is_household_owner(household_id) or user_id = auth.uid());

create policy "invitations member or invitee select" on public.household_invitations
  for select to authenticated
  using (
    public.is_household_member(household_id)
    or email = (select u.email::text from auth.users u where u.id = auth.uid())
  );
create policy "invitations owner insert" on public.household_invitations
  for insert to authenticated
  with check (public.is_household_owner(household_id) and invited_by = auth.uid());
create policy "invitations owner delete" on public.household_invitations
  for delete to authenticated
  using (public.is_household_owner(household_id));

create policy "accounts owner all" on public.accounts for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "aha select if member or account owner" on public.account_household_assignments
  for select to authenticated
  using (
    public.is_household_member(household_id)
    or exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
  );
create policy "aha insert by account owner" on public.account_household_assignments
  for insert to authenticated
  with check (exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy "aha delete by account owner" on public.account_household_assignments
  for delete to authenticated
  using (exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()));

create policy "transactions owner all" on public.transactions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Note: plaid_sync_state.item_id is uuid (FK to plaid_items.id), while plaid_items
-- also has a column named item_id (text, Plaid's external ID). Qualify the outer
-- column to avoid shadowing inside the EXISTS subquery.
create policy "sync state via item ownership" on public.plaid_sync_state for all to authenticated
  using (exists (select 1 from public.plaid_items i where i.id = plaid_sync_state.item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.plaid_items i where i.id = plaid_sync_state.item_id and i.user_id = auth.uid()));

create policy "budgets member select" on public.budgets for select to authenticated using (public.is_household_member(household_id));
create policy "budgets owner insert" on public.budgets for insert to authenticated with check (public.is_household_owner(household_id));
create policy "budgets owner update" on public.budgets for update to authenticated using (public.is_household_owner(household_id)) with check (public.is_household_owner(household_id));
create policy "budgets owner delete" on public.budgets for delete to authenticated using (public.is_household_owner(household_id));
