-- KANAWA SOFT FARMACIA PRO — adesão empresarial e documentos legais
-- Documentos privados por farmácia; a aprovação SaaS não substitui licenciamento da ARMED.

create table if not exists public.pharmacy_applications (
  pharmacy_id uuid primary key references public.pharmacies(id) on delete cascade,
  legal_name text not null,
  trade_name text not null,
  nif text not null,
  legal_form text,
  province text not null,
  municipality text not null,
  address text not null,
  phone text not null,
  contact_email text not null,
  representative_name text not null,
  representative_bi text,
  pharmacy_license_number text,
  technical_director_name text,
  technical_director_license text,
  status text not null default 'draft'
    check (status in ('draft','documents_pending','submitted','in_review','approved','rejected','suspended')),
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pharmacy_applications_nif_nonempty check (length(trim(nif)) > 0)
);

create index if not exists pharmacy_applications_status_created_idx
  on public.pharmacy_applications(status, created_at desc);

create table if not exists public.pharmacy_documents (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  document_type text not null,
  document_name text not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 15728640),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewer_note text,
  expires_on date,
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint pharmacy_documents_type_nonempty check (length(trim(document_type)) > 0)
);

create index if not exists pharmacy_documents_pharmacy_created_idx
  on public.pharmacy_documents(pharmacy_id, created_at desc);

alter table public.pharmacy_applications enable row level security;
alter table public.pharmacy_documents enable row level security;

grant select, insert, update on public.pharmacy_applications to authenticated;
grant select, insert, update, delete on public.pharmacy_documents to authenticated;

drop policy if exists pharmacy_application_select on public.pharmacy_applications;
create policy pharmacy_application_select on public.pharmacy_applications
for select to authenticated
using (
  private.has_pharmacy_role(pharmacy_id, array['pharmacy_owner','pharmacy_admin']::text[])
  or private.is_platform_admin()
);

drop policy if exists pharmacy_application_insert on public.pharmacy_applications;
create policy pharmacy_application_insert on public.pharmacy_applications
for insert to authenticated
with check (
  status in ('draft','documents_pending')
  and private.has_pharmacy_role(pharmacy_id, array['pharmacy_owner']::text[])
);

drop policy if exists pharmacy_application_update on public.pharmacy_applications;
create policy pharmacy_application_update on public.pharmacy_applications
for update to authenticated
using (
  private.is_platform_admin()
  or (
    private.has_pharmacy_role(pharmacy_id, array['pharmacy_owner','pharmacy_admin']::text[])
    and status in ('draft','documents_pending','rejected')
  )
)
with check (
  private.is_platform_admin()
  or (
    private.has_pharmacy_role(pharmacy_id, array['pharmacy_owner','pharmacy_admin']::text[])
    and status in ('draft','documents_pending','rejected','submitted')
  )
);

drop policy if exists pharmacy_documents_select on public.pharmacy_documents;
create policy pharmacy_documents_select on public.pharmacy_documents
for select to authenticated
using (
  private.is_platform_admin()
  or private.has_pharmacy_role(pharmacy_id, array['pharmacy_owner','pharmacy_admin']::text[])
);

drop policy if exists pharmacy_documents_insert on public.pharmacy_documents;
create policy pharmacy_documents_insert on public.pharmacy_documents
for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and status = 'pending'
  and private.has_pharmacy_role(pharmacy_id, array['pharmacy_owner','pharmacy_admin']::text[])
);

drop policy if exists pharmacy_documents_update on public.pharmacy_documents;
create policy pharmacy_documents_update on public.pharmacy_documents
for update to authenticated
using (
  private.is_platform_admin()
  or private.has_pharmacy_role(pharmacy_id, array['pharmacy_owner','pharmacy_admin']::text[])
)
with check (
  private.is_platform_admin()
  or (
    private.has_pharmacy_role(pharmacy_id, array['pharmacy_owner','pharmacy_admin']::text[])
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  )
);

drop policy if exists pharmacy_documents_delete on public.pharmacy_documents;
create policy pharmacy_documents_delete on public.pharmacy_documents
for delete to authenticated
using (
  private.is_platform_admin()
  or private.has_pharmacy_role(pharmacy_id, array['pharmacy_owner']::text[])
);

-- Impede que o dono da farmácia aprove a própria candidatura ou os próprios documentos.
create or replace function private.guard_pharmacy_application_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    if new.status is distinct from old.status
       and not (old.status in ('draft','documents_pending','rejected') and new.status = 'submitted') then
      raise exception 'Apenas a Central SaaS pode alterar o estado de aprovação.';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.rejection_reason is distinct from old.rejection_reason
       or new.internal_notes is distinct from old.internal_notes then
      raise exception 'Campos de revisão reservados à Central SaaS.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_guard_pharmacy_application_review on public.pharmacy_applications;
create trigger trg_guard_pharmacy_application_review
before update on public.pharmacy_applications
for each row execute function private.guard_pharmacy_application_review();

create or replace function private.guard_pharmacy_document_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and not private.is_platform_admin() then
    if new.status is distinct from old.status
       or new.reviewer_note is distinct from old.reviewer_note
       or new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Apenas a Central SaaS pode rever documentos.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_pharmacy_document_review on public.pharmacy_documents;
create trigger trg_guard_pharmacy_document_review
before update on public.pharmacy_documents
for each row execute function private.guard_pharmacy_document_review();

-- Bucket privado: ficheiros até 15 MB, apenas PDF/JPEG/PNG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pharmacy-legal-documents', 'pharmacy-legal-documents', false, 15728640,
        array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists pharmacy_legal_docs_read on storage.objects;
create policy pharmacy_legal_docs_read on storage.objects
for select to authenticated
using (
  bucket_id = 'pharmacy-legal-documents'
  and (
    private.is_platform_admin()
    or private.has_pharmacy_role(
      ((storage.foldername(name))[1])::uuid,
      array['pharmacy_owner','pharmacy_admin']::text[]
    )
  )
);

drop policy if exists pharmacy_legal_docs_upload on storage.objects;
create policy pharmacy_legal_docs_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'pharmacy-legal-documents'
  and (storage.foldername(name))[2] = auth.uid()::text
  and private.has_pharmacy_role(
    ((storage.foldername(name))[1])::uuid,
    array['pharmacy_owner','pharmacy_admin']::text[]
  )
);

drop policy if exists pharmacy_legal_docs_update on storage.objects;
create policy pharmacy_legal_docs_update on storage.objects
for update to authenticated
using (
  bucket_id = 'pharmacy-legal-documents'
  and private.has_pharmacy_role(
    ((storage.foldername(name))[1])::uuid,
    array['pharmacy_owner','pharmacy_admin']::text[]
  )
)
with check (
  bucket_id = 'pharmacy-legal-documents'
  and (storage.foldername(name))[2] = auth.uid()::text
  and private.has_pharmacy_role(
    ((storage.foldername(name))[1])::uuid,
    array['pharmacy_owner','pharmacy_admin']::text[]
  )
);

drop policy if exists pharmacy_legal_docs_delete on storage.objects;
create policy pharmacy_legal_docs_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'pharmacy-legal-documents'
  and (
    private.is_platform_admin()
    or private.has_pharmacy_role(
      ((storage.foldername(name))[1])::uuid,
      array['pharmacy_owner']::text[]
    )
  )
);

grant usage on schema private to authenticated;
revoke all on function private.guard_pharmacy_application_review() from public, anon;
revoke all on function private.guard_pharmacy_document_review() from public, anon;
