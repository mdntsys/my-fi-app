-- Initial migration: store Plaid Item access tokens, one row per linked institution.
-- Households / accounts / transactions are added in later migrations.

create extension if not exists pgcrypto;

create table public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null unique,
  access_token text not null,
  institution_id text,
  institution_name text,
  created_at timestamptz not null default now()
);

create index plaid_items_user_id_idx on public.plaid_items(user_id);

alter table public.plaid_items enable row level security;

create policy "users select their own plaid items"
  on public.plaid_items
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert their own plaid items"
  on public.plaid_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users delete their own plaid items"
  on public.plaid_items
  for delete
  to authenticated
  using (auth.uid() = user_id);
