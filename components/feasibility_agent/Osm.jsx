import React, { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import Header from "./Header";
import { FaRoad } from 'react-icons/fa';

// Helper: parse coordinates from "lat, lng" string
function parseCoordinates(str) {
  const parts = str.trim().split(/[,\s]+/);
  const numbers = parts.map((p) => parseFloat(p)).filter((n) => !isNaN(n));
  if (numbers.length >= 2) return { lat: numbers[0], lng: numbers[1] };
  return null;
}

// Helper: escape HTML for tooltips
function escapeHtml(unsafe) {
  return unsafe
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

// Fetch Overpass with retry and fallback for 504 / host failures
async function fetchOverpassWithFallback(
  queryFull,
  queryRoadsOnly,
  retries,
  statusEl,
) {
  let lastError;

  for (const url of OVERPASS_ENDPOINTS) {
    // First attempt with full query on this endpoint
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
        if (response.status === 504) {
          // Gateway timeout – break out and try roads-only query on this host
          throw new Error("TIMEOUT_FULL");
        }
        if (!response.ok) throw new Error(`Overpass error: ${response.status}`);
        return { data: await response.json(), mode: "full" };
      } catch (err) {
        lastError = err;
        if (err.message === "TIMEOUT_FULL") {
          if (statusEl) {
            statusEl.innerHTML =
              "⚠️ Full query timed out. Trying simplified query (roads & buildings only)...";
          }
          break; // exit retry loop for full query on this host
        }
        if (i === retries - 1) {
          // give up on this host, try next
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Attempt roads-only query on this endpoint
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
          // try next host
          throw new Error(
            "Even the simplified query timed out. Please reduce radius further.",
          );
        }
        if (!response.ok) throw new Error(`Overpass error: ${response.status}`);
        return { data: await response.json(), mode: "roads-only" };
      } catch (err) {
        lastError = err;
        if (i === retries - 1) {
          // move to next endpoint
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
  throw lastError || new Error("Max retries exceeded for all Overpass endpoints");
}

const Osm = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const currentLayersRef = useRef([]);
  const subjectMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);

  const coordInputRef = useRef(null);
  const radiusInputRef = useRef(null);
  const statusRef = useRef(null);
  const finalRoadTableRef = useRef(null);
  const roadTableRef = useRef(null);
  const loadBtnRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [turfReady, setTurfReady] = useState(false);

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
    script.onload = () => {
      setTurfReady(true);
    };
    script.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("Failed to load Turf.js from CDN");
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize Leaflet map once
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current).setView(
        [40.7128, -74.006],
        16,
      );
      // Satellite basemap (Esri World Imagery)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
          maxZoom: 19,
        },
      ).addTo(map);
      mapRef.current = map;
      setMapReady(true);
    }
  }, []);

  const clearLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    currentLayersRef.current.forEach((layer) => {
      map.removeLayer(layer);
    });
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
    if (!turf) {
      if (statusRef.current) {
        statusRef.current.innerHTML =
          "Loading geospatial library… please try again in a moment.";
      }
      return;
    }

    const coordStr = coordInputRef.current?.value || "";
    const coords = parseCoordinates(coordStr);
    if (!coords) {
      // eslint-disable-next-line no-alert
      alert("Invalid coordinates");
      return;
    }
    const radius = parseFloat(radiusInputRef.current?.value || "0");
    const { lat, lng } = coords;
    const subjectPoint = turf.point([lng, lat]);

    map.setView([lat, lng], 16);
    clearLayers();

    // radius circle & marker
    const radiusCircle = L.circle([lat, lng], {
      radius,
      color: "#22c55e",
      weight: 4,
      fillColor: "#22c55e",
      fillOpacity: 0.18,
    }).addTo(map);
    currentLayersRef.current.push(radiusCircle);
    radiusCircleRef.current = radiusCircle;

    const subjectMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color: "#000000",
      weight: 3,
      fillColor: "#000000",
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
      const radiusDeg = radius / 111320;
      const bbox = `${lat - radiusDeg},${lng - radiusDeg},${lat + radiusDeg},${
        lng + radiusDeg
      }`;

      // Full query (all categories) – timeout 120s
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

      // Simplified query – only roads and buildings (essential for width tables)
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

      if (statusEl) {
        if (mode === "roads-only") {
          statusEl.innerHTML =
            "⚠️ Using simplified data (roads & buildings only). Some map layers may be missing.";
        } else {
          statusEl.innerHTML = "⏳ Processing full data...";
        }
      }

      // Convert OSM elements to GeoJSON
      function osmelementsToGeojson(elements) {
        const nodes = {};
        elements.forEach((el) => {
          if (el.type === "node") nodes[el.id] = [el.lon, el.lat];
        });
        const features = [];
        elements.forEach((el) => {
          if (el.type === "way" && el.nodes) {
            const coords = el.nodes.map((nodeId) => nodes[nodeId]).filter(Boolean);
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

      // Split categories
      const buildingsGeojson = { type: "FeatureCollection", features: [] };
      const roadsGeojson = { type: "FeatureCollection", features: [] };
      const waterGeojson = { type: "FeatureCollection", features: [] };
      const landuseGeojson = { type: "FeatureCollection", features: [] };

      allGeojson.features.forEach((f) => {
        const props = f.properties;
        if (props.building) {
          buildingsGeojson.features.push(f);
        } else if (props.highway) {
          roadsGeojson.features.push(f);
        } else if (props.natural === "water" || props.waterway === "riverbank") {
          waterGeojson.features.push(f);
        } else if (props.landuse || props.natural || props.leisure) {
          landuseGeojson.features.push(f);
        }
      });

      // Helper area/length
      function addAreaAndLength(feature) {
        if (feature.geometry.type === "Polygon") {
          feature.properties.area_m2 = Math.round(turf.area(feature) * 10) / 10;
        } else if (feature.geometry.type === "LineString") {
          feature.properties.length_m =
            Math.round(turf.length(feature, { units: "meters" }) * 10) / 10;
        }
        return feature;
      }

      // Determine subject (building/landuse)
      let subjectBuildingId = null;
      let subjectLanduseId = null;

      buildingsGeojson.features = buildingsGeojson.features.filter((f) => {
        if (
          f.geometry.type === "Polygon" &&
          turf.booleanPointInPolygon(subjectPoint, f)
        ) {
          subjectBuildingId = f.id;
        }
        return true;
      });

      if (!subjectBuildingId && mode !== "roads-only") {
        landuseGeojson.features.forEach((f) => {
          if (
            f.geometry.type === "Polygon" &&
            turf.booleanPointInPolygon(subjectPoint, f)
          ) {
            subjectLanduseId = f.id;
          }
        });
      }

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
        if (typeof typ === "string") {
          typ = typ.charAt(0).toUpperCase() + typ.slice(1);
        }
        const area = props.area_m2 ? `${props.area_m2} m²` : "";
        props.tooltip = `<b>${escapeHtml(typ)}</b><br>Area: ${area}`;
        props.color = feature.id === subjectLanduseId ? "#ffd700" : "#ffff99";
        return feature;
      }

      // Width estimation helpers
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
          else if (["residential", "service"].includes(highwayType))
            laneWidth = 3.0;
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

      function processRoads(feature) {
        feature = addAreaAndLength(feature);
        const props = feature.properties;

        const hasExplicitTag = !!(
          props.width ||
          props["width:lanes"] ||
          props.est_width
        );
        let width = extractWidthFromTags(props);
        if (width === null && props.lanes) {
          width = estimateWidthFromLanes(props.lanes, props.highway);
        }
        if (width === null && props.highway) {
          width = getHighwayDefaultWidth(props.highway, props.service);
        }
        props.width_m = width;
        props.widthExplicit = hasExplicitTag;

        let name = props.name ? `<b>${escapeHtml(props.name)}</b><br>` : "";
        const lengthText = props.length_m
          ? `Length: ${props.length_m} m`
          : "";
        const widthText =
          width !== null ? `Width: ${width.toFixed(1)} m` : "Width: Unknown";
        const source = hasExplicitTag
          ? "✓ explicit tag"
          : props.lanes
            ? "✓ estimated from lanes"
            : "✓ estimated from road type";
        props.tooltip = [name, lengthText, widthText, source]
          .filter((s) => s)
          .join("<br>");

        return feature;
      }

      buildingsGeojson.features = buildingsGeojson.features.map(
        processBuildings,
      );
      waterGeojson.features = waterGeojson.features.map(processWater);
      landuseGeojson.features = landuseGeojson.features.map(processLanduse);
      roadsGeojson.features = roadsGeojson.features.map(processRoads);

      // Clip all geometries strictly to analysis circle so nothing is drawn outside it
      const circlePoly = turf.circle([lng, lat], radius, {
        units: "meters",
        steps: 64,
      });
      const circleLine = turf.polygonToLine(circlePoly);

      function clipPolygonsToCircle(collection) {
        const result = [];
        collection.features.forEach((feat) => {
          if (feat.geometry.type !== "Polygon") {
            return;
          }
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
            console.warn(
              "intersect failed for polygon, skipping clipping for this feature",
              e,
            );
          }
        });
        return { type: "FeatureCollection", features: result };
      }

      const clippedBuildings = clipPolygonsToCircle(buildingsGeojson);
      const clippedWater = clipPolygonsToCircle(waterGeojson);
      const clippedLanduse = clipPolygonsToCircle(landuseGeojson);

      buildingsGeojson.features = clippedBuildings.features;
      waterGeojson.features = clippedWater.features;
      landuseGeojson.features = clippedLanduse.features;

      const clippedRoads = [];
      roadsGeojson.features.forEach((road) => {
        if (road.geometry.type !== "LineString") {
          return;
        }

        let segments = [road];
        try {
          const split = turf.lineSplit(road, circleLine);
          if (split && Array.isArray(split.features) && split.features.length) {
            segments = split.features;
          }
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

      function addGeojsonLayer(geojson, styleFn) {
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
      }

      const polygonStyle = (feature) => ({
        fillColor: feature.properties.color,
        color: "#111827",
        weight: 1.3,
        fillOpacity: 0.85,
      });
      const roadStyle = { color: "#ff1744", weight: 6, opacity: 1 };

      addGeojsonLayer(waterGeojson, polygonStyle);
      addGeojsonLayer(landuseGeojson, polygonStyle);
      addGeojsonLayer(buildingsGeojson, polygonStyle);
      addGeojsonLayer(roadsGeojson, () => roadStyle);

      // ---------- ADJACENT ROADS (within 50m) ----------
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

          const coords = feature.geometry.coordinates;
          let roadBearing = null;
          if (coords.length >= 2) {
            roadBearing = turf.bearing(
              turf.point(coords[0]),
              turf.point(coords[coords.length - 1]),
            );
          }

          adjacentRoads.push({
            direction,
            width_m: feature.properties.width_m,
            widthExplicit: feature.properties.widthExplicit,
            distance,
            name: feature.properties.name || "Unnamed",
            feature,
            nearestPoint: nearest,
            roadBearing,
          });
        }
      });

      // ---------- FINAL ADJACENT ROAD TABLE (sum per direction) ----------
      const directionTotals = { N: 0, E: 0, S: 0, W: 0 };
      adjacentRoads.forEach((r) => {
        if (r.width_m && !isNaN(r.width_m)) {
          directionTotals[r.direction] += r.width_m;
        }
      });

      function categorizeWidth(w) {
        if (w === null || Number.isNaN(w) || w === 0) return "Unknown";
        if (w < 9) return "Below 9 m";
        if (w < 12) return "9 m to 12 m";
        if (w < 15) return "12 m to 15 m";
        if (w < 24) return "15 m to 24 m";
        if (w < 30) return "24 m to 30 m";
        return "30 m and above";
      }

      let finalTableHtml =
        "<table><tr><th>Direction</th><th>Total Width (m)</th><th>Category</th></tr>";
      ["N", "E", "S", "W"].forEach((dir) => {
        const total = directionTotals[dir];
        const cat = categorizeWidth(total);
        finalTableHtml += `<tr><td>${dir}</td><td>${
          total > 0 ? total.toFixed(1) : "0"
        }</td><td>${cat}</td></tr>`;
      });
      finalTableHtml += "</table>";
      if (finalRoadTableRef.current) {
        finalRoadTableRef.current.innerHTML = finalTableHtml;
      }

      // ---------- CLUSTERING LOGIC (always sum parallel roads) ----------
      const CLUSTER_RADIUS = 10; // meters
      const BEARING_TOLERANCE = 20; // degrees

      function normalizeBearing(b) {
        if (b === null) return null;
        let norm = b % 180;
        if (norm < 0) norm += 180;
        return norm;
      }

      const directionGroups = {};
      adjacentRoads.forEach((r) => {
        if (!directionGroups[r.direction]) directionGroups[r.direction] = [];
        directionGroups[r.direction].push(r);
      });

      const clusters = [];

      Object.entries(directionGroups).forEach(([dir, roads]) => {
        roads.sort((a, b) => a.distance - b.distance);
        const used = new Array(roads.length).fill(false);

        for (let i = 0; i < roads.length; i++) {
          if (used[i]) continue;
          const road = roads[i];
          const clusterRoads = [road];
          used[i] = true;
          const normBearing = normalizeBearing(road.roadBearing);

          for (let j = i + 1; j < roads.length; j++) {
            if (used[j]) continue;
            const other = roads[j];
            const dist = turf.pointToLineDistance(
              road.nearestPoint,
              other.feature,
              { units: "meters" },
            );
            if (dist > CLUSTER_RADIUS) continue;

            const otherNorm = normalizeBearing(other.roadBearing);
            if (normBearing !== null && otherNorm !== null) {
              const diff = Math.abs(normBearing - otherNorm);
              const angleDiff = Math.min(diff, 180 - diff);
              if (angleDiff > BEARING_TOLERANCE) continue;
            }
            clusterRoads.push(other);
            used[j] = true;
          }

          let totalWidth = 0;
          clusterRoads.forEach((r) => {
            if (r.width_m !== null && !isNaN(r.width_m)) totalWidth += r.width_m;
          });
          clusters.push({
            direction: dir,
            totalWidth,
            laneCount: clusterRoads.length,
            roads: clusterRoads,
          });
        }
      });

      const dirOrder = { N: 0, E: 1, S: 2, W: 3 };
      clusters.sort(
        (a, b) =>
          dirOrder[a.direction] - dirOrder[b.direction] ||
          a.totalWidth - b.totalWidth,
      );

      let tableHtml =
        "<table><tr><th>Direction</th><th>Total Width (m)</th><th>No. of Lanes</th><th>Category</th></tr>";
      if (clusters.length === 0) {
        tableHtml +=
          '<tr><td colspan="4">No adjacent roads found within 150m</td></tr>';
      } else {
        clusters.forEach((cluster) => {
          const cat = categorizeWidth(cluster.totalWidth);
          tableHtml += `<tr><td>${cluster.direction}</td><td>${
            cluster.totalWidth > 0 ? cluster.totalWidth.toFixed(1) : "?"
          }</td><td>${cluster.laneCount}</td><td>${cat}</td></tr>`;
        });
      }
      tableHtml += "</table>";
      if (roadTableRef.current) {
        roadTableRef.current.innerHTML = tableHtml;
      }

      const stats = `Buildings: ${buildingsGeojson.features.length}<br>Roads: ${roadsGeojson.features.length}<br>Water: ${waterGeojson.features.length}<br>Landuse: ${landuseGeojson.features.length}`;
      if (statusEl) {
        statusEl.innerHTML = `✅ Done (${
          mode === "roads-only" ? "simplified data" : "full data"
        })<br>${stats}`;
      }
      if (loadBtn) loadBtn.disabled = false;
    } catch (err) {
      if (statusRef.current) {
        statusRef.current.innerHTML = `❌ Error: ${err.message}`;
        const retryBtn = document.createElement("button");
        retryBtn.className = "retry-btn";
        retryBtn.innerText = "Retry";
        retryBtn.onclick = () => {
          loadMap();
        };
        statusRef.current.appendChild(document.createElement("br"));
        statusRef.current.appendChild(retryBtn);
      }
      if (loadBtn) loadBtn.disabled = false;
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }, [clearLayers]);

  // Initial auto-load once map is ready
  useEffect(() => {
    if (mapReady && turfReady) {
      loadMap();
    }
  }, [mapReady, turfReady, loadMap]);

  return (
    <div
      className="min-vh-100"
      style={{ backgroundColor: "#f3f5f9", fontFamily: "'Inter', sans-serif" }}
    >
      <Header />
      <main className="container-fluid py-5 px-4">
        {/* Page header similar to Parking Logic */}
        <div
          className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 pb-3 border-bottom border-2"
          style={{ borderColor: "rgba(0,0,0,0.05)" }}
        >
          <div>
            <div className="d-flex align-items-center mb-2">
              <h1 className="display-6 fw-bold text-dark mb-0">
                <FaRoad className="me-3 text-primary" />
                OSM Congestion MiniMap – Parallel Roads (Always Sum)
              </h1>
            </div>
            <p className="text-secondary mb-0 ms-1 fw-medium text-dark">
              Uses OpenStreetMap + Overpass API to detect adjacent roads around
              a subject point and sum widths by direction and clusters.
            </p>
          </div>
        </div>

        {/* Main card with sidebar + map */}
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body">
            <div className="row g-4">
              {/* Controls + tables */}
              <div className="col-lg-4">
                <div
                  id="sidebar"
                  style={{
                    background: "#397561",
                    padding: 20,
                    borderRadius: 16,
                    color: "#e0e0e0",
                  }}
                >
                  <h5 className="fw-bold mb-3 text-white">📍 Location</h5>
                  <div className="mb-3">
                    <label
                      htmlFor="coordInput"
                      className="form-label text-light"
                      style={{ fontSize: "0.9em", opacity: 0.85 }}
                    >
                      Latitude, Longitude (e.g. 18.592778, 73.800043)
                    </label>
                    <input
                      type="text"
                      id="coordInput"
                      ref={coordInputRef}
                      defaultValue=""
                      placeholder="lat, lon"
                      className="form-control"
                      style={{
                        background: "#3a3a55",
                        borderColor: "#555",
                        color: "#fff",
                      }}
                    />
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="radiusInput"
                      className="form-label text-light"
                      style={{ fontSize: "0.9em", opacity: 0.85 }}
                    >
                      Radius (meters) – reduce if timeout occurs
                    </label>
                    <input
                      type="number"
                      id="radiusInput"
                      ref={radiusInputRef}
                      defaultValue={200}
                      min={50}
                      max={2000}
                      className="form-control"
                      style={{
                        background: "#3a3a55",
                        borderColor: "#555",
                        color: "#fff",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    ref={loadBtnRef}
                    onClick={loadMap}
                    className="btn btn-primary w-100 mb-3 rounded-pill fw-semibold"
                    style={{ backgroundColor: "#2d2d44", color: "#fff", border: "none" }}
                  >
                    Load Map
                  </button>

                  <div
                    id="status"
                    ref={statusRef}
                    style={{
                      marginTop: 8,
                      padding: 10,
                      background: "#3a3a55",
                      borderRadius: 8,
                      fontSize: "0.9em",
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    Ready
                  </div>

                  {/* Final Adjacent Road table (sum per direction) */}
                  <div
                    id="final-table-container"
                    className="mt-3"
                    style={{
                      background: "transparent",
                      borderRadius: 8,
                    }}
                  >
                    <h6 className="fw-bold mb-2 mt-3 text-white" >Final Adjacent Road</h6>
                    <div
                      id="finalRoadTable"
                      ref={finalRoadTableRef}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>

                  {/* Adjacent Roads table (clustered) */}
                  <div
                    id="table-container"
                    className="mt-3"
                    style={{
                      background: "transparent",
                      borderRadius: 8,
                    }}
                  >
                    <h6 className="fw-bold mb-2 mt-3 text-white">Adjacent Roads (clusters)</h6>
                    <div
                      id="roadTable"
                      ref={roadTableRef}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="col-lg-8">
                <div
                  id="map-container"
                  style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                    height: "600px",
                    background: "#1e1e2f",
                  }}
                >
                  <div
                    id="map"
                    ref={mapContainerRef}
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .btn-primary {
            box-shadow: 0 4px 12px rgba(13, 110, 253, 0.2);
          }
          #finalRoadTable table,
          #roadTable table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          #finalRoadTable th,
          #finalRoadTable td,
          #roadTable th,
          #roadTable td {
            padding: 6px 8px;
            border-bottom: 1px solid #555;
            color: #e5e7eb;
          }
          #finalRoadTable th,
          #roadTable th {
            background: #3a3a55;
            color: #fff;
            font-weight: 600;
          }
        `}</style>
      </main>
    </div>
  );
};

export default Osm;

