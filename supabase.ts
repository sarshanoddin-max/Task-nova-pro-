
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rokygeeqgqsqhaqtadji.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJva3lnZWVxZ3FzcWhhcXRhZGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjAxODIsImV4cCI6MjA4NjAzNjE4Mn0.CVXiKvoHNuZfvddZbNi3iCgKdfToLf_I7aZC1oTOA7w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'pro-rewards-auth-token'
  }
});

export const SETUP_SQL = `-- SPRINT TAP MASTER V2 SETUP

-- 1. Profiles (Enhanced)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  balance BIGINT DEFAULT 0,
  referral_code TEXT UNIQUE,
  avatar TEXT,
  is_blocked BOOLEAN DEFAULT false,
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  total_earned BIGINT DEFAULT 0,
  total_withdrawn BIGINT DEFAULT 0,
  ip_address TEXT,
  device_id TEXT
);

-- 2. Companies / Surveys / Networks
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'video',
  survey_link TEXT,
  sdk_id TEXT,
  sdk_key TEXT,
  revenue_per_completion FLOAT DEFAULT 1.0,
  user_reward_percent INTEGER DEFAULT 50,
  admin_margin_percent INTEGER DEFAULT 50,
  user_reward_coins INTEGER DEFAULT 50,
  status TEXT DEFAULT 'active',
  daily_limit INTEGER DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. App Global Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  app_name TEXT DEFAULT 'Task Nova Pro',
  primary_color TEXT DEFAULT '#6366f1',
  maintenance_mode BOOLEAN DEFAULT false,
  min_withdrawal INTEGER DEFAULT 100,
  referral_bonus INTEGER DEFAULT 50,
  coin_to_inr_ratio INTEGER DEFAULT 100,
  ad_reward_coins INTEGER DEFAULT 15,
  ad_daily_limit INTEGER DEFAULT 30,
  ad_cooldown INTEGER DEFAULT 60,
  registration_open BOOLEAN DEFAULT true
);

-- 4. Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT,
  amount BIGINT,
  description TEXT,
  status TEXT DEFAULT 'completed',
  payment_method TEXT,
  payment_detail TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.companies FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.app_settings FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.transactions FOR ALL USING (true);
`;
