"use client";

import { FileText, MousePointerClick } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { Coordinates, MapAgentAnalyzeResponse, MapAgentSelection, MapLayerKey } from "./data";
import { mapLayers, PUNE_CENTER } from "./data";
import FullReportModal from "./FullReportModal";
import { resolveClickedLocation } from "./googleResolver";
import IntelligencePanel from "./IntelligencePanel";
import LocationMarker from "./LocationMarker";
import MapControls from "./MapControls";

export default function FullScreenMap() {
  const [selection, setSelection] = useState<MapAgentSelection | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reportType, setReportType] = useState<"valuation" | "market" | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MapAgentAnalyzeResponse | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayerKey>("streets");
  const lookupRequestId = useRef(0);

  const selectLocation = useCallback((coordinates: Coordinates) => {
    const requestId = lookupRequestId.current + 1;
    lookupRequestId.current = requestId;
    setAnalysisResult(null);
    setReportType(null);
    setPanelOpen(true);
    setSelection({
      coordinates,
      lookupStatus: "resolving",
      projectName: "",
      location: "",
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
        />
      )}
      {selection && !panelOpen && <button type="button" onClick={() => setPanelOpen(true)} className="map-agent-reopen-button"><FileText />Open Location Report</button>}
      {selection && reportType && analysisResult && <FullReportModal selection={selection} analysisResult={analysisResult} reportType={reportType} onClose={closeFullReport} />}
    </main>
  );
}
