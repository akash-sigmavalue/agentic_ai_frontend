"use client";

import { divIcon } from "leaflet";
import { Marker, useMapEvents } from "react-leaflet";
import type { Coordinates } from "./data";

type LocationMarkerProps = {
  position: Coordinates | null;
  onSelect: (coordinates: Coordinates) => void;
};

const markerIcon = divIcon({
  className: "map-agent-marker-shell",
  html: '<span class="map-agent-marker"><span></span></span>',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
});

export default function LocationMarker({ position, onSelect }: LocationMarkerProps) {
  const map = useMapEvents({
    click(event) {
      const coordinates = { lat: event.latlng.lat, lng: event.latlng.lng };
      onSelect(coordinates);
      map.flyTo(event.latlng, Math.max(map.getZoom(), 14), { duration: 0.65 });
    },
  });

  if (!position) return null;

  return <Marker position={[position.lat, position.lng]} icon={markerIcon} />;
}
