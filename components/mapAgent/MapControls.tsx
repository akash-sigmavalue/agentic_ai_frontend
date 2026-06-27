"use client";

import { useState } from "react";
import { Crosshair, Layers3, LocateFixed, Minus, Plus, RotateCcw } from "lucide-react";
import { useMap } from "react-leaflet";
import { mapLayers, PUNE_CENTER, type MapLayerKey } from "./data";

type MapControlsProps = {
  activeLayer: MapLayerKey;
  onLayerChange: (layer: MapLayerKey) => void;
};

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="map-agent-control-button">
      {children}
    </button>
  );
}

export default function MapControls({ activeLayer, onLayerChange }: MapControlsProps) {
  const map = useMap();
  const [layersOpen, setLayersOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  const locate = () => {
    setLocating(true);
    map.once("locationfound", (event) => {
      map.flyTo(event.latlng, 15, { duration: 0.7 });
      setLocating(false);
    });
    map.once("locationerror", () => setLocating(false));
    map.locate({ enableHighAccuracy: true, timeout: 8000 });
  };

  return (
    <div className="absolute bottom-5 right-4 z-[500] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {layersOpen && (
        <div className="map-agent-layer-menu" role="menu" aria-label="Map layers">
          <p>Map style</p>
          {(Object.keys(mapLayers) as MapLayerKey[]).map((key) => (
            <button key={key} type="button" role="menuitemradio" aria-checked={activeLayer === key} onClick={() => { onLayerChange(key); setLayersOpen(false); }}>
              <span className={activeLayer === key ? "active" : ""} />
              {mapLayers[key].label}
            </button>
          ))}
        </div>
      )}
      <div className="map-agent-control-group">
        <ControlButton label="Zoom in" onClick={() => map.zoomIn()}><Plus /></ControlButton>
        <ControlButton label="Zoom out" onClick={() => map.zoomOut()}><Minus /></ControlButton>
      </div>
      <div className="map-agent-control-group">
        <ControlButton label="Reset map to Pune" onClick={() => map.flyTo(PUNE_CENTER, 13, { duration: 0.7 })}><RotateCcw /></ControlButton>
        <ControlButton label="Choose map layer" onClick={() => setLayersOpen((value) => !value)}><Layers3 /></ControlButton>
        <ControlButton label={locating ? "Finding current location" : "Go to current location"} onClick={locate}>
          {locating ? <Crosshair className="animate-pulse" /> : <LocateFixed />}
        </ControlButton>
      </div>
    </div>
  );
}
