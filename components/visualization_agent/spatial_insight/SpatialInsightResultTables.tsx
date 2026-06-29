'use client';

import React, { useMemo } from 'react';
import type { SpatialInsightResultSummary, SpatialInsightState } from '@/lib/visualization-agent-spatial-insight';

function DataAccordion({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-slate-700 bg-slate-900/50">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-white marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-slate-500 transition group-open:rotate-90">›</span>
          {title}
        </span>
      </summary>
      <div className="space-y-3 border-t border-slate-800 px-4 py-3">
        {children}
        {caption ? <p className="text-xs leading-5 text-slate-400">{caption}</p> : null}
      </div>
    </details>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-slate-400">No records available.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="min-w-full text-left text-xs text-slate-200">
        <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-3 py-2">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-800 hover:bg-slate-900/80">
              {columns.map((column) => (
                <td key={column} className="whitespace-nowrap px-3 py-2">
                  {String(row[column] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildFeatureRows(features: Array<Record<string, unknown>>) {
  return features.map((feature) => ({
    id: feature.id,
    label: feature.label,
    category: feature.category,
    confidence: feature.confidence,
    validated_confidence: feature.validated_confidence,
    priority: feature.display_priority,
    show_client: feature.show_on_client_overlay,
  }));
}

function buildRealEstateRows(points: Array<Record<string, unknown>>) {
  return points.map((point) => ({
    record_id: point.record_id,
    Name: point.name,
    lat: point.lat,
    lng: point.lng,
    rate: point.rate,
    data_source: point.data_source,
  }));
}

function buildOsmRows(features: Array<Record<string, unknown>>) {
  return features.map((feature) => {
    const props = (feature.properties || {}) as Record<string, unknown>;
    const geometry = (feature.geometry || {}) as Record<string, unknown>;
    return {
      feature_uid: props.feature_uid,
      category: props.category_label || props.category,
      name: props.name,
      geometry: geometry.type,
      road_class: props.road_class,
      estimated_width_m: props.estimated_width_m,
      land_use_class: props.land_use_class,
      amenity_class: props.amenity_class,
      building_levels: props.building_levels,
      lat: props.lat,
      lng: props.lng,
      osm_type: props.osm_type,
      osm_id: props.osm_id,
    };
  });
}

function buildProjectProfileRows(projectSpatialAnalysis: Record<string, unknown>) {
  const profiles = Array.isArray(projectSpatialAnalysis.profiles)
    ? (projectSpatialAnalysis.profiles as Array<Record<string, unknown>>)
    : [];

  return profiles.map((profile) => {
    const land500 = ((profile.surrounding_land_use as Record<string, unknown> | undefined)?.['500m'] ||
      {}) as Record<string, unknown>;
    const density500 = ((profile.built_up_density as Record<string, unknown> | undefined)?.['500m'] ||
      {}) as Record<string, unknown>;
    const road = (profile.road_frontage_and_visibility || {}) as Record<string, unknown>;
    const connectivity = (profile.connectivity_hierarchy || {}) as Record<string, unknown>;
    const amenity = (profile.amenity_proximity_and_impact || {}) as Record<string, unknown>;
    const nearestRoad = (road.nearest_road || {}) as Record<string, unknown>;

    return {
      Project: profile.project_name,
      Rate: profile.rate,
      'Dominant land use (500m)': land500.dominant_land_use,
      'Building coverage % (500m)': density500.building_coverage_percent,
      'Nearest road': nearestRoad.name,
      'Road distance m': nearestRoad.distance_m,
      'Estimated road width m': nearestRoad.estimated_width_m,
      'Visibility score': road.approximate_visibility_score,
      'Connectivity score': connectivity.connectivity_score,
      'Amenity impact score': amenity.amenity_impact_score,
    };
  });
}

export function SpatialInsightStructuredDataPanels({
  resultSummary,
}: {
  resultSummary: SpatialInsightResultSummary;
}) {
  const featureRows = useMemo(
    () => buildFeatureRows((resultSummary.features || []) as Array<Record<string, unknown>>),
    [resultSummary.features],
  );
  const realEstateRows = useMemo(
    () => buildRealEstateRows((resultSummary.real_estate_points || []) as Array<Record<string, unknown>>),
    [resultSummary.real_estate_points],
  );
  const osmRows = useMemo(
    () => buildOsmRows((resultSummary.osm_features || []) as Array<Record<string, unknown>>),
    [resultSummary.osm_features],
  );
  const projectProfileRows = useMemo(
    () => buildProjectProfileRows(resultSummary.project_spatial_analysis || {}),
    [resultSummary.project_spatial_analysis],
  );

  const hasAnyData =
    featureRows.length > 0 ||
    realEstateRows.length > 0 ||
    osmRows.length > 0 ||
    projectProfileRows.length > 0;

  if (!hasAnyData) return null;

  return (
    <div className="space-y-2 pt-2">
      {featureRows.length > 0 ? (
          <DataAccordion title="Feature table">
            <DataTable
              columns={['id', 'label', 'category', 'confidence', 'validated_confidence', 'priority', 'show_client']}
              rows={featureRows}
            />
          </DataAccordion>
        ) : null}

        {realEstateRows.length > 0 ? (
          <DataAccordion
            title="Real-estate point layer (unique records)"
            caption="One table row equals one real-estate Point feature in the merged GeoJSON."
          >
            <DataTable
              columns={['record_id', 'Name', 'lat', 'lng', 'rate', 'data_source']}
              rows={realEstateRows}
            />
          </DataAccordion>
        ) : null}

        {osmRows.length > 0 ? (
          <DataAccordion
            title="OSM infrastructure layer (unique records)"
            caption="Each OSM object is stored once using its stable feature_uid. Styled map lines and station markers are visual renderings only. Data © OpenStreetMap contributors."
          >
            <DataTable
              columns={[
                'feature_uid',
                'category',
                'name',
                'geometry',
                'road_class',
                'estimated_width_m',
                'land_use_class',
                'amenity_class',
                'building_levels',
                'lat',
                'lng',
                'osm_type',
                'osm_id',
              ]}
              rows={osmRows}
            />
          </DataAccordion>
        ) : null}

        {projectProfileRows.length > 0 ? (
          <DataAccordion
            title="Project GIS analysis profiles"
            caption="These are derived GIS calculations. They do not add duplicate geometry records to merged GeoJSON."
          >
            <DataTable
              columns={[
                'Project',
                'Rate',
                'Dominant land use (500m)',
                'Building coverage % (500m)',
                'Nearest road',
                'Road distance m',
                'Estimated road width m',
                'Visibility score',
                'Connectivity score',
                'Amenity impact score',
              ]}
              rows={projectProfileRows}
            />
          </DataAccordion>
        ) : null}
    </div>
  );
}

export function SpatialInsightGisEvidence({
  queryGisResult,
}: {
  queryGisResult: SpatialInsightState['query_gis_result'];
}) {
  if (!queryGisResult) return null;

  const rows = Array.isArray(queryGisResult.rows)
    ? (queryGisResult.rows as Array<Record<string, unknown>>)
    : [];
  const displayRows = rows.map((row) => {
    const flattened: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      flattened[key] = typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
    }
    return flattened;
  });
  const columns =
    displayRows.length > 0
      ? Object.keys(displayRows[0])
      : [];

  return (
    <section className="space-y-3">
      <h4 className="text-sm font-bold text-white">GIS Calculation Evidence</h4>
      <p className="text-xs text-slate-400">
        Operation: {String(queryGisResult.operation ?? '—')} · Projects considered:{' '}
        {String(queryGisResult.project_count_considered ?? 0)} · OSM features considered:{' '}
        {String(queryGisResult.osm_feature_count_considered ?? 0)}
      </p>
      {displayRows.length > 0 ? (
        <DataTable columns={columns} rows={displayRows} />
      ) : (
        <p className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-xs text-slate-400">
          The GIS engine did not find matching records for this query in the loaded layers.
        </p>
      )}
      <DataAccordion title="View full deterministic GIS result">
        <pre className="max-h-72 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
          {JSON.stringify(queryGisResult, null, 2)}
        </pre>
      </DataAccordion>
    </section>
  );
}
