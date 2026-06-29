"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { APIProvider, Map, useMap, useApiIsLoaded } from "@vis.gl/react-google-maps";
import type { LatLng } from "@/types/elevation.ts";

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6366f1" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a2a4a" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a4a" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#16213e" }] },
];

const MAP_OPTIONS: any = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
  minZoom: 1,
  maxZoom: 18,
  // Note: mapId removed intentionally — it enables WebGL vector rendering which
  // conflicts with the Three.js WebGL context and causes context loss crashes.
  // Custom styles work without mapId and raster maps use no WebGL context.
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "var(--radius-lg)",
};

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

function makeVertexIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: "#818cf8",
    fillOpacity: 1,
    strokeColor: "#22d3ee",
    strokeWeight: 2,
    scale: 6,
  };
}

function makeFirstVertexIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: "#22d3ee",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2.5,
    scale: 8,
  };
}

interface Map2DProps {
  apiKey: string;
  polygon: LatLng[] | null;
  onPolygonComplete: (coords: LatLng[]) => void;
  isDrawing: boolean;
  searchQuery: string;
  center: google.maps.LatLngLiteral;
  setCenter: React.Dispatch<React.SetStateAction<google.maps.LatLngLiteral>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  tilt: number;
  setTilt: React.Dispatch<React.SetStateAction<number>>;
  heading: number;
  setHeading: React.Dispatch<React.SetStateAction<number>>;
  searchText: string;
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
}

// ── Custom Polygon Wrapper for @vis.gl/react-google-maps ───────────────
interface CustomPolygonProps {
  paths: LatLng[];
  options?: google.maps.PolygonOptions;
}

function CustomPolygon({ paths, options }: CustomPolygonProps) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;

    const polygon = new google.maps.Polygon({
      ...options,
      paths,
      map,
    });

    polygonRef.current = polygon;

    return () => {
      polygon.setMap(null);
    };
  }, [map]);

  // Sync paths dynamically
  useEffect(() => {
    if (polygonRef.current) {
      polygonRef.current.setPaths(paths);
    }
  }, [paths]);

  // Sync options dynamically
  useEffect(() => {
    if (polygonRef.current && options) {
      polygonRef.current.setOptions(options);
    }
  }, [options]);

  return null;
}

// ── Custom Marker Wrapper for @vis.gl/react-google-maps ────────────────
interface CustomMarkerProps {
  position: LatLng;
  icon?: string | google.maps.Symbol | google.maps.Icon;
  onClick?: () => void;
  clickable?: boolean;
  zIndex?: number;
}

function CustomMarker({ position, icon, onClick, clickable, zIndex }: CustomMarkerProps) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const marker = new google.maps.Marker({
      position,
      map,
      icon,
      clickable,
      zIndex,
    });

    markerRef.current = marker;

    if (onClick) {
      const listener = marker.addListener("click", onClick);
      return () => {
        listener.remove();
        marker.setMap(null);
      };
    }

    return () => {
      marker.setMap(null);
    };
  }, [map, onClick, icon, clickable, zIndex]);

  // Sync position dynamically
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    }
  }, [position]);

  return null;
}

interface MapInnerProps extends Omit<Map2DProps, "apiKey" | "searchQuery"> {}

// ── Inner Map Component utilizing hooks ────────────────────────────────
function MapInner({
  polygon,
  onPolygonComplete,
  isDrawing,
  center,
  setCenter,
  zoom,
  setZoom,
  tilt,
  setTilt,
  heading,
  setHeading,
  searchText,
  setSearchText,
}: MapInnerProps) {
  const map = useMap();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const apiIsLoaded = useApiIsLoaded();

  // ── Search state ──────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<google.maps.GeocoderResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Map style and tilt state ──────────────────────────────────────────
  const [mapTypeId, setMapTypeId] = useState<string>("roadmap");
  const [isTilted, setIsTilted] = useState(false);

  // ── Custom polygon drawing state ─────────────────────────────────────
  const [drawingVertices, setDrawingVertices] = useState<LatLng[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  // ── Initialize Geocoder and Places Autocomplete ───────────────────────
  useEffect(() => {
    if (!apiIsLoaded) return;

    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
      console.log("[Map2D] Geocoder initialized.");
    }

    if (!inputRef.current) return;
    try {
      const autocomplete = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["geocode", "establishment"],
          fields: ["geometry", "name"],
        }
      );
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place?.geometry?.location) {
          const loc = place.geometry.location;
          const latLng = { lat: loc.lat(), lng: loc.lng() };
          setCenter(latLng);
          setZoom(14);
          setSearchText(place.name || "");
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
      console.log("[Map2D] Places Autocomplete attached (legacy).");
    } catch {
      console.log("[Map2D] Places Autocomplete not available — using Geocoder.");
    }
  }, [apiIsLoaded]);

  // ── Debounced geocode search ──────────────────────────────────────────
  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchText(value);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      if (!value.trim() || value.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      debounceTimer.current = setTimeout(async () => {
        if (!geocoderRef.current) return;
        setSearchLoading(true);
        try {
          const result = await geocoderRef.current.geocode({ address: value });
          if (result.results && result.results.length > 0) {
            setSuggestions(result.results.slice(0, 5));
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        } catch (err) {
          console.warn("[Map2D] Geocode error:", err);
          setSuggestions([]);
        } finally {
          setSearchLoading(false);
        }
      }, 400);
    },
    []
  );

  const handleSuggestionClick = useCallback(
    (result: google.maps.GeocoderResult) => {
      const loc = result.geometry.location;
      const latLng = { lat: loc.lat(), lng: loc.lng() };
      setCenter(latLng);
      setZoom(14);
      setSearchText(result.formatted_address);
      setSuggestions([]);
      setShowSuggestions(false);
    },
    []
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && suggestions.length > 0) {
        handleSuggestionClick(suggestions[0]);
      }
    },
    [suggestions, handleSuggestionClick]
  );

  // ── Custom drawing: handle map clicks when in drawing mode ────────────
  const handleMapClick = useCallback(
    (e: any) => {
      if (!isDrawing || !e.detail.latLng) return;
      setShowSuggestions(false);

      const lat = typeof e.detail.latLng.lat === "function" ? e.detail.latLng.lat() : e.detail.latLng.lat;
      const lng = typeof e.detail.latLng.lng === "function" ? e.detail.latLng.lng() : e.detail.latLng.lng;

      const newPoint: LatLng = { lat, lng };
      setDrawingVertices((prev) => [...prev, newPoint]);
    },
    [isDrawing]
  );

  const handleFirstVertexClick = useCallback(() => {
    if (drawingVertices.length >= 3) {
      onPolygonComplete([...drawingVertices]);
      setDrawingVertices([]);
    }
  }, [drawingVertices, onPolygonComplete]);

  useEffect(() => {
    if (!isDrawing) {
      setDrawingVertices([]);
    }
  }, [isDrawing]);

  // ── Manage the drawing polyline preview ───────────────────────────────
  useEffect(() => {
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (isDrawing && drawingVertices.length >= 2) {
      const polyline = new google.maps.Polyline({
        path: drawingVertices,
        strokeColor: "#818cf8",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map,
      });
      polylineRef.current = polyline;
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, isDrawing, drawingVertices]);

  // ── Sync dynamic map options (styles & cursor) ────────────────────────
  useEffect(() => {
    if (!map) return;
    map.setOptions({
      styles: mapTypeId === "roadmap" ? MAP_STYLES : [],
      draggableCursor: isDrawing ? "crosshair" : null,
    } as any);
  }, [map, mapTypeId, isDrawing]);

  const handleToggleTilt = useCallback(() => {
    const nextTilted = !isTilted;
    setTilt(nextTilted ? 45 : 0);
    if (nextTilted && zoom < 17) {
      setZoom(17);
    }
    setIsTilted(nextTilted);
  }, [isTilted, zoom]);

  const handleCameraChanged = useCallback((e: any) => {
    setZoom(e.detail.zoom);
    setCenter(e.detail.center);
    setTilt(e.detail.tilt);
    setHeading(e.detail.heading);
  }, []);

  // ── Close suggestions when clicking outside ───────────────────────────
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* ── Search Bar (Raised z-index for overlay) ─────────────────────── */}
      <div
        className="absolute top-4 left-4 right-4 z-30 max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={(e) => handleSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search any location…"
            className="search-input"
            id="map-search-input"
            autoComplete="off"
          />
        </div>

        {/* ── Geocoder Suggestions Dropdown ──────────────────────────── */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="geocoder-dropdown mt-1">
            {suggestions.map((result, i) => (
              <button
                key={result.place_id || i}
                className="geocoder-item"
                onClick={() => handleSuggestionClick(result)}
              >
                <svg
                  className="w-4 h-4 shrink-0 text-[var(--text-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-sm text-[var(--text-secondary)] text-left truncate">
                  {result.formatted_address}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Map Style & Tilt Controls (Raised z-index) ──────────────────── */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 items-end">
        <div className="solid-card p-1.5 flex gap-1.5 items-center">
          {(["roadmap", "satellite", "hybrid", "terrain"] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setMapTypeId(type);
                if (map) {
                  map.setMapTypeId(type);
                }
              }}
              className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${
                mapTypeId === type
                  ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
              }`}
            >
              {type === "roadmap" ? "Map" : type}
            </button>
          ))}
        </div>

        <button
          onClick={handleToggleTilt}
          disabled={mapTypeId === "terrain"}
          className={`solid-card px-3 py-2 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
            isTilted
              ? "!border-cyan-500/40 !text-cyan-400 !bg-cyan-500/10"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
          } ${mapTypeId === "terrain" ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25" />
          </svg>
          3D Perspective {isTilted ? "On" : "Off"}
        </button>



        {isTilted && zoom < 16 && (
          <div className="solid-card px-3 py-2 text-[10px] text-cyan-400 font-semibold max-w-[200px] text-right mt-1 fade-in-up">
            Scroll to zoom in closer to see 3D buildings and tilted terrain relief.
          </div>
        )}
      </div>

      {/* ── Drawing hint ─────────────────────────────────────────────── */}
      {isDrawing && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 fade-in-up">
          <div className="solid-card px-5 py-3 flex items-center gap-3">
            <div className="pulse-dot" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {drawingVertices.length === 0
                ? "Click on the map to place the first vertex."
                : drawingVertices.length < 3
                ? `${drawingVertices.length} point${drawingVertices.length > 1 ? "s" : ""} placed. Keep clicking to add more.`
                : `${drawingVertices.length} points placed. Click the first (cyan) point to close the polygon.`}
            </span>
          </div>
        </div>
      )}

      {/* ── Google Map ───────────────────────────────────────────────── */}
      <Map
        id="basemap"
        center={center}
        zoom={zoom}
        tilt={tilt}
        heading={heading}
        tiltInteractionEnabled={true}
        headingInteractionEnabled={true}
        mapTypeId={mapTypeId}
        disableDefaultUI={true}
        zoomControl={true}
        gestureHandling="greedy"
        minZoom={1}
        maxZoom={18}
        onClick={handleMapClick}
        onCameraChanged={handleCameraChanged}
        style={containerStyle}
      >
        {isDrawing &&
          drawingVertices.map((v, i) => (
            <CustomMarker
              key={`draw-vertex-${i}`}
              position={v}
              icon={i === 0 ? makeFirstVertexIcon() : makeVertexIcon()}
              onClick={i === 0 && drawingVertices.length >= 3 ? handleFirstVertexClick : undefined}
              clickable={i === 0 && drawingVertices.length >= 3}
              zIndex={i === 0 ? 100 : 50}
            />
          ))}

        {isDrawing && drawingVertices.length >= 3 && (
          <CustomPolygon
            paths={drawingVertices}
            options={{
              fillColor: "#818cf8",
              fillOpacity: 0.1,
              strokeColor: "transparent",
              strokeWeight: 0,
              clickable: false,
            }}
          />
        )}

        {polygon && polygon.length > 0 && !isDrawing && (
          <CustomPolygon
            paths={polygon}
            options={{
              fillColor: "#818cf8",
              fillOpacity: 0.12,
              strokeColor: "#22d3ee",
              strokeOpacity: 0.9,
              strokeWeight: 2.5,
              editable: false,
              clickable: false,
            }}
          />
        )}
      </Map>
    </div>
  );
}

export default function Map2D(props: Map2DProps) {
  return (
    <APIProvider apiKey={props.apiKey} libraries={GOOGLE_MAPS_LIBRARIES}>
      <MapInner {...props} />
    </APIProvider>
  );
}
