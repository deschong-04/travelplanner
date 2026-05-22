import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  MapPin, 
  Users, 
  ArrowRightLeft, 
  Sparkles, 
  Lock, 
  ArrowRight,
  Mail,
  User,
  AlertCircle,
  Copy,
  Check,
  Globe,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase, mapSupabaseUser, isSupabaseConfigured } from '../supabase';

interface LandingPageProps {
  onLoginSuccess: (user: any) => void;
}

// Fun floating travel-related emojis to bounce on the bright canvas
const FLOATING_ITEMS = [
  { emoji: '✈️', label: 'Flight', x: '10%', y: '12%', delay: 0 },
  { emoji: '🌴', label: 'Beach', x: '82%', y: '10%', delay: 1.5 },
  { emoji: '🍜', label: 'Food', x: '6%', y: '75%', delay: 0.8 },
  { emoji: '🏔️', label: 'Explore', x: '86%', y: '74%', delay: 2.2 },
  { emoji: '🎫', label: 'Ticket', x: '42%', y: '6%', delay: 1.1 },
  { emoji: '🍹', label: 'Chill', x: '93%', y: '40%', delay: 2.8 },
  { emoji: '📸', label: 'Memories', x: '4%', y: '42%', delay: 1.9 },
  { emoji: '🎒', label: 'Adventure', x: '48%', y: '86%', delay: 2.5 },
];

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.host : '';
  const isStandalone = typeof window !== 'undefined' && (
    (window.navigator as any).standalone || 
    window.matchMedia('(display-mode: standalone)').matches
  );

  const handleCopyHost = () => {
    navigator.clipboard.writeText(currentHost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet! Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY inside secrets.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        if (!email || !password) {
          setError('Email and password are required');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const { data, error: sbError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              displayName: name || 'Explorer',
              name: name || 'Explorer'
            }
          }
        });
        if (sbError) throw sbError;
        if (!data.user) throw new Error('Sign up failed');
        onLoginSuccess(mapSupabaseUser(data.user));
      } else {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (sbError) throw sbError;
        if (!data.user) throw new Error('Sign in failed');
        onLoginSuccess(mapSupabaseUser(data.user));
      }
    } catch (err: any) {
      console.error("Auth helper error:", err);
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet! Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY inside secrets.');
      setLoading(false);
      return;
    }

    try {
      const { error: sbError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (sbError) throw sbError;
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      setError(err?.message || 'Google Auth Error');
    } finally {
      setLoading(false);
    }
  };

  const isUnauthorizedDomain = false;

  return (
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans">
      
      {/* Off-White Visual Grid & Soft Atmospheric Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
      
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-indigo-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[45%] h-[45%] bg-pink-100/50 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Travel Emojis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {FLOATING_ITEMS.map((item, index) => (
          <motion.div
            key={index}
            className="absolute text-3xl md:text-4xl filter drop-shadow-sm select-none"
            style={{ left: item.x, top: item.y }}
            animate={{
              y: [0, -12, 0],
              rotate: [0, index % 2 === 0 ? 8 : -8, 0]
            }}
            transition={{
              duration: 6 + (index % 3) * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay
            }}
            aria-hidden="true"
          >
            {item.emoji}
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 py-6">
        
        {/* Left Side: Dynamic App Introduction & Tagline */}
        <div className="lg:col-span-7 space-y-6 text-left px-4 md:px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 shadow-sm"
          >
            <Compass className="w-4 h-4 animate-spin text-pink-500" style={{ animationDuration: '8s' }} />
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600">
              Fun & Seamless Travel Planner
            </span>
          </motion.div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6.5xl font-extrabold tracking-tight text-slate-900 leading-none">
              Atlas Travel <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-500">
                Master Planner
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 font-medium leading-relaxed max-w-lg">
              Design, coordinate, and track custom itineraries in real-time. Say goodbye to messy spreadsheets and hello to elegantly organized, interactive travel maps! 🌴🎒
            </p>
          </div>

            {/* Key Value Pillars - Beautiful modern white bento cards */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-650 shrink-0 border border-indigo-100 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-slate-800">Live Multiplayer Sync</h4>
                  <p className="text-xs text-slate-500 leading-normal font-medium">
                    Invite friends to co-plan live across distinct devices with instant synchronization.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-650 shrink-0 border border-pink-100 group-hover:scale-110 transition-transform">
                  <MapPin className="w-5 h-5 text-pink-505" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-slate-800">Dynamic Stop Sequencer</h4>
                  <p className="text-xs text-slate-500 leading-normal font-medium">
                    Map and calculate custom paths, days, times, and travel checkpoints easily.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-650 shrink-0 border border-amber-100 group-hover:scale-110 transition-transform">
                  <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-slate-800">Advanced Currencies</h4>
                  <p className="text-xs text-slate-500 leading-normal font-medium">
                    Calculate real-time currency exchanges and monitor global travel costs instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-650 shrink-0 border border-emerald-100 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-slate-800">Smart Gemini Guides</h4>
                  <p className="text-xs text-slate-500 leading-normal font-medium">
                    Unlock curated summaries, food lists, and location suggestions on-demand.
                  </p>
                </div>
              </div>
            </div>
        </div>

        {/* Right Side: Modern High-Contrast White Travel Form */}
        <div className="lg:col-span-5 px-4 md:px-0">
          <div className="bg-white border border-slate-200/90 rounded-[32px] p-6 md:p-8 shadow-[0_15px_40px_-5px_rgba(0,0,0,0.08)] relative overflow-hidden text-slate-800">
            
            {/* Visual gradient top crown accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-pink-500 to-amber-400" />
            
            <div className="space-y-6 text-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {mode === 'login' ? 'Let\'s Get Rolling ✈️' : 'Assemble Trip Profile'}
                </h3>
                <p className="text-[11px] text-slate-500 font-extrabold mt-1 uppercase tracking-wider">
                  Access maps, coordinates & real-time team coordinates
                </p>
              </div>

              {/* Beautiful Slide Tab Controller */}
              <div className="bg-slate-100 p-1 rounded-2xl flex relative z-10 border border-slate-200/40">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 text-center py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    mode === 'login' ? 'bg-white text-indigo-750 shadow-sm' : 'text-slate-550 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`flex-1 text-center py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    mode === 'signup' ? 'bg-white text-indigo-750 shadow-sm' : 'text-slate-550 hover:text-slate-800'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Advanced Error / Whitelist Box */}
              {isUnauthorizedDomain ? (
                <div className="bg-rose-50 text-rose-850 border border-rose-200/80 p-4 rounded-2xl flex flex-col gap-2.5 text-left text-xs leading-normal font-sans shadow-sm">
                  <div className="flex items-start gap-2 select-none">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span className="font-black text-[11px] uppercase tracking-wider text-rose-800">
                      Domain Authorization Needed
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-700 leading-relaxed font-semibold">
                    Firebase Auth restricts client sign-ins on dynamic URLs until added to your project's authenticated list.
                  </p>
                  
                  {/* Current Host Copy Container */}
                  <div className="bg-white border border-rose-100 rounded-xl p-2.5 flex items-center justify-between gap-2.5 mt-1">
                    <div className="overflow-hidden">
                      <p className="text-[9px] uppercase tracking-widest text-slate-500 font-extrabold">Current Domain Host</p>
                      <p className="text-slate-800 text-[11px] font-mono select-all truncate mt-0.5 font-black">
                        {currentHost || 'ais-dev-...'}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyHost}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-650 p-2 rounded-lg transition-colors border border-slate-200 shrink-0 cursor-pointer"
                      title="Copy host name"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    </button>
                  </div>

                  <p className="text-[9px] text-slate-500 leading-relaxed font-medium">
                    💡 <strong>Quick Fix:</strong> Paste inside Firebase Auth &gt; Settings &gt; Authorized Domains in your Firebase Console.
                  </p>
                </div>
              ) : (
                error && (
                  <div className="bg-rose-50 text-rose-800 border border-rose-200/60 p-3.5 rounded-2xl flex items-start gap-2 text-left text-[11.5px] font-semibold leading-relaxed shadow-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )
              )}

              {/* Styled High-Contrast Input Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extra-black uppercase tracking-widest text-[#4f46e5] block px-1">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Rachel Green"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-slate-50 border border-slate-200/90 rounded-2xl pl-10 pr-4 py-3 text-base md:text-sm text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-650 w-full hover:border-slate-300 transition-colors"
                        maxLength={40}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extra-black uppercase tracking-widest text-[#4f46e5] block px-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-50 border border-slate-200/90 rounded-2xl pl-10 pr-4 py-3 text-base md:text-sm text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-650 w-full hover:border-slate-300 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extra-black uppercase tracking-widest text-[#4f46e5] block px-1">
                    Secure Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-50 border border-slate-200/90 rounded-2xl pl-10 pr-4 py-3 text-base md:text-sm text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-650 w-full hover:border-slate-300 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-sm py-3 rounded-2xl transition-all cursor-pointer shadow-md shadow-indigo-600/10 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Sign In' : 'Register & Plan'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider Splitting line */}
              <div className="flex items-center text-slate-300 gap-3 my-2 select-none">
                <div className="h-[1px] bg-slate-200 flex-1" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 shrink-0">
                  Or Instant Connection
                </span>
                <div className="h-[1px] bg-slate-200 flex-1" />
              </div>

              {/* iOS Standalone Friendly Warning/Helper Info */}
              {isStandalone && (
                <div className="bg-amber-50/90 text-amber-900 border border-amber-200/50 p-3.5 rounded-2xl text-xs leading-relaxed text-left font-semibold shadow-inner">
                  <span className="inline-block mr-1">💡</span>
                  <strong>iOS Standalone Web Clip Detected</strong>:<br/>
                  Apple's custom Web Clip sandbox limits standard Google Sign-In popups/redirects.
                  Please register or log in using <strong className="font-extrabold text-indigo-700 underline">Email & Password</strong> above, which works flawlessly right here!
                </div>
              )}

              {/* Clean stylish Google button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-black text-xs py-3 rounded-2xl transition-all cursor-pointer border border-slate-200 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4 grow-0 shrink-0 text-slate-700" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.71 0 3.27.61 4.5 1.62l2.437-2.437C17.312 1.696 14.933 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.254-4.074 10.254-10.24 0-.695-.081-1.355-.224-1.955H12.24z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
