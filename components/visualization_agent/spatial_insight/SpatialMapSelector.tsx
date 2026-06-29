'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type MapType = 'hybrid' | 'satellite';

export interface SpatialMapMarker {
  name?: string;
  lat: number;
  lng: number;
  rate?: string;
}

export interface GeoJsonCollection {
  type: 'FeatureCollection';
  features: Array<Record<string, unknown>>;
}

export interface SpatialMapSelectorProps {
  apiKey: string;
  initialLat: number;
  initialLng: number;
  initialZoom: number;
  initialMapType: MapType;
  markers: SpatialMapMarker[];
  fitExcelMarkers?: boolean;
  osmGeoJson?: GeoJsonCollection | null;
  fitOsmFeatures?: boolean;
  onSnapshot: (payload: {
    lat: number;
    lng: number;
    zoom: number;
    maptype: MapType;
    name?: string;
    address?: string;
    placeId?: string;
    eventId: string;
  }) => void;
  onFetchExcel: () => void;
  onFetchOsm: (payload: {
    bounds: { south: number; west: number; north: number; east: number };
    lat: number;
    lng: number;
    name?: string;
    address?: string;
    eventId: string;
  }) => void;
  busy?: boolean;
}

declare global {
  interface Window {
    google?: typeof google;
    __spatialInsightGoogleMapsPromise?: Promise<typeof google>;
    __spatialInsightGoogleMapsReady?: () => void;
  }
}

function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }
  if (window.__spatialInsightGoogleMapsPromise) {
    return window.__spatialInsightGoogleMapsPromise;
  }

  window.__spatialInsightGoogleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__spatialInsightGoogleMapsReady';
    window[callbackName] = () => resolve(window.google as typeof google);

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&libraries=places&callback=${callbackName}`;
    script.onerror = () => reject(new Error('Google Maps JavaScript API could not load.'));
    document.head.appendChild(script);
  });

  return window.__spatialInsightGoogleMapsPromise;
}

export default function SpatialMapSelector({
  apiKey,
  initialLat,
  initialLng,
  initialZoom,
  initialMapType,
  markers,
  fitExcelMarkers = false,
  osmGeoJson,
  fitOsmFeatures = false,
  onSnapshot,
  onFetchExcel,
  onFetchOsm,
  busy = false,
}: SpatialMapSelectorProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const osmLayerRef = useRef<google.maps.Data | null>(null);
  const selectedPlaceRef = useRef<{ name?: string; address?: string; placeId?: string } | null>(null);
  const [status, setStatus] = useState('Search a location, then pan and zoom to the required area.');
  const [coordinates, setCoordinates] = useState('');
  const [mapType, setMapType] = useState<MapType>(initialMapType);

  const updateCoordinates = useCallback((map: google.maps.Map) => {
    const center = map.getCenter();
    const zoom = map.getZoom();
    if (!center || zoom == null) return;
    setCoordinates(`${center.lat().toFixed(6)}, ${center.lng().toFixed(6)} | Zoom ${zoom}`);
  }, []);

  const plotExcelMarkers = useCallback((map: google.maps.Map, rows: SpatialMapMarker[], fit: boolean) => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    if (!rows.length) return;

    const bounds = new google.maps.LatLngBounds();
    rows.forEach((row, index) => {
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const name = String(row.name || `Location ${index + 1}`);
      const rate = String(row.rate ?? '').trim();
      const tooltip = rate ? `${name} | Rate: ${rate}` : name;
      const marker = new google.maps.Marker({ position: { lat, lng }, map, title: tooltip });
      markersRef.current.push(marker);
      bounds.extend({ lat, lng });
    });

    if (fit && markersRef.current.length > 0) {
      if (markersRef.current.length === 1) {
        map.setCenter(markersRef.current[0].getPosition()!);
        map.setZoom(initialZoom);
      } else {
        map.fitBounds(bounds, 70);
      }
    }
  }, [initialZoom]);

  const plotOsmFeatures = useCallback((map: google.maps.Map, geojson?: GeoJsonCollection | null, fit?: boolean) => {
    if (osmLayerRef.current) {
      osmLayerRef.current.setMap(null);
      osmLayerRef.current = null;
    }
    if (!geojson?.features?.length) return;

    const layer = new google.maps.Data();
    layer.addGeoJson(geojson as object);
    layer.setStyle((feature) => {
      const category = String(feature.getProperty('category') || '');
      if (category === 'metro_corridor') return { strokeColor: '#7c3aed', strokeOpacity: 0.95, strokeWeight: 5, zIndex: 50 };
      if (category === 'highway_corridor') return { strokeColor: '#f59e0b', strokeOpacity: 0.92, strokeWeight: 4, zIndex: 40 };
      if (category === 'railway_line') return { strokeColor: '#111827', strokeOpacity: 0.95, strokeWeight: 4, zIndex: 45 };
      if (category === 'metro_station' || category === 'railway_station') {
        return {
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: category === 'metro_station' ? '#7c3aed' : '#059669',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          zIndex: category === 'metro_station' ? 80 : 75,
        };
      }
      return { strokeColor: '#64748b', strokeOpacity: 0.7, strokeWeight: 2, fillOpacity: 0.08, fillColor: '#94a3b8' };
    });
    layer.setMap(map);
    osmLayerRef.current = layer;

    if (fit) {
      const bounds = new google.maps.LatLngBounds();
      layer.forEach((feature) => {
        feature.getGeometry()?.forEachLatLng((latLng) => bounds.extend(latLng));
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, 50);
    }
  }, []);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(async (googleMaps) => {
        if (cancelled || !mapRef.current) return;
        const map = new googleMaps.maps.Map(mapRef.current, {
          center: { lat: initialLat, lng: initialLng },
          zoom: initialZoom,
          mapTypeId: initialMapType,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapInstanceRef.current = map;
        updateCoordinates(map);
        map.addListener('idle', () => updateCoordinates(map));

        if (searchContainerRef.current) {
          try {
            const placesLib = (await googleMaps.maps.importLibrary('places')) as google.maps.PlacesLibrary;
            const autocomplete = new placesLib.PlaceAutocompleteElement();
            autocomplete.className = 'w-full';
            searchContainerRef.current.innerHTML = '';
            searchContainerRef.current.appendChild(autocomplete);
            autocomplete.addEventListener('gmp-placeselect', async (event: Event) => {
              const detail = (event as CustomEvent).detail;
              const place = detail?.place;
              if (!place) return;
              await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress', 'id'] });
              const location = place.location;
              if (!location) return;
              map.panTo(location);
              map.setZoom(initialZoom);
              selectedPlaceRef.current = {
                name: place.displayName,
                address: place.formattedAddress,
                placeId: place.id,
              };
              setStatus(`Selected: ${place.displayName || place.formattedAddress || 'Location'}`);
            });
          } catch {
            setStatus('Places autocomplete unavailable — pan/zoom manually.');
          }
        }

        plotExcelMarkers(map, markers, fitExcelMarkers);
        plotOsmFeatures(map, osmGeoJson, fitOsmFeatures);
      })
      .catch((error: Error) => setStatus(error.message));

    return () => {
      cancelled = true;
    };
  }, [apiKey, initialLat, initialLng, initialZoom, initialMapType, fitExcelMarkers, fitOsmFeatures, markers, osmGeoJson, plotExcelMarkers, plotOsmFeatures, updateCoordinates]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    plotExcelMarkers(map, markers, fitExcelMarkers);
  }, [markers, fitExcelMarkers, plotExcelMarkers]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    plotOsmFeatures(map, osmGeoJson, fitOsmFeatures);
  }, [osmGeoJson, fitOsmFeatures, plotOsmFeatures]);

  const handleSnapshot = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    if (!center || zoom == null) return;
    onSnapshot({
      lat: center.lat(),
      lng: center.lng(),
      zoom,
      maptype: mapType,
      name: selectedPlaceRef.current?.name || 'Selected map area',
      address: selectedPlaceRef.current?.address || '',
      placeId: selectedPlaceRef.current?.placeId || '',
      eventId: `${Date.now()}`,
    });
  };

  const handleFetchOsm = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();
    const center = map.getCenter();
    onFetchOsm({
      bounds: {
        north: northEast.lat(),
        east: northEast.lng(),
        south: southWest.lat(),
        west: southWest.lng(),
      },
      lat: center?.lat() ?? initialLat,
      lng: center?.lng() ?? initialLng,
      name: selectedPlaceRef.current?.name || 'Visible map area',
      address: selectedPlaceRef.current?.address || '',
      eventId: `${Date.now()}`,
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-600 bg-[#111827] text-white">
      <div className="grid grid-cols-2 gap-2 border-b border-slate-700 bg-[#111827] p-3 md:grid-cols-[minmax(220px,1fr)_86px_108px_132px_116px_108px] md:items-center">
        <div ref={searchContainerRef} className="col-span-2 min-w-0 md:col-span-1" />
        <button
          type="button"
          disabled={busy}
          className="h-10 rounded-lg bg-[#0f766e] px-3 text-sm font-bold text-white disabled:opacity-50"
          onClick={() => setStatus('Use the search box, then pan/zoom the map.')}
        >
          Search
        </button>
        <select
          value={mapType}
          onChange={(event) => {
            const next = event.target.value as MapType;
            setMapType(next);
            mapInstanceRef.current?.setMapTypeId(next);
          }}
          className="h-10 rounded-lg border border-slate-500 bg-[#1f2937] px-3 text-sm text-white"
        >
          <option value="hybrid">Hybrid</option>
          <option value="satellite">Satellite</option>
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={handleSnapshot}
          className="h-10 rounded-lg bg-[#2563eb] px-3 text-sm font-bold text-white disabled:opacity-50"
        >
          Take Snapshot
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onFetchExcel}
          className="h-10 rounded-lg bg-[#b45309] px-3 text-sm font-bold text-white disabled:opacity-50"
        >
          Fetch Excel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleFetchOsm}
          className="h-10 rounded-lg bg-[#7c3aed] px-3 text-sm font-bold text-white disabled:opacity-50"
        >
          Fetch OSM
        </button>
      </div>
      <div ref={mapRef} className="h-[488px] w-full bg-[#0f172a]" />
      <div className="flex flex-col gap-1 border-t border-slate-700 bg-[#111827] px-3 py-2 text-xs text-slate-300 md:flex-row md:items-center md:justify-between">
        <span>{status}</span>
        <span className="text-sky-300">{coordinates}</span>
        {(osmGeoJson?.features?.length ?? 0) > 0 && (
          <span className="text-slate-400">OSM data © OpenStreetMap contributors</span>
        )}
      </div>
    </div>
  );
}
