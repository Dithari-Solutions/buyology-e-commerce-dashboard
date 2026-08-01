import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { couriersService } from "../../api/services/couriers.service";
import type {
  CourierMapEntry,
  CourierStatus,
  VehicleType,
} from "../../types/courier.types";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";

const POLL_MS = 10_000;

// ── Marker colors ─────────────────────────────────────────────────────────────

function markerColor(c: CourierMapEntry): string {
  if (c.status === "SUSPENDED") return "#ef4444";
  if (c.status === "OFFLINE") return "#9ca3af";
  if (c.isAvailable) return "#22c55e";
  return "#f59e0b";
}

function makeIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);background:${color};
        border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center;
      "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

function vehicleLabel(v: VehicleType): string {
  return { BICYCLE: "Bicycle 🚴", FOOT: "On foot 🚶", SCOOTER: "Scooter 🛵", CAR: "Car 🚗" }[v] ?? v;
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const STATUSES: CourierStatus[] = ["ACTIVE", "OFFLINE", "SUSPENDED"];
const VEHICLES: VehicleType[] = ["BICYCLE", "FOOT", "SCOOTER", "CAR"];

interface Filters {
  status?: CourierStatus;
  vehicleType?: VehicleType;
  isAvailable?: true;
}

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const toggle = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    onChange({ ...filters, [key]: filters[key] === val ? undefined : val });

  const btnCls = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
      active
        ? "bg-brand-500 text-white border-brand-500"
        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-400"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</span>
      {STATUSES.map(s => (
        <button key={s} className={btnCls(filters.status === s)} onClick={() => toggle("status", s)}>{s}</button>
      ))}
      <span className="ml-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Vehicle</span>
      {VEHICLES.map(v => (
        <button key={v} className={btnCls(filters.vehicleType === v)} onClick={() => toggle("vehicleType", v)}>{v}</button>
      ))}
      <button
        className={btnCls(filters.isAvailable === true) + " ml-3"}
        onClick={() => toggle("isAvailable", true)}
      >Available only</button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CourierMap() {
  const [couriers, setCouriers] = useState<CourierMapEntry[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async (f: Filters) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const data = await couriersService.getForMap(f, ctrl.signal);
      setCouriers(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Failed to load courier locations.");
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetch(filters);
    const timer = setInterval(() => fetch(filters), POLL_MS);
    return () => { clearInterval(timer); abortRef.current?.abort(); };
  }, [fetch, filters]);

  const withLocation = couriers.filter(c => c.latestLocation).length;

  return (
    <div className="p-4 flex flex-col gap-4 h-full">
      <PageBreadCrumb pageTitle="Courier Fleet Map" />

      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
        {/* Filters */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Stats */}
        <div className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <span><strong className="text-gray-900 dark:text-white">{couriers.length}</strong> couriers total</span>
          <span><strong className="text-gray-900 dark:text-white">{withLocation}</strong> with location</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Refreshes every 10 s
            {lastRefresh && <span className="text-gray-400">· {lastRefresh.toLocaleTimeString()}</span>}
          </span>
          {error && <span className="text-red-500">{error}</span>}
        </div>

        {/* No-location banner */}
        {couriers.length > 0 && withLocation === 0 && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            {couriers.length} courier{couriers.length > 1 ? "s" : ""} found but none have sent a GPS ping yet — markers will appear once the courier app reports a location.
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[40.4093, 49.8671]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {couriers.map(c => {
              if (!c.latestLocation) return null;
              const { latitude, longitude, speed, recordedAt } = c.latestLocation;
              return (
                <Marker
                  key={c.id}
                  position={[Number(latitude), Number(longitude)]}
                  icon={makeIcon(markerColor(c))}
                >
                  <Popup>
                    <div style={{ minWidth: 190, fontFamily: "sans-serif" }}>
                      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {c.firstName} {c.lastName}
                      </p>
                      <p style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>{c.phone}</p>
                      <p style={{ fontSize: 12, marginBottom: 2 }}>
                        <strong>Vehicle:</strong> {vehicleLabel(c.vehicleType)}
                      </p>
                      <p style={{ fontSize: 12, marginBottom: 2 }}>
                        <strong>Status:</strong> {c.status} · {c.isAvailable ? "Available" : "Busy"}
                      </p>
                      <p style={{ fontSize: 12, marginBottom: 2 }}>
                        <strong>Rating:</strong> {c.rating != null ? Number(c.rating).toFixed(1) + " ★" : "—"}
                      </p>
                      <p style={{ fontSize: 12, marginBottom: 2 }}>
                        <strong>Speed:</strong> {speed != null ? Number(speed).toFixed(1) + " km/h" : "—"}
                      </p>
                      <p style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
                        Last ping: {new Date(recordedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Legend */}
          <div style={{
            position: "absolute", bottom: 32, left: 12, zIndex: 1000,
            background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)",
            borderRadius: 12, padding: "8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,.15)",
            fontSize: 12, color: "#555", lineHeight: "1.8",
          }}>
            {[
              { color: "#22c55e", label: "Active · Available" },
              { color: "#f59e0b", label: "Active · Busy" },
              { color: "#9ca3af", label: "Offline" },
              { color: "#ef4444", label: "Suspended" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, display: "inline-block" }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
