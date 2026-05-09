'use client';

import React, { useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Download } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────
export interface RoadMapData {
  latlngs: [number, number][];
  name: string | null;
  width_m: number | null;
  widthExplicit: boolean;
  length_m: number | null;
  lanes: string | null;
  highwayType: string | null;
}

// ── Overpass helpers ────────────────────────────────────────
const MAX_RETRIES = 5;
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

async function fetchOverpassWithFallback(
  queryFull: string, queryRoadsOnly: string, retries: number,
  onStatus?: (msg: string) => void
): Promise<{ data: any; mode: string }> {
  let lastError: Error | null = null;
  for (const url of OVERPASS_ENDPOINTS) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { method: 'POST', body: queryFull, headers: { 'Content-Type': 'text/plain' } });
        if (response.status === 429) {
          const waitTime = Math.pow(2, i) * 2000;
          onStatus?.(`⏳ Rate limited at ${url}. Retrying in ${waitTime / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        if (response.status === 504) throw new Error('TIMEOUT_FULL');
        if (!response.ok) throw new Error(`Overpass error: ${response.status}`);
        return { data: await response.json(), mode: 'full' };
      } catch (err: any) {
        lastError = err;
        if (err.message === 'TIMEOUT_FULL') {
          onStatus?.('⚠️ Full query timed out. Trying simplified query...');
          break;
        }
        if (i === retries - 1) break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { method: 'POST', body: queryRoadsOnly, headers: { 'Content-Type': 'text/plain' } });
        if (response.status === 429) {
          const waitTime = Math.pow(2, i) * 2000;
          onStatus?.(`⏳ Rate limited (roads-only). Retrying in ${waitTime / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        if (response.status === 504) throw new Error('Even the simplified query timed out.');
        if (!response.ok) throw new Error(`Overpass error: ${response.status}`);
        return { data: await response.json(), mode: 'roads-only' };
      } catch (err: any) {
        lastError = err;
        if (i === retries - 1) break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
  throw lastError || new Error('Max retries exceeded for all Overpass endpoints');
}

function osmelementsToGeojson(elements: any[]) {
  const nodes: Record<number, [number, number]> = {};
  elements.forEach((el) => { if (el.type === 'node') nodes[el.id] = [el.lon, el.lat]; });
  const features: any[] = [];
  elements.forEach((el) => {
    if (el.type === 'way' && el.nodes) {
      const coords = el.nodes.map((id: number) => nodes[id]).filter(Boolean);
      if (coords.length < 2) return;
      let geometry: any;
      if (coords.length >= 3 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]) {
        geometry = { type: 'Polygon', coordinates: [coords] };
      } else {
        geometry = { type: 'LineString', coordinates: coords };
      }
      features.push({ type: 'Feature', id: el.id, geometry, properties: el.tags || {} });
    }
  });
  return { type: 'FeatureCollection', features };
}

function extractWidthFromTags(tags: any): number | null {
  for (const key of ['width', 'width:lanes', 'est_width']) {
    if (tags[key]) { const match = tags[key].match(/(\d+\.?\d*)/); if (match) return parseFloat(match[1]); }
  }
  return null;
}

function estimateWidthFromLanes(lanes: any, highwayType: string): number | null {
  let laneCount: number | null = null;
  if (typeof lanes === 'string') { const match = lanes.match(/(\d+\.?\d*)/); if (match) laneCount = parseFloat(match[1]); }
  else if (typeof lanes === 'number') laneCount = lanes;
  if (laneCount === null) return null;
  let laneWidth = 3.5;
  if (['motorway', 'trunk'].includes(highwayType)) laneWidth = 3.75;
  else if (['residential', 'service'].includes(highwayType)) laneWidth = 3.0;
  return laneCount * laneWidth;
}

function getHighwayDefaultWidth(highwayType: string, serviceType?: string): number {
  const defaults: Record<string, number> = {
    motorway: 11.5, motorway_link: 8.0, trunk: 10.0, trunk_link: 7.0, primary: 8.5, primary_link: 6.5,
    secondary: 7.5, secondary_link: 6.0, tertiary: 6.5, tertiary_link: 5.5, unclassified: 5.5,
    residential: 5.5, living_street: 5.0, service: 4.5, track: 3.5, path: 2.0, footway: 2.0,
    cycleway: 2.0, bridleway: 2.5, steps: 1.5, pedestrian: 5.0,
  };
  if (highwayType === 'service' && serviceType) {
    const serviceDefaults: Record<string, number> = { parking_aisle: 3.5, driveway: 3.0, alley: 3.5, emergency_access: 4.0, 'drive-through': 3.5 };
    if (serviceDefaults[serviceType]) return serviceDefaults[serviceType];
  }
  return defaults[highwayType] || 5.0;
}

function processRoad(feature: any, turf: any) {
  if (feature.geometry.type === 'Polygon') feature.properties.area_m2 = Math.round(turf.area(feature) * 10) / 10;
  else if (feature.geometry.type === 'LineString') feature.properties.length_m = Math.round(turf.length(feature, { units: 'meters' }) * 10) / 10;
  const props = feature.properties;
  const hasExplicitTag = !!(props.width || props['width:lanes'] || props.est_width);
  let width = extractWidthFromTags(props);
  if (width === null && props.lanes) width = estimateWidthFromLanes(props.lanes, props.highway);
  if (width === null && props.highway) width = getHighwayDefaultWidth(props.highway, props.service);
  props.width_m = width;
  props.widthExplicit = hasExplicitTag;
  return feature;
}

function categorizeWidth(w: number | null): string {
  if (w === null || isNaN(w) || w === 0) return 'Unknown';
  if (w < 9) return 'Below 9 m';
  if (w < 12) return '9 m to 12 m';
  if (w < 15) return '12 m to 15 m';
  if (w < 24) return '15 m to 24 m';
  if (w < 30) return '24 m to 30 m';
  return '30 m and above';
}

// ── Component ───────────────────────────────────────────────
interface RoadWidthProps {
  savedCoordinate: [number, number] | null;
  circleRadius: number | null;
  polygonGeoJson: any;
  filterMode: string;
  selectedCity: string;
  onRoadsLoaded: (roads: RoadMapData[]) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export interface RoadWidthRef {
  runAnalysis: () => void;
}

const RoadWidth = forwardRef<RoadWidthRef, RoadWidthProps>(({
  savedCoordinate, circleRadius, polygonGeoJson, filterMode, selectedCity, onRoadsLoaded, onLoadingChange
}, ref) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [adjacentRoads, setAdjacentRoads] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [directionTotals, setDirectionTotals] = useState<Record<string, number> | null>(null);
  const [turfLoaded, setTurfLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).turf) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@turf/turf@6/turf.min.js';
      script.async = true;
      script.onload = () => setTurfLoaded(true);
      script.onerror = () => console.error('Failed to load Turf.js');
      document.body.appendChild(script);
    } else {
      setTurfLoaded(true);
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    const turf = (window as any).turf;
    if (!turf) { setError('Turf.js not loaded yet'); return; }

    let subjectPoint = savedCoordinate;
    let geometry: any = null;

    if (filterMode === 'circle' && savedCoordinate && circleRadius && circleRadius > 0) {
      geometry = { type: 'circle', center: savedCoordinate, radius: circleRadius };
    } else if (filterMode === 'polygon' && polygonGeoJson) {
      geometry = { type: 'polygon', geoJson: polygonGeoJson };
      if (!subjectPoint) {
        const polygon = turf.polygon(polygonGeoJson.geometry.coordinates);
        const centroid = turf.centroid(polygon);
        subjectPoint = [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
      }
    } else {
      setError('No valid geometry. Please draw a circle or polygon on the map.');
      return;
    }

    if (!subjectPoint || subjectPoint.length !== 2) {
      setError('No subject point. Please set a coordinate.');
      return;
    }

    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);
    setError(null); setStatus('Preparing...'); setAdjacentRoads([]); setClusters([]); setDirectionTotals(null);
    if (onRoadsLoaded) onRoadsLoaded([]);

    try {
      let bbox: string;
      if (geometry.type === 'circle') {
        const [lat, lng] = geometry.center;
        const radiusDeg = geometry.radius / 111320;
        bbox = `${lat - radiusDeg},${lng - radiusDeg},${lat + radiusDeg},${lng + radiusDeg}`;
      } else {
        const coords = geometry.geoJson.geometry.coordinates[0];
        const lats = coords.map((p: number[]) => p[1]);
        const lngs = coords.map((p: number[]) => p[0]);
        bbox = `${Math.min(...lats)},${Math.min(...lngs)},${Math.max(...lats)},${Math.max(...lngs)}`;
      }

      const fullQuery = `[out:json][timeout:120];(way["building"](${bbox});relation["building"](${bbox});way["highway"](${bbox});relation["highway"](${bbox});way["natural"="water"](${bbox});relation["natural"="water"](${bbox});way["waterway"="riverbank"](${bbox});way["landuse"~"grass|farmland|meadow"](${bbox});way["natural"~"wood|grassland|heath"](${bbox});way["leisure"~"park|garden|golf_course"](${bbox});way["landuse"](${bbox}););out body;>;out skel qt;`;
      const roadsOnlyQuery = `[out:json][timeout:120];(way["building"](${bbox});relation["building"](${bbox});way["highway"](${bbox});relation["highway"](${bbox}););out body;>;out skel qt;`;

      setStatus('Fetching OSM data...');
      const result = await fetchOverpassWithFallback(fullQuery, roadsOnlyQuery, MAX_RETRIES, setStatus);

      setStatus(`Fetched ${result.data.elements.length} OSM elements. Processing...`);
      const allGeojson = osmelementsToGeojson(result.data.elements);
      const roadsGeojson = { type: 'FeatureCollection', features: allGeojson.features.filter((f: any) => f.properties.highway) };

      let clipPolygon: any;
      if (geometry.type === 'circle') {
        const center = [geometry.center[1], geometry.center[0]];
        clipPolygon = turf.circle(center, geometry.radius, { units: 'meters', steps: 64 });
      } else {
        clipPolygon = turf.polygon(geometry.geoJson.geometry.coordinates);
      }
      const clipLine = turf.polygonToLine(clipPolygon);

      const clippedRoads: any[] = [];
      roadsGeojson.features.forEach((road: any) => {
        if (road.geometry.type !== 'LineString') return;
        let segments = [road];
        try { const split = turf.lineSplit(road, clipLine); if (split?.features?.length) segments = split.features; } catch { /* fallback */ }
        segments.forEach((seg: any, idx: number) => {
          const lengthMeters = turf.length(seg, { units: 'meters' });
          if (!lengthMeters || isNaN(lengthMeters)) return;
          const mid = turf.along(seg, lengthMeters / 2, { units: 'meters' });
          if (!turf.booleanPointInPolygon(mid, clipPolygon)) return;
          const newFeature = { type: 'Feature', id: `${road.id}-${idx}`, geometry: seg.geometry, properties: { ...road.properties } };
          if (newFeature.geometry.type === 'LineString') newFeature.properties.length_m = Math.round(turf.length(newFeature, { units: 'meters' }) * 10) / 10;
          clippedRoads.push(newFeature);
        });
      });

      const processedRoads = clippedRoads.map((r) => processRoad(r, turf));
      const roadsForMap: RoadMapData[] = processedRoads.map((r) => ({
        latlngs: r.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]),
        name: r.properties.name || null, width_m: r.properties.width_m, widthExplicit: r.properties.widthExplicit,
        length_m: r.properties.length_m, lanes: r.properties.lanes, highwayType: r.properties.highway,
      }));
      onRoadsLoaded(roadsForMap);

      // Adjacent roads within 50m
      const subjectPointTurf = turf.point([subjectPoint[1], subjectPoint[0]]);
      const adjacent: any[] = [];
      processedRoads.forEach((feature: any) => {
        if (feature.geometry.type !== 'LineString') return;
        const distance = turf.pointToLineDistance(subjectPointTurf, feature, { units: 'meters' });
        if (distance <= 50) {
          const nearest = turf.nearestPointOnLine(feature, subjectPointTurf);
          const bearing = turf.bearing(subjectPointTurf, nearest);
          let direction: string;
          if (bearing >= -45 && bearing < 45) direction = 'N';
          else if (bearing >= 45 && bearing < 135) direction = 'E';
          else if (bearing >= 135 && bearing < 225) direction = 'S';
          else direction = 'W';
          const coords = feature.geometry.coordinates;
          let roadBearing = null;
          if (coords.length >= 2) roadBearing = turf.bearing(turf.point(coords[0]), turf.point(coords[coords.length - 1]));
          adjacent.push({ direction, width_m: feature.properties.width_m, widthExplicit: feature.properties.widthExplicit, distance, name: feature.properties.name || 'Unnamed', feature, nearestPoint: nearest, roadBearing });
        }
      });
      setAdjacentRoads(adjacent);

      const dirTotals: Record<string, number> = { N: 0, E: 0, S: 0, W: 0 };
      adjacent.forEach((r) => { if (r.width_m && !isNaN(r.width_m)) dirTotals[r.direction] += r.width_m; });
      setDirectionTotals(dirTotals);

      // Clustering
      const CLUSTER_RADIUS = 10;
      const BEARING_TOLERANCE = 20;
      const normalizeBearing = (b: number | null) => { if (b === null) return null; let norm = b % 180; if (norm < 0) norm += 180; return norm; };
      const directionGroups: Record<string, any[]> = {};
      adjacent.forEach((r) => { if (!directionGroups[r.direction]) directionGroups[r.direction] = []; directionGroups[r.direction].push(r); });
      const clustersResult: any[] = [];
      Object.entries(directionGroups).forEach(([dir, roads]) => {
        roads.sort((a, b) => a.distance - b.distance);
        const used = new Array(roads.length).fill(false);
        for (let i = 0; i < roads.length; i++) {
          if (used[i]) continue;
          const clusterRoads = [roads[i]]; used[i] = true;
          const normB = normalizeBearing(roads[i].roadBearing);
          for (let j = i + 1; j < roads.length; j++) {
            if (used[j]) continue;
            const dist = turf.pointToLineDistance(roads[i].nearestPoint, roads[j].feature, { units: 'meters' });
            if (dist > CLUSTER_RADIUS) continue;
            const otherNorm = normalizeBearing(roads[j].roadBearing);
            if (normB !== null && otherNorm !== null) { const diff = Math.abs(normB - otherNorm); if (Math.min(diff, 180 - diff) > BEARING_TOLERANCE) continue; }
            clusterRoads.push(roads[j]); used[j] = true;
          }
          let totalWidth = 0;
          clusterRoads.forEach((r) => { if (r.width_m !== null && !isNaN(r.width_m)) totalWidth += r.width_m; });
          clustersResult.push({ direction: dir, totalWidth, laneCount: clusterRoads.length, roads: clusterRoads });
        }
      });
      const dirOrder: Record<string, number> = { N: 0, E: 1, S: 2, W: 3 };
      clustersResult.sort((a, b) => dirOrder[a.direction] - dirOrder[b.direction] || a.totalWidth - b.totalWidth);
      setClusters(clustersResult);
      setStatus(`✅ Done. Processed ${processedRoads.length} road segments.`);
    } catch (err: any) {
      setError(err.message || 'Failed to load road data');
      setStatus('');
      onRoadsLoaded([]);
    } finally {
      setLoading(false);
      if (onLoadingChange) onLoadingChange(false);
    }
  }, [savedCoordinate, circleRadius, polygonGeoJson, filterMode, onRoadsLoaded, onLoadingChange]);

  useImperativeHandle(ref, () => ({
    runAnalysis
  }));

  const handleDownloadCSV = () => {
    if (!adjacentRoads.length) return;
    const rows = [['Direction', 'Name', 'Width (m)', 'Distance (m)', 'Source']];
    adjacentRoads.forEach((r) => {
      rows.push([r.direction, r.name, r.width_m ? r.width_m.toFixed(1) : '?', r.distance.toFixed(1), r.widthExplicit ? 'Explicit' : (r.feature.properties.lanes ? 'Lanes' : 'Default')]);
    });
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `road_width_${selectedCity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasSubjectPoint = savedCoordinate || (filterMode === 'polygon' && polygonGeoJson);
  const hasGeometry = (filterMode === 'circle' && savedCoordinate && circleRadius) || (filterMode === 'polygon' && polygonGeoJson);

  if (!turfLoaded) return <div className="p-4 text-slate-500 text-sm">Loading geospatial library...</div>;

  if (!hasSubjectPoint || !hasGeometry) {
    return (
      <div className="px-4 text-center">
        <div className="mb-5 p-5 bg-amber-50 rounded-xl border border-amber-300">
          <p className="text-sm text-amber-800 mb-2">📐 Location not ready.</p>
          <p className="text-xs text-amber-700">
            {!savedCoordinate && 'Please set a coordinate using the map coordinate input.'}<br />
            {!hasGeometry && 'Then draw a circle or polygon on the map.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="mb-5">
        <button onClick={runAnalysis} disabled={loading}
          className={`w-full py-2 text-white rounded-lg text-sm font-medium transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'}`}>
          {loading ? 'Analyzing...' : 'Analyze Road Widths'}
        </button>
      </div>

      {status && <div className="mb-4 p-2 bg-slate-100 rounded-lg text-xs text-slate-600">{status}</div>}
      {error && <div className="mb-4 p-2 bg-red-50 rounded-lg text-xs text-red-700">❌ {error}</div>}

      {directionTotals && (
        <>
          <h4 className="mt-4 mb-2 text-base font-semibold">Final Adjacent Roads (Total Width)</h4>
          <table className="w-full text-sm border-collapse mb-4">
            <thead><tr className="border-b border-slate-200"><th className="text-left py-1">Direction</th><th className="text-right py-1">Total Width (m)</th><th className="text-right py-1">Category</th></tr></thead>
            <tbody>
              {['N', 'E', 'S', 'W'].map((dir) => {
                const total = directionTotals[dir] || 0;
                return (
                  <tr key={dir} className="border-b border-slate-200">
                    <td className="py-1">{dir}</td>
                    <td className="text-right py-1">{total > 0 ? total.toFixed(1) : '0'}</td>
                    <td className="text-right py-1">{categorizeWidth(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {clusters.length > 0 && (
        <>
          <h4 className="mt-4 mb-2 text-base font-semibold">Adjacent Roads (Clusters)</h4>
          <table className="w-full text-sm border-collapse mb-4">
            <thead><tr className="border-b border-slate-200"><th className="text-left py-1">Dir</th><th className="text-right py-1">Width (m)</th><th className="text-right py-1">Lanes</th><th className="text-right py-1">Category</th></tr></thead>
            <tbody>
              {clusters.map((cluster, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-1">{cluster.direction}</td>
                  <td className="text-right py-1">{cluster.totalWidth > 0 ? cluster.totalWidth.toFixed(1) : '?'}</td>
                  <td className="text-right py-1">{cluster.laneCount}</td>
                  <td className="text-right py-1">{categorizeWidth(cluster.totalWidth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {adjacentRoads.length > 0 && (
        <button onClick={handleDownloadCSV} className="mt-3 w-full py-2 bg-blue-500 text-white rounded-lg cursor-pointer flex items-center justify-center gap-1.5 text-sm hover:bg-blue-600 transition-colors">
          <Download size={16} /> Download CSV
        </button>
      )}
    </div>
  );
});

export default RoadWidth;
