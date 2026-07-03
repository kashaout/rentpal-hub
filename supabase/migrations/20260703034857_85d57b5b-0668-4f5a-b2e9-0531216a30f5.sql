
DO $$
DECLARE
  la RECORD;
  v_tenant_id uuid;
  v_wifi text;
  v_keybox text;
  n_tenants int := 0;
  n_payments int := 0;
  n_bookings int := 0;
  n_creds int := 0;
  n_sent int := 0;
  n_paused int := 0;
BEGIN
  FOR la IN
    SELECT * FROM public.lease_agreements
    WHERE tenant_signed = true
      AND landlord_signed = true
      AND status = 'active'
  LOOP
    -- 1) tenants bridge row
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE user_id = la.tenant_user_id
      AND property_id = la.property_id
      AND is_archived = false
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
      INSERT INTO public.tenants (
        user_id, property_id, unit_number,
        lease_start, lease_end, rent_amount,
        payment_status, tenant_type
      ) VALUES (
        la.tenant_user_id, la.property_id, la.unit_number,
        la.lease_start, la.lease_end, la.rent_amount,
        'pending', 'long_stay'
      )
      RETURNING id INTO v_tenant_id;
      n_tenants := n_tenants + 1;
    END IF;

    -- 2) payments row (initial pending) — idempotent by tenant_id + lease_id
    IF v_tenant_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.payments
      WHERE tenant_id = v_tenant_id AND lease_id = la.id
    ) THEN
      INSERT INTO public.payments (
        tenant_id, lease_id, property_id,
        amount, status, due_date
      ) VALUES (
        v_tenant_id, la.id, la.property_id,
        COALESCE(la.rent_amount, 0), 'pending', la.lease_start
      );
      n_payments := n_payments + 1;
    END IF;

    -- 3) booking row — idempotent by tenant+property+dates
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings
      WHERE property_id = la.property_id
        AND user_id = la.tenant_user_id
        AND check_in = la.lease_start
        AND check_out = la.lease_end
    ) THEN
      INSERT INTO public.bookings (
        property_id, user_id, check_in, check_out,
        total_price, status, payment_status, guest_count, notes
      ) VALUES (
        la.property_id, la.tenant_user_id, la.lease_start, la.lease_end,
        COALESCE(la.rent_amount, 0), 'confirmed', 'unpaid', 1,
        'Backfilled from lease ' || la.id::text
      );
      n_bookings := n_bookings + 1;
    END IF;

    -- 4) lease_credentials — idempotent by lease_id
    IF NOT EXISTS (SELECT 1 FROM public.lease_credentials WHERE lease_id = la.id) THEN
      v_wifi := upper(substr(md5(random()::text || la.id::text), 1, 10));
      v_keybox := lpad((floor(random() * 1000000))::int::text, 6, '0');
      INSERT INTO public.lease_credentials (lease_id, wifi_password, keybox_password)
      VALUES (la.id, v_wifi, v_keybox);
      n_creds := n_creds + 1;
    END IF;

    -- 5) credentials_sent_at — set only if null
    IF la.credentials_sent_at IS NULL THEN
      UPDATE public.lease_agreements
        SET credentials_sent_at = now()
      WHERE id = la.id AND credentials_sent_at IS NULL;
      n_sent := n_sent + 1;
    END IF;

    -- 6) Property pause — only if lease has not ended yet
    IF la.lease_end >= CURRENT_DATE THEN
      UPDATE public.properties
        SET is_paused = true, updated_at = now()
      WHERE id = la.property_id
        AND (is_paused IS NULL OR is_paused = false);
      IF FOUND THEN
        n_paused := n_paused + 1;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill counts — tenants:% payments:% bookings:% creds:% sent_at:% paused:%',
    n_tenants, n_payments, n_bookings, n_creds, n_sent, n_paused;
END $$;
