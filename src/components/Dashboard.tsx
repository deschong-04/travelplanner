import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  Trash2, 
  ArrowRight, 
  Plus, 
  Search, 
  LogOut, 
  Globe, 
  Award, 
  Sparkles,
  Plane
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface Trip {
  id: string;
  plannerName: string;
  destination: string;
  arrivalDate: string;
  departureDate: string;
  baseCurrency?: string;
  targetCurrency?: string;
  conversionRate?: number;
  lat?: number;
  lng?: number;
  ownerId?: string;
}

interface DashboardProps {
  currentUser: any;
  userTrips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onCreateNewTripClick: () => void;
  onDeleteTrip: (tripId: string) => void;
}

const TOURIST_QUOTES = [
  "✈️ Live with no excuses and travel with no regrets.",
  "🌴 The journey of a thousand miles begins with a single step.",
  "🍜 Eat, drink, explore, repeat! Adventure is waiting.",
  "🏔️ Climb that mountain! The view is always worth the hike.",
  "🍹 Turn your wanderlust into beautiful, synchronized plans.",
  "🎒 Travel is the only thing you buy that makes you richer."
];

// Helper to assign a cute emoji and color theme to each card dynamically based on destination words
const getDestinationTheme = (dest: string | undefined | null) => {
  const norm = (dest || '').toLowerCase();
  if (norm.includes('vietnam') || norm.includes('saigon') || norm.includes('hanoi') || norm.includes('pho') || norm.includes('asia')) {
    return { 
      emoji: '🍜', 
      bg: 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600', 
      border: 'border-slate-200 hover:border-amber-400', 
      badge: 'bg-amber-50/80 text-amber-900 border-amber-200', 
      text: 'text-amber-950',
      shadow: 'hover:shadow-amber-500/10 hover:shadow-xl'
    };
  }
  if (norm.includes('japan') || norm.includes('tokyo') || norm.includes('kyoto') || norm.includes('sushi') || norm.includes('osaka')) {
    return { 
      emoji: '🍣', 
      bg: 'bg-gradient-to-r from-rose-450 via-pink-500 to-rose-650', 
      border: 'border-slate-200 hover:border-rose-400', 
      badge: 'bg-rose-55/80 text-rose-950 border-rose-200', 
      text: 'text-rose-950',
      shadow: 'hover:shadow-rose-500/10 hover:shadow-xl'
    };
  }
  if (norm.includes('singapore') || norm.includes('merlion')) {
    return { 
      emoji: '🦁', 
      bg: 'bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600', 
      border: 'border-slate-200 hover:border-sky-400', 
      badge: 'bg-sky-50/80 text-sky-950 border-sky-200', 
      text: 'text-sky-950',
      shadow: 'hover:shadow-sky-500/10 hover:shadow-xl'
    };
  }
  if (norm.includes('london') || norm.includes('uk') || norm.includes('gbp') || norm.includes('united kingdom') || norm.includes('europe')) {
    return { 
      emoji: '🏰', 
      bg: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-700', 
      border: 'border-slate-200 hover:border-indigo-400', 
      badge: 'bg-indigo-50/80 text-indigo-950 border-indigo-200', 
      text: 'text-indigo-950',
      shadow: 'hover:shadow-indigo-500/10 hover:shadow-xl'
    };
  }
  if (norm.includes('beach') || norm.includes('hawaii') || norm.includes('bali') || norm.includes('phuket')) {
    return { 
      emoji: '🌴', 
      bg: 'bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-650', 
      border: 'border-slate-200 hover:border-teal-400', 
      badge: 'bg-teal-50/80 text-teal-950 border-teal-200', 
      text: 'text-teal-950',
      shadow: 'hover:shadow-teal-500/10 hover:shadow-xl'
    };
  }
  // Default general adventurer theme
  return { 
    emoji: '🎒', 
    bg: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500', 
    border: 'border-slate-200 hover:border-indigo-400', 
    badge: 'bg-indigo-50 text-indigo-950 border-indigo-200', 
    text: 'text-indigo-950',
    shadow: 'hover:shadow-indigo-500/10 hover:shadow-xl'
  };
};

export default function Dashboard({ 
  currentUser, 
  userTrips, 
  onSelectTrip, 
  onCreateNewTripClick, 
  onDeleteTrip 
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [randomQuote] = useState(() => TOURIST_QUOTES[Math.floor(Math.random() * TOURIST_QUOTES.length)]);

  const filteredTrips = useMemo(() => {
    return userTrips.filter(trip => {
      const criteria = `${trip.plannerName || ''} ${trip.destination || ''}`.toLowerCase();
      return criteria.includes((searchTerm || '').toLowerCase());
    });
  }, [userTrips, searchTerm]);

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('saigon_custom_user');
      await signOut(auth);
      window.location.reload();
    } catch (err) {
      console.error("Signout fail:", err);
    }
  };

  // Format date range nicely
  const formatDateRange = (arr: string, dep: string) => {
    if (!arr || !dep) return 'Dates unchosen';
    try {
      const a = new Date(arr);
      const d = new Date(dep);
      const diffTime = Math.abs(d.getTime() - a.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${a.toLocaleDateString('en-US', options)} - ${d.toLocaleDateString('en-US', options)} (${diffDays} ${diffDays === 1 ? 'Day' : 'Days'})`;
    } catch {
      return `${arr} to ${dep}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      
      {/* Soft Decorative Ambient Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-indigo-100/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-24 left-12 w-[300px] h-[300px] bg-pink-100/30 rounded-full blur-[80px] pointer-events-none" />

      {/* Primary Dashboard Header - Clean White Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50 backdrop-blur-md bg-opacity-95 shadow-[0_1px_15px_-4px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/10">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest uppercase text-slate-900 leading-none">
                Atlas Travel
              </h1>
              <span className="text-[10px] font-bold text-indigo-600 tracking-wider">
                Consolidated Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Profile Info */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/70 rounded-2xl px-3 py-1.5 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-150 font-black text-[11px] text-indigo-650">
                {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[10.5px] font-black text-slate-800 leading-tight">
                  {currentUser?.displayName || "Explorer"}
                </p>
                <span className="text-[8px] font-extrabold text-slate-500 block tracking-wider uppercase">
                  {currentUser?.isGuest ? 'Guest Sandbox' : 'Synced Profile'}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-550 hover:text-rose-600 border border-slate-250/70 hover:border-rose-200 transition-all rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8 space-y-8 relative z-10">
        
        {/* Welcome Jumbotron Banner - Clean White with thick bold side accent */}
        <div className="bg-white border border-slate-200/90 rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.04)] relative overflow-hidden">
          
          <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-gradient-to-b from-indigo-500 via-pink-500 to-amber-400" />
          
          <div className="space-y-3 max-w-xl text-left pl-2 md:pl-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs text-indigo-700 font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Let's organize your next escape</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              Hey {currentUser?.displayName?.split(' ')[0] || 'Adventurer'}! 👋 <br className="hidden sm:inline"/>
              Where are we headed next?
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium italic">
              {randomQuote}
            </p>
          </div>

          <button
            onClick={onCreateNewTripClick}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/10 active:scale-95 cursor-pointer transition-all flex items-center justify-center gap-2 uppercase tracking-wider shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Create New Adventure</span>
          </button>
        </div>

        {/* Search & Statistics Panel - Soft Slate-50 bento background */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-[0_4px_25px_-5px_rgba(0,0,0,0.02)]">
          
          {/* Search Input field */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search adventures by name or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors hover:border-slate-300"
            />
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 shrink-0 select-none text-left">
            <div className="bg-slate-50 border border-slate-200/75 rounded-xl px-4 py-2 flex items-center gap-3">
              <Award className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Plans</p>
                <p className="text-xs font-black text-slate-800">{userTrips.length} active</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/75 rounded-xl px-4 py-2 flex items-center gap-3">
              <Plane className="w-5 h-5 text-pink-500 shrink-0 animate-bounce" style={{ animationDuration: '3s' }} />
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Latest Hotspot</p>
                <p className="text-xs font-black text-slate-800 truncate max-w-[100px]">
                  {userTrips[0]?.destination || 'Uncharted 🗺️'}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Dashboard Grid Content */}
        <div className="space-y-6">
          <div className="flex items-center justify-between text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-500" />
              <span>Planned Destinations ({filteredTrips.length})</span>
            </h3>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="text-[10px] uppercase font-extrabold text-indigo-600 hover:text-indigo-500 cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {filteredTrips.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white border-2 border-dashed border-slate-200 rounded-[28px] p-12 text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto border border-indigo-100">
                  <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '10s' }} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-800 select-none">
                    {searchTerm ? "No plans match your query" : "No travel planners created yet"}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Create your first Master Itinerary to map location coordinates, synchronize collaborative friends, and track custom currency conversions!
                  </p>
                </div>
                <button
                  onClick={onCreateNewTripClick}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2.5 px-4.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 uppercase tracking-wider shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Map New Destination</span>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                layout
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredTrips.map((trip) => {
                  const theme = getDestinationTheme(trip.destination);
                  return (
                    <motion.div
                      layout
                      key={trip.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -3, scale: 1.005 }}
                      transition={{ duration: 0.2 }}
                      className={`bg-white border ${theme.border} rounded-[24px] p-5 flex flex-col justify-between gap-5 shadow-[0_4px_15px_-4px_rgba(0,0,0,0.03)] ${theme.shadow || ''} transition-all relative overflow-hidden group`}
                    >
                      {/* Subtle elegant theme color top line accent */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.bg} border-b border-black/5`} />

                      <div className="space-y-3.5 relative z-10 text-left pt-2">
                        {/* Header Destination Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`${theme.badge} text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border`}>
                            {theme.emoji} {trip.destination || 'Adventure'}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 font-mono">
                            TRIP ID: {trip.id}
                          </span>
                        </div>

                        {/* Planner Custom Name */}
                        <div className="space-y-0.5">
                          <h4 className="text-base font-black text-slate-900 group-hover:text-indigo-650 transition-colors leading-snug line-clamp-2">
                            {trip.plannerName || 'Unnamed Adventure'}
                          </h4>
                        </div>

                        {/* Stats Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl text-[10px]">
                          <div className="space-y-0.5">
                            <span className="text-slate-400 font-black block uppercase tracking-widest text-[8px]">Duration</span>
                            <span className="text-slate-700 font-bold">{formatDateRange(trip.arrivalDate, trip.departureDate)}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-400 font-black block uppercase tracking-widest text-[8px]">Currencies</span>
                            <span className="text-slate-700 font-bold uppercase">{trip.baseCurrency || 'SGD'} ➔ {trip.targetCurrency || 'USD'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 relative z-10">
                        {deletingId === trip.id ? (
                          <div className="flex items-center justify-between w-full gap-2 py-0.5">
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider animate-pulse">Delete this?</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(null);
                                }}
                                className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-500 hover:text-slate-705 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-all"
                              >
                                No
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTrip(trip.id);
                                  setDeletingId(null);
                                }}
                                className="px-2.5 py-1 text-[10px] font-black uppercase text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-all shadow-sm shadow-rose-600/10"
                              >
                                Yes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Delete Trip Icon Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(trip.id);
                              }}
                              className="p-2 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-all cursor-pointer flex items-center justify-center/50"
                              title="Delete trip plan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Open Plan CTA */}
                            <button
                              onClick={() => onSelectTrip(trip.id)}
                              className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-100/80 hover:border-indigo-600 px-4 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shadow-sm"
                            >
                              <span>Launch</span>
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                            </button>
                          </>
                        )}
                      </div>

                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

    </div>
  );
}
