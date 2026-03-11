
import React, { useState, useEffect, useCallback } from 'react';
import { User, TabType, Transaction, LeaderboardEntry, AppSettings } from './types';
import { supabase } from './supabase';
import { checkMultiAccountFraud, checkWithdrawalVelocity } from './services/fraudAi';
import Auth from './screens/Auth';
import Home from './screens/Home';
import Games from './screens/Games';
import Withdraw from './screens/Withdraw';
import Profile from './screens/Profile';
import Tasks from './screens/Tasks';
import Refer from './screens/Refer';
import Admin from './screens/Admin';
import Navbar from './components/Navbar';
import Header from './components/Header';
import Logo from './components/Logo';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('is_admin_session') === 'true');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  const ADMIN_EMAIL = "tasknovapro@gmail.com";

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBtn(false);
    setDeferredPrompt(null);
  };

  const loadGlobalSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').single();
    if (data) setSettings(data);
  };

  const loadInitialData = useCallback(async (userId: string) => {
    try {
      const [txsResponse, lbResponse] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name, avatar, balance').order('balance', { ascending: false }).limit(50)
      ]);

      if (txsResponse.data) setTransactions(txsResponse.data as any);
      if (lbResponse.data) {
        setLeaderboard(lbResponse.data.map(d => ({
          name: d.name,
          avatar: d.avatar,
          coins: d.balance,
          isCurrentUser: userId === d.id
        })));
      }
      
      // 👑 FRAUD AI: Run background check on login
      checkMultiAccountFraud(userId);
      
    } catch (err) {
      console.error("Data load error:", err);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string, email: string): Promise<User | null> => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) return data as User;

      const name = email.split('@')[0];
      const referralCode = (name.slice(0, 3) + Math.floor(100 + Math.random() * 900)).toUpperCase();
      
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          name: name,
          email: email,
          balance: 0,
          referral_code: referralCode,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
          signup_date: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      return newProfile as User;
    } catch (err) {
      console.error("Profile fetch exception:", err);
    }
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;
    const initApp = async () => {
      await loadGlobalSettings();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && mounted) {
        if (session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setIsAdmin(true);
          localStorage.setItem('is_admin_session', 'true');
        } else {
          const profile = await fetchProfile(session.user.id, session.user.email!);
          if (profile) {
            setUser(profile);
            await loadInitialData(session.user.id);
          }
        }
      }
      if (mounted) setLoading(false);
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        if (session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setIsAdmin(true);
          localStorage.setItem('is_admin_session', 'true');
        } else {
          const profile = await fetchProfile(session.user.id, session.user.email!);
          if (profile) {
            setUser(profile);
            await loadInitialData(session.user.id);
          }
        }
      } else {
        if (localStorage.getItem('is_admin_session') !== 'true') {
          setUser(null);
          setIsAdmin(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, loadInitialData]);

  const updateBalance = async (amount: number, description: string = "Reward", metadata: any = {}) => {
    if (!user) return;
    
    // 👑 FRAUD AI: Check withdrawal velocity before processing a debit
    if (amount < 0) {
      const isFlagged = await checkWithdrawalVelocity(user.id, Math.abs(amount));
      if (isFlagged) {
        alert("Security Alert: Withdrawal flagged for manual review due to rapid requests.");
        // We can either block it completely or let it go to pending.
        // For now, we'll let it proceed to 'pending' but it's already logged in fraud_logs.
      }
    }

    const newBalance = user.balance + amount;
    
    // Extract transaction specific metadata
    const { payment_method, payment_detail, ...userMetadata } = metadata;
    
    try {
      const { error } = await supabase.from('profiles').update({ balance: newBalance, ...userMetadata }).eq('id', user.id);
      if (!error) {
        setUser(prev => prev ? { ...prev, balance: newBalance, ...userMetadata } : null);
        const { data: tx } = await supabase.from('transactions').insert([{
          user_id: user.id,
          type: amount > 0 ? 'credit' : 'debit',
          amount: Math.abs(amount),
          description,
          status: amount < 0 ? 'pending' : 'completed', // Withdrawals are always pending initially
          payment_method: payment_method || null,
          payment_detail: payment_detail || null
        }]).select().single();
        if (tx) setTransactions(prev => [tx as any, ...prev]);
      }
    } catch (err) {
      console.error("Balance update failed:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('is_admin_session');
    setUser(null);
    setIsAdmin(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Logo size={80} className="animate-pulse" />
    </div>
  );

  if (settings?.maintenance_mode && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-6 border border-amber-500/30">
          <i className="fas fa-tools text-amber-500 text-3xl"></i>
        </div>
        <h1 className="text-white font-black text-2xl uppercase tracking-tighter">Under Maintenance</h1>
        <p className="text-slate-500 text-sm mt-4">We're updating the systems for a better experience. We'll be back shortly!</p>
      </div>
    );
  }

  if (isAdmin) return <Admin onLogout={handleLogout} />;
  if (!user) return <Auth onLogin={(res) => res === 'admin' ? setIsAdmin(true) : setUser(res)} />;

  const primaryColor = settings?.primary_color || '#6366f1';

  return (
    <div className="min-h-screen bg-slate-900 pb-24 text-slate-50 font-sans" style={{ '--primary': primaryColor } as React.CSSProperties}>
      <Header 
        user={user} 
        appName={settings?.app_name || "Task Nova Pro"} 
        showInstallBtn={showInstallBtn} 
        onInstall={handleInstallClick}
      />
      <main className="container mx-auto max-w-md px-4 pt-4">
        {activeTab === 'home' && (
          <Home 
            user={user} 
            leaderboard={leaderboard} 
            updateBalance={updateBalance} 
            setTab={setActiveTab} 
            onSpinComplete={(r) => updateBalance(r, "Daily Spin", { last_spin_date: new Date().toDateString() })}
            onScratchComplete={(r) => updateBalance(r, "Daily Scratch", { last_scratch_date: new Date().toDateString() })}
          />
        )}
        {activeTab === 'games' && <Games user={user} onSpinComplete={(r) => updateBalance(r, "Game Win")} onScratchComplete={() => {}} />}
        {activeTab === 'withdraw' && <Withdraw user={user} updateBalance={(r) => updateBalance(r, "Withdrawal Request")} />}
        {activeTab === 'profile' && <Profile user={user} transactions={transactions} setTab={setActiveTab} onLogout={handleLogout} updateName={(n) => updateBalance(0, "Name Change", { name: n })} />}
        {activeTab === 'tasks' && <Tasks setTab={setActiveTab} user={user} updateBalance={updateBalance} />}
        {activeTab === 'refer' && <Refer user={user} setTab={setActiveTab} />}
      </main>
      <Navbar activeTab={activeTab === 'tasks' || activeTab === 'refer' ? 'home' : activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;
