-- KANAWA SOFT FARMACIA PRO — dados operacionais multi-tenant
-- Todas as tabelas pertencem a uma farmácia e são protegidas por RLS.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  sku text not null, name text not null, generic_name text,
  category text not null default 'Medicamento', unit text not null default 'unidade',
  barcode text, cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  requires_prescription boolean not null default false, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (pharmacy_id, sku)
);
create index if not exists products_pharmacy_name_idx on public.products(pharmacy_id, name);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  name text not null, nif text, phone text, email text, address text, notes text,
  created_at timestamptz not null default now(), unique (pharmacy_id, nif)
);
create index if not exists suppliers_pharmacy_name_idx on public.suppliers(pharmacy_id, name);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  full_name text not null, phone text, email text, nif text, notes text, created_at timestamptz not null default now()
);
create index if not exists customers_pharmacy_name_idx on public.customers(pharmacy_id, full_name);

create table if not exists public.product_batches (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null, lot_number text not null,
  expiry_date date, quantity numeric(14,3) not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(), unique (pharmacy_id, product_id, lot_number)
);
create index if not exists product_batches_expiry_idx on public.product_batches(pharmacy_id, expiry_date);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  batch_id uuid references public.product_batches(id) on delete set null,
  movement_type text not null check (movement_type in ('purchase','sale','adjustment_in','adjustment_out','loss','return')),
  quantity numeric(14,3) not null check (quantity > 0), unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  reference_type text, reference_id uuid, notes text,
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create index if not exists stock_movements_product_idx on public.stock_movements(pharmacy_id, product_id, created_at desc);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  sale_number text not null, customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'completed' check (status in ('draft','completed','cancelled','refunded')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0), discount numeric(14,2) not null default 0 check (discount >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0), total numeric(14,2) not null default 0 check (total >= 0),
  payment_method text, notes text, sold_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), unique (pharmacy_id, sale_number)
);
create index if not exists sales_pharmacy_created_idx on public.sales(pharmacy_id, created_at desc);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict, batch_id uuid references public.product_batches(id) on delete restrict,
  product_name text not null, quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0), discount numeric(14,2) not null default 0 check (discount >= 0),
  line_total numeric(14,2) not null check (line_total >= 0), created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  purchase_number text not null, supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'received' check (status in ('draft','ordered','received','cancelled')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0), tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) not null default 0 check (total >= 0), invoice_number text, notes text,
  purchased_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
  unique (pharmacy_id, purchase_number)
);
create index if not exists purchases_pharmacy_created_idx on public.purchases(pharmacy_id, created_at desc);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict, product_name text not null,
  quantity numeric(14,3) not null check (quantity > 0), unit_cost numeric(14,2) not null check (unit_cost >= 0),
  line_total numeric(14,2) not null check (line_total >= 0), lot_number text, expiry_date date, created_at timestamptz not null default now()
);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  prescription_number text not null, customer_id uuid references public.customers(id) on delete set null,
  patient_name text not null, prescriber_name text, issued_on date, notes text,
  status text not null default 'registered' check (status in ('registered','partially_dispensed','dispensed','cancelled')),
  registered_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
  unique (pharmacy_id, prescription_number)
);

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  opened_by uuid not null default auth.uid() references auth.users(id), closed_by uuid references auth.users(id),
  opening_amount numeric(14,2) not null default 0 check (opening_amount >= 0), closing_amount numeric(14,2) check (closing_amount >= 0),
  status text not null default 'open' check (status in ('open','closed')), opened_at timestamptz not null default now(), closed_at timestamptz
);
create index if not exists cash_sessions_open_idx on public.cash_sessions(pharmacy_id, status);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  session_id uuid references public.cash_sessions(id) on delete set null,
  movement_type text not null check (movement_type in ('sale','income','expense','opening','closing','refund')),
  amount numeric(14,2) not null check (amount >= 0), description text,
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  entry_type text not null check (entry_type in ('income','expense')), category text, description text not null,
  amount numeric(14,2) not null check (amount > 0), reference text, entry_date date not null default current_date,
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  full_name text not null, job_title text not null, phone text, email text,
  status text not null default 'active' check (status in ('active','inactive')), created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  actor_id uuid default auth.uid() references auth.users(id), action text not null, entity_type text not null,
  entity_id uuid, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists audit_logs_pharmacy_created_idx on public.audit_logs(pharmacy_id, created_at desc);

do $$
declare t text; write_roles text[] := array['pharmacy_owner','pharmacy_admin','pharmacist','pharmacy_technician','cashier','stock_manager','accountant'];
begin
  foreach t in array array['products','suppliers','customers','product_batches','stock_movements','sales','sale_items','purchases','purchase_items','prescriptions','cash_sessions','cash_movements','finance_entries','employees','audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists tenant_select on public.%I', t);
    execute format('create policy tenant_select on public.%I for select to authenticated using (private.is_pharmacy_member(pharmacy_id) or private.is_platform_admin())', t);
    execute format('drop policy if exists tenant_insert on public.%I', t);
    execute format('create policy tenant_insert on public.%I for insert to authenticated with check (private.has_pharmacy_role(pharmacy_id, %L::text[]) or private.is_platform_admin())', t, write_roles);
    execute format('drop policy if exists tenant_update on public.%I', t);
    execute format('create policy tenant_update on public.%I for update to authenticated using (private.has_pharmacy_role(pharmacy_id, %L::text[]) or private.is_platform_admin()) with check (private.has_pharmacy_role(pharmacy_id, %L::text[]) or private.is_platform_admin())', t, write_roles, write_roles);
    execute format('drop policy if exists tenant_delete on public.%I', t);
    execute format('create policy tenant_delete on public.%I for delete to authenticated using (private.has_pharmacy_role(pharmacy_id, array[''pharmacy_owner'',''pharmacy_admin'']::text[]) or private.is_platform_admin())', t);
  end loop;
end $$;
