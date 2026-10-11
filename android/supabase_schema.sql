-- ==========================================================
-- Supabase Schema for Otp_sender Table + Auto OTP Generator
-- ==========================================================

-- 1. Rename existing outbound_sms table to otp_sender (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'outbound_sms') 
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'otp_sender') THEN
        ALTER TABLE public.outbound_sms RENAME TO otp_sender;
    END IF;
END $$;

-- 2. Create table otp_sender if not exists
CREATE TABLE IF NOT EXISTS public.otp_sender (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    otp TEXT,
    message TEXT,
    expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '5 minutes'),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMPTZ
);

-- Upgrade columns if needed:
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS otp TEXT;
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '5 minutes');
ALTER TABLE public.otp_sender ALTER COLUMN message DROP NOT NULL;

-- 3. Trigger function to automatically generate 6-digit OTP, 5-minute expiry, and SMS message
CREATE OR REPLACE FUNCTION generate_otp_sender_code()
RETURNS TRIGGER AS $$
BEGIN
    -- If OTP is not provided, generate a random 6-digit number (100000 to 999999)
    IF NEW.otp IS NULL OR NEW.otp = '' THEN
        NEW.otp := lpad(floor(random() * (999999 - 100000 + 1) + 100000)::text, 6, '0');
    END IF;

    -- Auto set 5-minute expiry time
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := timezone('utc'::text, now()) + interval '5 minutes';
    END IF;

    -- If message is not provided, compose standard OTP SMS with 5-minute validity
    IF NEW.message IS NULL OR NEW.message = '' THEN
        NEW.message := 'Your OTP verification code is ' || NEW.otp || '. Valid for 5 minutes.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger before insert on otp_sender
DROP TRIGGER IF EXISTS trg_generate_otp ON public.otp_sender;
CREATE TRIGGER trg_generate_otp
BEFORE INSERT ON public.otp_sender
FOR EACH ROW
EXECUTE FUNCTION generate_otp_sender_code();

-- 5. Indexes for fast queue polling
CREATE INDEX IF NOT EXISTS idx_otp_sender_status_created 
ON public.otp_sender (status, created_at ASC);

-- 6. Enable Realtime on otp_sender table (Safe check if already member)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'otp_sender'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.otp_sender;
    END IF;
END $$;

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.otp_sender ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gateway full access" ON public.otp_sender;
CREATE POLICY "Allow gateway full access" 
ON public.otp_sender
FOR ALL 
USING (true)
WITH CHECK (true);

-- 8. Test Insertion into otp_sender
INSERT INTO public.otp_sender (phone_number, status)
VALUES ('+8801700000000', 'PENDING');
