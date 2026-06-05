import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, ChevronRight, ArrowRightLeft, DollarSign, MapPin, Tag, Calendar, ChevronDown, ChevronUp, Clock, X, GripVertical, Search, Map as MapIcon, ExternalLink, Compass, Navigation, Car, MoveHorizontal as MoreHorizontal, Copy, Check, Users, CreditCard as Edit2, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, useMapsLibrary, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
  defaultDropAnimationSideEffects,
  CollisionDetection
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { supabase, mapSupabaseUser, handleSupabaseError, OperationType, isSupabaseConfigured } from './supabase';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

// --- Types & Constants ---

type District = 'D1' | 'D3' | 'D4' | 'D5' | 'D7' | 'Binh Thanh' | 'Thu Duc';
type Category = 'Food' | 'Fashion' | 'Coffee' | 'Spa' | 'Sightseeing' | 'Nightlife';
type Day = string;

interface Place {
  id: string;
  name: string;
  district: District;
  category: Category;
  address?: string;
  day?: Day;
  time?: string;
  expanded?: boolean;
  lat?: number;
  lng?: number;
}

const DISTRICTS: District[] = ['D1', 'D3', 'D4', 'D5', 'D7', 'Binh Thanh', 'Thu Duc'];
const CATEGORIES: Category[] = ['Food', 'Fashion', 'Coffee', 'Spa', 'Sightseeing', 'Nightlife'];

const DISTRICT_COORDS: Record<District, { lat: number; lng: number }> = {
  'D1': { lat: 10.7760, lng: 106.7000 },
  'D3': { lat: 10.7830, lng: 106.6880 },
  'D4': { lat: 10.7580, lng: 106.7082 },
  'D5': { lat: 10.7540, lng: 106.6630 },
  'D7': { lat: 10.7280, lng: 106.7202 },
  'Binh Thanh': { lat: 10.8030, lng: 106.7120 },
  'Thu Duc': { lat: 10.8490, lng: 106.7720 },
};

// --- Day Helper ---
function getDayList(arrival: string, departure: string): string[] {
  const start = new Date(arrival);
  const end = new Date(departure);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return ['Day 1'];
  }
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return Array.from({ length: diffDays }, (_, i) => `Day ${i + 1}`);
}

function getFormattedDayLabel(dayStr: string, arrivalDateStr: string): string {
  const match = dayStr.match(/\d+/);
  if (!match) return dayStr;
  const dayIndex = parseInt(match[0]) - 1;
  const baseDate = new Date(arrivalDateStr + 'T00:00:00');
  if (isNaN(baseDate.getTime())) return dayStr;
  
  const targetDate = new Date(baseDate);
  targetDate.setDate(baseDate.getDate() + dayIndex);
  
  const weekday = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
  const day = targetDate.getDate();
  const month = targetDate.toLocaleDateString('en-US', { month: 'long' });
  
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';
  
  return `${weekday}, ${day}${suffix} ${month}`;
}

function getFormattedDateRange(arrivalDateStr: string, departureDateStr: string): string {
  const start = new Date(arrivalDateStr + 'T00:00:00');
  const end = new Date(departureDateStr + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  const startDay = start.getDate();
  const startMonth = start.getMonth() + 1;
  const endDay = end.getDate();
  const endMonth = end.getMonth() + 1;
  return `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
}

const INITIAL_PLACES: Place[] = [
  { id: '1', name: 'Bánh Canh Cua 87', district: 'D1', category: 'Food', day: 'Day 1', time: '11:00', address: '87 Trần Khắc Chân, Tân Định, Quận 1', lat: 10.7915, lng: 106.6885 },
  { id: '2', name: 'The New Playground', district: 'D1', category: 'Fashion', day: 'Day 1', time: '13:00', address: '26 Lý Tự Trọng, Bến Nghé, Quận 1', lat: 10.7782, lng: 106.7020 },
  { id: '3', name: 'OKKIO Cà Phê', district: 'D1', category: 'Coffee', day: 'Day 1', time: '14:30', address: '122 Đ. Lê Lợi, Phường Bến Thành, Quận 1', lat: 10.7735, lng: 106.6990 },
  { id: '4', name: 'Miu Miu Spa 2', district: 'D1', category: 'Spa', day: 'Day 1', time: '16:00', address: '2B Chu Mạnh Trinh, Bến Nghé, Quận 1', lat: 10.7810, lng: 106.7052 },
  { id: '5', name: 'Phở Việt Nam Stone Bowl', district: 'D1', category: 'Food', day: 'Day 1', time: '19:00', address: '14 Phạm Hồng Thái, Phường Bến Thành, Quận 1', lat: 10.7725, lng: 106.6946 },
  { id: '6', name: 'The Cafe Apartment 42 Nguyen Hue', district: 'D1', category: 'Coffee', day: 'Day 2', time: '10:00', address: '42 Nguyễn Huệ, Bến Nghé, Quận 1', lat: 10.7741, lng: 106.7037 },
  { id: '7', name: 'Cà Phê Muối Chú Long', district: 'D1', category: 'Coffee', day: 'Day 2', time: '11:30', address: '104 Đ. Lê Lợi, Phường Bến Thành, Quận 1', lat: 10.7745, lng: 106.6998 },
  { id: '8', name: 'Union Square & Rue Miche', district: 'D1', category: 'Fashion', day: 'Day 2', time: '13:00', address: '171 Đ. Đồng Khởi, Bến Nghé, Quận 1', lat: 10.7758, lng: 106.7025 },
  { id: '9', name: 'Norah Spa 3', district: 'D1', category: 'Spa', day: 'Day 2', time: '15:00', address: '118 Đ. Nguyễn Du, Phường Bến Thành, Quận 1', lat: 10.7750, lng: 106.6935 },
  { id: '10', name: 'Pink Church & Ola Hale', district: 'D3', category: 'Sightseeing', day: 'Day 2', time: '16:30', address: '289 Hai Bà Trưng, Phường 8, Quận 3', lat: 10.7909, lng: 106.6908 },
  { id: '11', name: 'LIDER', district: 'D1', category: 'Fashion', day: 'Day 2', time: '17:30', address: '42 Tôn Thất Thiệp, Bến Nghé, Quận 1', lat: 10.7730, lng: 106.7032 },
  { id: '12', name: 'Secret Garden Rooftop', district: 'D1', category: 'Food', day: 'Day 2', time: '19:30', address: '158 Pasteur, Bến Nghé, Quận 1', lat: 10.7773, lng: 106.6987 },
  { id: '13', name: 'Highway Menswear', district: 'D3', category: 'Fashion', day: 'Day 3', time: '10:00', address: '16 Phạm Ngọc Thạch, Quận 3', lat: 10.7828, lng: 106.6963 },
  { id: '14', name: 'Compound Garment Alley 158', district: 'D1', category: 'Fashion', day: 'Day 3', time: '11:30', address: '158 Pasteur, Bến Nghé, Quận 1', lat: 10.7773, lng: 106.6987 },
  { id: '15', name: 'WEPHOBIA & 11 Garmentory', district: 'D1', category: 'Fashion', day: 'Day 3', time: '13:00', address: '39 Đ. Lê Duẩn, Bến Nghé, Quận 1', lat: 10.7833, lng: 106.7005 },
  { id: '16', name: 'Nguyen Van Binh Book Street', district: 'D1', category: 'Sightseeing', day: 'Day 3', time: '14:30', address: 'Đường Nguyễn Văn Bình, Bến Nghé, Quận 1', lat: 10.7797, lng: 106.6995 },
  { id: '17', name: 'Sen Trắng Hair Spa', district: 'D1', category: 'Spa', day: 'Day 3', time: '16:00', address: '150/19 Nguyễn Trãi, Phường Phạm Ngũ Lão, Quận 1', lat: 10.7695, lng: 106.6892 },
  { id: '18', name: 'Quán Bụi Lê Thánh Tôn', district: 'D1', category: 'Food', day: 'Day 3', time: '19:00', address: '17A Ngô Văn Năm, Bến Nghé, Quận 1', lat: 10.7818, lng: 106.7061 },
];

const VND_PER_SGD = 20600;

const RECOMMENDED_PLACES: Omit<Place, 'id'>[] = [
  { name: 'Bánh Mì Huỳnh Hoa', district: 'D1', category: 'Food', address: '26 Lê Thị Riêng, Phường Phạm Ngũ Lão, Quận 1', lat: 10.7735, lng: 106.6914 },
  { name: "Pizza 4P's Ben Thanh", district: 'D1', category: 'Food', address: '8 Thủ Khoa Huân, Phường Bến Thành, Quận 1', lat: 10.7731, lng: 106.6963 },
  { name: 'Highlands Coffee Opera House', district: 'D1', category: 'Coffee', address: '7 Công Trường Lam Sơn, Bến Nghé, Quận 1', lat: 10.7765, lng: 106.7032 },
  { name: 'War Remnants Museum', district: 'D3', category: 'Sightseeing', address: '28 Võ Văn Tần, Phường 6, Quận 3', lat: 10.7795, lng: 106.6908 },
  { name: 'Ben Thanh Market', district: 'D1', category: 'Sightseeing', address: 'Lê Lợi, Phường Bến Thành, Quận 1', lat: 10.7725, lng: 106.6980 },
  { name: 'Bitexco Financial Tower', district: 'D1', category: 'Sightseeing', address: '2 Hải Triều, Bến Nghé, Quận 1', lat: 10.7716, lng: 106.7044 },
  { name: 'Pasteur Street Brewing Co.', district: 'D1', category: 'Nightlife', address: '144 Pasteur, Bến Nghé, Quận 1', lat: 10.7773, lng: 106.6987 },
  { name: 'Saigon Central Post Office', district: 'D1', category: 'Sightseeing', address: '2 Công xã Paris, Bến Nghé, Quận 1', lat: 10.7798, lng: 106.6999 },
  { name: 'The New Playground', district: 'D1', category: 'Fashion', address: '26 Lý Tự Trọng, Bến Nghé, Quận 1', lat: 10.7782, lng: 106.7020 },
  { name: 'Miu Miu Spa', district: 'D1', category: 'Spa', address: '4 Chu Mạnh Trinh, Bến Nghé, Quận 1', lat: 10.7810, lng: 106.7052 },
];

// --- Time Helpers ---
const formatTimeTo12h = (time?: string) => {
  if (!time) return 'Set Time';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  if (isNaN(h)) return '--:--';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const TimePicker = ({ value, onChange, className = "" }: { value?: string, onChange: (val: string) => void, className?: string }) => {
  return (
    <div 
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 hover:border-slate-300 transition-colors ${className}`}
    >
      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <input 
        type="time" 
        value={value || ''}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value);
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-transparent border-none p-0 text-[11px] font-bold text-slate-700 focus:ring-0 focus:outline-none cursor-pointer w-[75px]"
        style={{ colorScheme: 'light' }}
      />
    </div>
  );
};

// --- Google Maps Components ---

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

function AppProvider({ children }: { children: React.ReactNode }) {
  if (hasValidKey) {
    return (
      <APIProvider apiKey={API_KEY} version="weekly">
        {children}
      </APIProvider>
    );
  }
  return <>{children}</>;
}

// --- Map Subcomponents ---

function MapRoutePolyline({ places }: { places: Place[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || places.length < 2) return;
    const path = places.map(p => ({ lat: p.lat!, lng: p.lng! }));
    const polyline = new google.maps.Polyline({
      path,
      strokeColor: '#4f46e5',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map
    });
    return () => polyline.setMap(null);
  }, [map, places]);
  return null;
}

function RealGoogleMap({ 
  places, 
  selectedId, 
  onSelectId,
  tripCenter
}: { 
  places: Place[]; 
  selectedId: string | null; 
  onSelectId: (id: string | null) => void; 
  tripCenter?: { lat: number, lng: number };
}) {
  const map = useMap();
  const validPlaces = useMemo(() => {
    return places.filter(p => p.lat !== undefined && p.lng !== undefined);
  }, [places]);

  const initialCenter = useMemo(() => {
    if (validPlaces.length > 0) {
      return { lat: validPlaces[0].lat!, lng: validPlaces[0].lng! };
    }
    if (tripCenter) return tripCenter;
    return { lat: 10.7760, lng: 106.7000 };
  }, [validPlaces, tripCenter]);

  useEffect(() => {
    if (map && validPlaces.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      validPlaces.forEach(p => bounds.extend({ lat: p.lat!, lng: p.lng! }));
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    } else if (map && validPlaces.length === 0 && tripCenter) {
      map.setCenter(tripCenter);
      map.setZoom(12);
    }
  }, [map, validPlaces, tripCenter]);

  return (
    <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200 relative shadow-sm">
      <Map
        defaultCenter={initialCenter}
        defaultZoom={14}
        mapId="saigon_planner_map_id"
        style={{ width: '100%', height: '100%' }}
        gestureHandling="cooperative"
      >
        <MapRoutePolyline places={validPlaces} />
        {validPlaces.map((place, index) => {
          const position = { lat: place.lat!, lng: place.lng! };
          const isSelected = selectedId === place.id;
          return (
            <React.Fragment key={place.id}>
              <AdvancedMarker
                position={position}
                onClick={() => onSelectId(isSelected ? null : place.id)}
              >
                <div className={`cursor-pointer transition-all ${isSelected ? 'scale-125 z-50 animate-bounce' : 'scale-110'}`}>
                  <Pin 
                    background={isSelected ? '#10b981' : '#4f46e5'} 
                    borderColor="#fff" 
                    glyphColor="#fff"
                    glyphText={(index + 1).toString()}
                  />
                </div>
              </AdvancedMarker>

              {isSelected && (
                <InfoWindow
                  position={position}
                  onCloseClick={() => onSelectId(null)}
                >
                  <div className="p-1 max-w-[200px] text-xs">
                    <p className="font-extrabold text-slate-800 text-[13px] mb-1">{place.name}</p>
                    <p className="text-[10px] font-sans text-slate-400 font-bold uppercase tracking-wider mb-2">
                      {formatTimeTo12h(place.time)} • {place.district}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-tight mb-2">{place.address || 'No address stored'}</p>
                    <div className="flex gap-2">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold">
                        {place.category}
                      </span>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </React.Fragment>
          );
        })}
      </Map>
    </div>
  );
}

function MockInteractiveMap({
  places,
  selectedId,
  onSelectId,
  destinationLat = 10.7760,
  destinationLng = 106.7000
}: {
  places: Place[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  destinationLat?: number;
  destinationLng?: number;
}) {
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  // Dynamic grid center reference
  const centerLat = places.length > 0 && places[0].lat !== undefined ? places[0].lat : destinationLat;
  const centerLng = places.length > 0 && places[0].lng !== undefined ? places[0].lng : destinationLng;

  // Dynamic Grid Bounds
  const minLat = centerLat - 0.04;
  const maxLat = centerLat + 0.04;
  const minLng = centerLng - 0.04;
  const maxLng = centerLng + 0.04;

  const points = useMemo(() => {
    return places.map((place, idx) => {
      const lat = place.lat || 10.77;
      const lng = place.lng || 10.70;

      const x = 50 + ((lng - minLng) / (maxLng - minLng)) * 420;
      const y = 350 - ((lat - minLat) / (maxLat - minLat)) * 280;

      return {
        id: place.id,
        name: place.name,
        time: place.time,
        district: place.district,
        category: place.category,
        address: place.address,
        x,
        y,
        lat,
        lng,
        index: idx + 1
      };
    });
  }, [places]);

  const selectedPlace = useMemo(() => {
    return points.find(p => p.id === selectedId);
  }, [points, selectedId]);

  const segments = useMemo(() => {
    const list = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i+1];
      const dLat = p2.lat - p1.lat;
      const dLng = p2.lng - p1.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111; // in KM
      const fare = Math.max(22000, Math.round(dist * 13500)); // base Grab fare in VND

      list.push({
        from: p1.name,
        to: p2.name,
        distance: dist.toFixed(1),
        fare: fare.toLocaleString(),
        p1,
        p2
      });
    }
    return list;
  }, [points]);

  return (
    <div className="w-full bg-[#FAFAFC] rounded-2xl border border-slate-200/80 p-5 space-y-5 shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Interactive Transit Router</h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Offline Fallback View (VITE_GOOGLE_MAPS_PLATFORM_KEY not set)</p>
        </div>

        <div className="bg-amber-50 border border-amber-200/50 rounded-xl px-3 py-1.5 text-[10px] text-amber-800 leading-normal max-w-sm">
          💡 <strong>Tip:</strong> Create <code>VITE_GOOGLE_MAPS_PLATFORM_KEY</code> in project secrets to unlock high-definition hybrid Google maps.
        </div>
      </div>

      {places.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-300 italic text-sm text-center bg-white rounded-xl border border-slate-100 gap-2">
          <Compass className="w-10 h-10 text-slate-200 animate-pulse" />
          <p>No stops planned for this day yet.</p>
          <p className="text-[10px] uppercase font-bold tracking-wider">Plan stops in schedule first to synthesize a route chart</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[2fr_1.1fr] gap-6">
          
          {/* SVG Route Visualizer */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 relative flex flex-col min-h-[300px]">
            <div className="absolute top-3 left-3 flex gap-2 z-10">
              <span className="text-[9px] font-bold bg-[#EFF6FF] text-[#1E40AF] px-2 py-1 rounded border border-[#BFDBFE]">HCM City Grid</span>
              <span className="text-[9px] font-bold bg-[#F3F4F6] text-[#374151] px-2 py-1 rounded">Scale: 1 : 12,000</span>
            </div>

            <div className="flex-1 w-full relative h-[360px] overflow-hidden">
              <svg viewBox="0 0 520 400" className="w-full h-full select-none" style={{ background: '#f8fafc' }}>
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                  </pattern>
                  <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5" />
                  </marker>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" rx="8" />

                <text x="30" y="380" className="fill-slate-300 text-[10px] font-mono font-bold tracking-widest">D3 ZONE</text>
                <text x="400" y="40" className="fill-slate-300 text-[10px] font-mono font-bold tracking-widest">D1 THEATER</text>
                <text x="440" y="360" className="fill-slate-300 text-[10px] font-mono font-bold tracking-widest">BEN NGHE</text>
                <line x1="180" y1="0" x2="180" y2="400" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="360" y1="0" x2="360" y2="400" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

                {/* Connections */}
                {points.length > 1 && points.map((p, idx) => {
                  if (idx === points.length - 1) return null;
                  const next = points[idx + 1];
                  const isHighlighted = activeSegment === idx || selectedId === p.id || selectedId === next.id;
                  return (
                    <g key={`leg-${idx}`}>
                      <line
                        x1={p.x}
                        y1={p.y}
                        x2={next.x}
                        y2={next.y}
                        stroke={isHighlighted ? "#10b981" : "#4f46e5"}
                        strokeWidth={isHighlighted ? "4.5" : "2.5"}
                        strokeDasharray={isHighlighted ? "none" : "5 3"}
                        className="transition-all duration-300 cursor-pointer text-indigo-700"
                        markerEnd="url(#arrow)"
                        onClick={() => {
                          setActiveSegment(idx);
                          onSelectId(p.id);
                        }}
                      />
                      <g 
                        transform={`translate(${(p.x + next.x)/2}, ${(p.y + next.y)/2})`}
                        className="cursor-pointer"
                        onClick={() => {
                          setActiveSegment(idx);
                          onSelectId(p.id);
                        }}
                      >
                        <circle r="12" fill="white" stroke={isHighlighted ? "#10b981" : "#818cf8"} strokeWidth="1.5" className="shadow-sm" />
                        <text y="3" textAnchor="middle" className="fill-slate-500 font-bold text-[8px] font-sans">🚗</text>
                      </g>
                    </g>
                  );
                })}

                {/* Markers */}
                {points.map((p) => {
                  const isSelected = selectedId === p.id;
                  return (
                    <g 
                      key={`marker-${p.id}`}
                      transform={`translate(${p.x}, ${p.y})`}
                      className="cursor-pointer group"
                      onClick={() => {
                        onSelectId(isSelected ? null : p.id);
                        setActiveSegment(null);
                      }}
                    >
                      <circle 
                        r="18" 
                        fill={isSelected ? '#10b981' : '#4f46e5'} 
                        className="shadow-md transition-all duration-300 group-hover:scale-110" 
                        stroke="#fff" 
                        strokeWidth="2.5" 
                      />
                      <text 
                        fill="#fff" 
                        textAnchor="middle" 
                        y="4" 
                        className="font-black text-[13px] font-sans"
                      >
                        {p.index}
                      </text>
                      <text 
                        y="-24" 
                        textAnchor="middle" 
                        className={`text-[9.5px] font-black tracking-tight fill-slate-700 pointer-events-none transition-all ${
                          isSelected ? 'font-black scale-105' : 'opacity-75 group-hover:opacity-100'
                        }`}
                      >
                        {p.name.length > 15 ? `${p.name.slice(0, 13)}...` : p.name}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Detail float box */}
              <AnimatePresence>
                {selectedPlace && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200/50 shadow-xl flex items-start gap-3 z-30"
                  >
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 font-bold text-sm">
                      #{points.find(p => p.id === selectedId)?.index}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 justify-between">
                        <h4 className="font-extrabold text-xs text-slate-800 truncate select-text">{selectedPlace.name}</h4>
                        <span className="text-[9px] font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {selectedPlace.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">
                        ⏱️ PROGRAMMED ARRIVAL: {formatTimeTo12h(selectedPlace.time)}
                      </p>
                      <p className="text-[10.5px] text-slate-500 truncate mt-0.5 select-text">{selectedPlace.address || 'District ' + selectedPlace.district}</p>
                    </div>
                    <button 
                      onClick={() => onSelectId(null)}
                      className="text-slate-300 hover:text-slate-500 text-sm font-bold p-1"
                    >
                      ×
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* List panel */}
          <div className="space-y-4 font-sans">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <h4 className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Sequence Planner</h4>
              
              <div className="space-y-2.5 max-h-[240px] overflow-y-auto no-scrollbar pr-1">
                {points.map((p) => (
                  <div 
                    key={`point-list-${p.id}`}
                    onClick={() => onSelectId(selectedId === p.id ? null : p.id)}
                    className={`p-2 py-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-center gap-3 ${
                      selectedId === p.id 
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-emerald-900' 
                        : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      selectedId === p.id 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.index}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate leading-tight">{p.name}</p>
                      <p className="text-[9.5px] opacity-75">{formatTimeTo12h(p.time)} • {p.district}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated segments */}
            {segments.length > 0 && (
              <div className="bg-[#EEF2FF] p-4 rounded-xl border border-[#C7D2FE]/40 space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-900">
                  <Car className="w-4 h-4 text-indigo-600" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wide">Transit & Costs</span>
                </div>

                <div className="space-y-2.5 text-[11px] text-indigo-950/80 max-h-[120px] overflow-y-auto no-scrollbar pr-1">
                  {segments.map((seg, idx) => (
                    <div 
                      key={`seq-${idx}`}
                      onMouseEnter={() => setActiveSegment(idx)}
                      onMouseLeave={() => setActiveSegment(null)}
                      className={`flex justify-between items-center rounded-md p-1.5 py-1 select-none transition-colors ${
                        activeSegment === idx ? 'bg-indigo-100/60' : ''
                      }`}
                    >
                      <span className="font-medium truncate max-w-[120px]">
                        Stops {idx+1} → {idx+2}
                      </span>
                      <span className="font-bold font-mono text-[10px]">
                        {seg.distance}km (~{seg.fare}đ)
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-indigo-900">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide">Grab Estimate</span>
                  <span className="font-extrabold font-mono text-xs">
                    ~{(segments.reduce((acc, current) => acc + parseInt(current.fare.replace(/,/g, '')), 0)).toLocaleString()} VND
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceAutocomplete({ onPlaceSelect }: { onPlaceSelect: (place: google.maps.places.Place) => void }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!placesLib || !inputValue) {
      setSuggestions([]);
      return;
    }

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: inputValue,
          sessionToken: sessionTokenRef.current!,
          locationBias: { center: { lat: 10.762622, lng: 106.660172 }, radius: 10000 }, // Bias to Saigon
        });
        setSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [placesLib, inputValue]);

  const handleSelect = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion.placePrediction) return;

    const place = suggestion.placePrediction.toPlace();
    await place.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location', 'types']
    });

    onPlaceSelect(place);
    setInputValue('');
    setSuggestions([]);
    sessionTokenRef.current = null;
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search for a place (e.g. Pasteur Street Brewing)"
          className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm outline-none focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[100] w-full mt-2 bg-white border border-border rounded-xl shadow-2xl max-h-[300px] overflow-y-auto overflow-hidden divide-y divide-border"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSelect(suggestion)}
                className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-start gap-3 transition-colors"
              >
                <MapPin className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-800">
                    {suggestion.placePrediction?.text.text}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {suggestion.placePrediction?.mainText.text}
                  </div>
                </div>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- DND Helper Components ---

interface DraggableTableRowProps {
  key?: React.Key;
  place: Place;
  deletePlace: (id: string) => void;
  toggleExpand: (id: string) => void;
  updatePlaceTime: (id: string, time: string) => void;
}

function DraggableTableRow({ place, deletePlace, toggleExpand, updatePlaceTime }: DraggableTableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `master-${place.id}`,
    data: { place }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <>
      <tr 
        ref={setNodeRef} 
        style={style}
        className={`hover:bg-slate-50 transition-colors group cursor-pointer ${isDragging ? 'bg-slate-100 shadow-lg' : ''} ${place.expanded ? 'bg-slate-50' : ''}`}
        onClick={() => toggleExpand(place.id)}
      >
        <td className="px-5 py-4 font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <button 
              {...attributes} 
              {...listeners} 
              className="p-3 -m-3 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              {place.expanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
              {place.name}
            </div>
          </div>
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <TimePicker value={place.time} onChange={(val) => updatePlaceTime(place.id, val)} className="scale-90 origin-left" />
          </div>
        </td>
        <td className="px-5 py-4"><DistrictBadge district={place.district} /></td>
        <td className="px-5 py-4"><CategoryBadge category={place.category} /></td>
        <td className="px-5 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
              {place.day ? place.day : 'UNASSIGNED'}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                deletePlace(place.id);
              }} 
              className="text-red-500 font-bold text-lg leading-none hover:opacity-70 transition-opacity"
            >
              ×
            </button>
          </div>
        </td>
      </tr>
      {place.expanded && (
        <tr className="bg-slate-50">
          <td colSpan={4} className="px-12 py-3">
            <div className="space-y-2 border-l-2 border-slate-200 pl-4 py-1">
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <MapPin className="w-3 h-3 mt-0.5 text-slate-400 shrink-0" />
                <span>{place.address || 'No address stored.'}</span>
              </div>
              {place.address && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Google Maps
                </a>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface DraggableItineraryItemProps {
  key?: React.Key;
  place: Place;
  updatePlaceTime: (id: string, time: string) => void;
  deletePlace: (id: string) => void;
  toggleExpand: (id: string) => void;
}

function DraggableItineraryItem({ place, updatePlaceTime, deletePlace, toggleExpand }: DraggableItineraryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `itinerary-${place.id}`,
    data: { place }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex flex-col border border-border rounded-2xl transition-all hover:bg-slate-50 shadow-sm group bg-white ${isDragging ? 'rotate-2 shadow-xl' : ''}`}
      onClick={() => toggleExpand(place.id)}
    >
      <div className="flex items-center gap-4 p-4 cursor-pointer">
        <button 
          {...attributes} 
          {...listeners} 
          className="p-3 -m-3 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0 touch-none flex items-center justify-center" 
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
            <div className="text-sm font-extrabold tracking-tight leading-tight text-slate-800 flex items-center gap-2">
              {place.expanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
              {place.name}
            </div>
            <div className="flex items-center gap-2 shrink-0" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <TimePicker value={place.time} onChange={(val) => updatePlaceTime(place.id, val)} />
              <button 
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  deletePlace(place.id);
                }}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Delete Place"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <DistrictBadge district={place.district} />
             <CategoryBadge category={place.category} />
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {place.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50 rounded-b-2xl"
          >
            <div className="p-4 pt-0 ml-12 space-y-2 border-l-2 border-slate-200">
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <MapPin className="w-3 h-3 mt-0.5 text-slate-400 shrink-0" />
                <span>{place.address || 'No address stored.'}</span>
              </div>
              {place.address && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MapIcon className="w-3 h-3" />
                  View Route on Map
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DroppableTabProps {
  key?: React.Key;
  day: Day;
  activeTab: Day;
  setActiveTab: (day: Day) => void;
}

function DroppableTab({ day, activeTab, setActiveTab }: DroppableTabProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tab-${day}`,
    data: { type: 'tab', day }
  });

  return (
    <button
      ref={setNodeRef}
      onClick={() => setActiveTab(day)}
      className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap relative ${
        activeTab === day 
        ? 'bg-white text-ink shadow-sm' 
        : 'text-slate-500 hover:text-ink/60'
      } ${isOver ? 'bg-ink/5 ring-2 ring-ink/20' : ''}`}
    >
      {day}
      {isOver && (
        <motion.div 
          layoutId="tabDropIndicator"
          className="absolute inset-0 bg-ink/5 rounded-lg border-2 border-dashed border-ink/20 z-10"
        />
      )}
    </button>
  );
}

interface ItineraryAccordionRowProps {
  key?: React.Key;
  day: Day;
  isExpanded: boolean;
  onToggle: () => void;
  arrivalDate: string;
  places: Place[];
  updatePlaceTime: (id: string, time: string) => void;
  deletePlace: (id: string) => void;
  toggleExpand: (id: string) => void;
  onClearDay: (day: Day) => void;
}

function ItineraryAccordionRow({
  day,
  isExpanded,
  onToggle,
  arrivalDate,
  places,
  updatePlaceTime,
  deletePlace,
  toggleExpand,
  onClearDay
}: ItineraryAccordionRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tab-${day}`,
    data: { type: 'tab', day }
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const dayPlaces = useMemo(() => {
    return places
      .filter(p => p.day === day)
      .sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
  }, [places, day]);

  const formattedLabel = getFormattedDayLabel(day, arrivalDate);

  const stopsSummary = useMemo(() => {
    if (dayPlaces.length === 0) return 'No stops scheduled yet';
    return dayPlaces.map(p => p.name).join(' • ');
  }, [dayPlaces]);

  return (
    <div 
      ref={setNodeRef}
      className={`border-b border-slate-100 pb-5 pt-5 transition-all duration-200 ${
        isOver ? 'bg-indigo-50/20 px-3 rounded-2xl border-dashed border-2 border-indigo-200' : ''
      }`}
    >
      <div 
        onClick={onToggle}
        className="flex items-start justify-between gap-4 cursor-pointer group py-1 select-none"
      >
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="pt-1.5 text-slate-400 group-hover:text-slate-800 transition-colors shrink-0">
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </motion.div>
          </div>

          <div className="min-w-0">
            <h3 className="text-[17px] sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
              {formattedLabel}
            </h3>
            
            {!isExpanded && (
              <p className="text-slate-500 font-medium text-xs sm:text-[13px] tracking-wide mt-1 truncate max-w-full leading-relaxed">
                {stopsSummary}
              </p>
            )}
          </div>
        </div>

        <div className="relative shrink-0 flex items-center gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
          {dayPlaces.length > 0 && (
            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center scale-90">
              {dayPlaces.length}
            </span>
          )}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 px-2 text-slate-400 hover:text-slate-700 hover:bg-slate-150/60 rounded-lg transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-150 py-1.5 z-40"
              >
                <div className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">
                  Day Actions
                </div>
                <button
                  onClick={() => {
                    onToggle();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{isExpanded ? 'Collapse Day' : 'Expand Day'}</span>
                </button>
                <button
                  onClick={() => {
                    onClearDay(day);
                    setIsMenuOpen(false);
                  }}
                  disabled={dayPlaces.length === 0}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Clear All Stops</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-6 sm:pl-9 pr-1 pt-5 pb-2 min-h-0">
              <SortableContext 
                items={dayPlaces.map(p => `itinerary-${p.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {dayPlaces.length > 0 ? (
                  <div className="space-y-3.5">
                    {dayPlaces.map((place) => (
                      <DraggableItineraryItem 
                        key={place.id}
                        place={place}
                        updatePlaceTime={updatePlaceTime}
                        deletePlace={deletePlace}
                        toggleExpand={toggleExpand}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 px-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-center gap-2 bg-slate-50/50">
                    <MapPin className="w-7 h-7 text-slate-300" />
                    <p className="text-xs font-bold text-slate-500">{day} empty</p>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-80 max-w-[200px] leading-relaxed">
                      Drag spots from database here to schedule
                    </p>
                  </div>
                )}
              </SortableContext>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper Components ---

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}>
    {children}
  </span>
);

const CategoryBadge = ({ category }: { category: Category }) => {
  const colors: Record<Category, string> = {
    Food: 'bg-[#FCE7F3] text-[#9D174D]',
    Fashion: 'bg-[#DBEAFE] text-[#1E40AF]',
    Coffee: 'bg-[#FEF3C7] text-[#92400E]',
    Spa: 'bg-[#F5F3FF] text-[#5B21B6]',
    Sightseeing: 'bg-[#F3F4F6] text-[#374151]',
    Nightlife: 'bg-slate-900 text-white',
  };
  return <Badge className={colors[category]}>{category}</Badge>;
};

const DistrictBadge = ({ district }: { district: District }) => (
  <Badge className="bg-[#DBEAFE] text-[#1E40AF]">{district}</Badge>
);

// --- Custom Collision Detection for Horizontal Tabs & Extra Hotspot Response ---
const customCollisionDetection: CollisionDetection = (args) => {
  const { active, droppableContainers, droppableRects, pointerCoordinates } = args;

  // Find all tab droppables that start with 'tab-'
  const tabContainers = droppableContainers.filter(
    (container) => container.id.toString().startsWith('tab-')
  );

  const activeRect = active.rect.current.translated;

  if (activeRect && tabContainers.length > 0) {
    // Define the "leftmost hotspot" of the dragged item
    // It starts at the left edge and extends 100px (or the whole item width if it's smaller)
    const hotspotWidth = Math.min(100, activeRect.width);
    const hotspotLeft = activeRect.left;
    const hotspotRight = activeRect.left + hotspotWidth;

    let bestTabId = null;
    let maxIntersectionArea = 0;

    for (const container of tabContainers) {
      const rect = droppableRects.get(container.id);
      if (!rect) continue;

      // Vertical leniency padding of 25px for better UX when hovering near tab borders
      const paddedTabTop = rect.top - 25;
      const paddedTabBottom = rect.bottom + 25;

      // Check overlap between the active item's leftmost hotspot and the padded tab rect
      const overlapLeft = Math.max(hotspotLeft, rect.left);
      const overlapRight = Math.min(hotspotRight, rect.right);
      const overlapTop = Math.max(activeRect.top, paddedTabTop);
      const overlapBottom = Math.min(activeRect.bottom, paddedTabBottom);

      if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
        const area = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
        if (area > maxIntersectionArea) {
          maxIntersectionArea = area;
          bestTabId = container.id;
        }
      }
    }

    // Also consider pointer coordinates as an immediate priority trigger when pointer is over the tab
    if (pointerCoordinates) {
      for (const container of tabContainers) {
        const rect = droppableRects.get(container.id);
        if (!rect) continue;

        const paddedTabTop = rect.top - 25;
        const paddedTabBottom = rect.bottom + 25;

        const isPointerInside = 
          pointerCoordinates.x >= rect.left && 
          pointerCoordinates.x <= rect.right && 
          pointerCoordinates.y >= paddedTabTop && 
          pointerCoordinates.y <= paddedTabBottom;

        if (isPointerInside) {
          return [{ id: container.id }];
        }
      }
    }

    if (bestTabId) {
      return [{ id: bestTabId }];
    }
  }

  // Fallback to standard closestCenter detection for non-tab items or when not overlapping
  return closestCenter(args);
};

// --- Main Application ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'planner'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tripId') ? 'planner' : 'dashboard';
  });

  // --- Real Authentication Form States ---
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // --- Multi-Trip Plan & Switcher States ---
  const [userTrips, setUserTrips] = useState<any[]>([]);
  const [isShared, setIsShared] = useState<boolean>(false);
  const [tripAccessError, setTripAccessError] = useState<string | null>(null);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);

  // Trip Creation Form States
  const [createTripName, setCreateTripName] = useState('');
  const [createTripDestinationLabel, setCreateTripDestinationLabel] = useState('');
  const [createTripLat, setCreateTripLat] = useState<number>(10.7760);
  const [createTripLng, setCreateTripLng] = useState<number>(106.7000);
  const [createTripArrival, setCreateTripArrival] = useState(() => new Date().toISOString().split('T')[0]);
  const [createTripDeparture, setCreateTripDeparture] = useState(() => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [isCreatingTripLoading, setIsCreatingTripLoading] = useState(false);

  // --- Active Destination Map details ---
  const [destinationLabel, setDestinationLabel] = useState('Saigon');
  const [destinationLat, setDestinationLat] = useState<number>(10.7760);
  const [destinationLng, setDestinationLng] = useState<number>(106.7000);

  // --- Universal Multi-currency converter details ---
  const [baseCur, setBaseCur] = useState('SGD');
  const [targetCur, setTargetCur] = useState('VND');
  const [convRate, setConvRate] = useState<number>(18500);

  // Hashing helper for guest sessions
  const getEmailHash = (email: string): string => {
    const clean = email.toLowerCase().trim();
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    const code = Math.abs(hash).toString(36).toUpperCase().substring(0, 5);
    return 'SG-' + code;
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isStandalone = typeof window !== 'undefined' && (
    (window.navigator as any).standalone || 
    window.matchMedia('(display-mode: standalone)').matches
  );
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');

  // --- Collaborative Trip ID & Presence State ---
  const [tripId, setTripId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTripId = params.get('tripId') || params.get('trip');
    if (urlTripId && /^[a-zA-Z0-9_\-]+$/.test(urlTripId)) {
      localStorage.setItem('saigon_trip_id', urlTripId);
      return urlTripId;
    }
    const saved = localStorage.getItem('saigon_trip_id');
    if (saved && /^[a-zA-Z0-9_\-]+$/.test(saved)) {
      return saved;
    }
    const newId = 'SG-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    localStorage.setItem('saigon_trip_id', newId);
    return newId;
  });

  const [guestName, setGuestName] = useState<string>(() => {
    const saved = localStorage.getItem('saigon_guest_name');
    if (saved && saved.trim()) return saved.trim();
    const names = ['Saigon Explorer', 'Enthusiast', 'Pho Lover', 'District Adventurer', 'Nomad Scooterist'];
    const chosen = names[Math.floor(Math.random() * names.length)] + '-' + Math.floor(100 + Math.random() * 900);
    localStorage.setItem('saigon_guest_name', chosen);
    return chosen;
  });

  const [isEditingGuestName, setIsEditingGuestName] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [joiningCode, setJoiningCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const clientId = useRef((() => {
    const key = 'atlas_client_id';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem(key, id);
    }
    return id;
  })()).current;

  const activeDisplayName = currentUser ? (currentUser.displayName || currentUser.email || 'Explorer') : guestName;
  const activePhotoURL = currentUser ? currentUser.photoURL : null;

  // Synchronize dynamic tripId parameter into query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (viewMode === 'planner') {
      if (params.get('tripId') !== tripId) {
        params.set('tripId', tripId);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    } else {
      if (params.get('tripId')) {
        params.delete('tripId');
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    }
  }, [tripId, viewMode]);

  // Subscribe and write to real-time presence collection
  useEffect(() => {
    if (!tripId || !isSupabaseConfigured) return;

    // Use the authenticated user's UID so all their devices map to one presence slot.
    // Fall back to the stable clientId for unauthenticated guests.
    const presenceKey = currentUser?.uid || clientId;

    const channel = supabase.channel(`presence:${tripId}`, {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });

    const updatePresence = async () => {
      try {
        await channel.track({
          id: presenceKey,
          name: activeDisplayName,
          avatar: activePhotoURL || '',
          activeAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Failed to checkin active presence", err);
      }
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const now = Date.now();
        // Each key may have multiple entries (one per connection). Keep only the
        // most-recent entry per key so the same user on multiple devices shows once.
        const seen = new Map<string, any>();
        Object.values(state).flat().forEach((user: any) => {
          const activeTime = new Date(user.activeAt || Date.now()).getTime();
          if (now - activeTime < 180000) {
            const existing = seen.get(user.id);
            if (!existing || activeTime > new Date(existing.activeAt || 0).getTime()) {
              seen.set(user.id, user);
            }
          }
        });
        setCollaborators(Array.from(seen.values()));
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await updatePresence();
      }
    });

    const heartbeat = setInterval(() => updatePresence(), 30000);

    return () => {
      clearInterval(heartbeat);
      channel.unsubscribe();
    };
  }, [tripId, activeDisplayName, activePhotoURL, clientId, currentUser]);


  // Authenticate user changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    setIsAuthLoading(true);

    // Initial session retrieval with timeout fallback
    const sessionTimeout = setTimeout(() => setIsAuthLoading(false), 4000);
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(sessionTimeout);
      setCurrentUser(mapSupabaseUser(session?.user));
      setIsAuthLoading(false);
    }).catch(() => {
      clearTimeout(sessionTimeout);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(mapSupabaseUser(session?.user));
      setIsAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserTrips = useCallback(async () => {
    if (!currentUser || !isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('ownerId', currentUser.uid);
      if (error) throw error;
      setUserTrips(data || []);
    } catch (err) {
      console.error("Error fetching personal user trips:", err);
    }
  }, [currentUser]);

  // Subscribe to user's trips from Supabase Database in real-time
  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured) {
      setUserTrips([]);
      return;
    }
    
    fetchUserTrips();

    const channel = supabase
      .channel('user-trips-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `ownerId=eq.${currentUser.uid}`
        },
        () => {
          fetchUserTrips();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentUser, fetchUserTrips]);

  const handleLogin = async () => {
    setIsAuthLoading(true);
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google OAuth login error:", err);
      setIsAuthLoading(false);
    }
  };

  const [places, setPlaces] = useState<Place[]>(() => {
    const savedPlaces = localStorage.getItem('saigon_places');
    if (savedPlaces) {
      const parsed = JSON.parse(savedPlaces);
      // Migration: ensure coordinates and addresses are recovered or filled
      return parsed.map((p: Place) => {
        let updated = { ...p };
        const initial = INITIAL_PLACES.find(ip => ip.name === p.name) || RECOMMENDED_PLACES.find(rp => rp.name === p.name);
        if (initial) {
          if (!updated.address) updated.address = initial.address;
          if (updated.lat === undefined) updated.lat = initial.lat;
          if (updated.lng === undefined) updated.lng = initial.lng;
        }
        if (updated.lat === undefined || updated.lng === undefined) {
          const coords = DISTRICT_COORDS[p.district] || DISTRICT_COORDS['D1'];
          updated.lat = coords.lat + (Math.random() - 0.5) * 0.006;
          updated.lng = coords.lng + (Math.random() - 0.5) * 0.006;
        }
        return updated;
      });
    }
    return INITIAL_PLACES;
  });
  const [activeTab, setActiveTab] = useState<Day>('Day 1');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({ 'Day 1': true });
  const [scheduleMode, setScheduleMode] = useState<'itinerary' | 'list' | 'map'>('itinerary');
  const [selectedMapPlaceId, setSelectedMapPlaceId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  
  // Trip Info State
  const [plannerName, setPlannerName] = useState(() => {
    const saved = localStorage.getItem('saigon_trip_info');
    if (saved) return JSON.parse(saved).plannerName || 'Atlas Travel Master Planner';
    return 'Atlas Travel Master Planner';
  });

  const [arrivalDate, setArrivalDate] = useState(() => {
    const saved = localStorage.getItem('saigon_trip_info');
    if (saved) return JSON.parse(saved).arrivalDate || new Date().toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  });

  const [departureDate, setDepartureDate] = useState(() => {
    const saved = localStorage.getItem('saigon_trip_info');
    if (saved) {
      const info = JSON.parse(saved);
      if (info.departureDate) return info.departureDate;
    }
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  const DAYS = useMemo(() => getDayList(arrivalDate, departureDate), [arrivalDate, departureDate]);

  // Set active tab to today's day if today falls within the trip range, otherwise first day
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arrival = arrivalDate ? new Date(arrivalDate + 'T00:00:00') : null;
    const departure = departureDate ? new Date(departureDate + 'T00:00:00') : null;

    if (arrival && departure && today >= arrival && today <= departure) {
      const dayIndex = Math.round((today.getTime() - arrival.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      const todayTab = `Day ${dayIndex}`;
      if (DAYS.includes(todayTab)) {
        setActiveTab(todayTab);
        return;
      }
    }

    if (!DAYS.includes(activeTab)) {
      setActiveTab(DAYS[0] || 'Day 1');
    }
  }, [DAYS]);
  
  // New Row State
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newDistrict, setNewDistrict] = useState<District>('D1');
  const [newCategory, setNewCategory] = useState<Category>('Food');

  // Database Collapse State
  const [isDbCollapsed, setIsDbCollapsed] = useState(true);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isSuggestedMode, setIsSuggestedMode] = useState(false);
  
  // AI Suggestions State
  const [suggestedPlaces, setSuggestedPlaces] = useState<Omit<Place, 'id'>[]>(RECOMMENDED_PLACES);
  const [isGenerating, setIsGenerating] = useState(false);

  const visibleSuggestions = useMemo(() => {
    const databaseNames = new Set(places.map(p => p.name.toLowerCase().replace(/\s+/g, ' ').trim()));
    return suggestedPlaces.filter(s => !databaseNames.has(s.name.toLowerCase().replace(/\s+/g, ' ').trim()));
  }, [suggestedPlaces, places]);

  const fetchMoreSuggestions = useCallback(async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPlaces: places }),
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const newSuggestions = await response.json();
      setSuggestedPlaces(prev => {
        // Filter out duplicates based on name
        const existingNames = new Set(prev.map(p => p.name));
        const filtered = newSuggestions.filter((p: any) => !existingNames.has(p.name));
        return [...filtered, ...prev];
      });
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [places]);

  // Currency State
  const [baseInput, setBaseInput] = useState<string>('50');
  const [targetInput, setTargetInput] = useState<string>('200000');

  // Sensors for DND
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Persist data locally
  useEffect(() => {
    localStorage.setItem('saigon_places', JSON.stringify(places));
  }, [places]);

  useEffect(() => {
    localStorage.setItem('saigon_trip_info', JSON.stringify({ plannerName, arrivalDate, departureDate }));
  }, [plannerName, arrivalDate, departureDate]);

  // Cloud Sync: Subscribe to Trip Metadata on Supabase
  useEffect(() => {
    if (!tripId || viewMode !== 'planner' || !isSupabaseConfigured) return;

    setTripAccessError(null);

    const fetchAndSetupTrip = async () => {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (error) {
          // If the record doesn't exist, create it!
          if (error.code === 'PGRST116') {
            await supabase
              .from('trips')
              .insert([{
                id: tripId,
                plannerName,
                arrivalDate,
                departureDate,
                destination: destinationLabel,
                lat: destinationLat,
                lng: destinationLng,
                baseCurrency: baseCur,
                targetCurrency: targetCur,
                conversionRate: convRate,
                ownerId: currentUser?.uid || 'guest',
                isShared: false,
                updatedAt: new Date().toISOString()
              }]);
          } else {
            throw error;
          }
        } else if (data) {
          setPlannerName((prev: string) => prev !== data.plannerName ? (data.plannerName || '') : prev);
          setArrivalDate((prev: string) => prev !== data.arrivalDate ? (data.arrivalDate || '') : prev);
          setDepartureDate((prev: string) => prev !== data.departureDate ? (data.departureDate || '') : prev);
          setDestinationLabel((prev: string) => prev !== data.destination ? (data.destination || 'Saigon') : prev);
          setIsShared(!!data.isShared);
          
          if (data.lat !== undefined && data.lat !== null) setDestinationLat(data.lat);
          if (data.lng !== undefined && data.lng !== null) setDestinationLng(data.lng);
          
          if (data.baseCurrency !== undefined && data.baseCurrency !== null) setBaseCur(data.baseCurrency);
          if (data.targetCurrency !== undefined && data.targetCurrency !== null) setTargetCur(data.targetCurrency);
          if (data.conversionRate !== undefined && data.conversionRate !== null) setConvRate(data.conversionRate);

          // Auto-claim anonymous guest trips for the logged-in user
          if (currentUser && (!data.ownerId || data.ownerId === 'guest')) {
            await supabase
              .from('trips')
              .update({ ownerId: currentUser.uid })
              .eq('id', tripId);
          }
        }
      } catch (err: any) {
        console.error("Error fetching trip:", err);
        const errStr = err?.message || String(err);
        if (errStr.toLowerCase().includes("permission") || errStr.toLowerCase().includes("policy")) {
          setTripAccessError("Access Denied: This travel plan is private. Please request the owner to toggle shared permissions.");
        }
      }
    };

    fetchAndSetupTrip();

    // Subscribe to metadata changes
    const channel = supabase
      .channel(`trip-metadata-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`
        },
        (payload) => {
          if (payload.new) {
            const data = payload.new as any;
            setPlannerName((prev: string) => prev !== data.plannerName ? (data.plannerName || '') : prev);
            setArrivalDate((prev: string) => prev !== data.arrivalDate ? (data.arrivalDate || '') : prev);
            setDepartureDate((prev: string) => prev !== data.departureDate ? (data.departureDate || '') : prev);
            setDestinationLabel((prev: string) => prev !== data.destination ? (data.destination || 'Saigon') : prev);
            setIsShared(!!data.isShared);
            
            if (data.lat !== undefined && data.lat !== null) setDestinationLat(data.lat);
            if (data.lng !== undefined && data.lng !== null) setDestinationLng(data.lng);
            
            if (data.baseCurrency !== undefined && data.baseCurrency !== null) setBaseCur(data.baseCurrency);
            if (data.targetCurrency !== undefined && data.targetCurrency !== null) setTargetCur(data.targetCurrency);
            if (data.conversionRate !== undefined && data.conversionRate !== null) setConvRate(data.conversionRate);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tripId, viewMode, currentUser]);

  // Keep the latest copy of places to prevent stale closure in subscription callback
  const placesRefVal = useRef(places);
  useEffect(() => {
    placesRefVal.current = places;
  }, [places]);

  // Cloud Sync: Subscribe to Place Documents inside the shared trip subcollection
  useEffect(() => {
    if (!tripId || viewMode !== 'planner' || !isSupabaseConfigured) return;

    const fetchPlaces = async () => {
      try {
        const { data, error } = await supabase
          .from('places')
          .select('*')
          .eq('tripId', tripId);
        
        if (error) throw error;
        const mappedPlaces = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          address: p.address || undefined,
          time: p.time || undefined,
          district: p.district,
          category: p.category,
          day: p.day || undefined,
          lat: p.lat || undefined,
          lng: p.lng || undefined,
        }));
        setPlaces(mappedPlaces);

        // Safe first-time migration of local state to Supabase ONLY for initial guests
        if ((data || []).length === 0 && !currentUser && tripId.startsWith('SG-')) {
          const currentPlaces = placesRefVal.current;
          if (currentPlaces.length > 0) {
            const inserts = currentPlaces.map((p) => ({
              id: p.id,
              tripId: tripId,
              name: p.name,
              address: p.address || null,
              time: p.time || null,
              district: p.district,
              category: p.category,
              day: p.day || null,
              lat: p.lat || null,
              lng: p.lng || null
            }));
            await supabase.from('places').insert(inserts);
          }
        }
      } catch (err) {
        console.error("Error reading places:", err);
      }
    };

    fetchPlaces();

    const channel = supabase
      .channel(`trip-places-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'places',
          filter: `tripId=eq.${tripId}`
        },
        () => {
          fetchPlaces();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tripId, viewMode, currentUser]);

  // Cloud Sync: Push user keystrokes / edits for trip info with 1s debounce
  useEffect(() => {
    if (!tripId || viewMode !== 'planner' || !isSupabaseConfigured) return;

    const timeout = setTimeout(async () => {
      try {
        await supabase
          .from('trips')
          .upsert([{
            id: tripId,
            plannerName,
            arrivalDate,
            departureDate,
            destination: destinationLabel,
            lat: destinationLat,
            lng: destinationLng,
            baseCurrency: baseCur,
            targetCurrency: targetCur,
            conversionRate: convRate,
            ownerId: currentUser?.uid || 'guest',
            isShared,
            updatedAt: new Date().toISOString()
          }]);
      } catch (err) {
        console.error("Error upserting trip info:", err);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [plannerName, arrivalDate, departureDate, destinationLabel, destinationLat, destinationLng, baseCur, targetCur, convRate, tripId, currentUser, viewMode, isShared]);

  // Handlers
  const addPlace = (selectedPlace?: google.maps.places.Place) => {
    if (!selectedPlace && !newName.trim()) return;
    
    // Infer category and district if it's from Google Maps
    let category: Category = newCategory;
    let district: District = newDistrict;
    
    if (selectedPlace) {
      const types = selectedPlace.types || [];
      if (types.includes('restaurant') || types.includes('food') || types.includes('cafe')) category = 'Food';
      if (types.includes('cafe') && !types.includes('restaurant')) category = 'Coffee';
      if (types.includes('shopping_mall') || types.includes('clothing_store')) category = 'Fashion';
      if (types.includes('spa') || types.includes('beauty_salon')) category = 'Spa';
      if (types.includes('tourist_attraction') || types.includes('museum')) category = 'Sightseeing';
      if (types.includes('night_club') || types.includes('bar')) category = 'Nightlife';
      
      // Rough district matching from address
      const address = selectedPlace.formattedAddress || '';
      if (address.includes('Quận 1') || address.includes('District 1')) district = 'D1';
      else if (address.includes('Quận 3') || address.includes('District 3')) district = 'D3';
      else if (address.includes('Quận 4') || address.includes('District 4')) district = 'D4';
      else if (address.includes('Quận 5') || address.includes('District 5')) district = 'D5';
      else if (address.includes('Quận 7') || address.includes('District 7')) district = 'D7';
      else if (address.includes('Bình Thạnh')) district = 'Binh Thanh';
      else if (address.includes('Thủ Đức')) district = 'Thu Duc';
    }

    let lat: number | undefined;
    let lng: number | undefined;

    if (selectedPlace && selectedPlace.location) {
      const loc = selectedPlace.location;
      lat = typeof loc.lat === 'function' ? (loc.lat as any)() : loc.lat;
      lng = typeof loc.lng === 'function' ? (loc.lng as any)() : loc.lng;
    }

    if (lat === undefined || lng === undefined) {
      const coords = DISTRICT_COORDS[district] || DISTRICT_COORDS['D1'];
      lat = coords.lat + (Math.random() - 0.5) * 0.006;
      lng = coords.lng + (Math.random() - 0.5) * 0.006;
    }

    const newPlace: Place = {
      id: Math.random().toString(36).substr(2, 9),
      name: selectedPlace 
        ? (typeof selectedPlace.displayName === 'object' ? (selectedPlace.displayName as any).text : selectedPlace.displayName) || 'Unnamed Place' 
        : newName,
      address: selectedPlace ? selectedPlace.formattedAddress : newAddress,
      time: undefined,
      district: district,
      category: category,
      day: undefined,
      lat,
      lng
    };
    setPlaces(prev => [...prev, newPlace]);
    setNewName('');
    setNewAddress('');

    if (tripId && isSupabaseConfigured) {
      const cleanPlace = {
        id: newPlace.id,
        tripId: tripId,
        name: newPlace.name,
        address: newPlace.address || null,
        time: newPlace.time || null,
        district: newPlace.district,
        category: newPlace.category,
        day: newPlace.day || null,
        lat: newPlace.lat || null,
        lng: newPlace.lng || null
      };

      supabase
        .from('places')
        .insert([cleanPlace])
        .then(({ error }) => {
          if (error) handleSupabaseError(error, OperationType.WRITE, `places/${newPlace.id}`);
        });
    }
  };

  const deletePlace = (id: string) => {
    setPlaces(prev => prev.filter(p => p.id !== id));
    if (tripId && isSupabaseConfigured) {
      supabase
        .from('places')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) handleSupabaseError(error, OperationType.DELETE, `places/${id}`);
        });
    }
  };

  const clearDayStops = (day: Day) => {
    setPlaces(prev => 
      prev.map(p => {
        if (p.day === day) {
          const updated = { ...p };
          delete updated.day;
          delete updated.time;
          
          if (tripId && isSupabaseConfigured) {
            supabase
              .from('places')
              .update({ day: null, time: null })
              .eq('id', p.id)
              .then(({ error }) => {
                if (error) handleSupabaseError(error, OperationType.WRITE, `places/${p.id}`);
              });
          }
          return updated;
        }
        return p;
      })
    );
  };

  const toggleExpand = (id: string) => {
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, expanded: !p.expanded } : p));
  };

  const updatePlaceDay = (id: string, day?: Day) => {
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, day } : p));
    if (tripId && isSupabaseConfigured) {
      supabase
        .from('places')
        .update({ day: day || null })
        .eq('id', id)
        .then(({ error }) => {
          if (error) handleSupabaseError(error, OperationType.WRITE, `places/${id}`);
        });
    }
  };

  const updatePlaceTime = (id: string, time: string) => {
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, time } : p));
    if (tripId && isSupabaseConfigured) {
      supabase
        .from('places')
        .update({ time: time || null })
        .eq('id', id)
        .then(({ error }) => {
          if (error) handleSupabaseError(error, OperationType.WRITE, `places/${id}`);
        });
    }
  };

  // Drag Handlers
  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    setActivePlace(active.data.current?.place || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setActivePlace(null);
    const { active, over } = event;
    
    if (!over) return;

    const activeData = active.data.current;
    if (!activeData || !activeData.place) return;

    const draggedPlace = activeData.place;
    const overId = over.id.toString();

    // CASE 1: Dropped on a Tab
    if (over.data.current?.type === 'tab') {
      const targetDay = over.data.current.day as Day;
      updatePlaceDay(draggedPlace.id, targetDay);
      setActiveTab(targetDay);
      return;
    }

    // CASE 2: Dropped into Master Database Area (from itinerary)
    if (over.id === 'master-database-area' || overId.startsWith('master-')) {
       updatePlaceDay(draggedPlace.id, undefined);
       return;
    }

    // CASE 3: Dropped into Checklist area
    if (over.id === 'checklist-area' || overId.startsWith('itinerary-')) {
      updatePlaceDay(draggedPlace.id, activeTab);
      return;
    }
  };

  // Currency Calculations
  const baseToTarget = (baseVal: string) => {
    const num = parseFloat(baseVal);
    if (isNaN(num)) return '0';
    return (num * convRate).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const targetToBase = (targetVal: string) => {
    const clean = targetVal.replace(/,/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) return '0.00';
    return (num / convRate).toFixed(2);
  };

  const filteredPlaces = useMemo(() => {
    return places
      .filter(p => p.day === activeTab)
      .sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
  }, [places, activeTab]);

  // Master Database Area Droppable
  const { setNodeRef: setMasterRef, isOver: isOverMaster } = useDroppable({
    id: 'master-database-area',
    data: { type: 'master' }
  });

  // Checklist Area Droppable
  const { setNodeRef: setChecklistRef, isOver: isOverChecklist } = useDroppable({
    id: 'checklist-area',
    data: { type: 'checklist', day: activeTab }
  });

  return (
    <AppProvider>
      <div className="min-h-screen bg-bg text-ink font-sans selection:bg-slate-200">
        {isAuthLoading ? (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto pb-1" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Initializing Planner...</p>
            </div>
          </div>
        ) : !currentUser ? (
          <LandingPage onLoginSuccess={(user) => setCurrentUser(user)} />
        ) : (
          <>
            {viewMode === 'dashboard' ? (
              <Dashboard 
                currentUser={currentUser} 
                userTrips={userTrips} 
                onSelectTrip={(id) => {
                  setTripId(id);
                  localStorage.setItem('saigon_trip_id', id);
                  setViewMode('planner');
                }} 
                onCreateNewTripClick={() => {
                  setCreateTripName('');
                  setCreateTripDestinationLabel('');
                  setIsCreateTripOpen(true);
                }} 
                onDeleteTrip={async (id) => {
                  try {
                    if (isSupabaseConfigured) {
                      await supabase.from('places').delete().eq('tripId', id);
                      await supabase.from('trips').delete().eq('id', id);
                    }
                  } catch (err) {
                    console.error("Delete trip failed:", err);
                  }
                }} 
              />
            ) : tripAccessError ? (
              <div className="min-h-[80vh] w-full flex items-center justify-center p-6 bg-slate-50">
                <div className="bg-white border border-slate-200 shadow-xl rounded-[32px] p-8 max-w-md w-full text-center space-y-6">
                  <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto shadow-sm">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Private Destination Plan</h2>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      This travel itinerary is private. Only the creator is authorized to access it, unless they enable 'Allow Collaboration & Sharing' inside their Collective Session settings.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTripAccessError(null);
                      setViewMode('dashboard');
                      const params = new URLSearchParams(window.location.search);
                      params.delete('tripId');
                      window.history.pushState({}, '', `${window.location.pathname}`);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-slate-100 transition-all cursor-pointer text-xs uppercase tracking-wider"
                  >
                    Go Back to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <>
                <DndContext 
              sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 grid lg:grid-cols-[1fr_300px] gap-5 lg:gap-10">
          
          {/* Main Content Area */}
          <div className="space-y-6 min-w-0">
            <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-10 border-b border-rose-50/10 pb-6">
              <div className="space-y-4 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between lg:justify-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-100">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 sm:flex-initial">
                      <input 
                        type="text" 
                        value={plannerName}
                        onChange={(e) => setPlannerName(e.target.value)}
                        className="text-lg font-extrabold tracking-tight bg-transparent border-none focus:ring-0 p-0 hover:bg-slate-100 transition-colors rounded px-2 -ml-2 text-slate-900"
                        placeholder="Planner Name..."
                      />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest px-2 truncate">
                        Loc: {destinationLabel || 'Saigon'}
                      </span>
                    </div>
                  </div>

                  {currentUser && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewMode('dashboard')}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-3.5 py-1.5 rounded-xl text-[10.5px] uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                        title="Back to Travels Dashboard"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="hidden sm:inline">My Travels</span>
                      </button>

                      <select
                        value={tripId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setTripId(id);
                          localStorage.setItem('saigon_trip_id', id);
                          const url = new URL(window.location.href);
                          url.searchParams.set('tripId', id);
                          window.history.pushState({}, '', url.toString());
                        }}
                        className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 border-none rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm outline-none"
                      >
                        <option value={tripId}>{plannerName || 'Current Plan'}</option>
                        {userTrips.filter(t => t.id !== tripId).map((trip) => (
                          <option key={trip.id} value={trip.id}>
                            {trip.plannerName || 'Unnamed Plan'} ({trip.destination || 'Custom'})
                          </option>
                        ))}
                      </select>
                      
                      <button
                        onClick={() => {
                          setCreateTripName('');
                          setCreateTripDestinationLabel('');
                          setIsCreateTripOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-1.5 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-[1.05]"
                        title="Create New Trip Layout"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5 shadow-sm">
                    <span>Arrival:</span>
                    <input 
                      type="date" 
                      value={arrivalDate}
                      onChange={(e) => setArrivalDate(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 p-0 text-slate-900 font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5 shadow-sm">
                    <span>Leaving:</span>
                    <input 
                      type="date" 
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 p-0 text-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {isAuthLoading ? (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-400">
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    Checking Sync Status...
                  </div>
                ) : currentUser ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl px-3 py-1.5 shadow-sm">
                      {currentUser.photoURL ? (
                        <img 
                          src={currentUser.photoURL} 
                          alt={currentUser.displayName || "User"} 
                          className="w-6 h-6 rounded-full border border-indigo-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          {currentUser.displayName?.charAt(0) || "U"}
                        </div>
                      )}
                      
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-indigo-900 leading-tight">
                          {currentUser.displayName || "Explorer"}
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[8px] font-bold tracking-wider text-emerald-600 uppercase">
                            Synced & Live
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={async () => {
                        try {
                          localStorage.removeItem('saigon_custom_user');
                          setCurrentUser(null);
                          if (isSupabaseConfigured) {
                            await supabase.auth.signOut();
                          }
                        } catch (err) {
                          console.error("Signout error:", err);
                        }
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-colors px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsLoginModalOpen(true)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold font-sans text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.71 0 3.27.61 4.5 1.62l2.437-2.437C17.312 1.696 14.933 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.254-4.074 10.254-10.24 0-.695-.081-1.355-.224-1.955H12.24z"/>
                      </svg>
                      <span>Sync Devices</span>
                    </button>
                    
                    <span className="hidden sm:inline-block text-[9px] font-bold text-slate-400 leading-tight uppercase max-w-[150px] text-left">
                      💡 Dynamically handles Safari & iPhone popups via redirect
                    </span>
                  </div>
                )}
                
                <div className="hidden sm:block">
                  <Badge className="bg-[#DBEAFE] text-[#1E40AF] px-4 py-2 text-[11px] shadow-sm whitespace-nowrap">
                    {new Date(arrivalDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} • Master Log
                  </Badge>
                </div>
              </div>
            </header>

            {/* Real-time Collaboration Hub Card */}
            <section className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Collective Session</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Changes sync immediately with all online collaborators</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Privacy Toggle */}
                  <div className="flex items-center bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        id="sharing-toggle"
                        checked={isShared} 
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          setIsShared(checked);
                          try {
                            if (isSupabaseConfigured) {
                              await supabase
                                .from('trips')
                                .update({ isShared: checked, updatedAt: new Date().toISOString() })
                                .eq('id', tripId);
                            }
                          } catch (err) {
                            console.error("Failed to update share status:", err);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">Allow Collaboration</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room Code:</span>
                    <div className="flex items-center gap-1 bg-slate-900 text-slate-100 rounded-xl pl-3 pr-1.5 py-1 text-xs font-mono font-bold shadow-inner">
                      <span>{tripId}</span>
                      <button
                        id="copy-invite-link"
                        onClick={() => {
                          const copyUrl = `${window.location.origin}${window.location.pathname}?tripId=${tripId}`;
                          navigator.clipboard.writeText(copyUrl).then(() => {
                            setCopySuccess(true);
                            setTimeout(() => setCopySuccess(false), 2000);
                          });
                        }}
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy Invite Link"
                      >
                        {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-[1fr_240px] gap-4 pt-3 border-t border-slate-100 items-start">
                {/* Active Collaborators Presence and Nickname Manager */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Now ({collaborators.length}):</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {collaborators.map((collab) => {
                        const init = collab.name ? collab.name.charAt(0).toUpperCase() : '?';
                        const isMe = collab.id === (currentUser?.uid || clientId);
                        return (
                          <div
                            key={collab.id}
                            className={`w-7 h-7 rounded-full border-2 ${isMe ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-white'} flex items-center justify-center text-[10px] font-bold text-white shrink-0 relative group cursor-help`}
                            style={{ 
                              backgroundColor: collab.id === (currentUser?.uid || clientId) ? '#4F46E5' : `hsl(${(collab.id.charCodeAt(0) * 40) % 360}, 65%, 50%)`
                            }}
                          >
                            {collab.avatar ? (
                              <img 
                                src={collab.avatar} 
                                alt={collab.name} 
                                className="w-full h-full rounded-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span>{init}</span>
                            )}
                            
                            {/* Simple inline tooltip displaying name of collaborator */}
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                              {collab.name} {isMe ? '(You)' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Guest nickname editing section */}
                  {!currentUser && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-100 max-w-sm">
                      <span className="shrink-0 text-[10px] font-bold text-slate-400 uppercase">My Name:</span>
                      {isEditingGuestName ? (
                        <div className="flex items-center gap-1.5 flex-1 col-span-2">
                          <input
                            type="text"
                            value={guestName}
                            onChange={(e) => {
                              setGuestName(e.target.value);
                              localStorage.setItem('saigon_guest_name', e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setIsEditingGuestName(false);
                            }}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                            maxLength={30}
                            autoFocus
                          />
                          <button
                            onClick={() => setIsEditingGuestName(false)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 py-1"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{guestName}</span>
                          <button
                            onClick={() => setIsEditingGuestName(true)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 cursor-pointer"
                            title="Edit Nickname"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Direct Room Join Form */}
                <div className="flex flex-col gap-1.5 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Join a Different Trip</label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!joiningCode.trim()) return;
                      const sanitized = joiningCode.trim().toUpperCase().replace(/[^A-Z0-9_\-]/gi, '');
                      if (sanitized) {
                        setTripId(sanitized);
                        localStorage.setItem('saigon_trip_id', sanitized);
                        setJoiningCode('');
                      }
                    }}
                    className="flex items-center gap-1 mt-1"
                  >
                    <input
                      type="text"
                      placeholder="Room Code..."
                      value={joiningCode}
                      onChange={(e) => setJoiningCode(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 min-w-0"
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-1.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </section>

            {/* Database Section */}
            <section 
              className={`section-card transition-all ${isOverMaster ? 'ring-2 ring-ink ring-offset-2' : ''}`}
              ref={setMasterRef}
            >
              <div 
                className="px-6 py-4 border-b border-border flex items-center justify-between bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsDbCollapsed(!isDbCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Master Places Database</h2>
                  {isDbCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              
              <AnimatePresence>
                {!isDbCollapsed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 bg-slate-50/50 border-b border-border space-y-4">
                      <div className="flex flex-col gap-4">
                        <div className="w-full">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5" />
                            Smart Place Search
                          </p>
                           {hasValidKey ? (
                            <PlaceAutocomplete onPlaceSelect={(p) => {
                              addPlace(p);
                              setIsManualMode(false);
                            }} />
                          ) : (
                            <div className="bg-slate-100/70 p-5 rounded-2xl border border-slate-200/50 space-y-3">
                              <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                                <MapIcon className="w-4 h-4 text-slate-400" />
                                Google Maps Autocomplete (Offline Mode)
                              </div>
                              <p className="text-[11.5px] text-slate-500 leading-relaxed">
                                The app is running offline or is deployed without a Maps API key. You can still easily add locations using <strong className="text-indigo-600 uppercase font-extrabold font-sans">"Or Add Manually"</strong> or extract curated itinerary spots with <strong className="text-indigo-600 uppercase font-extrabold font-sans">"View Suggested"</strong>!
                              </p>
                              <div className="pt-1.5">
                                <span className="text-[9.5px] font-bold tracking-wider text-indigo-600 uppercase bg-indigo-50/50 px-3 py-1 rounded-full border border-indigo-100 block sm:inline-block">
                                  💡 Setup: Configure VITE_GOOGLE_MAPS_PLATFORM_KEY on Netlify to activate search
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-4 py-1">
                          <div className="h-px bg-slate-200 flex-1 min-w-[20px]" />
                          <button 
                            onClick={() => {
                              setIsManualMode(!isManualMode);
                              setIsSuggestedMode(false);
                            }}
                            className={`text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full border transition-all shadow-sm ${
                              isManualMode 
                              ? 'bg-ink text-white border-ink' 
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                            }`}
                          >
                            {isManualMode ? "Hide Manual Entry" : "Or Add Manually"}
                          </button>
                          <button 
                            onClick={() => {
                              setIsSuggestedMode(!isSuggestedMode);
                              setIsManualMode(false);
                            }}
                            className={`text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full border transition-all shadow-sm ${
                              isSuggestedMode 
                              ? 'bg-indigo-600 text-white border-indigo-600' 
                              : 'bg-white text-indigo-500 border-indigo-100 hover:border-indigo-200 hover:text-indigo-600'
                            }`}
                          >
                            {isSuggestedMode ? "Hide Suggestions" : "View Suggested"}
                          </button>
                          <div className="h-px bg-slate-200 flex-1 min-w-[20px]" />
                        </div>

                        <AnimatePresence>
                          {isSuggestedMode && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0, y: -10 }}
                              animate={{ opacity: 1, height: 'auto', y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -10 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                                      <MapIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-indigo-900 tracking-tight">Curated Recommendations</h3>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      setPlaces(prev => {
                                        const databaseNames = new Set(prev.map(p => p.name.toLowerCase().replace(/\s+/g, ' ').trim()));
                                        const trulyNewPlaces = visibleSuggestions
                                          .filter(s => !databaseNames.has(s.name.toLowerCase().replace(/\s+/g, ' ').trim()))
                                          .map(p => {
                                            const coords = DISTRICT_COORDS[p.district] || DISTRICT_COORDS['D1'];
                                            return {
                                              ...p,
                                              id: Math.random().toString(36).substr(2, 9),
                                              day: undefined,
                                              time: undefined,
                                              lat: p.lat !== undefined ? p.lat : (coords.lat + (Math.random() - 0.5) * 0.006),
                                              lng: p.lng !== undefined ? p.lng : (coords.lng + (Math.random() - 0.5) * 0.006)
                                            };
                                          });

                                        if (trulyNewPlaces.length > 0) {
                                          if (tripId && isSupabaseConfigured) {
                                            const sbInserts = trulyNewPlaces.map((tp) => ({
                                              id: tp.id,
                                              tripId: tripId,
                                              name: tp.name,
                                              address: tp.address || null,
                                              time: tp.time || null,
                                              district: tp.district,
                                              category: tp.category,
                                              day: tp.day || null,
                                              lat: tp.lat || null,
                                              lng: tp.lng || null
                                            }));
                                            supabase
                                              .from('places')
                                              .insert(sbInserts)
                                              .then(({ error }) => {
                                                if (error) handleSupabaseError(error, OperationType.WRITE, 'places');
                                              });

                                          }
                                          return [...prev, ...trulyNewPlaces];
                                        }
                                        return prev;
                                      });
                                      setIsSuggestedMode(false);
                                    }}
                                    disabled={isGenerating || visibleSuggestions.length === 0}
                                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline disabled:opacity-50"
                                  >
                                    Add All to Database
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                  <button
                                    onClick={fetchMoreSuggestions}
                                    disabled={isGenerating}
                                    className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
                                  >
                                    {isGenerating ? (
                                      <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Generating fresh ideas...</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                                          <span className="text-xs font-bold uppercase tracking-wider">Generate AI Recommendations</span>
                                        </div>
                                        <span className="text-[10px] opacity-70">Gemini will suggest new unique spots based on your plan</span>
                                      </>
                                    )}
                                  </button>
                                  {visibleSuggestions.length === 0 && !isGenerating && (
                                    <div className="sm:col-span-2 text-center py-8">
                                      <div className="text-slate-400 text-xs italic">No new suggestions available. Try generating more!</div>
                                    </div>
                                  )}
                                  {visibleSuggestions.map((rec, i) => (
                                    <div 
                                      key={`${rec.name}-${i}`}
                                      className="bg-white p-3 rounded-xl border border-indigo-100 flex items-center justify-between group hover:border-indigo-300 transition-colors"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-800 truncate">{rec.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge className="bg-indigo-100 text-indigo-700">{rec.district}</Badge>
                                          <Badge className="bg-slate-100 text-slate-600">{rec.category}</Badge>
                                        </div>
                                      </div>
                                      <button 
                                        onClick={() => {
                                          setPlaces(prev => {
                                            const isDuplicate = prev.some(p => p.name.toLowerCase().replace(/\s+/g, ' ').trim() === rec.name.toLowerCase().replace(/\s+/g, ' ').trim());
                                            if (isDuplicate) return prev;
                                            
                                            const coords = DISTRICT_COORDS[rec.district] || DISTRICT_COORDS['D1'];
                                            const newPlace: Place = {
                                              ...rec,
                                              id: Math.random().toString(36).substr(2, 9),
                                              day: undefined,
                                              time: undefined,
                                              lat: rec.lat !== undefined ? rec.lat : (coords.lat + (Math.random() - 0.5) * 0.006),
                                              lng: rec.lng !== undefined ? rec.lng : (coords.lng + (Math.random() - 0.5) * 0.006)
                                            };

                                            if (tripId && isSupabaseConfigured) {
                                              const cleanPlace = {
                                                id: newPlace.id,
                                                tripId: tripId,
                                                name: newPlace.name,
                                                address: newPlace.address || null,
                                                time: newPlace.time || null,
                                                district: newPlace.district,
                                                category: newPlace.category,
                                                day: newPlace.day || null,
                                                lat: newPlace.lat || null,
                                                lng: newPlace.lng || null
                                              };
                                              supabase
                                                .from('places')
                                                .insert([cleanPlace]).then(({ error }) => { if (error) handleSupabaseError(error, OperationType.WRITE, `places/${newPlace.id}`); }) //
// catch removed
                                            }

                                            return [...prev, newPlace];
                                          });
                                        }}
                                        className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <AnimatePresence>
                          {isManualMode && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0, y: -10 }}
                              animate={{ opacity: 1, height: 'auto', y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -10 }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 items-end bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <Tag className="w-3 h-3" />
                                    Place Name
                                  </label>
                                  <input 
                                    type="text" 
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Pasteur Street Brewing"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-border rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-ink/20 focus:ring-4 focus:ring-ink/5 transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && addPlace()}
                                  />
                                </div>
                                <div className="space-y-1.5 lg:col-span-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3" />
                                    Address (Optional)
                                  </label>
                                  <input 
                                    type="text" 
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                    placeholder="e.g. 123 Le Loi Street, D1"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-border rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-ink/20 focus:ring-4 focus:ring-ink/5 transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && addPlace()}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3" />
                                    District
                                  </label>
                                  <select 
                                    value={newDistrict}
                                    onChange={(e) => setNewDistrict(e.target.value as District)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-border rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-ink/20 focus:ring-4 focus:ring-ink/5 transition-all appearance-none cursor-pointer"
                                  >
                                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <Tag className="w-3 h-3" />
                                    Category
                                  </label>
                                  <select 
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value as Category)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-border rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-ink/20 focus:ring-4 focus:ring-ink/5 transition-all appearance-none cursor-pointer"
                                  >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <button 
                                  onClick={() => {
                                    addPlace();
                                    setIsManualMode(false);
                                  }}
                                  disabled={!newName.trim()}
                                  className="h-[46px] w-full sm:w-auto px-8 bg-ink text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-30 transition-all shadow-lg shadow-ink/20 flex items-center justify-center gap-2"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add to Pool
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto no-scrollbar">
                      <SortableContext 
                        items={places.filter(p => !p.day).map(p => `master-${p.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <table className="w-full text-left border-collapse text-[13px]">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-100 text-slate-500 font-semibold border-b border-border text-[10px] uppercase tracking-wider">
                              <th className="px-5 py-3 border-b border-border">Place Name</th>
                              <th className="px-5 py-3 border-b border-border">Time</th>
                              <th className="px-5 py-3 border-b border-border">District</th>
                              <th className="px-5 py-3 border-b border-border">Category</th>
                              <th className="px-5 py-3 border-b border-border text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">

                            <AnimatePresence initial={false}>
                              {places.filter(p => !p.day).slice().reverse().map((place) => (
                                <DraggableTableRow 
                                  key={place.id}
                                  place={place}
                                  deletePlace={deletePlace}
                                  toggleExpand={toggleExpand}
                                  updatePlaceTime={updatePlaceTime}
                                />
                              ))}
                            </AnimatePresence>
                            {places.filter(p => !p.day).length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-5 py-10 text-center text-slate-400 italic bg-white">
                                  No unassigned places. Search or add manually above!
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </SortableContext>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Itinerary Section */}
            <section 
              className={`section-card min-h-[400px] p-6 flex flex-col gap-6 transition-all ${isOverChecklist ? 'ring-2 ring-ink ring-offset-2' : ''}`}
              ref={setChecklistRef}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Itinerary</h2>
                  
                  {/* Date Range Pill from Screenshot */}
                  <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/50 px-3.5 py-1 text-slate-600 font-bold rounded-full text-xs shrink-0 select-none">
                    <Calendar className="w-3.5 h-3.5 stroke-[2.5] text-slate-400" />
                    <span className="font-sans font-extrabold">{getFormattedDateRange(arrivalDate, departureDate)}</span>
                  </div>
                </div>
                
                {/* Mode Toggle Selector */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold font-sans self-start sm:self-auto shrink-0 select-none">
                  <button 
                    onClick={() => setScheduleMode('itinerary')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                      scheduleMode === 'itinerary' 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>📅 Itinerary</span>
                  </button>
                  <button 
                    onClick={() => setScheduleMode('list')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                      scheduleMode === 'list' 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>📋 Day Tabs</span>
                  </button>
                  <button 
                    onClick={() => setScheduleMode('map')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                      scheduleMode === 'map' 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>🗺️ Route Map</span>
                    {filteredPlaces.length > 0 && (
                      <span className="bg-indigo-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {filteredPlaces.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Itinerary Accordion Layout (Matches Screenshot) */}
              {scheduleMode === 'itinerary' && (
                <div className="flex-1 space-y-2">
                  {DAYS.map((day) => (
                    <ItineraryAccordionRow
                      key={day}
                      day={day}
                      isExpanded={!!expandedDays[day]}
                      onToggle={() => {
                        setExpandedDays(prev => ({
                          ...prev,
                          [day]: !prev[day]
                        }));
                        setActiveTab(day);
                      }}
                      arrivalDate={arrivalDate}
                      places={places}
                      updatePlaceTime={updatePlaceTime}
                      deletePlace={deletePlace}
                      toggleExpand={toggleExpand}
                      onClearDay={clearDayStops}
                    />
                  ))}
                </div>
              )}

              {/* Day Tabs Layout / Old List View */}
              {scheduleMode === 'list' && (
                <>
                  <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {DAYS.map((day) => (
                      <DroppableTab 
                        key={day}
                        day={day}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                      />
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                    <SortableContext 
                      items={filteredPlaces.map(p => `itinerary-${p.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div 
                          key={activeTab}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="space-y-4"
                        >
                          {filteredPlaces.length > 0 ? filteredPlaces.map((place) => (
                            <DraggableItineraryItem 
                              key={place.id}
                              place={place}
                              updatePlaceTime={updatePlaceTime}
                              deletePlace={deletePlace}
                              toggleExpand={toggleExpand}
                            />
                          )) : (
                            <div className="h-40 flex flex-col items-center justify-center text-slate-400 italic text-sm text-center gap-2">
                              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                <MapPin className="w-6 h-6" />
                              </div>
                              <p>Nothing planned for {activeTab}</p>
                              <p className="text-[10px] uppercase font-bold tracking-widest mt-2 px-10">Drag from Database into here or onto tabs to schedule</p>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </SortableContext>
                  </div>
                </>
              )}

              {/* Route Map View Layout */}
              {scheduleMode === 'map' && (
                <>
                  <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        onClick={() => setActiveTab(day)}
                        className={`flex-1 py-1 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap min-w-[70px] ${
                          activeTab === day 
                            ? 'bg-white text-ink shadow-sm font-black text-slate-800' 
                            : 'text-slate-500 hover:text-ink/60'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-visible min-h-[400px]">
                    {hasValidKey ? (
                      <RealGoogleMap 
                        places={filteredPlaces} 
                        selectedId={selectedMapPlaceId} 
                        onSelectId={setSelectedMapPlaceId} 
                        tripCenter={{ lat: destinationLat, lng: destinationLng }}
                      />
                    ) : (
                      <MockInteractiveMap 
                        places={filteredPlaces} 
                        selectedId={selectedMapPlaceId} 
                        onSelectId={setSelectedMapPlaceId} 
                        destinationLat={destinationLat}
                        destinationLng={destinationLng}
                      />
                    )}
                  </div>
                </>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Currency Assistant */}
            <div className="section-card p-6 gap-4 flex flex-col shadow-lg shadow-slate-200/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-1">Currency Converter</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Configure rate below:</p>
              </div>

              {/* Dynamic Rate Configurator */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="flex-1 space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">From</span>
                    <input 
                      type="text" 
                      value={baseCur} 
                      onChange={(e) => setBaseCur(e.target.value.toUpperCase().slice(0, 3))}
                      className="w-full text-center text-xs font-bold p-1 bg-white border border-slate-200 rounded outline-none focus:border-indigo-500"
                      maxLength={3}
                    />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <span className="text-[9px] font-extrabold text-[#10B981] uppercase tracking-wider">To</span>
                    <input 
                      type="text" 
                      value={targetCur} 
                      onChange={(e) => setTargetCur(e.target.value.toUpperCase().slice(0, 3))}
                      className="w-full text-center text-xs font-bold p-1 bg-white border border-slate-200 rounded outline-none focus:border-emerald-500"
                      maxLength={3}
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Factor (1 {baseCur} = To {targetCur})</span>
                  <input 
                    type="number" 
                    value={convRate} 
                    onChange={(e) => setConvRate(parseFloat(e.target.value) || 1)}
                    className="w-full text-center text-xs font-bold p-1 bg-white border border-slate-200 rounded outline-none focus:border-indigo-500"
                    step="any"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Convert ({baseCur})</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={baseInput}
                      onChange={(e) => setBaseInput(e.target.value)}
                      className="w-full p-2.5 pr-12 bg-slate-50 border border-border rounded-lg text-sm font-bold outline-none focus:border-ink/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">{baseCur}</span>
                  </div>
                </div>

                <div className="text-center text-slate-300 text-lg font-light leading-none">↓</div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Calculated ({targetCur})</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      readOnly
                      value={baseToTarget(baseInput)}
                      className="w-full p-2.5 pr-12 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-sm font-bold outline-none text-emerald-800"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600">{targetCur}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-border">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">QUICK {targetCur} TO {baseCur}</label>
                <div className="relative border border-slate-200 rounded-lg overflow-hidden">
                  <input 
                    type="text"
                    value={targetInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setTargetInput(val ? parseInt(val).toLocaleString() : '');
                    }}
                    className="w-full p-2.5 pr-12 bg-slate-50 outline-none focus:bg-white text-sm font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">{targetCur}</span>
                </div>
                <div className="mt-2 text-right flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400">Equals:</span>
                  <div>
                    <span className="text-sm font-bold font-mono tracking-tight text-indigo-700">{targetToBase(targetInput)}</span>
                    <span className="text-[10px] font-bold text-slate-400 ml-1">{baseCur}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Stats */}
            <div className="section-card p-6 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Trip Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500">Planned Stops</span>
                  <span className="font-bold">{places.filter(p => p.day).length}</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500">Unassigned Items</span>
                  <span className="font-bold">{places.filter(p => !p.day).length}</span>
                </div>
              </div>
            </div>

            {/* Pro Tip Card */}
            <div className="bg-ink text-white p-5 rounded-2xl flex flex-col items-center text-center gap-1 shadow-lg shadow-ink/10">
              <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest">Pro Tip</p>
              <p className="text-[13px] leading-snug">Grab is the best way to move between D1 & D3.</p>
            </div>
          </aside>
        </main>
        <DragOverlay modifiers={[restrictToWindowEdges]}>
          {activeId && activePlace ? (
            <div className="bg-white border-2 border-ink p-4 rounded-2xl shadow-2xl flex items-center gap-4 opacity-90 scale-105 pointer-events-none w-[300px]">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <GripVertical className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800 truncate">{activePlace.name}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest flex gap-2">
                  <span>{activePlace.district}</span>
                  <span>•</span>
                  <span>{activePlace.category}</span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Mobile Footer Overlay */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-white/80 backdrop-blur-md border-t border-border lg:hidden flex justify-around items-center z-50">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center gap-1">
          <Calendar className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Plan</span>
        </button>
        <button 
           onClick={() => {
             const assistant = document.querySelector('aside');
             assistant?.scrollIntoView({ behavior: 'smooth' });
           }}
           className="flex flex-col items-center gap-1"
        >
          <ArrowRightLeft className="w-5 h-5 text-ink" />
          <span className="text-[10px] font-bold text-ink uppercase tracking-tighter">Money</span>
        </button>
      </div>
              </>
            )}

      {/* Login / Auth Dialog Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200/80 w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden relative z-50 p-5 md:p-6 space-y-4 flex flex-col text-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    {authMode === 'login' ? 'Welcome Back Explorer' : 'Create Your Account'}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setAuthError(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                >
                  ×
                </button>
              </div>

              {authError && (
                <div className="bg-rose-50 text-rose-600 border border-rose-100 p-2.5 rounded-xl text-[10px] font-bold tracking-normal uppercase leading-normal">
                  ⚠️ {authError}
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsAuthLoading(true);
                setAuthError(null);
                try {
                  if (authMode === 'signup') {
                    if (!authEmail || !authPassword) {
                      setAuthError('Email and Password are required');
                      setIsAuthLoading(false);
                      return;
                    }
                    if (isSupabaseConfigured) {
                      const { data, error } = await supabase.auth.signUp({
                        email: authEmail,
                        password: authPassword,
                        options: {
                          data: {
                            displayName: authName || 'Explorer',
                            name: authName || 'Explorer'
                          }
                        }
                      });
                      if (error) throw error;
                      if (!data.user) throw new Error('Sign up failed');
                      setCurrentUser(mapSupabaseUser(data.user));
                    }
                  } else {
                    if (isSupabaseConfigured) {
                      const { data, error } = await supabase.auth.signInWithPassword({
                        email: authEmail,
                        password: authPassword
                      });
                      if (error) throw error;
                      if (!data.user) throw new Error('Sign in failed');
                      setCurrentUser(mapSupabaseUser(data.user));
                    }
                  }
                  setIsLoginModalOpen(false);
                } catch (err: any) {
                  console.error("Auth modal error:", err);
                  setAuthError(err?.message || 'Authentication failed');
                } finally {
                  setIsAuthLoading(false);
                }
              }} className="space-y-3">
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Name</label>
                    <input
                      type="text"
                      placeholder="My Nickname (e.g. Alex)"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-sm"
                      maxLength={30}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter email..."
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                  <input
                    type="password"
                    placeholder="Enter password..."
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                  {isAuthLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{authMode === 'login' ? 'Sign In Sync' : 'Register Account'}</span>
                </button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setAuthError(null);
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider"
                >
                  {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>

              <div className="flex items-center text-slate-300 gap-2 my-1">
                <div className="h-[1px] bg-slate-200 flex-1" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 shrink-0">OR QUICK LINK</span>
                <div className="h-[1px] bg-slate-200 flex-1" />
              </div>

              {/* iOS Standalone Friendly Warning/Helper Info */}
              {isStandalone && (
                <div className="bg-amber-50/90 text-amber-900 border border-amber-200/50 p-3 rounded-2xl text-[10px] leading-relaxed text-left font-semibold shadow-inner my-2">
                  <span className="inline-block mr-1">💡</span>
                  <strong>iOS Standalone Web Clip Detected</strong>:<br/>
                  Apple's custom Web Clip sandbox limits standard Google Sign-In popups/redirects.
                  Please register or log in using <strong className="font-extrabold text-indigo-700 underline">Email & Password</strong> above, which works flawlessly right here!
                </div>
              )}

              {/* standard Google federated auth */}
              <button
                onClick={async () => {
                  setIsLoginModalOpen(false);
                  setIsAuthLoading(true);
                  try {
                    if (isSupabaseConfigured) {
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                          redirectTo: window.location.origin
                        }
                      });
                      if (error) throw error;
                    }
                  } catch (err) {
                    console.error("Popup login failed:", err);
                    setIsAuthLoading(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer border border-slate-200"
              >
                <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.71 0 3.27.61 4.5 1.62l2.437-2.437C17.312 1.696 14.933 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.254-4.074 10.254-10.24 0-.695-.081-1.355-.224-1.955H12.24z"/>
                </svg>
                Sign In with Google
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* + Create New Trip Dialog Modal */}
      <AnimatePresence>
        {isCreateTripOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateTripOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 w-full max-w-lg rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] overflow-hidden relative z-50 p-6 md:p-8 flex flex-col text-slate-800 space-y-6"
            >
              {/* Double bold color accent top line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-pink-500 to-amber-400" />

              {/* Modal Title Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shrink-0">
                    <Compass className="w-5 h-5 text-indigo-600 animate-spin" style={{ animationDuration: '20s' }} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-black text-slate-900 leading-snug">Design New Adventure</h2>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Map custom itineraries & currency exchanges</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateTripOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200/60 cursor-pointer"
                >
                  <span className="text-lg font-black leading-none">×</span>
                </button>
              </div>

              {/* Quick Popular Presets Selector (Awesome interactive touch) */}
              <div className="space-y-2 text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  ⚡ Quick Starter Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Tokyo Cultural Escapade', city: 'Tokyo, Japan', emoji: '🍣', lat: 35.6762, lng: 139.6503, days: 7, color: 'hover:border-rose-400 hover:bg-rose-50 text-rose-700' },
                    { name: 'Saigon Street Food Route', city: 'Ho Chi Minh City, Vietnam', emoji: '🍜', lat: 10.7760, lng: 106.7000, days: 5, color: 'hover:border-amber-400 hover:bg-amber-50 text-amber-700' },
                    { name: 'London Classic Highlights', city: 'London, United Kingdom', emoji: '🏰', lat: 51.5074, lng: -0.1278, days: 6, color: 'hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700' },
                    { name: 'Bali Sands & Sunshine', city: 'Bali, Indonesia', emoji: '🌴', lat: -8.4095, lng: 115.1889, days: 8, color: 'hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700' }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setCreateTripName(preset.name);
                        setCreateTripDestinationLabel(preset.city);
                        setCreateTripLat(preset.lat);
                        setCreateTripLng(preset.lng);
                        // Adjust departure based on arrival & days
                        try {
                          const arrDate = new Date(createTripArrival);
                          if (!isNaN(arrDate.getTime())) {
                            const depDate = new Date(arrDate.getTime() + (preset.days - 1) * 24 * 60 * 60 * 1000);
                            setCreateTripDeparture(depDate.toISOString().split('T')[0]);
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-black text-[10.5px] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] ${preset.color}`}
                    >
                      <span>{preset.emoji}</span>
                      <span>{preset.city.split(',')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Creator Main Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!createTripName.trim()) return;
                setIsCreatingTripLoading(true);

                const newTripId = 'TRIP-' + Math.random().toString(36).substr(2, 6).toUpperCase();
                try {
                  // Setup dynamic currency mappings based on destination text bias
                  let targetCurrency = 'EUR';
                  let baseCurrency = 'USD';
                  let conversionRate = 0.92;
                  
                  const destLower = createTripDestinationLabel.toLowerCase();
                  if (destLower.includes('vietnam') || destLower.includes('saigon') || destLower.includes('hanoi')) {
                    targetCurrency = 'VND';
                    baseCurrency = 'SGD';
                    conversionRate = 18500;
                  } else if (destLower.includes('japan') || destLower.includes('tokyo') || destLower.includes('kyoto')) {
                    targetCurrency = 'JPY';
                    baseCurrency = 'USD';
                    conversionRate = 155.60;
                  } else if (destLower.includes('singapore')) {
                    targetCurrency = 'SGD';
                    baseCurrency = 'USD';
                    conversionRate = 1.34;
                  } else if (destLower.includes('united kingdom') || destLower.includes('london')) {
                    targetCurrency = 'GBP';
                    baseCurrency = 'USD';
                    conversionRate = 0.79;
                  }

                  if (isSupabaseConfigured) {
                    const { error } = await supabase
                      .from('trips')
                      .insert([{
                        id: newTripId,
                        plannerName: createTripName,
                        destination: createTripDestinationLabel || 'Custom Destination',
                        lat: createTripLat,
                        lng: createTripLng,
                        arrivalDate: createTripArrival,
                        departureDate: createTripDeparture,
                        baseCurrency,
                        targetCurrency,
                        conversionRate,
                        ownerId: currentUser?.uid || 'guest',
                        isShared: false,
                        updatedAt: new Date().toISOString()
                      }]);
                    if (error) throw error;
                  }

                  // Clear current list to load blank destination context cleanly
                  setPlaces([]);

                  // Select new trip
                  setTripId(newTripId);
                  localStorage.setItem('saigon_trip_id', newTripId);
                  const url = new URL(window.location.href);
                  url.searchParams.set('tripId', newTripId);
                  window.history.pushState({}, '', url.toString());

                  setIsCreateTripOpen(false);
                  setViewMode('planner');
                } catch (err) {
                  console.error("Failed to build new trip:", err);
                } finally {
                  setIsCreatingTripLoading(false);
                }
              }} className="space-y-4 text-left">
                
                {/* Plan Name field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Plan Identifier Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kyoto Cherry Blossom Trip"
                    value={createTripName}
                    onChange={(e) => setCreateTripName(e.target.value)}
                    className="bg-slate-50/50 border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-650 focus:border-indigo-650 w-full hover:border-slate-350 transition-all shadow-sm placeholder-slate-400"
                  />
                </div>

                {/* City Search Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Interactive City Fetcher</label>
                  <CitySearchAutocomplete 
                    value={createTripDestinationLabel}
                    onChange={(val) => setCreateTripDestinationLabel(val)}
                    onCitySelect={(city, lat, lng) => {
                      setCreateTripDestinationLabel(city);
                      setCreateTripLat(lat);
                      setCreateTripLng(lng);
                    }} 
                  />
                  {createTripDestinationLabel ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/80 border border-emerald-100 rounded-xl text-[10px] font-bold text-emerald-800 shadow-sm mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span>Matched: <strong>{createTripDestinationLabel}</strong> (Lat: {createTripLat.toFixed(3)}, Lng: {createTripLng.toFixed(3)})</span>
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-400 font-bold italic block pl-1">
                      Search and click options from the Google Places list above to find precise coordinates!
                    </p>
                  )}
                </div>

                {/* Dates Selector and duration pill tabs */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Arrival Date</label>
                      <input
                        type="date"
                        required
                        value={createTripArrival}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateTripArrival(val);
                          // Auto shift departure to fit at least 3 days if departure becomes earlier
                          try {
                            const newArr = new Date(val);
                            const currentDep = new Date(createTripDeparture);
                            if (!isNaN(newArr.getTime()) && (!isNaN(currentDep.getTime()) && currentDep < newArr)) {
                              const depDate = new Date(newArr.getTime() + 2 * 24 * 60 * 60 * 1000);
                              setCreateTripDeparture(depDate.toISOString().split('T')[0]);
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="bg-slate-50/50 border border-slate-200/95 rounded-2xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-650 w-full transition-all hover:border-slate-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Departure Date</label>
                      <input
                        type="date"
                        required
                        value={createTripDeparture}
                        onChange={(e) => setCreateTripDeparture(e.target.value)}
                        className="bg-slate-50/50 border border-slate-200/95 rounded-2xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-650 w-full transition-all hover:border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Smart quick duration helpers */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mr-1 pl-1">Quick Duration:</span>
                    {[3, 5, 7, 10, 14].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          try {
                            const arrDate = new Date(createTripArrival);
                            if (!isNaN(arrDate.getTime())) {
                              const depDate = new Date(arrDate.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
                              setCreateTripDeparture(depDate.toISOString().split('T')[0]);
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-black text-[9.5px] rounded-lg border border-slate-200/50 cursor-pointer active:scale-95 transition-all"
                      >
                        +{days} Days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Dynamic Live Card Theme Preview */}
                {(createTripName || createTripDestinationLabel) && (
                  <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-left select-none relative overflow-hidden space-y-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#4f46e5]">Live Core Preview</span>
                    
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1 text-left">
                        <h4 className="text-xs font-black text-slate-900 truncate max-w-[200px]">
                          {createTripName || 'Unnamed Adventure'}
                        </h4>
                        <p className="text-[9.5px] font-bold text-slate-500">
                          🗺️ {createTripDestinationLabel || 'Custom Destination'}
                        </p>
                      </div>

                      {/* Cool Dynamic Emoji selector preview badges */}
                      <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-sm shrink-0">
                        {(() => {
                          const destLower = (createTripDestinationLabel || '').toLowerCase();
                          if (destLower.includes('vietnam') || destLower.includes('saigon') || destLower.includes('hanoi')) return '🍜';
                          if (destLower.includes('japan') || destLower.includes('tokyo') || destLower.includes('kyoto')) return '🍣';
                          if (destLower.includes('singapore')) return '🦁';
                          if (destLower.includes('united kingdom') || destLower.includes('london')) return '🏰';
                          if (destLower.includes('beach') || destLower.includes('hawaii') || destLower.includes('bali')) return '🌴';
                          return '🎒';
                        })()}
                      </span>
                    </div>

                    {/* Calculated Days count visual check */}
                    {(() => {
                      try {
                        const a = new Date(createTripArrival);
                        const d = new Date(createTripDeparture);
                        if (!isNaN(a.getTime()) && !isNaN(d.getTime())) {
                          const diffTime = Math.abs(d.getTime() - a.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                          return (
                            <div className="flex items-center gap-1.5 text-[9px] font-black tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg w-fit">
                              🧳 Setup sequence: {diffDays} {diffDays === 1 ? 'Day' : 'Days'} total plan range
                            </div>
                          );
                        }
                      } catch {
                        return null;
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Submission Flow button */}
                <button
                  type="submit"
                  disabled={isCreatingTripLoading || !createTripDestinationLabel}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:from-indigo-400 disabled:to-indigo-500 text-white font-extrabold text-xs py-3.5 rounded-2xl transition-all cursor-pointer shadow-lg shadow-indigo-600/10 active:scale-95 flex items-center justify-center gap-2 mt-4 uppercase tracking-wider disabled:cursor-not-allowed"
                >
                  {isCreatingTripLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Generate Master Planner</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
          </>
        )}
    </div>
    </AppProvider>
  );
}

// Separate Autocomplete helper for Cities in new trip modal
interface CitySearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onCitySelect: (city: string, lat: number, lng: number) => void;
}

function CitySearchAutocomplete({ value, onChange, onCitySelect }: CitySearchAutocompleteProps) {
  const [list, setList] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const placesLib = useMapsLibrary('places');
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!placesLib || !value) {
      setList([]);
      return;
    }
    if (!tokenRef.current) {
      tokenRef.current = new placesLib.AutocompleteSessionToken();
    }

    const fetchCities = async () => {
      setLoading(true);
      try {
        const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: tokenRef.current!
        });
        setList(suggestions);
      } catch (err) {
        console.error("City suggestion failed:", err);
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(fetchCities, 250);
    return () => clearTimeout(t);
  }, [placesLib, value]);

  const selectHandler = async (s: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !s.placePrediction) return;
    const place = s.placePrediction.toPlace();
    await place.fetchFields({ fields: ['displayName', 'location'] });
    
    if (place.location) {
      onCitySelect(place.displayName || value, place.location.lat(), place.location.lng());
    }
    setList([]);
    tokenRef.current = null;
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={value}
          required
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Kyoto, Singapore, Paris..."
          className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs outline-none focus:border-indigo-500 shadow-inner text-slate-800 font-medium"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {list.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg text-left"
          >
            {list.map((s, idx) => (
              <li
                key={idx}
                onClick={() => selectHandler(s)}
                className="px-3 py-2 text-[11px] hover:bg-slate-50 font-bold text-slate-700 cursor-pointer border-b border-slate-50 whitespace-nowrap overflow-hidden text-ellipsis"
              >
                📍 {s.placePrediction?.text?.text || s.placePrediction?.displayName?.text}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
