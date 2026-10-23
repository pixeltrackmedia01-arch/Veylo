-- =============================================================================
-- Contact form without the service-role key, and an editable offer ticker.
-- =============================================================================

-- Visitors submit contact messages through this function only (there is no
-- insert grant), so the form works even when the server has no service-role
-- key. Rate-limited per email address.
create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_phone text,
  p_subject text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if not public.consume_rate_limit('contact:' || v_email, 5, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.contact_messages (name, email, phone, subject, message, user_id)
  values (btrim(p_name), v_email, nullif(btrim(coalesce(p_phone, '')), ''), btrim(p_subject), btrim(p_message), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_contact_message(text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text) to anon, authenticated;

-- Scrolling offer strip shown above the header (edited in Admin → Content).
insert into public.app_settings (key, value, description, is_public)
values (
  'home.ticker',
  '[
    {"icon": "gift", "text": "Joining any group is free — ₹0 registration or joining fee", "href": "/groups"},
    {"icon": "rupee", "text": "Group buyers save an estimated ₹20,000 – ₹60,000 per car (estimate, not guaranteed)", "href": "/faq#how-much-can-i-save"},
    {"icon": "car", "text": "Book a free test drive on any new car", "href": "/cars"},
    {"icon": "calc", "text": "New: EMI calculator and side-by-side car comparison", "href": "/emi-calculator"}
  ]'::jsonb,
  'Offer strip above the header: a list of {"icon": gift|rupee|car|calc|fire|spark, "text": "...", "href": "/path"}. Live group progress is added automatically.',
  true)
on conflict (key) do nothing;
