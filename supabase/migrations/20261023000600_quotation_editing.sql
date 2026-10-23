-- =============================================================================
-- GroupDrive — atomic quotation editing
-- Replaces a quotation's header fields and line items in one transaction so a
-- half-saved quotation can never exist. Totals are recomputed by trigger.
-- =============================================================================

create or replace function public.save_quotation(p_quotation_id uuid, p_header jsonb, p_items jsonb)
returns public.dealer_quotations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.dealer_quotations;
  v_item jsonb;
  v_index integer := 0;
begin
  select * into v_quote from public.dealer_quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'quotation_not_found';
  end if;
  if not public.can_edit_quotation(p_quotation_id) then
    raise exception 'quotation_locked';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 40 then
    raise exception 'invalid_line_items';
  end if;

  update public.dealer_quotations
     set quote_reference = nullif(trim(p_header ->> 'quote_reference'), ''),
         valid_until = (p_header ->> 'valid_until')::date,
         conditions = nullif(trim(p_header ->> 'conditions'), ''),
         availability_note = nullif(trim(p_header ->> 'availability_note'), ''),
         delivery_timeline = nullif(trim(p_header ->> 'delivery_timeline'), '')
   where id = p_quotation_id;

  delete from public.quotation_line_items where quotation_id = p_quotation_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_index := v_index + 1;
    insert into public.quotation_line_items (quotation_id, category, label, amount, is_included, notes, sort_order)
    values (
      p_quotation_id,
      (v_item ->> 'category')::public.line_item_category,
      left(v_item ->> 'label', 160),
      round((v_item ->> 'amount')::numeric, 2),
      coalesce((v_item ->> 'is_included')::boolean, true),
      nullif(left(v_item ->> 'notes', 500), ''),
      v_index
    );
  end loop;

  select * into v_quote from public.dealer_quotations where id = p_quotation_id;
  perform public.log_audit('quotation.saved', 'dealer_quotation', p_quotation_id::text, null,
    jsonb_build_object('total_payable', v_quote.total_payable, 'items', jsonb_array_length(p_items)));
  return v_quote;
end;
$$;

revoke execute on function public.save_quotation(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_quotation(uuid, jsonb, jsonb) to authenticated, service_role;

-- Admin: attach a document path after upload (dealers use the column grant directly).
create or replace function public.set_quotation_document(p_quotation_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.dealer_quotations;
begin
  select * into v_quote from public.dealer_quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'quotation_not_found';
  end if;
  if not (public.is_admin() or public.is_dealer_member(v_quote.dealer_id)) then
    raise exception 'forbidden';
  end if;
  if v_quote.status in ('published', 'expired', 'withdrawn', 'rejected') and not public.is_admin() then
    raise exception 'quotation_locked';
  end if;
  if p_path !~ ('^' || v_quote.dealer_id::text || '/' || p_quotation_id::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'invalid_document_path';
  end if;
  update public.dealer_quotations set document_path = p_path where id = p_quotation_id;
  perform public.log_audit('quotation.document_attached', 'dealer_quotation', p_quotation_id::text, null,
    jsonb_build_object('document_path', p_path));
end;
$$;

revoke execute on function public.set_quotation_document(uuid, text) from public, anon;
grant execute on function public.set_quotation_document(uuid, text) to authenticated, service_role;
