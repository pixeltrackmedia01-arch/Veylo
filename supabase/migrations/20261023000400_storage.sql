-- =============================================================================
-- GroupDrive — Supabase Storage buckets & policies
--   vehicle-images       public, admin-managed catalogue imagery
--   quotation-documents  private, <dealer_id>/<quotation_id>/<file>
--   sale-evidence        private, <enquiry_id>/<file>
-- Uploads are validated (type, size) in the app before reaching storage; bucket
-- limits below are a second line of defence.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-images', 'vehicle-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('quotation-documents', 'quotation-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('sale-evidence', 'sale-evidence', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Safe uuid parsing for folder names (invalid paths simply fail the policy).
create or replace function public.try_uuid(p_text text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;
grant execute on function public.try_uuid(text) to authenticated;

create or replace function public.can_access_sale_folder(p_enquiry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.dealer_enquiries e
    where e.id = p_enquiry_id
      and (e.user_id = auth.uid() or public.is_dealer_member(e.dealer_id) or public.is_admin())
  );
$$;
grant execute on function public.can_access_sale_folder(uuid) to authenticated;

create or replace function public.can_access_quote_folder(p_dealer_id uuid, p_quotation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.dealer_quotations q
    where q.id = p_quotation_id and q.dealer_id = p_dealer_id
      and (public.is_admin() or public.is_dealer_member(q.dealer_id))
  );
$$;
grant execute on function public.can_access_quote_folder(uuid, uuid) to authenticated;

-- Vehicle images: anyone can read (public bucket), only admins write.
create policy "vehicle images admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-images' and public.is_admin());
create policy "vehicle images admin update" on storage.objects for update to authenticated
  using (bucket_id = 'vehicle-images' and public.is_admin());
create policy "vehicle images admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-images' and public.is_admin());

-- Quotation documents: the owning dealer and admins.
create policy "quotation docs read" on storage.objects for select to authenticated
  using (
    bucket_id = 'quotation-documents'
    and public.can_access_quote_folder(public.try_uuid((storage.foldername(name))[1]),
                                       public.try_uuid((storage.foldername(name))[2]))
  );
create policy "quotation docs insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'quotation-documents'
    and public.can_access_quote_folder(public.try_uuid((storage.foldername(name))[1]),
                                       public.try_uuid((storage.foldername(name))[2]))
  );

-- Sale evidence: the customer, the dealer on the enquiry, and admins.
create policy "sale evidence read" on storage.objects for select to authenticated
  using (
    bucket_id = 'sale-evidence'
    and public.can_access_sale_folder(public.try_uuid((storage.foldername(name))[1]))
  );
create policy "sale evidence insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sale-evidence'
    and public.can_access_sale_folder(public.try_uuid((storage.foldername(name))[1]))
  );
