import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ---------------------------------------------------------------------------
// Fix default Leaflet marker icons (Vite / bundler compatibility)
// ---------------------------------------------------------------------------
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoResult {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface LocationPickerMapProps {
  /** Initial coordinates (e.g. when editing an existing location) */
  initialLat?: number | null;
  initialLng?: number | null;
  onChange: (result: GeoResult) => void;
}

// ---------------------------------------------------------------------------
// Nominatim reverse-geocode
// ---------------------------------------------------------------------------

interface NominatimReverseResult {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
    country?: string;
  };
}

async function reverseGeocode(lat: number, lng: number): Promise<Partial<GeoResult>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return {};
    const data: NominatimReverseResult = await res.json();
    const a = data.address;

    const streetParts = [a.house_number, a.road, a.suburb].filter(Boolean);
    const address = streetParts.join(", ") || data.display_name.split(",")[0];

    return {
      address,
      city: a.city ?? a.town ?? a.village ?? a.county ?? "",
      state: a.state ?? "",
      country: (a.country_code ?? "").toUpperCase(),
      postalCode: a.postcode ?? "",
    };
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Nominatim forward-geocode (search)
// ---------------------------------------------------------------------------

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function forwardGeocode(query: string): Promise<NominatimSearchResult[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return [];
    return res.json() as Promise<NominatimSearchResult[]>;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Inner: Click handler + draggable marker
// ---------------------------------------------------------------------------

interface MarkerHandlerProps {
  position: [number, number] | null;
  onPlace: (lat: number, lng: number) => void;
}

function MarkerHandler({ position, onPlace }: MarkerHandlerProps) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });

  if (!position) return null;

  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend(e) {
          const m = e.target as L.Marker;
          const latlng = m.getLatLng();
          onPlace(latlng.lat, latlng.lng);
        },
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Inner: Programmatic fly-to
// ---------------------------------------------------------------------------

function FlyToLocation({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const prevTarget = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (
      target &&
      (prevTarget.current === null ||
        prevTarget.current[0] !== target[0] ||
        prevTarget.current[1] !== target[1])
    ) {
      map.flyTo(target, Math.max(map.getZoom(), 15), { animate: true, duration: 1 });
      prevTarget.current = target;
    }
  }, [map, target]);

  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LocationPickerMap({
  initialLat,
  initialLng,
  onChange,
}: LocationPickerMapProps) {
  const hasInitial = initialLat != null && initialLng != null;

  const [position, setPosition] = useState<[number, number] | null>(
    hasInitial ? [initialLat!, initialLng!] : null
  );
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(
    hasInitial ? [initialLat!, initialLng!] : null
  );

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reverse-geocoding indicator
  const [geocoding, setGeocoding] = useState(false);

  // Default map center (Baku, Azerbaijan — adjust as needed)
  const defaultCenter: [number, number] = hasInitial
    ? [initialLat!, initialLng!]
    : [40.4093, 49.8671];

  async function placePin(lat: number, lng: number) {
    setPosition([lat, lng]);
    setGeocoding(true);

    const geo = await reverseGeocode(lat, lng);
    setGeocoding(false);

    onChange({
      latitude: lat,
      longitude: lng,
      address: geo.address ?? "",
      city: geo.city ?? "",
      state: geo.state ?? "",
      country: geo.country ?? "",
      postalCode: geo.postalCode ?? "",
    });
  }

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    setSearchResults([]);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) return;
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const results = await forwardGeocode(value);
      setSearchResults(results);
      setSearching(false);
    }, 500);
  }

  function selectSearchResult(r: NominatimSearchResult) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setSearchQuery(r.display_name);
    setSearchResults([]);
    setFlyTarget([lat, lng]);
    placePin(lat, lng);
  }

  return (
    <div className="space-y-2">
      {/* Search box */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-400 flex-shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search address…"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
          />
          {searching && (
            <svg className="animate-spin w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
        </div>

        {searchResults.length > 0 && (
          <ul className="absolute z-[1000] left-0 right-0 mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-theme-md overflow-hidden">
            {searchResults.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => selectSearchResult(r)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ height: 320 }}>
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MarkerHandler position={position} onPlace={placePin} />
          <FlyToLocation target={flyTarget} />
        </MapContainer>

        {!position && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="rounded-xl bg-white/90 dark:bg-gray-900/90 px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 shadow">
              Click the map to place a pin
            </div>
          </div>
        )}

        {geocoding && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-lg bg-white/90 dark:bg-gray-900/90 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 shadow">
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Fetching address…
          </div>
        )}
      </div>

      {/* Coordinates display */}
      {position && (
        <p className="text-xs text-gray-400 text-center">
          {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </p>
      )}
    </div>
  );
}
