
export interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
  referral_code: string;
  avatar: string;
  last_spin_date?: string;
  last_scratch_date?: string;
  signup_date: string;
  is_blocked?: boolean;
  ip_address?: string;
  device_id?: string;
  total_earned: number;
  total_withdrawn: number;
  
  // Fraud AI Fields
  fraud_score?: number;
  device_fingerprint?: string;
  is_vpn?: boolean;
  last_ip?: string;
  risk_level?: 'Normal' | 'Watch' | 'Restricted' | 'Blocked';
}

export interface UserDevice {
  id: string;
  user_id: string;
  device_fingerprint: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_used_at: string;
}

export interface FraudLog {
  id: string;
  user_id: string;
  rule_triggered: string;
  risk_score_added: number;
  description: string;
  created_at: string;
}

export interface WithdrawVelocity {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  risk_flag: boolean;
  created_at: string;
}

export type TabType = 'home' | 'games' | 'withdraw' | 'profile' | 'tasks' | 'refer' | 'admin';

export interface Transaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
  status: 'completed' | 'pending' | 'rejected';
  payment_method?: string;
  payment_detail?: string;
  transaction_id?: string;
}

export interface AppSettings {
  id: string;
  app_name: string;
  primary_color: string;
  maintenance_mode: boolean;
  min_withdrawal: number;
  referral_bonus: number;
  coin_to_inr_ratio: number;
  ad_reward_coins: number;
  ad_daily_limit: number;
  ad_cooldown: number;
  registration_open: boolean;
}

export interface Company {
  id: string;
  name: string;
  category: 'survey' | 'video' | 'ad_network';
  description?: string;
  sdk_id?: string;
  sdk_key?: string;
  survey_link?: string;
  revenue_per_completion: number;
  user_reward_percent: number;
  admin_margin_percent: number;
  user_reward_coins: number;
  status: 'active' | 'inactive';
  daily_limit: number;
}

export interface LeaderboardEntry {
  name: string;
  avatar: string;
  coins: number;
  isCurrentUser: boolean;
}
