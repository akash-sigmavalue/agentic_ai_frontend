import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaCompress, FaExpand, FaGlobe } from 'react-icons/fa';

// Helper: parse coordinates from "lat, lng" string
function parseCoordinates(str) {
  const parts = String(str || "")
    .trim()
    .split(/[,\s]+/);
  const numbers = parts.map((p) => parseFloat(p)).filter((n) => !isNaN(n));
  if (numbers.length >= 2) return { lat: numbers[0], lng: numbers[1] };
  return null;
}

// Helper: escape HTML for tooltips
function escapeHtml(unsafe) {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const MAX_RETRIES = 5;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// Map Final Adjacent Road category to Road Widening form value
const CATEGORY_TO_ROAD_WIDENING = {
  "Below 9 m": "below9",
  "9 m to 12 m": "9-12",
  "12 m to 15 m": "12-15",
  "15 m to 24 m": "15-24",
  "24 m to 30 m": "24-30",
  "30 m and above": "30+",
};

async function fetchOverpassWithFallback(
  queryFull,
  queryRoadsOnly,
  retries,
  statusEl,
) {
  let lastError;

  for (const url of OVERPASS_ENDPOINTS) {
    // Full query attempts on this endpoint
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          body: queryFull,
          headers: { "Content-Type": "text/plain" },
        });
        if (response.status === 429) {
          const waitTime = Math.pow(2, i) * 2000;
          if (statusEl) {
            statusEl.innerHTML = `⏳ Rate limited at ${url}. Retrying in ${
              waitTime / 1000
            }s... (attempt ${i + 1}/${retries})`;
          }
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        if (response.status === 504) throw new Error("TIMEOUT_FULL");
        if (!response.ok) throw new Error(`Overpass error: ${response.status}`);
        return { data: await response.json(), mode: "full" };
      } catch (err) {
        lastError = err;
        if (err.message === "TIMEOUT_FULL") {
          if (statusEl) {
            statusEl.innerHTML =
              "⚠️ Full query timed out. Trying simplified query (roads & buildings only)...";
          }
          break;
        }
        if (i === retries - 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Roads-only attempts on this endpoint
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          body: queryRoadsOnly,
          headers: { "Content-Type": "text/plain" },
        });
        if (response.status === 429) {
          const waitTime = Math.pow(2, i) * 2000;
          if (statusEl) {
            statusEl.innerHTML = `⏳ Rate limited (roads-only) at ${url}. Retrying in ${
              waitTime / 1000
            }s... (attempt ${i + 1}/${retries})`;
          }
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        if (response.status === 504) {
          throw new Error(
            "Even the simplified query timed out. Please reduce radius further.",
          );
        }
        if (!response.ok) throw new Error(`Overpass error: ${response.status}`);
        return { data: await response.json(), mode: "roads-only" };
      } catch (err) {
        lastError = err;
        if (i === retries - 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded for all Overpass endpoints");
}

export default function OsmInline({
  coordString,
  defaultRadius = 200,
  height = 420,
  layout = "default",
  autoLoadTrigger = 0,
  onLoadStatusChange,
  onHighestRoadWidthCategory,
  onPlanningParameters,
  onLoadMap,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const currentLayersRef = useRef([]);
  const subjectMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);

  const statusRef = useRef(null);
  const finalRoadTableRef = useRef(null);
  const loadBtnRef = useRef(null);
  const mapContainerHomeRef = useRef(null);
  const fullscreenContainerRef = useRef(null);

  const [radius, setRadius] = useState(defaultRadius);
  const [turfReady, setTurfReady] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const lastAutoLoadTriggerRef = useRef(0);

  const coords = useMemo(() => parseCoordinates(coordString), [coordString]);

  // Load Turf.js from CDN if not already available
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.turf) {
      setTurfReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@turf/turf@6/turf.min.js";
    script.async = true;
    script.onload = () => setTurfReady(true);
    script.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("Failed to load Turf.js from CDN");
    };
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  // Init map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
    }).setView([18.592778, 73.800043], 16);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        maxZoom: 19,
      },
    ).addTo(map);

    mapRef.current = map;
  }, []);

  const clearLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    currentLayersRef.current.forEach((layer) => map.removeLayer(layer));
    currentLayersRef.current = [];

    if (subjectMarkerRef.current) {
      map.removeLayer(subjectMarkerRef.current);
      subjectMarkerRef.current = null;
    }
    if (radiusCircleRef.current) {
      map.removeLayer(radiusCircleRef.current);
      radiusCircleRef.current = null;
    }
  }, []);

  const loadMap = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    // eslint-disable-next-line no-undef
    const turf = window.turf;
    if (!turfReady || !turf) {
      if (statusRef.current) {
        statusRef.current.innerHTML =
          "Loading geospatial library… please try again in a moment.";
      }
      return;
    }

    if (!coords) {
      if (statusRef.current) statusRef.current.innerHTML = "Invalid coordinates.";
      return;
    }

    const lat = coords.lat;
    const lng = coords.lng;
    const radiusNum = Number(radius);

    const subjectPoint = turf.point([lng, lat]);

    map.setView([lat, lng], 16);
    clearLayers();

    const radiusCircle = L.circle([lat, lng], {
      radius: radiusNum,
      color: "#22c55e",
      weight: 4,
      fillColor: "#22c55e",
      fillOpacity: 0.18,
    }).addTo(map);
    currentLayersRef.current.push(radiusCircle);
    radiusCircleRef.current = radiusCircle;

    const subjectMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color: "#facc15",
      weight: 3,
      fillColor: "#fb923c",
      fillOpacity: 1,
    })
      .bindTooltip("Subject", { direction: "right" })
      .addTo(map);
    currentLayersRef.current.push(subjectMarker);
    subjectMarkerRef.current = subjectMarker;

    const statusEl = statusRef.current;
    const loadBtn = loadBtnRef.current;
    if (statusEl) statusEl.innerHTML = "⏳ Fetching OSM data...";
    if (loadBtn) loadBtn.disabled = true;

    try {
      const radiusDeg = radiusNum / 111320;
      const bbox = `${lat - radiusDeg},${lng - radiusDeg},${lat + radiusDeg},${
        lng + radiusDeg
      }`;

      const fullQuery = `
        [out:json][timeout:120];
        (
          way["building"](${bbox});
          relation["building"](${bbox});
          way["highway"](${bbox});
          relation["highway"](${bbox});
          way["natural"="water"](${bbox});
          relation["natural"="water"](${bbox});
          way["waterway"="riverbank"](${bbox});
          relation["waterway"="riverbank"](${bbox});
          way["landuse"~"grass|farmland|meadow|orchard|vineyard|allotments"](${bbox});
          relation["landuse"~"grass|farmland|meadow|orchard|vineyard|allotments"](${bbox});
          way["natural"~"wood|grassland|heath|scrub|wetland"](${bbox});
          relation["natural"~"wood|grassland|heath|scrub|wetland"](${bbox});
          way["leisure"~"park|garden|golf_course"](${bbox});
          relation["leisure"~"park|garden|golf_course"](${bbox});
          way["landuse"](${bbox});
          relation["landuse"](${bbox});
        );
        out body;
        >;
        out skel qt;
      `;

      const roadsOnlyQuery = `
        [out:json][timeout:120];
        (
          way["building"](${bbox});
          relation["building"](${bbox});
          way["highway"](${bbox});
          relation["highway"](${bbox});
        );
        out body;
        >;
        out skel qt;
      `;

      const result = await fetchOverpassWithFallback(
        fullQuery,
        roadsOnlyQuery,
        MAX_RETRIES,
        statusEl,
      );
      const data = result.data;
      const mode = result.mode;

      function osmelementsToGeojson(elements) {
        const nodes = {};
        elements.forEach((el) => {
          if (el.type === "node") nodes[el.id] = [el.lon, el.lat];
        });
        const features = [];
        elements.forEach((el) => {
          if (el.type === "way" && el.nodes) {
            const coords = el.nodes.map((id) => nodes[id]).filter(Boolean);
            if (coords.length < 2) return;
            let geometry;
            if (
              coords.length >= 3 &&
              coords[0][0] === coords[coords.length - 1][0] &&
              coords[0][1] === coords[coords.length - 1][1]
            ) {
              geometry = { type: "Polygon", coordinates: [coords] };
            } else {
              geometry = { type: "LineString", coordinates: coords };
            }
            features.push({
              type: "Feature",
              id: el.id,
              geometry,
              properties: el.tags || {},
            });
          }
        });
        return { type: "FeatureCollection", features };
      }

      const allGeojson = osmelementsToGeojson(data.elements);

      const buildingsGeojson = { type: "FeatureCollection", features: [] };
      const roadsGeojson = { type: "FeatureCollection", features: [] };
      const waterGeojson = { type: "FeatureCollection", features: [] };
      const landuseGeojson = { type: "FeatureCollection", features: [] };

      allGeojson.features.forEach((f) => {
        const props = f.properties;
        if (props.building) buildingsGeojson.features.push(f);
        else if (props.highway) roadsGeojson.features.push(f);
        else if (props.natural === "water" || props.waterway === "riverbank")
          waterGeojson.features.push(f);
        else if (props.landuse || props.natural || props.leisure)
          landuseGeojson.features.push(f);
      });

      function addAreaAndLength(feature) {
        if (feature.geometry.type === "Polygon") {
          feature.properties.area_m2 = Math.round(turf.area(feature) * 10) / 10;
        } else if (feature.geometry.type === "LineString") {
          feature.properties.length_m =
            Math.round(turf.length(feature, { units: "meters" }) * 10) / 10;
        }
        return feature;
      }

      let subjectBuildingId = null;
      buildingsGeojson.features = buildingsGeojson.features.filter((f) => {
        if (
          f.geometry.type === "Polygon" &&
          turf.booleanPointInPolygon(subjectPoint, f)
        ) {
          subjectBuildingId = f.id;
        }
        return true;
      });

      function processBuildings(feature) {
        feature = addAreaAndLength(feature);
        const props = feature.properties;
        let name = props.name || props.building || "Building";
        if (typeof name === "string") {
          name = name
            .replace("building=", "")
            .replace("Yes", "Generic Building");
          name = name.charAt(0).toUpperCase() + name.slice(1);
        }
        const area = props.area_m2 ? `${props.area_m2} m²` : "";
        props.tooltip = `<b>${escapeHtml(name)}</b><br>Area: ${area}`;
        props.color = feature.id === subjectBuildingId ? "#22c55e" : "#3b82f6";
        return feature;
      }

      function processWater(feature) {
        feature = addAreaAndLength(feature);
        const area = feature.properties.area_m2
          ? `${feature.properties.area_m2} m²`
          : "";
        feature.properties.tooltip = `Water<br>Area: ${area}`;
        feature.properties.color = "#00d4ff";
        return feature;
      }

      function processLanduse(feature) {
        feature = addAreaAndLength(feature);
        const props = feature.properties;
        let typ =
          props.landuse || props.natural || props.leisure || "Open area";
        if (typeof typ === "string") typ = typ.charAt(0).toUpperCase() + typ.slice(1);
        const area = props.area_m2 ? `${props.area_m2} m²` : "";
        props.tooltip = `<b>${escapeHtml(typ)}</b><br>Area: ${area}`;
        props.color = "#ffff99";
        return feature;
      }

      function extractWidthFromTags(tags) {
        if (tags.width) {
          const match = tags.width.match(/(\d+\.?\d*)/);
          if (match) return parseFloat(match[1]);
        }
        if (tags["width:lanes"]) {
          const match = tags["width:lanes"].match(/(\d+\.?\d*)/);
          if (match) return parseFloat(match[1]);
        }
        if (tags.est_width) {
          const match = tags.est_width.match(/(\d+\.?\d*)/);
          if (match) return parseFloat(match[1]);
        }
        return null;
      }

      function estimateWidthFromLanes(lanes, highwayType) {
        let laneCount = null;
        if (typeof lanes === "string") {
          const match = lanes.match(/(\d+\.?\d*)/);
          if (match) laneCount = parseFloat(match[1]);
        } else if (typeof lanes === "number") {
          laneCount = lanes;
        }
        if (laneCount === null) return null;
        let laneWidth = 3.5;
        if (highwayType) {
          if (["motorway", "trunk"].includes(highwayType)) laneWidth = 3.75;
          else if (["residential", "service"].includes(highwayType)) laneWidth = 3.0;
        }
        return laneCount * laneWidth;
      }

      function getHighwayDefaultWidth(highwayType, serviceType) {
        const defaults = {
          motorway: 11.5,
          motorway_link: 8.0,
          trunk: 10.0,
          trunk_link: 7.0,
          primary: 8.5,
          primary_link: 6.5,
          secondary: 7.5,
          secondary_link: 6.0,
          tertiary: 6.5,
          tertiary_link: 5.5,
          unclassified: 5.5,
          residential: 5.5,
          living_street: 5.0,
          service: 4.5,
          track: 3.5,
          path: 2.0,
          footway: 2.0,
          cycleway: 2.0,
          bridleway: 2.5,
          steps: 1.5,
          pedestrian: 5.0,
        };
        if (highwayType === "service" && serviceType) {
          const serviceDefaults = {
            parking_aisle: 3.5,
            driveway: 3.0,
            alley: 3.5,
            emergency_access: 4.0,
            "drive-through": 3.5,
          };
          if (serviceDefaults[serviceType]) return serviceDefaults[serviceType];
        }
        return defaults[highwayType] || 5.0;
      }

      function formatRoadCategory(highwayType, serviceType) {
        if (!highwayType) return "";
        const label = String(highwayType)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
        if (!serviceType) return label;
        const serviceLabel = String(serviceType)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
        return `${label} - ${serviceLabel}`;
      }

      function processRoads(feature) {
        feature = addAreaAndLength(feature);
        const props = feature.properties;
        const hasExplicitTag = !!(props.width || props["width:lanes"] || props.est_width);
        let width = extractWidthFromTags(props);
        if (width === null && props.lanes) width = estimateWidthFromLanes(props.lanes, props.highway);
        if (width === null && props.highway) width = getHighwayDefaultWidth(props.highway, props.service);
        props.width_m = width;
        props.widthExplicit = hasExplicitTag;

        const name = props.name ? `<b>${escapeHtml(props.name)}</b><br>` : "";
        const lengthText = props.length_m ? `Length: ${props.length_m} m` : "";
        const widthText = width !== null ? `Width: ${width.toFixed(1)} m` : "Width: Unknown";
        const source = hasExplicitTag
          ? "✓ explicit tag"
          : props.lanes
            ? "✓ estimated from lanes"
            : "✓ estimated from road type";
        props.tooltip = [name, lengthText, widthText, source].filter(Boolean).join("<br>");
        return feature;
      }

      buildingsGeojson.features = buildingsGeojson.features.map(processBuildings);
      waterGeojson.features = waterGeojson.features.map(processWater);
      landuseGeojson.features = landuseGeojson.features.map(processLanduse);
      roadsGeojson.features = roadsGeojson.features.map(processRoads);

      // Clip all geometries to circle (same behavior as Osm.jsx)
      const circlePoly = turf.circle([lng, lat], radiusNum, {
        units: "meters",
        steps: 64,
      });
      const circleLine = turf.polygonToLine(circlePoly);

      const clipPolygonsToCircle = (collection) => {
        const result = [];
        collection.features.forEach((feat) => {
          if (feat.geometry.type !== "Polygon") return;
          try {
            const clipped = turf.intersect(feat, circlePoly);
            if (clipped) {
              result.push(
                addAreaAndLength({
                  type: "Feature",
                  id: feat.id,
                  geometry: clipped.geometry,
                  properties: { ...feat.properties },
                }),
              );
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("intersect failed for polygon", e);
          }
        });
        return { type: "FeatureCollection", features: result };
      };

      buildingsGeojson.features = clipPolygonsToCircle(buildingsGeojson).features;
      waterGeojson.features = clipPolygonsToCircle(waterGeojson).features;
      landuseGeojson.features = clipPolygonsToCircle(landuseGeojson).features;

      const circleAreaM2 = Math.PI * radiusNum * radiusNum;
      const totalBuildingAreaM2 = buildingsGeojson.features.reduce(
        (sum, feature) => sum + (Number(feature.properties.area_m2) || 0),
        0,
      );
      const builtupDensity =
        circleAreaM2 > 0
          ? Math.round((totalBuildingAreaM2 / circleAreaM2) * 10000) / 100
          : 0;

      const clippedRoads = [];
      roadsGeojson.features.forEach((road) => {
        if (road.geometry.type !== "LineString") return;
        let segments = [road];
        try {
          const split = turf.lineSplit(road, circleLine);
          if (split?.features?.length) segments = split.features;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("lineSplit failed for road, using original geometry", e);
        }

        segments.forEach((seg, idx) => {
          const lengthMeters = turf.length(seg, { units: "meters" });
          if (!lengthMeters || Number.isNaN(lengthMeters)) return;
          const mid = turf.along(seg, lengthMeters / 2, { units: "meters" });
          if (!turf.booleanPointInPolygon(mid, circlePoly)) return;
          const newFeature = {
            type: "Feature",
            id: `${road.id}-${idx}`,
            geometry: seg.geometry,
            properties: { ...road.properties },
          };
          clippedRoads.push(addAreaAndLength(newFeature));
        });
      });
      roadsGeojson.features = clippedRoads;

      const polygonStyle = (feature) => ({
        fillColor: feature.properties.color,
        color: "#111827",
        weight: 1.3,
        fillOpacity: 0.85,
      });
      const roadStyle = { color: "#ff1744", weight: 6, opacity: 1 };

      const addGeojsonLayer = (geojson, styleFn) => {
        if (!geojson.features.length) return;
        const layer = L.geoJSON(geojson, {
          style: styleFn,
          onEachFeature: (feature, layerInstance) => {
            if (feature.properties.tooltip) {
              layerInstance.bindTooltip(feature.properties.tooltip, {
                sticky: true,
                direction: "top",
              });
            }
          },
        }).addTo(map);
        currentLayersRef.current.push(layer);
      };

      addGeojsonLayer(waterGeojson, polygonStyle);
      addGeojsonLayer(landuseGeojson, polygonStyle);
      addGeojsonLayer(buildingsGeojson, polygonStyle);
      addGeojsonLayer(roadsGeojson, () => roadStyle);

      // Adjacent road widths within 50m (based on clipped roads)
      const adjacentRoads = [];
      roadsGeojson.features.forEach((feature) => {
        if (feature.geometry.type !== "LineString") return;
        const distance = turf.pointToLineDistance(subjectPoint, feature, {
          units: "meters",
        });
        if (distance <= 50) {
          const nearest = turf.nearestPointOnLine(feature, subjectPoint);
          const bearing = turf.bearing(subjectPoint, nearest);
          let direction;
          if (bearing >= -45 && bearing < 45) direction = "N";
          else if (bearing >= 45 && bearing < 135) direction = "E";
          else if (bearing >= 135 && bearing < 225) direction = "S";
          else direction = "W";
          adjacentRoads.push({
            direction,
            width_m: feature.properties.width_m,
            highway: feature.properties.highway,
            service: feature.properties.service,
            name: feature.properties.name,
            distance_m: distance,
          });
        }
      });

      const directionTotals = { N: 0, E: 0, S: 0, W: 0 };
      adjacentRoads.forEach((r) => {
        if (r.width_m && !isNaN(r.width_m)) directionTotals[r.direction] += r.width_m;
      });

      const categorizeWidth = (w) => {
        if (w === null || Number.isNaN(w) || w === 0) return "Unknown";
        if (w < 9) return "Below 9 m";
        if (w < 12) return "9 m to 12 m";
        if (w < 15) return "12 m to 15 m";
        if (w < 24) return "15 m to 24 m";
        if (w < 30) return "24 m to 30 m";
        return "30 m and above";
      };

      let finalTableHtml =
        '<table class="osm-road-table"><thead><tr><th>Direction</th><th>Total Width (m)</th><th>Category</th></tr></thead><tbody>';
      let maxTotal = 0;
      let highestCategory = null;
      let selectedDirection = null;

      ["N", "E", "S", "W"].forEach((dir) => {
        const total = directionTotals[dir];
        const cat = categorizeWidth(total);
        if (total > maxTotal) {
          maxTotal = total;
          highestCategory = cat;
          selectedDirection = dir;
        }
        finalTableHtml += `<tr><td>${dir}</td><td>${
          total > 0 ? total.toFixed(1) : "0"
        }</td><td>${cat}</td></tr>`;
      });
      finalTableHtml += "</tbody></table>";
      if (finalRoadTableRef.current) finalRoadTableRef.current.innerHTML = finalTableHtml;

      const selectedRoad = adjacentRoads
        .filter((road) => road.direction === selectedDirection)
        .sort((a, b) => {
          const widthDiff = (Number(b.width_m) || 0) - (Number(a.width_m) || 0);
          if (widthDiff !== 0) return widthDiff;
          return (Number(a.distance_m) || 0) - (Number(b.distance_m) || 0);
        })[0];
      const selectedRoadCategory = selectedRoad
        ? formatRoadCategory(selectedRoad.highway, selectedRoad.service)
        : "";

      // Inform parent about highest category so it can select Road Widening
      let roadWideningValue = "";
      if (
        highestCategory &&
        highestCategory !== "Unknown" &&
        typeof onHighestRoadWidthCategory === "function"
      ) {
        roadWideningValue = CATEGORY_TO_ROAD_WIDENING[highestCategory];
        if (roadWideningValue) {
          onHighestRoadWidthCategory(roadWideningValue);
        }
      }

      if (typeof onPlanningParameters === "function") {
        onPlanningParameters({
          roadWidening: roadWideningValue,
          roadCategory: selectedRoadCategory,
          builtupDensity,
        });
      }

      const stats = `Roads: ${roadsGeojson.features.length}<br>Buildings: ${buildingsGeojson.features.length}<br>Built-up density: ${builtupDensity.toFixed(2)}%`;
      if (statusEl) {
        statusEl.innerHTML = `✅ Done (${
          mode === "roads-only" ? "simplified data" : "full data"
        })<br>${stats}`;
      }
      if (loadBtn) loadBtn.disabled = false;
    } catch (err) {
      if (statusRef.current) {
        statusRef.current.innerHTML = `❌ Error: ${err.message}`;
      }
      if (loadBtnRef.current) loadBtnRef.current.disabled = false;
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }, [clearLayers, coords, radius, turfReady, onHighestRoadWidthCategory, onPlanningParameters]);

  const handleLoadMapClick = useCallback(async () => {
    if (coords && typeof onLoadStatusChange === "function") {
      onLoadStatusChange(true);
    }

    try {
      if (coords && typeof onLoadMap === "function") {
        await onLoadMap({
          latitude: coords.lat,
          longitude: coords.lng,
          radius: Number(radius),
        });
      }

      await loadMap();
    } finally {
      if (typeof onLoadStatusChange === "function") {
        onLoadStatusChange(false);
      }
    }
  }, [coords, loadMap, onLoadMap, onLoadStatusChange, radius]);

  useEffect(() => {
    if (layout !== "results") return;
    if (autoLoadTrigger === null || autoLoadTrigger === undefined) return;
    if (lastAutoLoadTriggerRef.current === autoLoadTrigger) return;
    if (!coords || !turfReady) return;

    lastAutoLoadTriggerRef.current = autoLoadTrigger;
    handleLoadMapClick();
  }, [autoLoadTrigger, coords, handleLoadMapClick, layout, turfReady]);

  // Move map container to fullscreen portal or back to inline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const container = map.getContainer();
    if (isMapFullscreen && fullscreenContainerRef.current) {
      fullscreenContainerRef.current.appendChild(container);
      setTimeout(() => map.invalidateSize(), 50);
    } else if (!isMapFullscreen && mapContainerHomeRef.current) {
      mapContainerHomeRef.current.appendChild(container);
      setTimeout(() => map.invalidateSize(), 50);
    }
  }, [isMapFullscreen]);

  const isResultsLayout = layout === "results";

  const controlsMarkup = (
    <div className="osm-control-panel">
      <div className="osm-control-fields">
        <div className="osm-radius-field">
          <label className="osm-control-label form-label small fw-semibold">
            Radius (meters)
          </label>
          <input
            type="number"
            className="osm-radius-input form-control"
            min={50}
            max={2000}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value || 0))}
          />
        </div>

        <button
          type="button"
          className="osm-load-map-btn btn rounded-pill fw-semibold"
          onClick={handleLoadMapClick}
          ref={loadBtnRef}
          disabled={!coords}
          title={!coords ? "Enter valid coordinates first" : "Load map"}
        >
          Load Map
        </button>
      </div>

      <div ref={statusRef} className="osm-status-box small">
        {coords ? "Ready" : "Enter valid coordinates to start"}
      </div>
    </div>
  );

  const mapMarkup = (
    <div
      ref={mapContainerHomeRef}
      className="osm-map-shell"
      style={{
        height,
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          height: "100%",
          width: "100%",
        }}
      />
      <button
        type="button"
        className="btn btn-sm btn-light shadow-sm osm-fullscreen-btn"
        onClick={() => setIsMapFullscreen((v) => !v)}
        title={isMapFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isMapFullscreen ? (
          <FaCompress className="me-1" />
        ) : (
          <FaExpand className="me-1" />
        )}
        {isMapFullscreen ? "Exit" : "Fullscreen"}
      </button>
    </div>
  );

  const landGisButtonMarkup = (
    <div className="osm-land-gis-action">
      <button type="button" className="osm-land-gis-btn">
        <FaGlobe className="me-2" />
        Land/GIS Agent
      </button>
    </div>
  );

  const roadTableMarkup = (
    <div className="osm-road-section">
      <div className="osm-table-title fw-bold mb-2">Final Adjacent Road</div>
      <div className="osm-road-table-wrapper">
        <div ref={finalRoadTableRef} />
      </div>
    </div>
  );

  return (
    <div className={`osm-inline-shell mt-3 w-100 ${isResultsLayout ? "osm-inline-results" : ""}`}>
      {isResultsLayout ? (
        <div className="osm-results-stack">
          {mapMarkup}
          {landGisButtonMarkup}
          {roadTableMarkup}
          {controlsMarkup}
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-lg-6">{controlsMarkup}{roadTableMarkup}</div>
          <div className="col-lg-6">{mapMarkup}</div>
        </div>
      )}

        {isMapFullscreen &&
          ReactDOM.createPortal(
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.9)",
              }}
            >
              <div
                ref={fullscreenContainerRef}
                style={{
                  width: "100%",
                  height: "100%",
                  maxWidth: "100vw",
                  maxHeight: "100vh",
                }}
              />
              <button
                type="button"
                className="btn btn-light shadow"
                onClick={() => setIsMapFullscreen(false)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  zIndex: 10001,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontWeight: 600,
                }}
                title="Exit fullscreen"
              >
                <FaCompress className="me-2" />
                Exit fullscreen
              </button>
            </div>,
            document.body
          )}

      <style>{`
        .osm-inline-shell {
          color: #273242;
        }

        .osm-control-panel {
          min-height: 100%;
          border: 1px solid #e5eaf2;
          background: #fbfcff;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
        }

        .osm-control-fields {
          display: grid;
          gap: 12px;
        }

        .osm-control-label {
          color: #3f4a5a;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .osm-radius-input {
          min-height: 41px;
          border-radius: 12px;
          border: 1px solid #dfe5ee;
          background: #ffffff;
          color: #111827;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
        }

        .osm-load-map-btn {
          min-height: 42px;
          border: 0;
          background: #3f967b;
          color: #ffffff;
          font-weight: 800;
          box-shadow: 0 10px 22px rgba(63, 150, 123, 0.18);
        }

        .osm-load-map-btn:hover,
        .osm-load-map-btn:focus {
          background: #357f69;
          color: #ffffff;
        }

        .osm-load-map-btn:disabled {
          background: #9fb7ae;
          color: #ffffff;
          opacity: 0.75;
          cursor: not-allowed;
        }

        .osm-status-box {
          margin-top: 12px;
          padding: 12px;
          background: #f4f7fb;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          max-height: 140px;
          overflow-y: auto;
          color: #475569;
          font-weight: 700;
          line-height: 1.45;
        }

        .osm-map-shell {
          position: relative;
          width: 100%;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.08);
          background: #111827;
        }

        .osm-land-gis-action {
          display: flex;
          justify-content: flex-end;
        }

        .osm-land-gis-btn {
          border: 0;
          border-radius: 14px;
          background: #111827;
          color: #ffffff;
          font-weight: 800;
          padding: 11px 16px;
          min-width: 190px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
        }

        .osm-land-gis-btn:hover,
        .osm-land-gis-btn:focus {
          background: #0f172a;
          color: #ffffff;
        }

        .osm-fullscreen-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 1000;
          border-radius: 8px;
          padding: 6px 12px;
          font-weight: 600;
        }

        .osm-road-section {
          margin-top: 16px;
        }

        .osm-table-title {
          color: #273242;
          font-size: 14px;
        }

        .osm-road-table-wrapper {
          overflow: auto;
          max-width: 100%;
          border-radius: 12px;
          border: 1px solid #dfe5ee;
          background: #ffffff;
          scrollbar-width: thin;
        }
        .osm-road-table-wrapper::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .osm-road-table-wrapper::-webkit-scrollbar-track {
          background: #eef2f7;
          border-radius: 4px;
        }
        .osm-road-table-wrapper::-webkit-scrollbar-thumb {
          background: #b8c2d1;
          border-radius: 4px;
        }
        .osm-road-table-wrapper::-webkit-scrollbar-thumb:hover {
          background: #97a6ba;
        }
        .osm-road-table {
          width: 100%;
          min-width: 200px;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .osm-road-table th,
        .osm-road-table td {
          padding: 8px 12px;
          text-align: left;
          border: 1px solid #e2e8f0;
        }
        .osm-road-table thead th {
          background: #f4f7fb;
          color: #273242;
          font-weight: 800;
        }
        .osm-road-table tbody tr:nth-child(even) {
          background: #fbfcff;
        }
        .osm-road-table tbody tr:hover {
          background: #f0f6f4;
        }
        .osm-road-table tbody td {
          color: #334155;
          font-weight: 600;
        }

        .osm-inline-results {
          margin-top: 0 !important;
        }

        .osm-results-stack {
          display: grid;
          gap: 14px;
        }

        .osm-inline-results .osm-control-panel {
          min-height: auto;
        }

        .osm-inline-results .osm-control-fields {
          grid-template-columns: minmax(0, 1fr);
        }

        .osm-inline-results .osm-road-section {
          margin-top: 0;
        }

        @media (min-width: 768px) {
          .osm-inline-results .osm-control-fields {
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: end;
          }

          .osm-inline-results .osm-load-map-btn {
            min-width: 150px;
          }
        }

        @media (max-width: 767px) {
          .osm-land-gis-action {
            justify-content: stretch;
          }

          .osm-land-gis-btn {
            width: 100%;
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
}

