-- KANAWA SOFT FARMACIA PRO
-- Base de identidade, multi-farmacia e RBAC.
-- Atribuição de Super Administrador SaaS é feita por operação administrativa segura,
-- nunca por auto-registo público nem por user_metadata.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  preferred_locale text not null default 'pt-AO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nif text,
  country_code text not null default 'AO',
  currency_code text not null default 'AOA',
  timezone text not null default 'Africa/Luanda',
  status text not null default 'active' check (status in ('active','suspended','pending')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pharmacy_members (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('pharmacy_owner','pharmacy_admin','pharmacist','pharmacy_technician','cashier','stock_manager','accountant','viewer')),
  status text not null default 'active' check (status in ('active','invited','suspended')),
  created_at timestamptz not null default now(),
  unique (pharmacy_id,user_id)
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists pharmacy_members_user_id_idx on public.pharmacy_members(user_id);
create index if not exists pharmacy_members_pharmacy_id_idx on public.pharmacy_members(pharmacy_id);

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())); $$;

create or replace function private.is_pharmacy_member(p_pharmacy_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.pharmacy_members pm where pm.pharmacy_id=p_pharmacy_id and pm.user_id=(select auth.uid()) and pm.status='active'); $$;

create or replace function private.has_pharmacy_role(p_pharmacy_id uuid,p_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.pharmacy_members pm where pm.pharmacy_id=p_pharmacy_id and pm.user_id=(select auth.uid()) and pm.status='active' and pm.role=any(p_roles)); $$;

revoke all on function private.is_platform_admin() from public,anon;
revoke all on function private.is_pharmacy_member(uuid) from public,anon;
revoke all on function private.has_pharmacy_role(uuid,text[]) from public,anon;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_pharmacy_member(uuid) to authenticated;
grant execute on function private.has_pharmacy_role(uuid,text[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.pharmacies enable row level security;
alter table public.pharmacy_members enable row level security;
alter table public.platform_admins enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated
using (id=(select auth.uid()) or (select private.is_platform_admin()));
create policy profiles_insert_self on public.profiles for insert to authenticated
with check (id=(select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
using (id=(select auth.uid()) or (select private.is_platform_admin()))
with check (id=(select auth.uid()) or (select private.is_platform_admin()));

create policy pharmacies_select_member on public.pharmacies for select to authenticated
using ((select private.is_pharmacy_member(id)) or (select private.is_platform_admin()));
create policy pharmacies_insert_creator on public.pharmacies for insert to authenticated
with check (created_by=(select auth.uid()));
create policy pharmacies_update_admin on public.pharmacies for update to authenticated
using ((select private.has_pharmacy_role(id,array['pharmacy_owner','pharmacy_admin']::text[])) or (select private.is_platform_admin()))
with check ((select private.has_pharmacy_role(id,array['pharmacy_owner','pharmacy_admin']::text[])) or (select private.is_platform_admin()));

create policy members_select_same_pharmacy on public.pharmacy_members for select to authenticated
using (user_id=(select auth.uid()) or (select private.is_pharmacy_member(pharmacy_id)) or (select private.is_platform_admin()));
create policy members_insert_owner_or_self_owner on public.pharmacy_members for insert to authenticated
with check (
 (user_id=(select auth.uid()) and role='pharmacy_owner'
  and exists(select 1 from public.pharmacies p where p.id=pharmacy_id and p.created_by=(select auth.uid())))
 or (select private.has_pharmacy_role(pharmacy_id,array['pharmacy_owner','pharmacy_admin']::text[]))
 or (select private.is_platform_admin())
);
create policy members_update_admin on public.pharmacy_members for update to authenticated
using ((select private.has_pharmacy_role(pharmacy_id,array['pharmacy_owner','pharmacy_admin']::text[])) or (select private.is_platform_admin()))
with check ((select private.has_pharmacy_role(pharmacy_id,array['pharmacy_owner','pharmacy_admin']::text[])) or (select private.is_platform_admin()));

create policy platform_admins_select_self on public.platform_admins for select to authenticated
using (user_id=(select auth.uid()));

grant select,insert,update on public.profiles to authenticated;
grant select,insert,update on public.pharmacies to authenticated;
grant select,insert,update on public.pharmacy_members to authenticated;
grant select on public.platform_admins to authenticated;
