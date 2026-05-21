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
  DollarSign, 
  Plane, 
  Clock, 
  Activity,
  Award,
  Sparkles
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
  "🍹 Offline is the new luxury. Enjoy the sights!",
  "🎒 Travel becomes a strategy of accumulating memorable moments."
];

// Helper to assign a cute emoji and color theme to each card dynamically based on destination words
const getDestinationTheme = (dest: string) => {
  const norm = dest.toLowerCase();
  if (norm.includes('vietnam') || norm.includes('saigon') || norm.includes('hanoi') || norm.includes('pho') || norm.includes('asia')) {
    return { emoji: '🍜', bg: 'from-amber-500/10 to-yellow-500/10', border: 'border-amber-250/30', badge: 'bg-amber-500/15 text-amber-300', text: 'text-amber-450' };
  }
  if (norm.includes('japan') || norm.includes('tokyo') || norm.includes('kyoto') || norm.includes('sushi') || norm.includes('osaka')) {
    return { emoji: '🍣', bg: 'from-rose-500/10 to-pink-500/10', border: 'border-rose-250/30', badge: 'bg-rose-500/15 text-rose-300', text: 'text-rose-450' };
  }
  if (norm.includes('singapore') || norm.includes('merlion')) {
    return { emoji: '🦁', bg: 'from-sky-500/10 to-blue-500/10', border: 'border-sky-250/30', badge: 'bg-sky-500/15 text-sky-300', text: 'text-sky-450' };
  }
  if (norm.includes('london') || norm.includes('uk') || norm.includes('gbp') || norm.includes('united kingdom') || norm.includes('europe')) {
    return { emoji: '🏰', bg: 'from-indigo-500/10 to-purple-500/10', border: 'border-indigo-250/30', badge: 'bg-indigo-500/15 text-indigo-300', text: 'text-indigo-455' };
  }
  if (norm.includes('beach') || norm.includes('hawaii') || norm.includes('bali') || norm.includes('phuket')) {
    return { emoji: '🌴', bg: 'from-teal-500/10 to-emerald-500/10', border: 'border-teal-250/30', badge: 'bg-teal-500/15 text-teal-300', text: 'text-teal-450' };
  }
  // Default general adventurer theme
  return { emoji: '🎒', bg: 'from-purple-500/10 to-indigo-500/10', border: 'border-slate-700/50', badge: 'bg-slate-700/60 text-slate-300', text: 'text-indigo-400' };
};

export default function Dashboard({ 
  currentUser, 
  userTrips, 
  onSelectTrip, 
  onCreateNewTripClick, 
  onDeleteTrip 
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [randomQuote] = useState(() => TOURIST_QUOTES[Math.floor(Math.random() * TOURIST_QUOTES.length)]);

  const filteredTrips = useMemo(() => {
    return userTrips.filter(trip => {
      const criteria = `${trip.plannerName} ${trip.destination}`.toLowerCase();
      return criteria.includes(searchTerm.toLowerCase());
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
    <div className="min-h-screen bg-slate-955 text-white pb-16">
      
      {/* Decorative Atmosphere Lights */}
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-24 left-12 w-[300px] h-[300px] bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Primary Dashboard Header */}
      <header className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-md">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest uppercase text-white leading-none">
                Atlas Travel
              </h1>
              <span className="text-[10px] font-bold text-indigo-400 tracking-wider">
                Consolidated Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile */}
            <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl px-3 py-1.5 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-indigo-600/30 flex items-center justify-center border border-indigo-500/30 font-bold text-xs text-indigo-200">
                {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[10px] font-black text-slate-200 leading-tight">
                  {currentUser?.displayName || "Explorer"}
                </p>
                <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">
                  {currentUser?.isGuest ? 'Guest Sandbox Account' : 'Synced Account'}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 bg-slate-800/40 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-slate-700/50 hover:border-rose-900/60 transition-all rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8 space-y-8 relative z-10">
        
        {/* Welcome Jumbotron Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-3 max-w-xl text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Let's plan your ultimate journey</span>
            </div>
            <h2 className="text-2xl md:text-3.5xl font-black text-white tracking-tight">
              Hey {currentUser?.displayName?.split(' ')[0] || 'Adventurer'}! 👋 <br className="hidden sm:inline"/>
              Where are we headed next?
            </h2>
            <p className="text-xs text-slate-400 italic">
              {randomQuote}
            </p>
          </div>

          <button
            onClick={onCreateNewTripClick}
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-650 text-white font-extrabold text-xs px-5 py-3.5 rounded-2xl shadow-xl shadow-indigo-500/10 hover:scale-[1.02] cursor-pointer transition-all flex items-center justify-center gap-2 uppercase tracking-wider shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Create New Adventure</span>
          </button>
        </div>

        {/* Search & Overview Statistics Rail */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/60 p-4 rounded-[24px]">
          
          {/* Search Inputs */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search adventures by name or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-250 placeholder-slate-500 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 shrink-0 select-none text-left">
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3">
              <Award className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Plans</p>
                <p className="text-xs font-black text-white">{userTrips.length} active</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3">
              <Plane className="w-5 h-5 text-pink-400 shrink-0 animate-bounce" style={{ animationDuration: '3s' }} />
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Latest Hotspot</p>
                <p className="text-xs font-black text-white truncate max-w-[100px]">
                  {userTrips[0]?.destination || 'Uncharted 🗺️'}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Dashboard Grid Content */}
        <div className="space-y-6">
          <div className="flex items-center justify-between text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>Planned Destinations ({filteredTrips.length})</span>
            </h3>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="text-[10px] uppercase font-extrabold text-indigo-400 hover:text-indigo-350 cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {filteredTrips.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900 border border-dashed border-slate-800 rounded-[28px] p-12 text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-500 mx-auto">
                  <Compass className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-300">
                    {searchTerm ? "No plans match your query" : "No travel planners created yet"}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Create your first Master Itinerary to map location coordinates, synchronize collaborative friends, and track custom conversions!
                  </p>
                </div>
                <button
                  onClick={onCreateNewTripClick}
                  className="bg-indigo-600/30 hover:bg-indigo-600/45 text-indigo-300 border border-indigo-500/20 font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 uppercase"
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
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className={`bg-slate-900 border ${theme.border} rounded-[24px] p-5 flex flex-col justify-between gap-5 shadow-lg relative overflow-hidden group hover:shadow-2xl transition-all`}
                    >
                      {/* Interactive background accent glow */}
                      <div className={`absolute -right-12 -top-12 w-24 h-24 bg-gradient-to-br ${theme.bg} rounded-full blur-2xl opacity-75 group-hover:scale-125 transition-transform duration-500`} />
                      
                      <div className="space-y-3.5 relative z-10 text-left">
                        {/* Header Destination Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`${theme.badge} text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/5`}>
                            {theme.emoji} {trip.destination}
                          </span>
                          <span className="text-[9px] font-bold text-slate-550 font-mono">
                            ID: {trip.id}
                          </span>
                        </div>

                        {/* Planner Custom Name */}
                        <div className="space-y-1">
                          <h4 className="text-base font-black text-white group-hover:text-indigo-400 transition-colors leading-snug line-clamp-2">
                            {trip.plannerName || 'Unnamed Adventure'}
                          </h4>
                        </div>

                        {/* Stats Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-950/45 border border-slate-800/30 p-2.5 rounded-xl text-[10px]">
                          <div className="space-y-0.5">
                            <span className="text-slate-500 font-bold block uppercase tracking-widest text-[8px]">Duration</span>
                            <span className="text-slate-300 font-semibold">{formatDateRange(trip.arrivalDate, trip.departureDate)}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 font-bold block uppercase tracking-widest text-[8px]">Currencies</span>
                            <span className="text-slate-300 font-semibold uppercase">{trip.baseCurrency || 'USD'} → {trip.targetCurrency || 'VND'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60 relative z-10">
                        {/* Delete Trip Icon Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to permanently delete "${trip.plannerName || 'this trip'}"?`)) {
                              onDeleteTrip(trip.id);
                            }
                          }}
                          className="p-2 border border-slate-800 hover:border-rose-900/40 text-slate-500 hover:text-rose-400 bg-slate-950/30 hover:bg-rose-950/10 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                          title="Delete plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Open Plan CTA */}
                        <button
                          onClick={() => onSelectTrip(trip.id)}
                          className="bg-indigo-600/20 group-hover:bg-indigo-600 hover:bg-indigo-600 text-indigo-300 group-hover:text-white hover:text-white border border-indigo-500/25 group-hover:border-indigo-500 px-4 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                        >
                          <span>Launch</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </button>
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
