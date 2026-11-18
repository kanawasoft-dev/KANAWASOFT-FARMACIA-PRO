-- KANAWA SOFT FARMACIA PRO — optimização das políticas de adesão
drop policy if exists pharmacy_documents_insert on public.pharmacy_documents;
create policy pharmacy_documents_insert on public.pharmacy_documents
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and status = 'pending'
  and private.has_pharmacy_role(pharmacy_id, array['pharmacy_owner','pharmacy_admin']::text[])
);

create index if not exists pharmacy_applications_reviewed_by_idx
  on public.pharmacy_applications(reviewed_by) where reviewed_by is not null;
create index if not exists pharmacy_documents_uploaded_by_idx
  on public.pharmacy_documents(uploaded_by);
create index if not exists pharmacy_documents_reviewed_by_idx
  on public.pharmacy_documents(reviewed_by) where reviewed_by is not null;

drop policy if exists pharmacy_legal_docs_upload on storage.objects;
create policy pharmacy_legal_docs_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'pharmacy-legal-documents'
  and (storage.foldername(name))[2] = (select auth.uid())::text
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
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and private.has_pharmacy_role(
    ((storage.foldername(name))[1])::uuid,
    array['pharmacy_owner','pharmacy_admin']::text[]
  )
);
