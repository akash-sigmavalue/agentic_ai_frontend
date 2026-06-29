"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { AlertCircle, Building2, FileText, Loader2, MapPin, MousePointerClick, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { DomEvent, divIcon, latLngBounds } from "leaflet";
import type { Coordinates, MapAgentAnalyzeResponse, MapAgentSelection, MapLayerKey } from "./data";
import { mapLayers, PUNE_CENTER } from "./data";
import FullReportModal from "./FullReportModal";
import { resolveClickedLocation, searchMapPlaces, type MapPlaceSearchResult } from "./googleResolver";
import IntelligencePanel from "./IntelligencePanel";
import LocationMarker from "./LocationMarker";
import MapControls from "./MapControls";
import ComparableSelectionPanel from "./ComparableSelectionPanel";

type Comparable = Record<string, any>;

type ValuationMapState = {
  subject: (Comparable & { lat: number; lng: number }) | null;
  comparables: Comparable[];
  radiusKm: number | null;
  focusNonce: number;
};

const subjectIcon = divIcon({
  className: "",
  html: '<span class="map-agent-valuation-pin subject"><b>S</b></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -16],
});

const comparableIcon = divIcon({
  className: "",
  html: '<span class="map-agent-valuation-pin comparable"><b>C</b></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -14],
});

function isValidCoord(value: unknown) {
  return value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value));
}

function focusValuationBounds(mapState: ValuationMapState) {
  const points: [number, number][] = [];
  if (mapState.subject && isValidCoord(mapState.subject.lat) && isValidCoord(mapState.subject.lng)) {
    points.push([Number(mapState.subject.lat), Number(mapState.subject.lng)]);
  }
  mapState.comparables.forEach((comp) => {
    if (isValidCoord(comp.lat) && isValidCoord(comp.lng)) points.push([Number(comp.lat), Number(comp.lng)]);
  });
  return points;
}

function ValuationBounds({ mapState }: { mapState: ValuationMapState }) {
  const map = useMap();
  const points = useMemo(() => focusValuationBounds(mapState), [mapState]);

  useEffect(() => {
    if (points.length === 0 || mapState.focusNonce === 0) return;
    if (points.length === 1) {
      map.flyTo(points[0], Math.max(map.getZoom(), 15), { duration: 0.6 });
      return;
    }
    map.fitBounds(latLngBounds(points), { padding: [60, 60], maxZoom: 16 });
  }, [map, mapState.focusNonce, points]);

  return null;
}

function ValuationMapLayers({
  mapState,
  onOpenComparable,
}: {
  mapState: ValuationMapState;
  onOpenComparable: (comp: Comparable) => void;
}) {
  const subject = mapState.subject;
  const validComparables = mapState.comparables.filter((comp) => isValidCoord(comp.lat) && isValidCoord(comp.lng));

  return (
    <>
      {subject && isValidCoord(subject.lat) && isValidCoord(subject.lng) && (
        <>
          <Marker position={[Number(subject.lat), Number(subject.lng)]} icon={subjectIcon}>
            <Popup>
              <div className="map-agent-popup-card">
                <strong>{subject.project_name || "Subject Property"}</strong>
                <span>{subject.location_name || subject.location || "Selected location"}</span>
                <small>Subject property</small>
              </div>
            </Popup>
          </Marker>
          {mapState.radiusKm && mapState.radiusKm > 0 && (
            <Circle
              center={[Number(subject.lat), Number(subject.lng)]}
              radius={mapState.radiusKm * 1000}
              pathOptions={{ color: "#4f46e5", fillColor: "#6366f1", fillOpacity: 0.08, weight: 2 }}
            />
          )}
        </>
      )}
      {validComparables.map((comp, index) => (
        <Marker key={`${comp.project_name || "comp"}-${index}`} position={[Number(comp.lat), Number(comp.lng)]} icon={comparableIcon}>
          <Popup>
            <div className="map-agent-popup-card">
              <strong>{comp.project_name || comp.name || "Comparable Project"}</strong>
              <span>{comp.location || comp.location_name || "Location unavailable"}</span>
              <small>{comp.distance_from_subject_km != null ? `${comp.distance_from_subject_km} km from subject` : "Distance unavailable"}</small>
              <small>{comp.confidence_score != null ? `Confidence ${comp.confidence_score}` : comp.confidence_tier || "Confidence pending"}</small>
              <small>{comp.data_source || comp.source || "Web"}</small>
              <button type="button" onClick={() => onOpenComparable(comp)}>Open Comparable Project</button>
            </div>
          </Popup>
        </Marker>
      ))}
      <ValuationBounds mapState={mapState} />
    </>
  );
}

function MapSearchBox({ onSelect }: { onSelect: (coordinates: Coordinates) => void }) {
  const map = useMap();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const suggestionRequestId = useRef(0);
  const skipNextSuggestionRef = useRef(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapPlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!searchRef.current) return;
    DomEvent.disableClickPropagation(searchRef.current);
    DomEvent.disableScrollPropagation(searchRef.current);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    const requestId = suggestionRequestId.current + 1;
    suggestionRequestId.current = requestId;

    if (skipNextSuggestionRef.current) {
      skipNextSuggestionRef.current = false;
      return;
    }

    if (trimmedQuery.length < 3) return;

    const timer = window.setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const matches = await searchMapPlaces(trimmedQuery, { lat: PUNE_CENTER[0], lng: PUNE_CENTER[1] });
        if (suggestionRequestId.current !== requestId) return;
        setResults(matches);
      } catch {
        if (suggestionRequestId.current !== requestId) return;
        setResults([]);
      } finally {
        if (suggestionRequestId.current === requestId) setIsSuggesting(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  const runSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isSearching) return;

    suggestionRequestId.current += 1;
    setIsSearching(true);
    setIsSuggesting(false);
    setError("");
    setResults([]);

    try {
      const matches = await searchMapPlaces(trimmedQuery, { lat: PUNE_CENTER[0], lng: PUNE_CENTER[1] });
      setResults(matches);
      if (matches.length === 0) setError("No project or place found for this search.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search project name.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: MapPlaceSearchResult) => {
    map.flyTo([result.coordinates.lat, result.coordinates.lng], Math.max(map.getZoom(), 15), { duration: 0.65 });
    skipNextSuggestionRef.current = true;
    setQuery(result.name);
    setResults([]);
    setIsSuggesting(false);
    setError("");
    onSelect(result.coordinates);
  };

  return (
    <div ref={searchRef} className="map-agent-search-box">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          runSearch();
        }}
      >
        <Search />
        <input
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setError("");
            if (nextQuery.trim().length < 3) {
              setResults([]);
              setIsSuggesting(false);
            }
          }}
          placeholder="Search project or place name"
          aria-label="Search project or place name"
        />
        <button type="submit" disabled={!query.trim() || isSearching}>
          {isSearching ? <Loader2 className="map-agent-spin-icon" /> : "Search"}
        </button>
      </form>

      {(results.length > 0 || error || isSuggesting) && (
        <div className="map-agent-search-results">
          {isSuggesting && (
            <p className="map-agent-search-status">
              <Loader2 className="map-agent-spin-icon" />
              Finding matching projects
            </p>
          )}
          {error && (
            <p>
              <AlertCircle />
              {error}
            </p>
          )}
          {results.map((result) => (
            <button key={result.placeId || `${result.name}-${result.coordinates.lat}-${result.coordinates.lng}`} type="button" onClick={() => selectSearchResult(result)}>
              <strong>{result.name}</strong>
              <span>{result.address || `${result.coordinates.lat.toFixed(5)}, ${result.coordinates.lng.toFixed(5)}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparableDetailModal({ comparable, onClose }: { comparable: Comparable; onClose: () => void }) {
  return (
    <div className="map-agent-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="map-agent-modal map-agent-comparable-modal" role="dialog" aria-modal="true" aria-labelledby="map-agent-comparable-title">
        <header className="map-agent-modal-header">
          <div>
            <span>COMPARABLE PROJECT</span>
            <h2 id="map-agent-comparable-title">{comparable.project_name || comparable.name || "Comparable Project"}</h2>
            <p><MapPin /> {comparable.location || comparable.location_name || "Location unavailable"}</p>
          </div>
          <button type="button" aria-label="Close comparable details" onClick={onClose} className="map-agent-icon-button"><X /></button>
        </header>
        <div className="map-agent-modal-body">
          <section>
            <h3><Building2 />Comparable Summary</h3>
            <div className="map-agent-summary-grid">
              <div><span>Distance</span><strong>{comparable.distance_from_subject_km != null ? `${comparable.distance_from_subject_km} km` : "--"}</strong></div>
              <div><span>Confidence</span><strong>{comparable.confidence_score ?? comparable.confidence_tier ?? "--"}</strong></div>
              <div><span>Source</span><strong>{comparable.data_source || comparable.source || "Web"}</strong></div>
              <div><span>Latitude</span><strong>{isValidCoord(comparable.lat) ? Number(comparable.lat).toFixed(5) : "--"}</strong></div>
              <div><span>Longitude</span><strong>{isValidCoord(comparable.lng) ? Number(comparable.lng).toFixed(5) : "--"}</strong></div>
              <div><span>Property Type</span><strong>{comparable.property_type || comparable.project_category || "--"}</strong></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function FullScreenMap() {
  const [selection, setSelection] = useState<MapAgentSelection | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reportType, setReportType] = useState<"valuation" | "market" | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MapAgentAnalyzeResponse | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayerKey>("streets");
  const [valuationMapState, setValuationMapState] = useState<ValuationMapState>({ subject: null, comparables: [], radiusKm: null, focusNonce: 0 });
  const [activeComparable, setActiveComparable] = useState<Comparable | null>(null);
  const lookupRequestId = useRef(0);

  // Comparable Selection Panel — lifted up from IntelligencePanel so it can render BESIDE it
  const [showComparablesPanel, setShowComparablesPanel] = useState(false);
  const [selectedComparables, setSelectedComparables] = useState<Set<number>>(new Set());
  const onConfirmCallbackRef = useRef<(() => void) | null>(null);

  const handleSetConfirmCallback = useCallback((cb: (() => void) | null) => {
    onConfirmCallbackRef.current = cb;
  }, []);

  const selectLocation = useCallback((coordinates: Coordinates) => {
    const requestId = lookupRequestId.current + 1;
    lookupRequestId.current = requestId;
    setAnalysisResult(null);
    setReportType(null);
    setActiveComparable(null);
    setValuationMapState({ subject: null, comparables: [], radiusKm: null, focusNonce: 0 });
    setShowComparablesPanel(false);
    setSelectedComparables(new Set());
    setPanelOpen(true);
    setSelection({
      coordinates,
      lookupStatus: "resolving",
      projectName: "",
      location: "",
      city: "",
      propertyType: "plot",
    });

    resolveClickedLocation(coordinates).then((resolved) => {
      if (lookupRequestId.current !== requestId) return;
      setSelection((current) => {
        if (!current) return current;
        return {
          ...current,
          lookupStatus: resolved.error ? "failed" : "resolved",
          projectName: resolved.projectName || current.projectName,
          location: resolved.location || current.location,
          city: resolved.city || current.city,
          placeId: resolved.placeId,
          formattedAddress: resolved.formattedAddress,
          lookupError: resolved.error,
        };
      });
    });
  }, []);

  const openFullReport = useCallback((type: "valuation" | "market") => {
    if (!analysisResult) return;
    setReportType(type);
    setPanelOpen(false);
  }, [analysisResult]);
  const closeFullReport = useCallback(() => {
    setReportType(null);
    setPanelOpen(true);
  }, []);
  const layer = mapLayers[activeLayer];

  return (
    <main className="map-agent-page">
      <MapContainer center={PUNE_CENTER} zoom={13} minZoom={3} maxZoom={19} zoomControl={false} scrollWheelZoom className="h-full w-full" aria-label="Interactive map of Pune">
        <TileLayer key={activeLayer} url={layer.url} attribution={layer.attribution} maxZoom={activeLayer === "terrain" ? 17 : 19} />
        <LocationMarker position={selection?.coordinates || null} onSelect={selectLocation} />
        <ValuationMapLayers mapState={valuationMapState} onOpenComparable={setActiveComparable} />
        <MapSearchBox onSelect={selectLocation} />
        <MapControls activeLayer={activeLayer} onLayerChange={setActiveLayer} />
      </MapContainer>

      {!selection && <div className="map-agent-instruction"><MousePointerClick />Click any location to open its intelligence report</div>}

      {selection && panelOpen && (
        <IntelligencePanel
          selection={selection}
          analysisResult={analysisResult}
          onSelectionChange={setSelection}
          onAnalysisComplete={setAnalysisResult}
          onClose={() => setPanelOpen(false)}
          onOpenReport={openFullReport}
          valuationMapState={valuationMapState}
          onValuationMapStateChange={setValuationMapState}
          onOpenComparable={setActiveComparable}
          // Pass comparable panel control down
          selectedComparables={selectedComparables}
          onSelectedComparablesChange={setSelectedComparables}
          showComparablesPanel={showComparablesPanel}
          onShowComparablesPanel={setShowComparablesPanel}
          onSetConfirmCallback={handleSetConfirmCallback}
        />
      )}

      {/* Comparable Selection Panel — renders BESIDE the Intelligence Panel */}
      {showComparablesPanel && valuationMapState.comparables.length > 0 && (
        <ComparableSelectionPanel
          comparables={valuationMapState.comparables}
          selectedIndices={selectedComparables}
          onToggle={(index: number) => {
            setSelectedComparables((current) => {
              const next = new Set(current);
              if (next.has(index)) next.delete(index);
              else next.add(index);
              return next;
            });
          }}
          onOpenDetails={setActiveComparable}
          onClose={() => setShowComparablesPanel(false)}
          onConfirm={() => {
            setShowComparablesPanel(false);
            if (onConfirmCallbackRef.current) onConfirmCallbackRef.current();
          }}
        />
      )}

      {selection && !panelOpen && <button type="button" onClick={() => setPanelOpen(true)} className="map-agent-reopen-button"><FileText />Open Location Report</button>}
      {selection && reportType && analysisResult && <FullReportModal selection={selection} analysisResult={analysisResult} reportType={reportType} onClose={closeFullReport} />}
      {activeComparable && <ComparableDetailModal comparable={activeComparable} onClose={() => setActiveComparable(null)} />}
    </main>
  );
}
