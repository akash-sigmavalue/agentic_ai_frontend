export type LocationIdentification = {
  latitude: string;
  longitude: string;
  identified_location: string;
  nearest_locality: string;
  sector_or_area: string;
  micro_market: string;
  city: string;
  state: string;
  country: string;
};

export type PlaceSuggestion = {
  place_id: string;
  name: string;
  formatted_address: string;
  latitude: string;
  longitude: string;
};

export type PortalListing = {
  portal: string;
  url: string;
  project_name?: string;
  title?: string;
  price?: string;
  currency?: string;
  area?: string;
  area_type?: string;
  location?: string;
};

export type PropertyListing = {
  project_name?: string;
  property_type?: string;
  distance_from_coordinate?: string;
  portal_listings?: PortalListing[];
};

export type PropertyCategories = {
  residential: PropertyListing[];
  office: PropertyListing[];
  retail: PropertyListing[];
  land: PropertyListing[];
};

export type PipelineResult = {
  location: string;
  location_identification: LocationIdentification;
  property_categories: PropertyCategories;
  error_message?: string;
};

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  call_count?: number;
};

export type AnalyzeResponse = {
  location: string;
  openai_result: PipelineResult;
  bedrock_result: PipelineResult;
  openai_tokens: TokenUsage;
  bedrock_tokens: TokenUsage;
};

export type TrendResponse = {
  location: string;
  openai_trend: string;
  bedrock_trend: string;
  openai_tokens: TokenUsage;
  bedrock_tokens: TokenUsage;
};

export type AppreciationResponse = {
  location: string;
  openai_appreciation: string;
  bedrock_appreciation: string;
  openai_tokens: TokenUsage;
  bedrock_tokens: TokenUsage;
};

export type FinalAnalysisResponse = {
  location: string;
  openai_analysis: string;
  bedrock_analysis: string;
  openai_tokens: TokenUsage;
  bedrock_tokens: TokenUsage;
};
