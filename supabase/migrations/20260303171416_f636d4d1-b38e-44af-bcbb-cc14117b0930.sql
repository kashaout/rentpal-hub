
-- Add amenities/facilities to properties
ALTER TABLE public.properties ADD COLUMN amenities jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN description text;

-- Create bookings table for property reservations
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  total_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  guest_count integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 day')
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies for bookings
CREATE POLICY "Block anonymous access to bookings" ON public.bookings
  AS RESTRICTIVE FOR SELECT TO anon USING (false);

CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Landlords can view bookings for their properties" ON public.bookings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = bookings.property_id AND p.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can manage bookings for their properties" ON public.bookings
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = bookings.property_id AND p.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-release expired unpaid bookings
CREATE OR REPLACE FUNCTION public.release_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.bookings
  SET status = 'cancelled', updated_at = now()
  WHERE status = 'pending'
    AND payment_status = 'unpaid'
    AND expires_at < now();
END;
$$;
