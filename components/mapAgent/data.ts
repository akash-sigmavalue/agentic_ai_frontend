export type Coordinates = {
  lat: number;
  lng: number;
};

export type LocationLookupStatus = "idle" | "resolving" | "resolved" | "failed";

export type MapAgentSelection = {
  coordinates: Coordinates;
  lookupStatus: LocationLookupStatus;
  projectName: string;
  location: string;
  city?: string;
  propertyType: string;
  placeId?: string;
  formattedAddress?: string;
  lookupError?: string;
};

export type PricingRecord = {
  portal: string;
  area_type: string;
  rate?: string | null;
  price_range: string;
  evidence: string;
  confidence: string;
  source_url: string;
  website_authenticity_score?: number | null;
  website_authenticity_category?: string | null;
  confidence_rationale?: string | null;
};

export type PricingIntelligence = {
  project_name: string;
  location: string;
  openai_intelligence: PricingRecord[];
  gemini_intelligence: PricingRecord[];
};

export type MapAgentAnalyzeResponse = {
  data: PricingIntelligence;
  tokens_used?: number | null;
  estimated_cost?: number | null;
};

export type ReportItem = {
  label: string;
  value: string;
};

export type ComparableProperty = {
  name: string;
  distance: string;
  rate: string;
};

export const PUNE_CENTER: [number, number] = [18.5204, 73.8567];

export const mapLayers = {
  streets: {
    label: "Street map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  terrain: {
    label: "Terrain map",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data &copy; OpenStreetMap contributors, map style &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
} as const;

export type MapLayerKey = keyof typeof mapLayers;

export const locationDetails = {
  name: "Selected Location",
  city: "Pune",
  microMarket: "Baner - Balewadi",
  propertyType: "Residential",
  confidence: 87,
};

export const valuationData: ReportItem[] = [
  { label: "Fair market value", value: "₹2.85 Cr" },
  { label: "Average rate", value: "₹9,800 / sq.ft" },
  { label: "Realizable value", value: "₹2.55 Cr" },
  { label: "Distress value", value: "₹2.25 Cr" },
  { label: "Land rate", value: "₹95,000 / sq.m" },
  { label: "Built-up rate", value: "₹9,800 / sq.ft" },
];

export const marketData: ReportItem[] = [
  { label: "Demand", value: "High" },
  { label: "Supply", value: "Medium" },
  { label: "Market trend", value: "Upward" },
  { label: "Risk", value: "Low" },
  { label: "Liquidity", value: "Good" },
  { label: "Observed rate range", value: "₹8,500-₹11,500 / sq.ft" },
];

export const nearbyProjects = ["Project Alpha", "Project Beta", "Project Gamma"];
export const infrastructure = ["Metro connectivity", "School nearby", "Hospital nearby", "IT hub nearby"];
export const positiveFactors = ["Good road connectivity", "Strong residential demand", "Upcoming infrastructure"];
export const marketConstraints = ["Traffic congestion", "Limited parking", "High competition"];

export const comparableProperties: ComparableProperty[] = [
  { name: "Comparable Project 1", distance: "1.2 km", rate: "₹9,500 / sq.ft" },
  { name: "Comparable Project 2", distance: "2.1 km", rate: "₹10,200 / sq.ft" },
  { name: "Comparable Project 3", distance: "2.8 km", rate: "₹9,850 / sq.ft" },
];
