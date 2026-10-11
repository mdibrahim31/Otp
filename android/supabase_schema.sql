-- ==========================================================
-- Supabase Schema for Outbound SMS Gateway
-- ==========================================================

-- 1. Create table outbound_sms
CREATE TABLE IF NOT EXISTS public.outbound_sms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMPTZ
);

-- 2. Indexes for fast queue polling
CREATE INDEX IF NOT EXISTS idx_outbound_sms_status_created 
ON public.outbound_sms (status, created_at ASC);

-- 3. Enable Realtime on the outbound_sms table
ALTER PUBLICATION supabase_realtime ADD TABLE public.outbound_sms;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.outbound_sms ENABLE ROW LEVEL SECURITY;

-- 5. Access Policy:
-- For server/service role or authenticated gateways:
CREATE POLICY "Allow gateway full access" 
ON public.outbound_sms
FOR ALL 
USING (true)
WITH CHECK (true);

-- 6. Test insertion to trigger an outbound SMS
INSERT INTO public.outbound_sms (phone_number, message, status)
VALUES ('+1234567890', 'Hello from Supabase Outbound SMS Gateway!', 'PENDING');
