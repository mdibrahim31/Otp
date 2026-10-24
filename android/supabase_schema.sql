-- ==========================================================
-- Supabase Schema for otp_sender Table + Auto OTP Generator
-- ==========================================================

-- 1. Create table otp_sender matching exact user specification
CREATE TABLE IF NOT EXISTS public.otp_sender (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(50) NOT NULL,
    otp VARCHAR(10),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure 'phone' column exists if table was created previously with 'phone_number'
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'otp_sender' 
          AND column_name = 'phone_number'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'otp_sender' 
          AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.otp_sender RENAME COLUMN phone_number TO phone;
    END IF;
END $$;

-- Add any missing columns safely
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS otp VARCHAR(10);
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- 2. Trigger function to automatically generate 6-digit OTP, message text & expiry on raw INSERT
CREATE OR REPLACE FUNCTION generate_otp_sender_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-generate random 6-digit OTP if not provided
    IF NEW.otp IS NULL OR NEW.otp = '' THEN
        NEW.otp := lpad(floor(random() * (999999 - 100000 + 1) + 100000)::text, 6, '0');
    END IF;

    -- Auto set default status to 'pending' if null
    IF NEW.status IS NULL OR NEW.status = '' THEN
        NEW.status := 'pending';
    END IF;

    -- Auto set 5-minute expiry time
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := timezone('utc'::text, now()) + interval '5 minutes';
    END IF;

    -- If message is not provided, compose standard OTP SMS
    IF NEW.message IS NULL OR NEW.message = '' THEN
        NEW.message := 'Your OTP verification code is ' || NEW.otp || '. Valid for 5 minutes.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger before insert on otp_sender
DROP TRIGGER IF EXISTS trg_generate_otp ON public.otp_sender;
CREATE TRIGGER trg_generate_otp
BEFORE INSERT ON public.otp_sender
FOR EACH ROW
EXECUTE FUNCTION generate_otp_sender_code();

-- 4. Indexes for fast queue polling by gateway
CREATE INDEX IF NOT EXISTS idx_otp_sender_status_created 
ON public.otp_sender (status, created_at ASC);

-- 5. Enable Realtime on otp_sender table for instant dispatch
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

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.otp_sender ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gateway full access" ON public.otp_sender;
CREATE POLICY "Allow gateway full access" 
ON public.otp_sender
FOR ALL 
USING (true)
WITH CHECK (true);

-- 7. Test Insertion into otp_sender (Example raw insert)
-- INSERT INTO public.otp_sender (phone, otp) VALUES ('+8801700000000', '849201');
