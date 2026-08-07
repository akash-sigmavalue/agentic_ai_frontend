import {
  AnalyzeResponse,
  TrendResponse,
  AppreciationResponse,
  FinalAnalysisResponse,
  PlaceSuggestion,
} from "@/types/market_research";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function cleanLocation(loc: string): string {
  if (!loc) return "";
  return loc.replace(/,/g, " ").replace(/\s+/g, " ").trim();
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/market-research/places/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.places || [];
  } catch (err) {
    console.error("Error searching places:", err);
    return [];
  }
}

export async function fetchAnalysis(payload: {
  latitude: string;
  longitude: string;
  location: string;
}): Promise<AnalyzeResponse> {
  const sanitizedPayload = { ...payload, location: cleanLocation(payload.location) };
  const res = await fetch(`${API_BASE_URL}/api/market-research/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitizedPayload),
  });
  if (!res.ok) throw new Error(`Analyze API error: ${res.statusText}`);
  return res.json();
}

export async function fetchTrend(payload: {
  latitude: string;
  longitude: string;
  location: string;
}): Promise<TrendResponse> {
  const sanitizedPayload = { ...payload, location: cleanLocation(payload.location) };
  const res = await fetch(`${API_BASE_URL}/api/market-research/trend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitizedPayload),
  });
  if (!res.ok) throw new Error(`Trend API error: ${res.statusText}`);
  return res.json();
}

export async function fetchAppreciation(payload: {
  latitude: string;
  longitude: string;
  location: string;
}): Promise<AppreciationResponse> {
  const sanitizedPayload = { ...payload, location: cleanLocation(payload.location) };
  const res = await fetch(`${API_BASE_URL}/api/market-research/appreciation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitizedPayload),
  });
  if (!res.ok) throw new Error(`Appreciation API error: ${res.statusText}`);
  return res.json();
}

export async function fetchFinalAnalysis(payload: {
  latitude: string;
  longitude: string;
  location: string;
  price_point_data: any;
  trend_data: any;
  appreciation_data: any;
}): Promise<FinalAnalysisResponse> {
  const sanitizedPayload = { ...payload, location: cleanLocation(payload.location) };
  const res = await fetch(`${API_BASE_URL}/api/market-research/final-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitizedPayload),
  });
  if (!res.ok) throw new Error(`Final Analysis API error: ${res.statusText}`);
  return res.json();
}
