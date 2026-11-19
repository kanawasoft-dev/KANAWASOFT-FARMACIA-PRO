-- Guarda esclarecimentos adicionais enviados pela empresa durante a candidatura.
-- Aplicado no projecto Supabase KANAWASOFT-FARMACIA-PRO.
alter table public.pharmacy_applications
  add column if not exists applicant_notes text;

comment on column public.pharmacy_applications.applicant_notes is
  'Esclarecimentos adicionais fornecidos pela empresa candidata; conteúdo visível à equipa de análise.';
