-- ==============================================================================
-- 👑 FRAUD AI DATABASE TABLES & SCHEMA UPDATE
-- Run this in your Supabase SQL Editor to upgrade your database for Fraud AI.
-- ==============================================================================

-- 1. Update existing 'profiles' table with Fraud AI columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS fraud_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS is_vpn BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_ip TEXT,
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'Normal'; -- Normal, Watch, Restricted, Blocked

-- 2. Create 'user_devices' table (For Multi-account & Emulator detection)
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create 'fraud_logs' table (To track suspicious activities & AI flags)
CREATE TABLE IF NOT EXISTS fraud_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rule_triggered TEXT NOT NULL,
    risk_score_added INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create 'withdraw_velocity' table (To track rapid withdrawal fraud)
CREATE TABLE IF NOT EXISTS withdraw_velocity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, flagged
    risk_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add Indexes for fast querying (Crucial for real-time AI checks)
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_ip ON user_devices(ip_address);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_user ON fraud_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_velocity_user ON withdraw_velocity(user_id);

-- ==============================================================================
-- ✅ DONE: Your database is now ready for Enterprise-Level Fraud Detection!
-- ==============================================================================
