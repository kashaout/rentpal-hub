
ALTER TABLE public.lease_agreements
  ADD COLUMN IF NOT EXISTS wifi_password TEXT,
  ADD COLUMN IF NOT EXISTS keybox_password TEXT,
  ADD COLUMN IF NOT EXISTS credentials_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;
