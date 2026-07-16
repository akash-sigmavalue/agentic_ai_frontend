/* ── Shared types for the Elevation Profile GIS app ────────────────────── */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ElevationGridResponse {
  rows: number;
  cols: number;
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
    lat_step: number;
    lng_step: number;
    rows: number;
    cols: number;
  };
  elevations: (number | null)[][];
  mask: boolean[][];
  min_elevation: number | null;
  max_elevation: number | null;
  elevation_range: number | null;
  total_points: number;
  inside_points: number;
  area_km2: number;
  plot_area_m2: number;
  avg_slope_pct: number;
  slope_classification: string;
  balance_elevation_m: number;
  estimated_cut_m3: number;
  estimated_fill_m3: number;
  net_earthwork_m3: number;
  nearby_features: { name: string; distance_m: number; type: string }[];
  slopes: (number | null)[][];
  cut_fill_depths: (number | null)[][];
  api_cost_details?: {
    elevation_cache_hits: number;
    elevation_cache_misses: number;
    elevation_api_calls: number;
    places_api_calls: number;
    elevation_cost_usd: number;
    places_cost_usd: number;
    total_cost_usd: number;
  };
}

export type ViewMode = "2d" | "3d";
