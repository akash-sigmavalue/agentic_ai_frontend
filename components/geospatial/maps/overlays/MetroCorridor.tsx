'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────
export interface HighwayData {
  type: string;
  latlngs: [number, number][];
  name: string | null;
  ref: string | null;
}

export interface MetroLineData {
  type: string;
  latlngs: [number, number][];
  name: string;
}

export interface MetroStationData {
  type: string;
  lat: number;
  lon: number;
  name: string;
  operator?: string;
}

export interface MetroDataBundle {
  highways: HighwayData[];
  metroLines: MetroLineData[];
  metroStations: MetroStationData[];
}

export interface MetroVisibility {
  highways: boolean;
  metroLines: boolean;
  metroStations: boolean;
}

// ── Overpass API helpers ────────────────────────────────────
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const metroDataCache: Record<string, MetroDataBundle> = {};

const fetchOverpassData = async (bbox: string, retries = 3): Promise<any[]> => {
  const query = `
    [out:json];
    (
      way["highway"~"motorway|trunk|primary"](${bbox});
      way["railway"="subway"](${bbox});
      node["railway"="station"]["subway"="yes"](${bbox});
      node["railway"="subway_entrance"](${bbox});
    );
    out geom;
  `;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[(attempt - 1) % OVERPASS_ENDPOINTS.length];
    const url = endpoint + '?data=' + encodeURIComponent(query);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.status === 429) {
        const wait = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      return json.elements || [];
    } catch (e: any) {
      if (attempt === retries) throw new Error(`All attempts failed: ${e.message}`);
      const wait = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return [];
};

const processElements = (elements: any[]): MetroDataBundle => {
  const highways: HighwayData[] = [];
  const metroLines: MetroLineData[] = [];
  const metroStations: MetroStationData[] = [];

  elements.forEach((el) => {
    if (el.type === 'way') {
      if (el.tags?.highway?.match(/motorway|trunk|primary/)) {
        if (el.geometry && el.geometry.length > 1) {
          highways.push({
            type: 'way',
            latlngs: el.geometry.map((p: any) => [p.lat, p.lon] as [number, number]),
            name: el.tags.name || null,
            ref: el.tags.ref || null,
          });
        }
      } else if (el.tags?.railway === 'subway') {
        if (el.geometry && el.geometry.length > 1) {
          metroLines.push({
            type: 'way',
            latlngs: el.geometry.map((p: any) => [p.lat, p.lon] as [number, number]),
            name: el.tags.name || el.tags.ref || 'Metro line',
          });
        }
      }
    } else if (el.type === 'node') {
      if (el.lat && el.lon) {
        metroStations.push({
          type: 'node',
          lat: el.lat,
          lon: el.lon,
          name: el.tags?.name || el.tags?.ref || 'Metro station',
          operator: el.tags?.operator,
        });
      }
    }
  });

  return { highways, metroLines, metroStations };
};

// ── Right Column ───────────────────────────────────────────
interface MetroRightColumnProps {
  highwaysData: HighwayData[];
  metroLinesData: MetroLineData[];
  metroStationsData: MetroStationData[];
  selectedCity: string;
  visibility: MetroVisibility;
}

export const MetroRightColumn: React.FC<MetroRightColumnProps> = ({
  highwaysData,
  metroLinesData,
  metroStationsData,
  selectedCity,
  visibility,
}) => {
  const [showList, setShowList] = useState(false);

  const handleDownloadCSV = () => {
    const rows = [['Name', 'Type', 'Details']];
    highwaysData.forEach((h) => rows.push([h.name || 'Unnamed', 'Highway', h.ref ? `Ref: ${h.ref}` : '']));
    metroLinesData.forEach((l) => rows.push([l.name, 'Metro Line', '']));
    metroStationsData.forEach((s) => rows.push([s.name, 'Metro Station', s.operator ? `Operator: ${s.operator}` : '']));
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metro_highway_${selectedCity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: '🛣️ Highways', value: highwaysData.length },
    { label: '🚇 Metro Lines', value: metroLinesData.length },
    { label: '🚉 Metro Stations', value: metroStationsData.length },
  ];

  return (
    <>
      <h3 className="mt-0 mb-4 text-lg font-semibold">Metro &amp; Highway Summary</h3>
      <table className="w-full text-sm border-collapse mb-4">
        <tbody>
          {stats.map(({ label, value }, i) => (
            <tr key={i} className={i < stats.length - 1 ? 'border-b border-slate-200' : ''}>
              <td className="py-1">{label}</td>
              <td className="text-right py-1">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => setShowList(!showList)} className="w-full py-1.5 bg-slate-100 border border-slate-300 rounded-lg cursor-pointer text-xs mb-3 hover:bg-slate-200 transition-colors">
        {showList ? 'Hide List' : 'Show Details'}
      </button>

      {showList && (
        <div className="max-h-[calc(100vh-400px)] overflow-y-auto mb-3">
          {visibility.highways && highwaysData.length > 0 && (
            <div className="mb-3">
              <h4 className="mb-1.5 text-sm font-semibold">🛣️ Highways</h4>
              {highwaysData.map((h, idx) => (
                <div key={idx} className="text-xs mb-1">{h.name || 'Unnamed'} {h.ref && <span className="text-slate-500">({h.ref})</span>}</div>
              ))}
            </div>
          )}
          {visibility.metroLines && metroLinesData.length > 0 && (
            <div className="mb-3">
              <h4 className="mb-1.5 text-sm font-semibold">🚇 Metro Lines</h4>
              {metroLinesData.map((l, idx) => (
                <div key={idx} className="text-xs mb-1">{l.name}</div>
              ))}
            </div>
          )}
          {visibility.metroStations && metroStationsData.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-sm font-semibold">🚉 Metro Stations</h4>
              {metroStationsData.map((s, idx) => (
                <div key={idx} className="text-xs mb-1">{s.name} {s.operator && <span className="text-slate-500">({s.operator})</span>}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={handleDownloadCSV} className="mt-3 w-full py-2 bg-blue-500 text-white rounded-lg cursor-pointer flex items-center justify-center gap-1.5 text-sm hover:bg-blue-600 transition-colors">
        <Download size={16} /> Download CSV
      </button>
    </>
  );
};

// ── Sidebar Controls ───────────────────────────────────────
interface MetroCorridorProps {
  selectedCity: string;
  onDataLoaded: (data: MetroDataBundle) => void;
  visibility: MetroVisibility;
  onToggle: (layer: keyof MetroVisibility) => void;
}

const MetroCorridor: React.FC<MetroCorridorProps> = ({
  selectedCity,
  onDataLoaded,
  visibility,
  onToggle,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptInfo, setAttemptInfo] = useState('');
  const currentCityRef = useRef(selectedCity);

  const geocodeCity = useCallback(async (city: string) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'CityMapper-OSM/1.0 (contact@example.com)' } });
    const data = await resp.json();
    if (!data || data.length === 0) throw new Error('City not found');
    const place = data[0];
    return { lat: parseFloat(place.lat), lon: parseFloat(place.lon), bbox: `${place.boundingbox[0]},${place.boundingbox[2]},${place.boundingbox[1]},${place.boundingbox[3]}` };
  }, []);

  useEffect(() => {
    if (!selectedCity) return;
    const loadData = async () => {
      currentCityRef.current = selectedCity;
      setLoading(true);
      setError(null);
      setAttemptInfo('');
      if (metroDataCache[selectedCity]) {
        onDataLoaded(metroDataCache[selectedCity]);
        setLoading(false);
        return;
      }
      try {
        setAttemptInfo('Geocoding city...');
        const geo = await geocodeCity(selectedCity);
        if (currentCityRef.current !== selectedCity) return;
        setAttemptInfo('Fetching Overpass data...');
        const elements = await fetchOverpassData(geo.bbox);
        if (currentCityRef.current !== selectedCity) return;
        const processed = processElements(elements);
        metroDataCache[selectedCity] = processed;
        onDataLoaded(processed);
        setError(null);
      } catch (err: any) {
        if (currentCityRef.current === selectedCity) {
          setError(err.message || 'Failed to load data');
          onDataLoaded({ highways: [], metroLines: [], metroStations: [] });
        }
      } finally {
        if (currentCityRef.current === selectedCity) {
          setLoading(false);
          setAttemptInfo('');
        }
      }
    };
    loadData();
  }, [selectedCity, geocodeCity, onDataLoaded]);

  const layers: { key: keyof MetroVisibility; icon: string; label: string }[] = [
    { key: 'highways', icon: '🛣️', label: 'Highways' },
    { key: 'metroLines', icon: '🚇', label: 'Metro lines' },
    { key: 'metroStations', icon: '🚉', label: 'Metro stations' },
  ];

  return (
    <div className="px-4">
      <div className="mb-4">
        <h4 className="mb-2 text-base font-semibold">🗺️ Metro &amp; Highway Data</h4>
        {loading && <p className="text-slate-500 text-sm">⏳ {attemptInfo || 'Loading data...'}</p>}
        {error && (
          <div className="text-red-500">
            <p className="text-sm">❌ Error: {error}</p>
            <button
              onClick={() => { delete metroDataCache[selectedCity]; window.location.reload(); }}
              className="mt-1 py-1 px-2 bg-slate-100 border border-slate-300 rounded text-xs cursor-pointer hover:bg-slate-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {layers.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex items-center gap-2 py-2.5 px-3 border border-slate-300 rounded-lg cursor-pointer transition-all text-sm ${
              visibility[key] ? 'bg-slate-200 font-semibold' : 'bg-white font-normal'
            }`}
          >
            <span className={`w-3 h-3 rounded-full ${visibility[key] ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span>{icon} {label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-2">Data from OpenStreetMap. Click toggles to show/hide.</p>
    </div>
  );
};

export default MetroCorridor;
