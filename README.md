# Supabase Outbound SMS Gateway (Android App + Web Dashboard)

এই রিপোজিটরিতে **২টি অংশ** রয়েছে:

1. **Android App (`android/` ফোল্ডারে):** 
   - এটি আসল অ্যান্ড্রয়েড অ্যাপ (Kotlin)।
   - মোবাইলে ইনস্টল করে সিম কার্ডের মাধ্যমে Supabase থেকে SMS পাঠানোর জন্য এটি তৈরি করা হয়েছে।
   - এটি কোনো ওয়েবসাইট হোস্টিংয়ে ডেপ্লয় হবে না, এটি থেকে **`.apk` ফাইল বিল্ড করতে হবে** এবং অ্যান্ড্রয়েড ফোনে ইনস্টল করতে হবে।

2. **Web Dashboard & Simulator (`src/` ফোল্ডারে):**
   - এটি একটি React + Vite ওয়েব ড্যাশবোর্ড এবং সিমুলেটর।
   - এটি আপনি Vercel, Netlify বা Cloudflare Pages-এ ওয়েব হিসেবে ডেপ্লয় করতে পারেন।

---

## ১. কিভাবে অ্যান্ড্রয়েড APK পাবেন?

### উপায় ক: GitHub Actions (সবচেয়ে সহজ - কোনো সফটওয়্যার লাগবে না)
এই রিপোজিটরিতে `.github/workflows/build-apk.yml` যোগ করা হয়েছে।
1. GitHub-এ এই রিপোজিটরি ওপেন করুন।
2. উপরে **"Actions"** ট্যাবে যান।
3. **"Build Android APK"** সিলেক্ট করে **"Run workflow"** ক্লিক করুন।
4. বিল্ড শেষ হলে নিচে **Artifacts** থেকে `app-debug.apk` ডাউনলোড করে আপনার ফোনে ইনস্টল করুন!

### উপায় খ: Android Studio দিয়ে
1. আপনার কম্পিউটারে **Android Studio** ওপেন করুন।
2. **Open** ক্লিক করে শুধুমাত্র **`android` ফোল্ডারটি** সিলেক্ট করুন।
3. `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)` ক্লিক করুন।
4. তৈরি হওয়া APK ফাইলটি আপনার ফোনে ইনস্টল করে নিন।

---

## ২. Supabase Database টেবিল তৈরি

আপনার Supabase প্রজেক্টের **SQL Editor**-এ গিয়ে `android/supabase_schema.sql` ফাইলটির কোড রান করুন:

```sql
CREATE TABLE IF NOT EXISTS public.outbound_sms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMPTZ
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.outbound_sms;
ALTER TABLE public.outbound_sms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow gateway full access" ON public.outbound_sms FOR ALL USING (true);
```

---

## ৩. ওয়েব ড্যাশবোর্ড রান/ডেপ্লয় (Vite / React)

লোকাল কম্পিউটারে ড্যাশবোর্ড চালু করতে:
```bash
npm install
npm run dev
```

প্রোডাকশন বিল্ড:
```bash
npm run build
```
Vercel বা Netlify-তে ডেপ্লয় করতে রুট ডিরেক্টরিতে `npm run build` দিলে `dist/` ফোল্ডার বিল্ড হবে।
