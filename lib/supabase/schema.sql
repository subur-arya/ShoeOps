-- ============================================================
-- ShoeOps Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── TENANTS ───────────────────────────────────────────────
create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  wa_number text,
  address text,
  created_at timestamptz default now(),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  subscription_status text default 'trial' check (subscription_status in ('trial','active','expired'))
);

-- ─── USERS ─────────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  tenant_id uuid references public.tenants on delete cascade,
  role text not null check (role in ('owner','operasional')),
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

-- ─── CUSTOMERS ─────────────────────────────────────────────
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants on delete cascade,
  name text not null,
  phone text,
  total_orders int default 0,
  last_order_at timestamptz,
  created_at timestamptz default now()
);

-- ─── TREATMENTS ────────────────────────────────────────────
create table public.treatments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants on delete cascade,
  name text not null,
  price numeric not null check (price >= 0),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── ORDERS ────────────────────────────────────────────────
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants on delete cascade,
  order_code text not null,
  customer_id uuid references public.customers,
  status text default 'diterima' check (status in ('diterima','diproses','selesai','diantar')),
  total_price numeric not null default 0,
  notes text,
  estimated_done_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, order_code)
);

-- ─── ORDER ITEMS ───────────────────────────────────────────
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders on delete cascade,
  treatment_id uuid references public.treatments,
  treatment_name text not null,
  price numeric not null,
  quantity int default 1
);

-- ─── UPDATED_AT TRIGGER ────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure public.handle_updated_at();

-- ─── ROW LEVEL SECURITY ────────────────────────────────────
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.treatments enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Helper function to get current user's tenant_id
create or replace function public.get_tenant_id()
returns uuid as $$
  select tenant_id from public.users where id = auth.uid();
$$ language sql security definer;

-- Helper function to get current user's role
create or replace function public.get_user_role()
returns text as $$
  select role from public.users where id = auth.uid();
$$ language sql security definer;

-- Tenants: users can only see their own tenant
create policy "Users see own tenant"
  on public.tenants for select
  using (id = public.get_tenant_id());

-- Users: users can see others in same tenant
create policy "Users see same tenant members"
  on public.users for all
  using (tenant_id = public.get_tenant_id());

-- Customers: tenant isolation
create policy "Customers tenant isolation"
  on public.customers for all
  using (tenant_id = public.get_tenant_id());

-- Treatments: tenant isolation
create policy "Treatments tenant isolation"
  on public.treatments for all
  using (tenant_id = public.get_tenant_id());

-- Orders: tenant isolation
create policy "Orders tenant isolation"
  on public.orders for all
  using (tenant_id = public.get_tenant_id());

-- Public order lookup by code (for /cek-pesanan)
create policy "Public order lookup"
  on public.orders for select
  using (true);

-- Order items: via order ownership
create policy "Order items via orders"
  on public.order_items for all
  using (
    order_id in (
      select id from public.orders where tenant_id = public.get_tenant_id()
    )
  );

-- Public order items lookup
create policy "Public order items lookup"
  on public.order_items for select
  using (true);

-- ─── SEED DATA ─────────────────────────────────────────────
-- Insert demo tenant
insert into public.tenants (id, name, slug, wa_number, address)
values (
  '00000000-0000-0000-0000-000000000001',
  'ShoeOps Surabaya',
  'surabaya',
  '6281234567890',
  'Jl. Raya Darmo No. 12, Surabaya'
);

-- Note: Create auth users via Supabase dashboard or Auth API,
-- then insert into public.users with matching id:
-- owner@tokoku.com → role: owner
-- operasional@tokoku.com → role: operasional

-- Insert treatments
insert into public.treatments (tenant_id, name, price, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'Basic Wash', 45000, true),
  ('00000000-0000-0000-0000-000000000001', 'Deep Cleaning', 85000, true),
  ('00000000-0000-0000-0000-000000000001', 'Unyellowing', 95000, true),
  ('00000000-0000-0000-0000-000000000001', 'Premium Restore', 135000, true),
  ('00000000-0000-0000-0000-000000000001', 'Water Repellent', 60000, false);
