import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  ArrowRightLeft, 
  DollarSign, 
  MapPin, 
  Tag, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
  GripVertical,
  Search,
  Map as MapIcon,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
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
}

const DISTRICTS: District[] = ['D1', 'D3', 'D4', 'D5', 'D7', 'Binh Thanh', 'Thu Duc'];
const CATEGORIES: Category[] = ['Food', 'Fashion', 'Coffee', 'Spa', 'Sightseeing', 'Nightlife'];

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

const INITIAL_PLACES: Place[] = [
  { id: '1', name: 'Bánh Canh Cua 87', district: 'D1', category: 'Food', day: 'Day 1', time: '11:00', address: '87 Trần Khắc Chân, Tân Định, Quận 1' },
  { id: '2', name: 'The New Playground', district: 'D1', category: 'Fashion', day: 'Day 1', time: '13:00', address: '26 Lý Tự Trọng, Bến Nghé, Quận 1' },
  { id: '3', name: 'OKKIO Cà Phê', district: 'D1', category: 'Coffee', day: 'Day 1', time: '14:30', address: '122 Đ. Lê Lợi, Phường Bến Thành, Quận 1' },
  { id: '4', name: 'Miu Miu Spa 2', district: 'D1', category: 'Spa', day: 'Day 1', time: '16:00', address: '2B Chu Mạnh Trinh, Bến Nghé, Quận 1' },
  { id: '5', name: 'Phở Việt Nam Stone Bowl', district: 'D1', category: 'Food', day: 'Day 1', time: '19:00', address: '14 Phạm Hồng Thái, Phường Bến Thành, Quận 1' },
  { id: '6', name: 'The Cafe Apartment 42 Nguyen Hue', district: 'D1', category: 'Coffee', day: 'Day 2', time: '10:00', address: '42 Nguyễn Huệ, Bến Nghé, Quận 1' },
  { id: '7', name: 'Cà Phê Muối Chú Long', district: 'D1', category: 'Coffee', day: 'Day 2', time: '11:30', address: '104 Đ. Lê Lợi, Phường Bến Thành, Quận 1' },
  { id: '8', name: 'Union Square & Rue Miche', district: 'D1', category: 'Fashion', day: 'Day 2', time: '13:00', address: '171 Đ. Đồng Khởi, Bến Nghé, Quận 1' },
  { id: '9', name: 'Norah Spa 3', district: 'D1', category: 'Spa', day: 'Day 2', time: '15:00', address: '118 Đ. Nguyễn Du, Phường Bến Thành, Quận 1' },
  { id: '10', name: 'Pink Church & Ola Hale', district: 'D3', category: 'Sightseeing', day: 'Day 2', time: '16:30', address: '289 Hai Bà Trưng, Phường 8, Quận 3' },
  { id: '11', name: 'LIDER', district: 'D1', category: 'Fashion', day: 'Day 2', time: '17:30', address: '42 Tôn Thất Thiệp, Bến Nghé, Quận 1' },
  { id: '12', name: 'Secret Garden Rooftop', district: 'D1', category: 'Food', day: 'Day 2', time: '19:30', address: '158 Pasteur, Bến Nghé, Quận 1' },
  { id: '13', name: 'Highway Menswear', district: 'D3', category: 'Fashion', day: 'Day 3', time: '10:00', address: '16 Phạm Ngọc Thạch, Quận 3' },
  { id: '14', name: 'Compound Garment Alley 158', district: 'D1', category: 'Fashion', day: 'Day 3', time: '11:30', address: '158 Pasteur, Bến Nghé, Quận 1' },
  { id: '15', name: 'WEPHOBIA & 11 Garmentory', district: 'D1', category: 'Fashion', day: 'Day 3', time: '13:00', address: '39 Đ. Lê Duẩn, Bến Nghé, Quận 1' },
  { id: '16', name: 'Nguyen Van Binh Book Street', district: 'D1', category: 'Sightseeing', day: 'Day 3', time: '14:30', address: 'Đường Nguyễn Văn Bình, Bến Nghé, Quận 1' },
  { id: '17', name: 'Sen Trắng Hair Spa', district: 'D1', category: 'Spa', day: 'Day 3', time: '16:00', address: '150/19 Nguyễn Trãi, Phường Phạm Ngũ Lão, Quận 1' },
  { id: '18', name: 'Quán Bụi Lê Thánh Tôn', district: 'D1', category: 'Food', day: 'Day 3', time: '19:00', address: '17A Ngô Văn Năm, Bến Nghé, Quận 1' },
];

const VND_PER_SGD = 20600;

const RECOMMENDED_PLACES: Omit<Place, 'id'>[] = [
  { name: 'Bánh Mì Huỳnh Hoa', district: 'D1', category: 'Food', address: '26 Lê Thị Riêng, Phường Phạm Ngũ Lão, Quận 1' },
  { name: "Pizza 4P's Ben Thanh", district: 'D1', category: 'Food', address: '8 Thủ Khoa Huân, Phường Bến Thành, Quận 1' },
  { name: 'Highlands Coffee Opera House', district: 'D1', category: 'Coffee', address: '7 Công Trường Lam Sơn, Bến Nghé, Quận 1' },
  { name: 'War Remnants Museum', district: 'D3', category: 'Sightseeing', address: '28 Võ Văn Tần, Phường 6, Quận 3' },
  { name: 'Ben Thanh Market', district: 'D1', category: 'Sightseeing', address: 'Lê Lợi, Phường Bến Thành, Quận 1' },
  { name: 'Bitexco Financial Tower', district: 'D1', category: 'Sightseeing', address: '2 Hải Triều, Bến Nghé, Quận 1' },
  { name: 'Pasteur Street Brewing Co.', district: 'D1', category: 'Nightlife', address: '144 Pasteur, Bến Nghé, Quận 1' },
  { name: 'Saigon Central Post Office', district: 'D1', category: 'Sightseeing', address: '2 Công xã Paris, Bến Nghé, Quận 1' },
  { name: 'The New Playground', district: 'D1', category: 'Fashion', address: '26 Lý Tự Trọng, Bến Nghé, Quận 1' },
  { name: 'Miu Miu Spa', district: 'D1', category: 'Spa', address: '4 Chu Mạnh Trinh, Bến Nghé, Quận 1' },
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
  const [places, setPlaces] = useState<Place[]>(() => {
    const savedPlaces = localStorage.getItem('saigon_places');
    if (savedPlaces) {
      const parsed = JSON.parse(savedPlaces);
      // Migration: ensure addresses are recovered from INITIAL_PLACES if missing in saved data
      return parsed.map((p: Place) => {
        if (!p.address) {
          const initial = INITIAL_PLACES.find(ip => ip.name === p.name);
          if (initial) return { ...p, address: initial.address };
        }
        return p;
      });
    }
    return INITIAL_PLACES;
  });
  const [activeTab, setActiveTab] = useState<Day>('Day 1');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  
  // Trip Info State
  const [plannerName, setPlannerName] = useState(() => {
    const saved = localStorage.getItem('saigon_trip_info');
    if (saved) return JSON.parse(saved).plannerName || 'Saigon Travel Master Planner';
    return 'Saigon Travel Master Planner';
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

  // Ensure active tab is valid when DAYS change
  useEffect(() => {
    if (!DAYS.includes(activeTab)) {
      setActiveTab(DAYS[0] || 'Day 1');
    }
  }, [DAYS, activeTab]);
  
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
  const [sgdInput, setSgdInput] = useState<string>('50');
  const [vndInput, setVndInput] = useState<string>('200000');

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
    };
    setPlaces(prev => [...prev, newPlace]);
    setNewName('');
    setNewAddress('');
  };

  const deletePlace = (id: string) => {
    setPlaces(prev => prev.filter(p => p.id !== id));
  };

  const toggleExpand = (id: string) => {
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, expanded: !p.expanded } : p));
  };

  const updatePlaceDay = (id: string, day?: Day) => {
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, day } : p));
  };

  const updatePlaceTime = (id: string, time: string) => {
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, time } : p));
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
  const sgdToVnd = (sgd: string) => {
    const num = parseFloat(sgd);
    if (isNaN(num)) return '0';
    return (num * VND_PER_SGD).toLocaleString();
  };

  const vndToSgd = (vnd: string) => {
    const cleanVnd = vnd.replace(/,/g, '');
    const num = parseFloat(cleanVnd);
    if (isNaN(num)) return '0.00';
    return (num / VND_PER_SGD).toFixed(2);
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
      <DndContext 
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <main className="max-w-6xl mx-auto p-6 md:p-8 grid lg:grid-cols-[1fr_300px] gap-6 lg:gap-10">
          
          {/* Main Content Area */}
          <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-10">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center text-white shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <input 
                    type="text" 
                    value={plannerName}
                    onChange={(e) => setPlannerName(e.target.value)}
                    className="text-xl font-bold tracking-tight bg-transparent border-none focus:ring-0 p-0 w-full hover:bg-slate-100 transition-colors rounded px-2 -ml-2"
                    placeholder="Planner Name..."
                  />
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
              
              <div className="hidden sm:block pt-1">
                <Badge className="bg-[#DBEAFE] text-[#1E40AF] px-4 py-2 text-[11px] shadow-sm whitespace-nowrap">
                  {new Date(arrivalDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} • Master Log
                </Badge>
              </div>
            </header>

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
                                The app is running offline or is deployed without a Maps API key. You can still easily add locations using <strong className="text-indigo-600 uppercase font-extrabold font-sans">"Or Add Manually"</strong> or extract curated Saigon spots with <strong className="text-indigo-600 uppercase font-extrabold font-sans">"View Suggested"</strong>!
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
                                          .map(p => ({
                                            ...p,
                                            id: Math.random().toString(36).substr(2, 9),
                                            day: undefined,
                                            time: undefined
                                          }));
                                        return [...prev, ...trulyNewPlaces];
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
                                            
                                            const newPlace: Place = {
                                              ...rec,
                                              id: Math.random().toString(36).substr(2, 9),
                                              day: undefined,
                                              time: undefined
                                            };
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
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Travel Schedule</h2>
              
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
                        <div className="h-40 flex flex-col items-center justify-center text-slate-300 italic text-sm text-center gap-2">
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
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Currency Assistant */}
            <div className="section-card p-6 gap-6 flex flex-col shadow-lg shadow-slate-200/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-1">Currency Assistant</h2>
                <p className="text-[11px] text-slate-500">Mid-market: 1 SGD = 20,600 VND</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Convert (SGD)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={sgdInput}
                      onChange={(e) => setSgdInput(e.target.value)}
                      className="w-full p-3 pr-12 bg-slate-50 border border-border rounded-lg text-lg font-bold outline-none focus:border-ink/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">SGD</span>
                  </div>
                </div>

                <div className="text-center text-slate-300 text-2xl font-light">↓</div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">To (VND)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      readOnly
                      value={sgdToVnd(sgdInput)}
                      className="w-full p-3 pr-12 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-lg font-bold outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">VND</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">QUICK VND TO SGD</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={vndInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setVndInput(val ? parseInt(val).toLocaleString() : '');
                    }}
                    className="w-full p-3 pr-12 bg-slate-50 border border-border rounded-lg text-lg font-bold outline-none focus:border-ink/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">VND</span>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-xl font-bold font-mono tracking-tight text-ink">${vndToSgd(vndInput)}</span>
                  <span className="text-[10px] font-bold text-slate-400 ml-1">SGD</span>
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
    </div>
    </AppProvider>
  );
}
