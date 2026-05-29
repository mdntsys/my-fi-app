-- Replace the v1 budgets table with a per-month, per-subcategory model that
-- supports "edit this month only" vs "edit this and future months" via
-- carry-forward: for any month X, the active budget is the most recent row
-- with effective_month <= X.

drop table if exists public.budgets cascade;

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_detailed text not null,
  effective_month date not null,
  monthly_limit numeric(15, 2) not null check (monthly_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, category_detailed, effective_month),
  check (extract(day from effective_month) = 1)
);
create index budgets_household_month_idx
  on public.budgets(household_id, effective_month desc);
alter table public.budgets enable row level security;

create policy "budgets member select" on public.budgets
  for select to authenticated using (public.is_household_member(household_id));
create policy "budgets owner insert" on public.budgets
  for insert to authenticated with check (public.is_household_owner(household_id));
create policy "budgets owner update" on public.budgets
  for update to authenticated using (public.is_household_owner(household_id)) with check (public.is_household_owner(household_id));
create policy "budgets owner delete" on public.budgets
  for delete to authenticated using (public.is_household_owner(household_id));
