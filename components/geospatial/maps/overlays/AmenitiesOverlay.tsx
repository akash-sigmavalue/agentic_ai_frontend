'use client';

import React, { useEffect } from 'react';
import { Download, Trash2, Circle } from 'lucide-react';
import { apiUrl } from '@/lib/api-client';

// ── Constants ───────────────────────────────────────────────
const CITIES: Record<string, string> = {
  Pune: 'Pune',
  Mumbai: 'Mumbai',
  Thane: 'Thane',
  Hyderabad: 'Hyderabad',
  Bengaluru: 'Bengaluru',
};

export interface CategoryConfig {
  name: string;
  icon: string;
  color: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  hospitals:                  { name: 'Hospitals',                  icon: 'fa-hospital',    color: '#d9534f' },
  bus_stops:                  { name: 'Bus Stops',                  icon: 'fa-bus',         color: '#0275d8' },
  schools:                    { name: 'Schools',                    icon: 'fa-school',      color: '#5cb85c' },
  metro_stations:             { name: 'Metro Stations',             icon: 'fa-subway',      color: '#f0ad4e' },
  railway_stations:           { name: 'Railway Stations',           icon: 'fa-train',       color: '#8b6b4f' },
  gardens:                    { name: 'Gardens',                    icon: 'fa-leaf',        color: '#5cb85c' },
  malls:                      { name: 'Malls',                      icon: 'fa-shopping-bag', color: '#6f4e9e' },
  it_parks:                   { name: 'IT Parks',                   icon: 'fa-building',    color: '#6c757d' },
  restaurants_entertainment:  { name: 'Restaurants & Entertainment', icon: 'fa-utensils',   color: '#fd7e14' },
  police_stations:            { name: 'Police Stations',            icon: 'fa-shield-alt',  color: '#0275d8' },
  fire_stations:              { name: 'Fire Stations',              icon: 'fa-fire',        color: '#d9534f' },
};

export { CITIES };

// ── Types ───────────────────────────────────────────────────
export interface AmenityPoint {
  name: string;
  lat: number;
  lon: number;
  category: string;
  osm_type?: string;
  osm_id?: number;
}

// ── Runtime OSM response ───────────────────────────────────
interface AmenityRuntimeResponse {
  points?: AmenityPoint[];
  category_metadata?: Record<string, { source?: string; count?: number }>;
}

// ── Sidebar Controls ───────────────────────────────────────
interface AmenitiesOverlayProps {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  setAllAmenities: (pts: AmenityPoint[]) => void;
  pointsToShow: AmenityPoint[];
  onClearDrawn: () => void;
  onClearCircle: () => void;
  onLoadingChange?: (loading: boolean) => void;
  onStatusChange?: (status: string) => void;
}

const AmenitiesOverlay: React.FC<AmenitiesOverlayProps> = ({
  selectedCity,
  setSelectedCity,
  selectedCategories,
  setSelectedCategories,
  setAllAmenities,
  pointsToShow,
  onClearDrawn,
  onClearCircle,
  onLoadingChange,
  onStatusChange,
}) => {
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadData = async () => {
      if (!selectedCity || selectedCategories.length === 0) {
        setAllAmenities([]);
        onLoadingChange?.(false);
        onStatusChange?.('Select an amenity category');
        return;
      }

      onLoadingChange?.(true);
      onStatusChange?.('Fetching selected amenities from OpenStreetMap...');

      try {
        const params = new URLSearchParams({
          city: selectedCity,
          categories: selectedCategories.join(','),
        });
        const response = await fetch(apiUrl(`/map-overlays/osm-amenities?${params.toString()}`), {
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({ detail: response.statusText }));
          throw new Error(body.detail || `HTTP ${response.status}`);
        }

        const data = await response.json() as AmenityRuntimeResponse;
        if (!active) return;

        const points = Array.isArray(data.points) ? data.points : [];
        const sources = new Set(
          Object.values(data.category_metadata || {}).map((metadata) => metadata.source).filter(Boolean),
        );
        const cacheUsed = sources.has('soft_cache') || sources.has('stale_soft_cache');
        setAllAmenities(points);
        onStatusChange?.(`${points.length} OSM amenities loaded${cacheUsed ? ' (soft cache used)' : ''}`);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setAllAmenities([]);
        onStatusChange?.(error instanceof Error ? error.message : 'Unable to load OSM amenities');
      } finally {
        if (active) onLoadingChange?.(false);
      }
    };

    loadData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [onLoadingChange, onStatusChange, selectedCity, selectedCategories, setAllAmenities]);

  const categoryCounts = pointsToShow.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const handleDownloadCSV = () => {
    const rows = [['Name', 'Category', 'Latitude', 'Longitude']];
    pointsToShow.forEach((p) => {
      rows.push([p.name || 'Unnamed', CATEGORY_CONFIG[p.category]?.name || p.category, String(p.lat), String(p.lon)]);
    });
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amenities_${selectedCity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* City selector */}
      <div className="px-4 mb-5">
        <label className="block text-sm font-medium text-slate-500 mb-1.5">Select city</label>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="w-full p-2 rounded-lg border border-slate-300 bg-white text-sm outline-none"
        >
          {Object.keys(CITIES).map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Category checkboxes */}
      <div className="px-4 mb-5">
        <label className="block text-sm font-medium text-slate-500 mb-1.5">Amenity categories</label>
        {Object.keys(CATEGORY_CONFIG).map((cat) => (
          <div key={cat} className="mb-1.5">
            <label className="flex items-center text-sm cursor-pointer gap-2">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedCategories([...selectedCategories, cat]);
                  else setSelectedCategories(selectedCategories.filter((c) => c !== cat));
                }}
                className="accent-blue-500"
              />
              <span style={{ color: CATEGORY_CONFIG[cat].color }}>●</span>
              <span>{CATEGORY_CONFIG[cat].name}</span>
            </label>
          </div>
        ))}
      </div>

      {/* Clear buttons */}
      <div className="px-4 flex gap-2 mb-5">
        <button onClick={onClearDrawn} className="flex-1 py-2 px-3 bg-slate-100 border border-slate-300 rounded-lg cursor-pointer flex items-center justify-center gap-1 text-sm hover:bg-slate-200 transition-colors">
          <Trash2 size={16} /> Clear drawn
        </button>
        <button onClick={onClearCircle} className="flex-1 py-2 px-3 bg-slate-100 border border-slate-300 rounded-lg cursor-pointer flex items-center justify-center gap-1 text-sm hover:bg-slate-200 transition-colors">
          <Circle size={16} /> Clear circle
        </button>
      </div>

      {/* Amenity Summary */}
      <div className="px-4">
        <h4 className="mb-3 text-base font-semibold flex items-center gap-1.5">
          <Download size={18} /> Amenity Summary
        </h4>
        {pointsToShow.length > 0 ? (
          <>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-1">Category</th>
                  <th className="text-right py-1">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(categoryCounts).map(([cat, cnt]) => (
                  <tr key={cat}>
                    <td className="py-1" style={{ color: CATEGORY_CONFIG[cat]?.color }}>{CATEGORY_CONFIG[cat]?.name || cat}</td>
                    <td className="text-right py-1">{cnt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleDownloadCSV} className="mt-3 w-full py-2 bg-blue-500 text-white rounded-lg cursor-pointer flex items-center justify-center gap-1.5 text-sm hover:bg-blue-600 transition-colors">
              <Download size={16} /> Download CSV
            </button>
          </>
        ) : (
          <p className="text-slate-400 text-sm">No amenities match filters</p>
        )}
      </div>
    </>
  );
};

export default AmenitiesOverlay;

// ── Right Column ───────────────────────────────────────────
interface AmenitiesRightColumnProps {
  pointsToShow: AmenityPoint[];
  selectedCity: string;
  categoryConfig: Record<string, CategoryConfig>;
}

export const AmenitiesRightColumn: React.FC<AmenitiesRightColumnProps> = ({
  pointsToShow,
  selectedCity,
  categoryConfig,
}) => {
  const handleDownloadCSV = () => {
    const rows = [['Name', 'Category', 'Latitude', 'Longitude']];
    pointsToShow.forEach((p) => {
      rows.push([p.name || 'Unnamed', categoryConfig[p.category]?.name || p.category, String(p.lat), String(p.lon)]);
    });
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amenities_${selectedCity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <h3 className="mt-0 mb-4 text-lg font-semibold">{pointsToShow.length} amenities found</h3>
      {pointsToShow.length > 0 ? (
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          {pointsToShow.map((p, idx) => {
            const cfg = categoryConfig[p.category] || {};
            return (
              <div key={idx} className="mb-3 flex items-center gap-2">
                <i className={`fas ${cfg.icon || 'fa-circle'}`} style={{ color: cfg.color || '#000', width: 20, textAlign: 'center' }} />
                <div>
                  <div className="font-medium text-sm">{p.name || 'Unnamed'}</div>
                  <div className="text-xs text-slate-500">{cfg.name || p.category}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-slate-400 text-sm">No amenities in this zone.</p>
      )}
      {pointsToShow.length > 0 && (
        <button onClick={handleDownloadCSV} className="mt-3 w-full py-2 bg-blue-500 text-white rounded-lg cursor-pointer flex items-center justify-center gap-1.5 text-sm hover:bg-blue-600 transition-colors">
          <Download size={16} /> Download CSV
        </button>
      )}
    </>
  );
};
