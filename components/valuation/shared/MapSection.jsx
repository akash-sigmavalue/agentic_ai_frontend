"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap, LayersControl, Circle, Polygon, Polyline } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const glowingIcon = L.divIcon({
  className: "",
  html: `<div style="
      width:18px;
      height:18px;
      background:#22d3ee;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 5px rgba(34,211,238,0.25),0 0 24px rgba(34,211,238,0.6);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
});

const createCircleIcon = (color, innerColor, emoji, size = 18) => L.divIcon({
  className: "",
  html: `<div style="
      width:${size}px;
      height:${size}px;
      background:${innerColor};
      border:2px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 4px ${color}40, 0 0 12px ${color}80;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.55}px;
  ">${emoji || ''}</div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  popupAnchor: [0, -size / 2],
});

const icons = {
  subject: createCircleIcon('#22d3ee', '#0891b2', '🌟', 26),
  comparable: createCircleIcon('#a78bfa', '#7c3aed', '🏢', 22),
  amenity_Healthcare: createCircleIcon('#fb7185', '#e11d48', '🏥', 18),
  amenity_Education: createCircleIcon('#fbbf24', '#d97706', '🎓', 18),
  amenity_Retail: createCircleIcon('#34d399', '#059669', '🛍️', 18),
  amenity_Transport: createCircleIcon('#60a5fa', '#2563eb', '🚇', 18),
  amenity_Leisure: createCircleIcon('#a3e635', '#65a30d', '🌳', 18),
  amenity_default: createCircleIcon('#9ca3af', '#4b5563', '📍', 16),
};

const rawCategoryIcons = {
  hospitals: { color: '#ef4444', emoji: '🏥' },
  clinics: { color: '#f43f5e', emoji: '⚕️' },
  schools: { color: '#22c55e', emoji: '🎓' },
  colleges: { color: '#10b981', emoji: '🏫' },
  bus_stops: { color: '#3b82f6', emoji: '🚌' },
  metro_stations: { color: '#eab308', emoji: '🚇' },
  railway_stations: { color: '#a855f7', emoji: '🚉' },
  gardens: { color: '#84cc16', emoji: '🌳' },
  parks: { color: '#84cc16', emoji: '🌳' },
  malls: { color: '#d946ef', emoji: '🛍️' },
  supermarkets: { color: '#8b5cf6', emoji: '🛒' },
  it_parks: { color: '#64748b', emoji: '💻' },
  restaurants_entertainment: { color: '#f97316', emoji: '🍴' },
  police_stations: { color: '#0ea5e9', emoji: '👮' },
  fire_stations: { color: '#dc2626', emoji: '🔥' },
};

const getIcon = (marker) => {
  if (marker.source === 'subject') return icons.subject;
  if (marker.source === 'comparable') return icons.comparable;
  if (marker.source === 'amenity') {
    const config = rawCategoryIcons[marker.category];
    if (config) {
      return createCircleIcon(config.color, config.color, config.emoji, 20);
    }
    const typeKey = marker.mapped_type || marker.category;
    return icons[`amenity_${typeKey}`] || icons.amenity_default;
  }
  return glowingIcon;
};

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function FitRadiusBounds({ markers, radius, mapMode }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0 && radius) {
      const bounds = L.latLngBounds(
        markers.map(m => [Number(m.lat), Number(m.lng)])
      );

      const latOffset = radius / 111320;

      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      const lngOffsetSW = radius / (111320 * Math.cos(sw.lat * Math.PI / 180));
      const lngOffsetNE = radius / (111320 * Math.cos(ne.lat * Math.PI / 180));

      const newSW = L.latLng(sw.lat - latOffset, sw.lng - lngOffsetSW);
      const newNE = L.latLng(ne.lat + latOffset, ne.lng + lngOffsetNE);

      const paddedBounds = L.latLngBounds(newSW, newNE);

      map.fitBounds(paddedBounds, { padding: [40, 40], maxZoom: 16 });
      setTimeout(() => map.invalidateSize(), 200);
    }
  }, [markers, radius, mapMode, map]);

  return null;
}

export default function MapSection({ markers = [], factorialData, onDensityUpdate, onAmenityUpdate, onRoadUpdate, backendUrl = "http://localhost:8000" }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTableMaximized, setIsTableMaximized] = useState(false);
  const [mapMode, setMapMode] = useState("amenity");
  const [amenityRadius, setAmenityRadius] = useState(1000);
  const [densityRadius, setDensityRadius] = useState(500);
  const [roadRadius, setRoadRadius] = useState(200);
  const [selectedCategories, setSelectedCategories] = useState(null);
  const [hiddenProjects, setHiddenProjects] = useState(new Set());

  useEffect(() => {
    setHiddenProjects(new Set());
  }, [markers]);

  const [isFetchingAmenities, setIsFetchingAmenities] = useState(false);
  const [liveAmenities, setLiveAmenities] = useState(null);
  const [isFetchingDensity, setIsFetchingDensity] = useState(false);
  const [liveDensity, setLiveDensity] = useState(null);
  const [isFetchingRoads, setIsFetchingRoads] = useState(false);
  const [liveRoads, setLiveRoads] = useState(null);
  const [isFetchingCbd, setIsFetchingCbd] = useState(false);
  const [liveCbd, setLiveCbd] = useState(null); // { project_name → [cbd_entry] }

  const fetchLiveAmenities = async () => {
    if (markers.length === 0) return;
    setIsFetchingAmenities(true);
    try {
      const city = factorialData?.location_name || factorialData?.table?.[0]?.location || "mumbai";

      const results = await Promise.all(markers.map(async (m) => {
        let res;
        try {
          res = await fetch(`${backendUrl}/api/local-amenities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: Number(m.lat), lng: Number(m.lng), radius: amenityRadius, city_name: city })
          });
        } catch (fetchErr) {
          console.error("Fetch error for marker:", m, fetchErr);
          throw new Error(`Connection to backend failed at ${backendUrl}. Please ensure the backend server is running.`);
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        const data = await res.json();
        const ams = data.amenities || [];

        return ams.map(a => {
          let weight = 0;
          const typeForLogic = a.mapped_type || a.category;
          if (typeForLogic === "Healthcare" || typeForLogic === "Education") weight = 1.0;
          else if (typeForLogic === "Transport") weight = 0.8;
          else if (typeForLogic === "Retail" || typeForLogic === "IT_Office") weight = 0.6;
          else if (typeForLogic === "Leisure" || typeForLogic === "Restaurant" || typeForLogic === "Entertainment") weight = 0.5;
          else if (typeForLogic === "Security") weight = 0.4;
          const contribution = weight * (1 / (1 + a.distance_m / 200));

          return {
            ...a,
            contribution,
            project_name: m.label || m.project_name || "Subject"
          };
        });
      }));

      const newAmenities = results.flat();
      setLiveAmenities(newAmenities);

      if (onAmenityUpdate) {
        const grouped = newAmenities.reduce((acc, a) => {
          if (!acc[a.project_name]) acc[a.project_name] = [];
          acc[a.project_name].push(a);
          return acc;
        }, {});

        const updates = markers.map(m => {
          const name = m.label || m.project_name || "Subject";
          const ams = grouped[name] || [];

          // Calculate categorical counts for the table update
          const counts = {};

          ams.forEach(a => {
            const cat = a.category || "Other";
            counts[cat] = (counts[cat] || 0) + 1;
          });

          // Sort for consistent display
          const sortedCounts = Object.fromEntries(
            Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
          );

          return {
            project_name: name,
            amenities: ams,
            amenity_summary: {
              total: ams.length,
              counts: sortedCounts
            }
          };
        });
        onAmenityUpdate(updates);
      }
    } catch (e) {
      console.error(e);
      alert(`Failed to fetch live amenities: ${e.message}. Using cached data if available.`);
    }
    setIsFetchingAmenities(false);
  };

  const fetchLiveDensity = async () => {
    if (markers.length === 0) return;
    setIsFetchingDensity(true);
    try {
      const results = await Promise.all(markers.map(async (m) => {
        let res;
        try {
          res = await fetch(`${backendUrl}/api/builtup-density`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: Number(m.lat), lng: Number(m.lng), radius: densityRadius })
          });
        } catch (fetchErr) {
          console.error("Fetch error for density:", m, fetchErr);
          throw new Error(`Connection to backend failed at ${backendUrl}. Please ensure the backend server is running.`);
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        const data = await res.json();
        return { project_name: m.label || m.project_name || "Subject", is_subject: m.is_subject, data };
      }));
      setLiveDensity(results);
      if (onDensityUpdate) onDensityUpdate(results);
    } catch (e) {
      console.error(e);
      alert(`Failed to analyze density: ${e.message}`);
    }
    setIsFetchingDensity(false);
  };

  const fetchLiveRoads = async () => {
    if (markers.length === 0) return;
    setIsFetchingRoads(true);
    try {
      const queries = markers.map(m => `way["highway"](around:${roadRadius},${m.lat},${m.lng});`).join('');
      const overpassQuery = `[out:json][timeout:25];(${queries});out geom qt;`;

      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery
      });
      const data = await res.json();

      const newRoads = [];
      const seenWays = new Set();

      data.elements.forEach(e => {
        if (e.type === 'way' && e.geometry && !seenWays.has(e.id)) {
          seenWays.add(e.id);
          const highway = e.tags?.highway || "road";

          let cat = 'A';
          if (['trunk', 'motorway', 'motorway_link', 'trunk_link'].includes(highway)) cat = 'D';
          else if (['primary', 'primary_link'].includes(highway)) cat = 'C';
          else if (['secondary', 'secondary_link'].includes(highway)) cat = 'B';
          else cat = 'A';

          const coords = e.geometry.map(pt => [pt.lat, pt.lon]);

          let closestProj = markers[0];
          let minDistance = Infinity;
          markers.forEach(m => {
            const dist = getDistance(coords[0][0], coords[0][1], Number(m.lat), Number(m.lng));
            if (dist < minDistance) {
              minDistance = dist;
              closestProj = m;
            }
          });

          newRoads.push({
            id: e.id,
            name: e.tags?.name || "Unnamed Road",
            highway: highway,
            lanes: e.tags?.lanes || "N/A",
            surface: e.tags?.surface || "N/A",
            category: cat,
            coords: coords,
            project_name: closestProj.label || closestProj.project_name || "Subject"
          });
        }
      });
      setLiveRoads(newRoads);

      if (onRoadUpdate) {
        const grouped = newRoads.reduce((acc, r) => {
          if (!acc[r.project_name]) acc[r.project_name] = [];
          acc[r.project_name].push(r);
          return acc;
        }, {});

        const updates = markers.map(m => {
          const name = m.label || m.project_name || "Subject";
          const roads = grouped[name] || [];

          let bestCat = 'A';
          if (roads.some(r => r.category === 'D')) bestCat = 'D';
          else if (roads.some(r => r.category === 'C')) bestCat = 'C';
          else if (roads.some(r => r.category === 'B')) bestCat = 'B';

          return { project_name: name, road_type: bestCat };
        });
        onRoadUpdate(updates);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to fetch live roads.");
    }
    setIsFetchingRoads(false);
  };

  const fetchLiveCbd = async () => {
    if (markers.length === 0 || !factorialData?.table) return;
    setIsFetchingCbd(true);
    try {
      const table = factorialData.table;
      const subjectRow = table.find(r => r.is_subject);
      const compRows = table.filter(r => !r.is_subject);

      const subject = {
        project_name: subjectRow?.project_name || markers[0]?.label || 'Subject',
        location_name: subjectRow?.location || markers[0]?.location || '',
        country: 'India',
        lat: markers[0]?.lat,
        lng: markers[0]?.lng,
      };
      const comparables = compRows.map((r, i) => ({
        project_name: r.project_name,
        location: r.location || markers[i + 1]?.location || '',
        country: 'India',
        lat: markers[i + 1]?.lat,
        lng: markers[i + 1]?.lng,
      }));

      const res = await fetch(`${backendUrl}/api/cbd-identification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, comparables }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLiveCbd(data.cbd_results || {});
    } catch (e) {
      console.error('CBD fetch error:', e);
      alert(`Failed to identify CBDs: ${e.message}`);
    }
    setIsFetchingCbd(false);
  };

  useEffect(() => {
    if (markers.length > 0) {
      if (mapMode === "roads" && !liveRoads && !isFetchingRoads) {
        fetchLiveRoads();
      } else if (mapMode === "density" && !liveDensity && !isFetchingDensity) {
        const hasDensity = factorialData?.table?.some(p => p.builtup_density && !p.builtup_density.error);
        if (!hasDensity) fetchLiveDensity();
      } else if (mapMode === "amenity" && !liveAmenities && !isFetchingAmenities) {
        const hasAmenities = factorialData?.table?.some(p => p.amenities && p.amenities.length > 0);
        if (!hasAmenities) fetchLiveAmenities();
      } else if (mapMode === "cbd" && !liveCbd && !isFetchingCbd) {
        // Check if factorial_table already computed CBD data
        const hasCbd = factorialData?.table?.some(p => p.cbd_data && p.cbd_data.length > 0);
        if (!hasCbd) fetchLiveCbd();
      }
    }
  }, [mapMode, markers, factorialData]);

  const handleRefresh = () => {
    if (mapMode === "amenity") fetchLiveAmenities();
    else if (mapMode === "density") fetchLiveDensity();
    else if (mapMode === "roads") fetchLiveRoads();
    else if (mapMode === "cbd") fetchLiveCbd();
  };

  const availableProjects = useMemo(() => {
    if (!factorialData?.table) return markers;
    // Map markers to only those present in the factorial table
    return markers.filter(m => {
      const name = m.label || m.project_name;
      return factorialData.table.some(p => p.project_name === name);
    });
  }, [markers, factorialData]);

  const displayedProjects = useMemo(() => {
    return availableProjects.filter(p => !hiddenProjects.has(p.label || p.project_name || "Subject"));
  }, [availableProjects, hiddenProjects]);

  const allMarkers = [...displayedProjects];
  const allAmenities = [];

  const sourceAmenities = (factorialData && liveAmenities) ? liveAmenities : (factorialData?.table ? factorialData.table.flatMap(p => p.amenities ? p.amenities.map(a => ({ ...a, project_name: p.project_name })) : []) : []);

  const availableCategories = useMemo(() => {
    return [...new Set(sourceAmenities.map(a => a.category))].filter(Boolean).sort();
  }, [sourceAmenities]);

  useEffect(() => {
    if (selectedCategories === null && availableCategories.length > 0) {
      setSelectedCategories(availableCategories);
    }
  }, [availableCategories, selectedCategories]);

  const activeFilters = selectedCategories || [];

  if (factorialData) {
    sourceAmenities.forEach(a => {
      if (a.distance_m <= amenityRadius && a.lat && a.lng) {
        if (!activeFilters.includes(a.category)) return;
        if (hiddenProjects.has(a.project_name)) return;
        allAmenities.push(a);
      }
    });
  }

  const primaryMarker = displayedProjects[0];
  const center = primaryMarker ? [primaryMarker.lat, primaryMarker.lng] : [20.5937, 78.9629];

  const mapContent = (
    <div className={`transition-all duration-300 flex flex-col ${isMaximized
        ? "fixed inset-0 z-[9999] m-4 overflow-hidden rounded-2xl border border-border bg-bg-card shadow-[0_0_50px_rgba(0,0,0,0.6)]"
        : "w-full h-[450px] overflow-hidden rounded-2xl border border-border bg-bg-card shadow-panel relative"
      }`}>
      <div className="flex items-center justify-between border-b border-border bg-bg-input px-4 py-3 shrink-0">
        <span className="font-display text-[11px] uppercase tracking-[0.14em] text-accent-light">
          {isMaximized ? "Fullscreen Map View" : "Subject Property Location"}
        </span>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-text-dim">
            {typeof primaryMarker?.lat === 'number' ? primaryMarker.lat.toFixed(5) : Number(primaryMarker?.lat || 0).toFixed(5)}, {typeof primaryMarker?.lng === 'number' ? primaryMarker.lng.toFixed(5) : Number(primaryMarker?.lng || 0).toFixed(5)}
          </span>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="rounded-md bg-accent/10 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-accent hover:bg-accent hover:text-bg-deep transition cursor-pointer"
          >
            {isMaximized ? "⛕ Close Fullscreen" : "⛶ Maximize Map"}
          </button>
        </div>
      </div>
      <div className="w-full flex-1 relative z-0">
        <MapContainer
          center={center}
          zoom={15}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          scrollWheelZoom
        >
          <FitRadiusBounds
            markers={displayedProjects}
            radius={mapMode === "amenity" ? amenityRadius : mapMode === "density" ? densityRadius : roadRadius}
            mapMode={mapMode}
          />

          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Dark Map">
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Street Map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Light Map">
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {factorialData && mapMode !== "cbd" && displayedProjects.map((proj, i) => (
            <Circle
              key={`circle-${i}`}
              center={[Number(proj.lat), Number(proj.lng)]}
              radius={mapMode === "amenity" ? amenityRadius : mapMode === "density" ? densityRadius : roadRadius}
              pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.1, weight: 1, dashArray: '4, 4' }}
            />
          ))}

          {mapMode === "density" && (() => {
            const sourceDensity = (factorialData && liveDensity) ? liveDensity : (
              factorialData?.table ? factorialData.table.map(p => ({
                project_name: p.project_name,
                is_subject: p.is_subject,
                data: p.builtup_density
              })).filter(d => d.data && !d.data.error) : []
            );

            return sourceDensity.map((proj, i) => {
              if (hiddenProjects.has(proj.project_name)) return null;
              if (!proj.data?.mapData) return null;
              return (
                <div key={`density-${i}`}>
                  {proj.data.mapData.buildings?.map((b, bi) => (
                    <Polygon key={`b-${i}-${bi}`} positions={b.coordinates} pathOptions={{ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.4, weight: 1 }}>
                      <Popup>Building: {b.name}<br />Area: {b.area_m2} m²</Popup>
                    </Polygon>
                  ))}
                  {proj.data.mapData.roads?.map((r, ri) => (
                    <Polyline key={`r-${i}-${ri}`} positions={r.coordinates} pathOptions={{ color: '#eab308', weight: Math.max(2, r.width_m / 2) }}>
                      <Popup>Road: {r.name || r.highway}<br />Width: {r.width_m}m</Popup>
                    </Polyline>
                  ))}
                  {proj.data.mapData.water?.map((w, wi) => (
                    <Polygon key={`w-${i}-${wi}`} positions={w.coordinates} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, weight: 1 }} />
                  ))}
                </div>
              );
            });
          })()}

          {/* Always show Project Markers (Subject & Comparables) */}
          {displayedProjects.map((marker, index) => (
            <Marker key={`proj-${marker.lat}-${marker.lng}-${index}`} position={[Number(marker.lat), Number(marker.lng)]} icon={getIcon(marker)}>
              <Popup>
                <div>
                  <strong>{marker.label || marker.project_name || "Property"}</strong>
                  {marker.is_subject && <div className="text-[10px] text-accent font-bold mt-1">SUBJECT PROPERTY</div>}
                  <br />
                  <code>
                    {Number(marker.lat).toFixed(5)}, {Number(marker.lng).toFixed(5)}
                  </code>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Only show Amenities if Map Mode is Amenity and Table is Generated */}
          {factorialData && mapMode === "amenity" && allAmenities.map((marker, index) => (
            <Marker key={`amenity-${marker.lat}-${marker.lng}-${index}`} position={[Number(marker.lat), Number(marker.lng)]} icon={getIcon({ ...marker, source: 'amenity' })}>
              <Popup>
                <div>
                  <strong>{marker.name || "Amenity"}</strong>
                  {marker.project_name && (
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                      Near {marker.project_name}
                    </div>
                  )}
                  {marker.category && (
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', textTransform: 'uppercase' }}>
                      {marker.category.replace(/_/g, ' ')}
                    </div>
                  )}
                  {marker.distance_m !== undefined && (
                    <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px', fontWeight: 'bold' }}>
                      Distance: {Math.round(marker.distance_m)}m
                    </div>
                  )}
                  <br />
                  <code>
                    {Number(marker.lat).toFixed(5)}, {Number(marker.lng).toFixed(5)}
                  </code>
                </div>
              </Popup>
            </Marker>
          ))}
          {mapMode === "roads" && liveRoads && liveRoads.map(r => {
            if (hiddenProjects.has(r.project_name)) return null;
            let color = '#22c55e'; // A
            if (r.category === 'D') color = '#ef4444';
            else if (r.category === 'C') color = '#f59e0b';
            else if (r.category === 'B') color = '#3b82f6';

            return (
              <Polyline key={r.id} positions={r.coords} color={color} weight={r.category === 'D' ? 6 : r.category === 'C' ? 5 : r.category === 'B' ? 4 : 3} opacity={0.8}>
                <Popup>
                  <div className="text-[11px] font-mono p-1">
                    <strong className="text-[#a78bfa] block mb-1 text-xs">{r.name}</strong>
                    <div className="flex justify-between gap-4 mb-1"><span>Category:</span> <span className="font-bold" style={{ color }}>{r.category} Type</span></div>
                    <div className="flex justify-between gap-4 mb-1"><span>Highway:</span> <span>{r.highway}</span></div>
                    <div className="flex justify-between gap-4 mb-1"><span>Lanes:</span> <span>{r.lanes}</span></div>
                    <div className="flex justify-between gap-4"><span>Surface:</span> <span>{r.surface}</span></div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}
          {/* CBD Markers */}
          {factorialData && mapMode === "cbd" && (() => {
            const sourceCbd = liveCbd || Object.fromEntries(
              (factorialData?.table || []).map(p => [p.project_name, p.cbd_data || []])
            );
            return Object.entries(sourceCbd).flatMap(([projName, cbds]) => {
              if (hiddenProjects.has(projName)) return [];
              return (cbds || []).filter(cbd => cbd.lat && cbd.lng).map((cbd, ci) => {
                const cbdIcon = L.divIcon({
                  className: '',
                  html: `<div style="
                    width:22px;height:22px;
                    background:#f59e0b;border:2px solid #fff;
                    border-radius:4px;
                    box-shadow:0 0 0 3px rgba(245,158,11,0.3),0 0 12px rgba(245,158,11,0.6);
                    display:flex;align-items:center;justify-content:center;
                    font-size:11px;
                  ">🏙</div>`,
                  iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14],
                });
                return (
                  <Marker key={`cbd-${projName}-${ci}`} position={[cbd.lat, cbd.lng]} icon={cbdIcon}>
                    <Popup>
                      <div className="text-[11px] font-mono p-1">
                        <strong className="text-[#f59e0b] block mb-1 text-xs">🏙 {cbd.short_name}</strong>
                        <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '2px' }}>{cbd.name}</div>
                        <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>{cbd.type?.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '10px', color: '#22d3ee', fontWeight: 'bold' }}>Near: {projName}</div>
                        {cbd.distance_km != null && (
                          <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', marginTop: '2px' }}>Distance: {cbd.distance_km} km</div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })
            });
          })()}
        </MapContainer>
      </div>
    </div>
  );

  return (
    <section className="panel-shell">
      <div className="panel-header-shell">
        <div className="panel-title-shell">
          <div className="icon-chip">🗺️</div>
          <div>
            <p className="panel-kicker">Visual Layer</p>
            <h2 className="panel-heading">Graphs, Charts, Maps</h2>
          </div>
        </div>
        <div className="panel-pill">{markers.length > 0 ? "LIVE MAP" : "WAITING"}</div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar relative z-0">
        {factorialData && factorialData.table && (
          <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-panel flex gap-4 items-end flex-wrap shrink-0 relative z-10">
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1.5 block pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
                Map View Mode
              </label>
              <select
                value={mapMode}
                onChange={(e) => setMapMode(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent"
              >
                <option className="bg-bg-card text-text-primary" value="amenity">Amenities Layout</option>
                <option className="bg-bg-card text-text-primary" value="density">Built-Up Density & Congestion</option>
                <option className="bg-bg-card text-text-primary" value="roads">Road Infrastructure</option>
                <option className="bg-bg-card text-text-primary" value="cbd">CBD Proximity</option>
              </select>
            </div>

            {mapMode === "amenity" && availableCategories.length > 0 && (
              <div className="w-full mt-2 pt-3 border-t border-white/5">
                <label className="mb-2 block pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
                  Amenity Filters
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {availableCategories.map(cat => {
                    const label = cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const isChecked = activeFilters.includes(cat);
                    const color = rawCategoryIcons[cat]?.color || '#9ca3af';
                    return (
                      <label key={cat} className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (activeFilters.includes(cat)) {
                              setSelectedCategories(activeFilters.filter(c => c !== cat));
                            } else {
                              setSelectedCategories([...activeFilters, cat]);
                            }
                          }}
                          className="accent-accent w-3 h-3 bg-bg-deep border-border rounded-sm"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[12px] leading-none shrink-0">{rawCategoryIcons[cat]?.emoji || '📍'}</span>
                          <span className="text-[10px] text-text-secondary group-hover:text-text-primary transition">{label}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="w-full mt-2 pt-3 border-t border-white/5">
              <label className="mb-2 block pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
                Project Visibility
              </label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {availableProjects.map((proj, i) => {
                  const name = proj.label || proj.project_name || "Subject";
                  const isChecked = !hiddenProjects.has(name);
                  return (
                    <label key={i} className="flex items-center gap-1.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const newHidden = new Set(hiddenProjects);
                          if (isChecked) newHidden.add(name);
                          else newHidden.delete(name);
                          setHiddenProjects(newHidden);
                        }}
                        className="accent-accent w-3 h-3 bg-bg-deep border-border rounded-sm"
                      />
                      <span className="text-[10px] text-text-secondary group-hover:text-text-primary transition">{name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {mapMode !== "cbd" && (
              <div className="flex-[0.5] min-w-[140px]">
                <label className="mb-1.5 block pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
                  Search Radius (m)
                </label>
                <input
                  type="number"
                  value={mapMode === "amenity" ? amenityRadius : mapMode === "density" ? densityRadius : roadRadius}
                  onChange={(e) => {
                    if (mapMode === "amenity") setAmenityRadius(Number(e.target.value));
                    else if (mapMode === "density") setDensityRadius(Number(e.target.value));
                    else setRoadRadius(Number(e.target.value));
                  }}
                  step={100}
                  className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent"
                />
              </div>
            )}

            {mapMode !== "cbd" && (
              <button
                onClick={handleRefresh}
                disabled={isFetchingAmenities || isFetchingDensity || isFetchingRoads}
                className="shrink-0 h-[42px] rounded-xl border border-border bg-accent/10 px-5 text-xs font-bold uppercase tracking-wider text-accent transition hover:bg-accent hover:text-bg-deep disabled:opacity-50 whitespace-nowrap"
              >
                {(isFetchingAmenities || isFetchingDensity || isFetchingRoads) ? "Refreshing..." : "↻ Refresh Data"}
              </button>
            )}
          </div>
        )}

        {markers.length > 0 ? (
          <div className={isMaximized ? "hidden" : "relative w-full shrink-0"}>
            {typeof window !== 'undefined' && isMaximized ? createPortal(mapContent, document.body) : mapContent}
          </div>
        ) : (
          <div className="relative flex min-h-[400px] shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-border bg-bg-card">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_70%_80%,rgba(167,139,250,0.14),transparent_32%)]" />
            <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative z-10 max-w-sm px-8 py-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-glow text-3xl text-accent-light">
                ◌
              </div>
              <h3 className="font-display text-base uppercase tracking-[0.14em] text-text-primary">
                Waiting For Coordinates
              </h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                This panel follows the legacy frontend behavior. Once the backend sends coordinates or a map confirmation event, the location map will render here.
              </p>
            </div>
          </div>
        )}

        {factorialData && (
          isTableMaximized ? (
            <>
              <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-panel shrink-0 opacity-40 flex items-center justify-between">
                <span className="text-text-dim text-xs font-bold tracking-widest uppercase">Table is Fullscreen</span>
                {mapMode === "amenity" && allAmenities.length > 0 && (
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${allAmenities[0]?.source === "Live OSM API"
                      ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
                      : "text-[#22d3ee] bg-[#22d3ee]/10 border-[#22d3ee]/20"
                    }`}>
                    {allAmenities[0]?.source || "Local Database"}
                  </span>
                )}
              </div>
              {typeof window !== 'undefined' ? createPortal(
                <div className="fixed inset-0 z-[9999] m-4 overflow-hidden rounded-2xl border border-border bg-bg-deep shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">
                  <div className="flex items-center justify-between border-b border-border bg-bg-input px-4 py-3 shrink-0">
                    <span className="font-display text-[11px] uppercase tracking-[0.14em] text-accent-light">
                      Fullscreen {mapMode === "amenity" ? "Amenities" : mapMode === "density" ? "Built-up Density" : mapMode === "cbd" ? "CBD Proximity" : "Road Infrastructure"} Table
                    </span>
                    <button
                      onClick={() => setIsTableMaximized(false)}
                      className="rounded-md bg-accent/10 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-accent hover:bg-accent hover:text-bg-deep transition cursor-pointer"
                    >
                      ⛕ Close Fullscreen
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {mapMode === "amenity" ? (
                      <AmenitiesTableContent allAmenities={allAmenities} radius={amenityRadius} markers={markers} />
                    ) : mapMode === "density" ? (
                      <DensityTableContent liveDensity={liveDensity} factorialData={factorialData} markers={markers} />
                    ) : mapMode === "cbd" ? (
                      <CbdTableContent cbdData={liveCbd} factorialData={factorialData} markers={markers} />
                    ) : (
                      <RoadsTableContent allRoads={liveRoads || []} radius={roadRadius} markers={markers} />
                    )}
                  </div>
                </div>
                , document.body) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-panel shrink-0 flex flex-col">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-sm uppercase tracking-[0.14em] text-accent-light flex items-center gap-2">
                    <span>{mapMode === "amenity" ? '📋' : mapMode === "density" ? '🏙️' : mapMode === "cbd" ? '🏛️' : '🛣️'}</span> {mapMode === "amenity" ? `Amenities Found (${allAmenities.length})` : mapMode === "density" ? 'Built-Up Density & Congestion' : mapMode === "cbd" ? 'CBD Proximity' : 'Nearby Road Infrastructure'}
                  </h3>
                  {mapMode === "amenity" && allAmenities.length > 0 && (
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${allAmenities[0]?.source === "Live OSM API"
                        ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
                        : "text-[#22d3ee] bg-[#22d3ee]/10 border-[#22d3ee]/20"
                      }`}>
                      {allAmenities[0]?.source || "Local Database"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsTableMaximized(true)}
                  className="rounded-md bg-accent/10 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-accent hover:bg-accent hover:text-bg-deep transition cursor-pointer"
                >
                  ⛶ Maximize
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {mapMode === "amenity" ? (
                  <AmenitiesTableContent allAmenities={allAmenities} radius={amenityRadius} markers={markers} />
                ) : mapMode === "density" ? (
                  <DensityTableContent sourceDensity={liveDensity} factorialData={factorialData} markers={markers} />
                ) : mapMode === "cbd" ? (
                  <CbdTableContent cbdData={liveCbd} factorialData={factorialData} markers={markers} />
                ) : (
                  <RoadsTableContent allRoads={liveRoads || []} radius={roadRadius} markers={markers} />
                )}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function CbdTableContent({ cbdData, factorialData, markers }) {
  const sourceCbd = cbdData || Object.fromEntries(
    (factorialData?.table || []).map(p => [p.project_name, p.cbd_data || []])
  );

  const entries = Object.entries(sourceCbd).filter(([, cbds]) => cbds && cbds.length > 0);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="text-3xl">🏛️</span>
        <p className="text-xs text-text-dim italic max-w-[260px]">
          CBD data is computed automatically during analysis. Run the Factorial Table to populate this view.
        </p>
      </div>
    );
  }

  const subjectName = markers[0]?.label || 'Subject';
  const sorted = [...entries].sort(([a], [b]) => {
    if (a === subjectName || a.includes('Subject')) return -1;
    if (b === subjectName || b.includes('Subject')) return 1;
    return a.localeCompare(b);
  });

  const typeConfig = {
    traditional_cbd: { color: '#f59e0b', bg: '#f59e0b15', label: 'Traditional CBD', icon: '🏛️', desc: 'Established central business district with premium Grade-A office stock, institutional presence, and highest footfall.' },
    business_park: { color: '#a78bfa', bg: '#a78bfa15', label: 'Business Park / SEZ', icon: '💻', desc: 'Planned IT/ITeS or special economic zone with modern infrastructure, large corporate campuses, and talent concentration.' },
    commercial_hub: { color: '#22d3ee', bg: '#22d3ee15', label: 'Commercial Hub', icon: '🏬', desc: 'Emerging or secondary commercial micro-market with growing retail, office, and mixed-use development.' },
  };

  // Collect all unique CBDs across all projects for the summary table
  const allCbdsMap = new Map();
  entries.forEach(([projName, cbds]) => {
    cbds.forEach(cbd => {
      const key = cbd.short_name || cbd.name;
      if (!allCbdsMap.has(key)) {
        allCbdsMap.set(key, { ...cbd, projects: [projName] });
      } else {
        allCbdsMap.get(key).projects.push(projName);
      }
    });
  });
  const allCbds = [...allCbdsMap.values()].sort((a, b) => (a.distance_km || 99) - (b.distance_km || 99));

  return (
    <div className="flex flex-col gap-6">
      {/* Per-project breakdown */}
      {sorted.map(([projName, cbds]) => {
        const isSubject = projName === subjectName || projName.includes('Subject');
        return (
          <div key={projName} className="flex flex-col gap-3 rounded-2xl border border-border/40 p-4 bg-bg-deep/30">
            {/* Project header */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <span className="text-lg">{isSubject ? '🌟' : '🏢'}</span>
              <h4 className={`font-display text-sm uppercase tracking-wider ${isSubject ? 'text-accent' : 'text-accent-purple'}`}>
                {projName}
              </h4>
              {isSubject && <span className="ml-auto rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent border border-accent/20">SUBJECT</span>}
            </div>

            {/* CBD cards */}
            <div className="flex flex-col gap-2">
              {cbds.map((cbd, ci) => {
                const cfg = typeConfig[cbd.type] || { color: '#9ca3af', bg: '#9ca3af15', label: 'CBD', icon: '🏙️', desc: 'Key commercial zone in the city.' };
                return (
                  <div key={ci} className="rounded-xl border border-border/30 bg-black/20 overflow-hidden">
                    {/* CBD title row */}
                    <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[15px] shrink-0">{cfg.icon}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-[12px] text-text-primary">{cbd.short_name}</div>
                          <div className="text-[9px] text-text-dim truncate" title={cbd.name}>{cbd.name}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border whitespace-nowrap"
                          style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}30` }}>
                          {cfg.label}
                        </span>
                        {cbd.distance_km != null && (
                          <span className="font-mono text-[11px] font-bold text-[#10b981]">{cbd.distance_km} km away</span>
                        )}
                      </div>
                    </div>
                    {/* Description + metadata */}
                    <div className="px-3 py-2 flex flex-col gap-1.5">
                      <p className="text-[10px] text-text-secondary leading-relaxed">{cfg.desc}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        {cbd.lat && cbd.lng && (
                          <span className="font-mono text-[9px] text-text-dim">
                            📍 {Number(cbd.lat).toFixed(4)}, {Number(cbd.lng).toFixed(4)}
                          </span>
                        )}
                        {cbd.geocode_source && cbd.geocode_source !== 'failed' && (
                          <span className="text-[9px] text-text-dim italic">via {cbd.geocode_source.replace(/_/g, ' ')}</span>
                        )}
                        {cbd.geocode_source === 'failed' && (
                          <span className="text-[9px] text-red-400">⚠ Geocode failed — distance unavailable</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Combined summary table across all projects */}
      {allCbds.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border/40 p-4 bg-bg-deep/30">
          <h4 className="font-display text-[11px] uppercase tracking-[0.14em] text-text-dim border-b border-white/5 pb-2 mb-1">
            🏛️ All Identified CBDs — Summary
          </h4>
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-text-dim border-b border-white/5">
                <th className="pb-2 font-semibold">CBD</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold text-right">Distance</th>
                <th className="pb-2 font-semibold">Near Projects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allCbds.map((cbd, i) => {
                const cfg = typeConfig[cbd.type] || { color: '#9ca3af', label: 'CBD', icon: '🏙️' };
                return (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 pr-2">
                      <div className="font-semibold text-text-primary">{cfg.icon} {cbd.short_name}</div>
                      <div className="text-[8px] text-text-dim truncate max-w-[120px]">{cbd.name}</div>
                    </td>
                    <td className="py-2 pr-2">
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded border whitespace-nowrap"
                        style={{ color: cfg.color, background: `${cfg.color}15`, borderColor: `${cfg.color}30` }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono font-bold text-[#10b981] whitespace-nowrap">
                      {cbd.distance_km != null ? `${cbd.distance_km} km` : '—'}
                    </td>
                    <td className="py-2 pl-2 text-text-secondary">
                      {cbd.projects.map((p, pi) => (
                        <span key={pi} className="inline-block mr-1 text-[8px] px-1 py-0.5 rounded bg-white/5 border border-white/10">
                          {p.length > 15 ? p.slice(0, 15) + '…' : p}
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DensityTableContent({ liveDensity, factorialData, markers }) {
  const sourceDensity = liveDensity ? liveDensity : (
    factorialData?.table ? factorialData.table.map(p => ({
      project_name: p.project_name,
      is_subject: p.is_subject,
      data: p.builtup_density
    })).filter(d => d.data && !d.data.error) : []
  );

  if (sourceDensity.length === 0) {
    return <p className="text-xs text-text-dim italic">No density data calculated yet. Click Refresh Data to compute.</p>;
  }

  const subjectProjectName = markers[0]?.label || "Subject";

  const sorted = [...sourceDensity].sort((a, b) => {
    const isASubject = a.project_name === subjectProjectName || a.project_name.includes("Subject");
    const isBSubject = b.project_name === subjectProjectName || b.project_name.includes("Subject");
    if (isASubject && !isBSubject) return -1;
    if (!isASubject && isBSubject) return 1;
    return a.project_name.localeCompare(b.project_name);
  });

  return (
    <div className="flex flex-col gap-6">
      {sorted.map((proj, i) => {
        const isSubject = proj.project_name === subjectProjectName || proj.project_name.includes("Subject");
        const d = proj.data;
        if (!d) return null;

        return (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-border/40 p-3 bg-bg-input/20">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <span className="text-base">{isSubject ? '🌟' : '🏢'}</span>
              <h4 className={`font-display text-sm uppercase tracking-wider ${isSubject ? 'text-accent' : 'text-accent-purple'}`}>
                {proj.project_name} {isSubject && <span className="ml-2 rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px]">SUBJECT</span>}
              </h4>
              <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-md tracking-wider uppercase ${d.congestion.level === 'HIGH' ? 'bg-red-500/10 text-red-400' : d.congestion.level === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
                {d.congestion.level} Congestion
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-dim uppercase tracking-wider font-bold">Metrics ({d.radius}m)</span>
                <div className="text-xs text-text-secondary flex justify-between"><span>Score:</span> <span className="font-mono text-text-primary">{d.congestion.score} / 10</span></div>
                <div className="text-xs text-text-secondary flex justify-between"><span>Density:</span> <span className="font-mono text-text-primary">{d.metrics.density_class}</span></div>
                <div className="text-xs text-text-secondary flex justify-between"><span>Used Area:</span> <span className="font-mono text-text-primary">{(d.congestion.used_area_ratio * 100).toFixed(1)}%</span></div>
                <div className="text-xs text-text-secondary flex justify-between"><span>Open Space:</span> <span className="font-mono text-text-primary">{(d.metrics.true_open_space_ratio * 100).toFixed(1)}%</span></div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-dim uppercase tracking-wider font-bold">Infrastructure</span>
                <div className="text-xs text-text-secondary flex justify-between"><span>Buildings:</span> <span className="font-mono text-text-primary">{d.metrics.detected_buildings}</span></div>
                <div className="text-xs text-text-secondary flex justify-between"><span>Roads:</span> <span className="font-mono text-text-primary">{d.metrics.detected_road_segments}</span></div>
                <div className="text-xs text-text-secondary flex justify-between"><span>BCR:</span> <span className="font-mono text-text-primary">{(d.metrics.building_coverage_ratio * 100).toFixed(1)}%</span></div>
              </div>
            </div>

            <div className="mt-2 bg-black/20 p-3 rounded-lg border border-white/5 font-mono text-[10px] leading-relaxed text-text-dim whitespace-pre-wrap">
              {d.summary}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AmenitiesTableContent({ allAmenities, radius, markers }) {
  if (allAmenities.length === 0) {
    return <p className="text-xs text-text-dim italic">No amenities found within {radius}m.</p>;
  }

  const subjectProjectName = markers[0]?.label || "Subject";

  const groupedAmenities = allAmenities.reduce((acc, curr) => {
    if (!acc[curr.project_name]) acc[curr.project_name] = [];
    acc[curr.project_name].push(curr);
    return acc;
  }, {});

  const sortedProjects = Object.keys(groupedAmenities).sort((a, b) => {
    const isASubject = a === subjectProjectName || a.includes("Subject");
    const isBSubject = b === subjectProjectName || b.includes("Subject");
    if (isASubject && !isBSubject) return -1;
    if (!isASubject && isBSubject) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex flex-col gap-6">
      {sortedProjects.map((project) => {
        const isSubject = project === subjectProjectName || project.includes("Subject");
        const amenities = groupedAmenities[project].sort((a, b) => a.distance_m - b.distance_m);

        const counts = amenities.reduce((acc, a) => {
          const cat = a.mapped_type || a.category || "Other";
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {});

        return (
          <div key={project} className="flex flex-col gap-2 rounded-2xl border border-border bg-bg-deep/40 p-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{isSubject ? '🌟' : '🏢'}</span>
                <h4 className={`font-display text-sm uppercase tracking-wider ${isSubject ? 'text-accent' : 'text-accent-purple'}`}>
                  {project} {isSubject && <span className="ml-2 rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px]">SUBJECT</span>}
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-2 max-w-[50%] justify-end">
                {Object.entries(counts).map(([cat, count]) => (
                  <span key={cat} title={cat} className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent border border-accent/20">
                    {cat.charAt(0)}:{count}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-white/5 text-text-dim uppercase tracking-widest text-[9px]">
                    <th className="pb-2 font-semibold">Name</th>
                    <th className="pb-2 font-semibold">Category</th>
                    <th className="pb-2 font-semibold text-center">Distance(m)</th>
                    <th className="pb-2 text-right font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {amenities.map((a, i) => (
                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 font-medium text-text-primary pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] leading-none shrink-0">{rawCategoryIcons[a.category]?.emoji || '📍'}</span>
                          <span>{a.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-text-secondary border border-white/5">
                          {a.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-mono text-text-dim">{Math.round(a.distance_m)}m</td>
                      <td className="py-2.5 text-right text-[10px] text-text-dim italic">{a.source || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoadsTableContent({ allRoads, radius, markers }) {
  if (!allRoads || allRoads.length === 0) {
    return <p className="text-xs text-text-dim italic">No roads found within {radius}m. Try increasing radius or clicking Refresh Data.</p>;
  }

  const subjectProjectName = markers[0]?.label || markers[0]?.project_name || "Subject";

  const groupedRoads = allRoads.reduce((acc, curr) => {
    if (!acc[curr.project_name]) acc[curr.project_name] = [];
    acc[curr.project_name].push(curr);
    return acc;
  }, {});

  const sortedProjects = Object.keys(groupedRoads).sort((a, b) => {
    const isASubject = a === subjectProjectName || a.includes("Subject");
    const isBSubject = b === subjectProjectName || b.includes("Subject");
    if (isASubject && !isBSubject) return -1;
    if (!isASubject && isBSubject) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex flex-col gap-6">
      {sortedProjects.map((project) => {
        const isSubject = project === subjectProjectName || project.includes("Subject");
        const roads = groupedRoads[project];

        let bestCat = 'A';
        if (roads.some(r => r.category === 'D')) bestCat = 'D';
        else if (roads.some(r => r.category === 'C')) bestCat = 'C';
        else if (roads.some(r => r.category === 'B')) bestCat = 'B';

        const typeColor = bestCat === 'D' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
          bestCat === 'C' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
            bestCat === 'B' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
              'text-green-400 bg-green-500/10 border-green-500/20';

        // Filter out tiny unnamed residential roads if there are too many, just keep the top ones
        const displayRoads = roads.sort((a, b) => {
          const catOrder = { 'D': 0, 'C': 1, 'B': 2, 'A': 3 };
          return catOrder[a.category] - catOrder[b.category];
        }).slice(0, 15); // Show top 15 highest category roads

        return (
          <div key={project} className="flex flex-col gap-2 rounded-2xl border border-border bg-bg-deep/40 p-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{isSubject ? '🌟' : '🏢'}</span>
                <h4 className={`font-display text-sm uppercase tracking-wider ${isSubject ? 'text-accent' : 'text-accent-purple'}`}>
                  {project} {isSubject && <span className="ml-2 rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px]">SUBJECT</span>}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-text-dim uppercase tracking-widest">Highest Grade</p>
                <span className={`rounded-lg px-3 py-1 border text-sm font-bold shadow-sm ${typeColor}`}>Type {bestCat}</span>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-white/5 text-text-dim uppercase tracking-widest text-[9px]">
                    <th className="pb-2 font-semibold">Road Name</th>
                    <th className="pb-2 font-semibold">OSM Type</th>
                    <th className="pb-2 font-semibold text-center">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayRoads.map((r, i) => {
                    const catColor = r.category === 'D' ? 'text-red-400' : r.category === 'C' ? 'text-amber-400' : r.category === 'B' ? 'text-blue-400' : 'text-green-400';
                    return (
                      <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 font-medium text-text-primary pr-4">{r.name}</td>
                        <td className="py-2.5 text-text-secondary font-mono text-[10px]">{r.highway}</td>
                        <td className="py-2.5 text-center">
                          <span className={`font-bold ${catColor}`}>
                            Type {r.category}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <p className="mt-2 text-[9px] text-text-dim italic leading-relaxed">
        * Priority: Type D (Trunk/Motorway) {">"} Type C (Primary) {">"} Type B (Secondary) {">"} Type A (Tertiary/Residential). The highest tier road within the radius determines the property's Road Type score.
      </p>
    </div>
  );
}
