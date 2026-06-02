'use client';

import { apiUrl } from '@/lib/api-client';
import type {
  ThreeDMapRequest,
  ThreeDMapResponse,
  ThreeDMapTimelapseRequest,
  ThreeDMapTimelapseResponse,
  SpatialAnalysisRequest,
  SpatialAnalysisResponse,
  ProjectRateTimelapseRequest,
  ProjectRateTimelapseResponse,
  LocationRateTimelapseRequest,
  LocationRateTimelapseResponse,
  HeatmapTimelapseRequest,
  HeatmapTimelapseResponse,
} from './types';


export const SAMPLE_MAP_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: '2d', label: '2D Maps' },
  { value: '3d', label: '3D Maps' },
  { value: '3d-timelapse', label: '3D map - timelapse' },
  { value: 'visualization', label: 'Spatial Analysis' },
  { value: 'heatmap-timelapse', label: 'Heatmap - Timelapse' },
] as const;


export async function fetchThreeDMap(payload: ThreeDMapRequest): Promise<ThreeDMapResponse> {
  const response = await fetch(apiUrl('/maps/3d'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `3D map request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchThreeDMapTimelapse(
  payload: ThreeDMapTimelapseRequest
): Promise<ThreeDMapTimelapseResponse> {
  const response = await fetch(apiUrl('/maps/3d-timelapse'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `3D timelapse request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchSpatialAnalysis(
  payload: SpatialAnalysisRequest
): Promise<SpatialAnalysisResponse> {
  const response = await fetch(apiUrl('/maps/spatial-analysis'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Spatial analysis request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchProjectRateTimelapse(
  payload: ProjectRateTimelapseRequest
): Promise<ProjectRateTimelapseResponse> {
  const response = await fetch(apiUrl('/maps/project-rate-growth'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Project timelapse request failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchLocationRateTimelapse(
  payload: LocationRateTimelapseRequest
): Promise<LocationRateTimelapseResponse> {
  const response = await fetch(apiUrl('/maps/location-rate-volume'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Location timelapse request failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchHeatmapTimelapse(
  payload: HeatmapTimelapseRequest
): Promise<HeatmapTimelapseResponse> {
  const response = await fetch(apiUrl('/maps/heatmap-timelapse'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Heatmap timelapse request failed with status ${response.status}`);
  }
  return response.json();
}
