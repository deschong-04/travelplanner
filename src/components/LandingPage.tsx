import React, { useState } from 'react';
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
  Calendar,
  AlertCircle
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

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        setError(err.message || "Failed to sign in with Google redirect");
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
          setError(redirectErr.message || "Google redirect rejected");
          setLoading(false);
        }
      } else {
        setError(err.message || 'Google Auth Error');
        setLoading(false);
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/20 to-indigo-50/30 flex items-center justify-center p-4 overflow-hidden">
      {/* Visual Ambient Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-200/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 py-8">
        
        {/* Left Side: Creative & Elegant Introduction */}
        <div className="lg:col-span-7 space-y-6 text-left px-4 md:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <Compass className="w-4 h-4 text-indigo-600 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-[10px] uppercase font-extrabold text-indigo-700 tracking-wider">
              Exclusive Travel Suite
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Saigon Travel <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600">
                Master Planner
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed max-w-lg">
              Design, optimize, and synchronize your perfect Saigon travel itinerary with real-time multiplayer coordination and dynamic local metrics.
            </p>
          </div>

          {/* Key Value Pillars */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-3 bg-white/60 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-transform">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800">Live Team Sync</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  Plan itineraries with friends dynamically across devices without latency.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/60 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-transform">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800">Interactive Routing</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  Map and coordinate exact stops sequentially day-by-day.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/60 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-transform">
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800">Dynamic Currencies</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  Configure custom conversion factors and auto-convert itinerary costs instantly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/60 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-transform">
              <div className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800">AI Spot Assistant</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  Leverage secure, context-aware smart additions for top Saigon locations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Elegant Gated Authentication Card */}
        <div className="lg:col-span-5 px-4 md:px-0">
          <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden">
            
            {/* Soft decorative visual border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
            
            <div className="space-y-6 text-center">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  {mode === 'login' ? 'Welcome Back, Explorer' : 'Create Travel Profile'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Authenticate to lock, edit, or sync itinerary maps
                </p>
              </div>

              {/* Toggle Tab */}
              <div className="bg-slate-100 p-1 rounded-2xl flex relative z-10">
                <button
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {error && (
                <div className="bg-rose-50 text-rose-600 border border-rose-100/55 p-3 rounded-2xl flex items-start gap-2.5 text-left text-[11px] font-bold uppercase tracking-normal select-none">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span className="leading-snug">⚠️ {error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block px-1">
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
                        className="bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-inner"
                        maxLength={40}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block px-1">
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
                      className="bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block px-1">
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
                      className="bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Sign In Planner' : 'Register & Start'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center text-slate-300 gap-3 my-2 select-none">
                <div className="h-[1px] bg-slate-200 flex-1" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 shrink-0">
                  Or Instant Connection
                </span>
                <div className="h-[1px] bg-slate-200 flex-1" />
              </div>

              {/* Google Federated Authentication Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs py-3 rounded-2xl transition-all cursor-pointer border border-slate-200 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4 grow-0 shrink-0 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
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
