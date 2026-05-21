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
  HelpCircle,
  Copy,
  Check,
  Globe,
  Plane,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  signInWithRedirect
} from 'firebase/auth';

interface LandingPageProps {
  onLoginSuccess: (user: any) => void;
}

// Fun floating items to animate on background
const FLOATING_ITEMS = [
  { emoji: '✈️', label: 'Flight', x: '10%', y: '15%', delay: 0 },
  { emoji: '🌴', label: 'Beach', x: '82%', y: '12%', delay: 1.5 },
  { emoji: '🍜', label: 'Food', x: '8%', y: '75%', delay: 0.8 },
  { emoji: '🏔️', label: 'Explore', x: '85%', y: '72%', delay: 2.2 },
  { emoji: '🎫', label: 'Ticket', x: '45%', y: '8%', delay: 1.1 },
  { emoji: '🍹', label: 'Chill', x: '92%', y: '42%', delay: 2.8 },
  { emoji: '📸', label: 'Memories', x: '3%', y: '45%', delay: 1.9 },
  { emoji: '🎒', label: 'Adventure', x: '50%', y: '85%', delay: 2.5 },
];

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSandboxLoading, setIsSandboxLoading] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.host : '';

  const handleCopyHost = () => {
    navigator.clipboard.writeText(currentHost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSandboxEnter = () => {
    setIsSandboxLoading(true);
    setTimeout(() => {
      onLoginSuccess({
        uid: 'sandbox_guest_explorer',
        displayName: 'Guest Explorer 🎒',
        email: 'explorer@sandbox.travel',
        photoURL: null,
        isGuest: true
      });
      setIsSandboxLoading(false);
    }, 700);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
        const res = await createUserWithEmailAndPassword(auth, email, password);
        if (name && res.user) {
          await updateProfile(res.user, { displayName: name });
        }
        onLoginSuccess({ ...res.user, displayName: name || res.user.displayName });
      } else {
        const res = await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      console.error("Auth helper error:", err);
      let errMsg = err.message || 'Authentication failed';
      if (err.code === 'auth/user-not-found') {
        errMsg = 'No account found with this email. Please sign up instead!';
      } else if (err.code === 'auth/wrong-password') {
        errMsg = 'Incorrect email or password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'An account already exists with this email address.';
      } else if (err.code === 'auth/unauthorized-domain' || errMsg.toLowerCase().includes('unauthorized-domain') || errMsg.toLowerCase().includes('unauthorized domain')) {
        errMsg = 'unauthorized-domain';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isSafari || isIOS) {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err: any) {
        console.error("Redirect login error:", err);
        if (err.code === 'auth/unauthorized-domain' || err.message?.toLowerCase().includes('unauthorized-domain')) {
          setError('unauthorized-domain');
        } else {
          setError(err.message || "Failed to sign in with Google redirect");
        }
        setLoading(false);
      }
      return;
    }

    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res?.user) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      console.error("Popup login error:", err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup')) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr: any) {
          if (redirectErr.code === 'auth/unauthorized-domain' || redirectErr.message?.toLowerCase().includes('unauthorized-domain')) {
            setError('unauthorized-domain');
          } else {
            setError(redirectErr.message || "Google redirect rejected");
          }
          setLoading(false);
        }
      } else if (err.code === 'auth/unauthorized-domain' || err.message?.toLowerCase().includes('unauthorized-domain')) {
        setError('unauthorized-domain');
        setLoading(false);
      } else {
        setError(err.message || 'Google Auth Error');
        setLoading(false);
      }
    }
  };

  const isUnauthorizedDomain = error === 'unauthorized-domain';

  return (
    <div className="relative min-h-screen bg-slate-900 flex items-center justify-center p-4 md:p-8 overflow-hidden">
      
      {/* Decorative Travel Grid Background & Atmospheric Lights */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
      
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4f46e5]/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ec4899]/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Interactive Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {FLOATING_ITEMS.map((item, index) => (
          <motion.div
            key={index}
            className="absolute text-3xl md:text-4xl filter drop-shadow-lg"
            style={{ left: item.x, top: item.y }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, index % 2 === 0 ? 10 : -10, 0]
            }}
            transition={{
              duration: 5 + (index % 3) * 2,
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
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#4f46e5]/10 border border-[#4f46e5]/20 rounded-full text-indigo-400"
          >
            <Compass className="w-4 h-4 animate-spin text-pink-500" style={{ animationDuration: '8s' }} />
            <span className="text-[10px] uppercase font-black tracking-widest text-[#a5b4fc]">
              Fun & Seamless Travel Planner
            </span>
          </motion.div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Atlas Travel <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-pink-400 to-amber-300">
                Master Planner
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 font-medium leading-relaxed max-w-lg">
              Design, coordinate, and track custom itineraries in real-time. Say goodbye to messy sheets and hello to beautifully planned adventures across any city or country! 🌴🎒
            </p>
          </div>

          {/* Key Value Pillars */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-3 bg-slate-800/40 backdrop-blur-md border border-slate-700/55 rounded-2xl p-4 shadow-xl hover:translate-y-[-2px] transition-transform">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
                <Users className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Live Multiplayer Sync</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  Invite friends to co-plan live across distinct devices with instant synchronization.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-800/40 backdrop-blur-md border border-slate-700/55 rounded-2xl p-4 shadow-xl hover:translate-y-[-2px] transition-transform">
              <div className="w-9 h-9 rounded-xl bg-[#ec4899]/15 flex items-center justify-center text-pink-400 shrink-0 border border-[#ec4899]/20">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Dynamic Stop Sequencer</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  Map and calculate custom paths, days, times, and travel checkpoints.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-800/40 backdrop-blur-md border border-slate-700/55 rounded-2xl p-4 shadow-xl hover:translate-y-[-2px] transition-transform">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/20">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Advanced Currency Converter</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  Set dynamic currency exchange factors to see instant itinerary budget totals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-800/40 backdrop-blur-md border border-slate-700/55 rounded-2xl p-4 shadow-xl hover:translate-y-[-2px] transition-transform">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Smart Gemini Spotter</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  Receive location-aware, handpicked destination helper guides instantly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Travel Authentication Widget */}
        <div className="lg:col-span-5 px-4 md:px-0">
          <div className="bg-slate-850/80 backdrop-blur-xl border border-slate-700/60 rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden text-white">
            
            {/* Visual gradient crown line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-pink-500 to-amber-300" />
            
            <div className="space-y-6 text-center">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  {mode === 'login' ? 'Let\'s Get Rolling ✈️' : 'Assemble Trip Profile'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
                  Select authentication to coordinate real-time maps
                </p>
              </div>

              {/* Sandbox Quick Access Bypass Button (HIGHLY VISIBLE, PREVENTS BLOCKS!) */}
              <div className="bg-gradient-to-r from-indigo-600/20 to-pink-600/20 border border-indigo-500/30 p-4 rounded-2xl text-left space-y-2.5 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-pink-500 rounded-full animate-ping" />
                  <span className="text-xs font-extrabold text-indigo-300 uppercase tracking-widest">
                    Quick Sandbox (No Setup Needed)
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-normal font-sans">
                  Instantly explore and test all route sequencing, budgeting, and multiplayer features. Bypasses domain config.
                </p>
                <button
                  onClick={handleSandboxEnter}
                  disabled={isSandboxLoading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-extrabold text-[11px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 uppercase tracking-wider"
                >
                  {isSandboxLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Explore Sandbox as Guest</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Login/Signup Regular Toggle Tab */}
              <div className="bg-slate-800 p-1 rounded-2xl flex relative z-10 border border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 text-center py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    mode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
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
                  className={`flex-1 text-center py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    mode === 'signup' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Dynamic Error State and Helpful Domain Fixer */}
              {isUnauthorizedDomain ? (
                <div className="bg-rose-950/80 text-rose-300 border border-rose-800/60 p-4 rounded-2xl flex flex-col gap-2.5 text-left text-xs leading-normal">
                  <div className="flex items-start gap-2 select-none">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-450 mt-0.5" />
                    <span className="font-bold text-[11px] uppercase tracking-wider text-rose-200">
                      Domain Whitelist Needed
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-300/90 leading-relaxed font-semibold">
                    Firebase Auth restricts credentials on dynamic app URLs until whitelisted in your Firebase project console.
                  </p>
                  
                  {/* Whitelisting details snippet */}
                  <div className="bg-slate-900 border border-rose-800/30 rounded-xl p-2.5 flex items-center justify-between gap-2.5 mt-1">
                    <div className="overflow-hidden">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold">Current Domain Host</p>
                      <p className="text-slate-200 text-[11px] font-mono select-all truncate mt-0.5 font-bold">
                        {currentHost || 'ais-dev-...'}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyHost}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg transition-colors border border-slate-700 shrink-0 cursor-pointer"
                      title="Copy host name"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="text-[9px] text-slate-400 leading-normal leading-relaxed">
                    💡 <strong>Quick Fix:</strong> Copy the host, navigate to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains, and add it. Or click <strong>"Explore Sandbox"</strong> above to play instantly!
                  </p>
                </div>
              ) : (
                error && (
                  <div className="bg-rose-950/80 text-rose-200 border border-rose-800/60 p-3.5 rounded-2xl flex items-start gap-2 text-left text-[11.5px] font-medium leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-450 mt-0.5" />
                    <span>⚠️ {error}</span>
                  </div>
                )
              )}

              {/* Login or Signup Forms */}
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#a5b4fc] block px-1">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rachel Green"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-slate-900 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-inner"
                        maxLength={40}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#a5b4fc] block px-1">
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
                      className="bg-slate-900 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#a5b4fc] block px-1">
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
                      className="bg-slate-900 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-extrabold text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
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

              {/* Split Line divider */}
              <div className="flex items-center text-slate-600 gap-3 my-2 select-none">
                <div className="h-[1px] bg-slate-700 flex-1 opacity-55" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 shrink-0">
                  Or Social Logins
                </span>
                <div className="h-[1px] bg-slate-700 flex-1 opacity-55" />
              </div>

              {/* Google Connection Provider */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs py-3 rounded-2xl transition-all cursor-pointer border border-slate-700/80 shadow-md active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4 grow-0 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor">
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
