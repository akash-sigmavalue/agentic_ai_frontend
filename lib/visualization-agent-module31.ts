import type {
  GeneratedMapConfig,
  GeneratedMapFamily,
  GeneratedMapRecord,
  GeneratedMapRuntimeContext,
  GeneratedMapRenderer,
  Module1IntentOutput,
  Module2Output,
  Module31Readiness,
} from '@/components/visualization_agent/types';

const LATITUDE_FIELDS = [
  'latitude',
  'lat',
  'project_latitude',
  'subject_lat',
  'center_lat',
  'y',
];

const LONGITUDE_FIELDS = [
  'longitude',
  'lng',
  'lon',
  'long',
  'project_longitude',
  'subject_lon',
  'subject_lng',
  'center_lng',
  'x',
];

const GEO_LABEL_FIELDS = [
  'geo_label',
  'location_name',
  'location',
  'locality',
  'village',
  'village_name',
  'micromarket',
  'micro_market',
  'project_name',
  'city_name',
  'city',
];

const TIME_FIELDS = [
  'timelapse_frame',
  'time_period',
  'period',
  'year',
  'transaction_year',
  'month',
  'date',
  'transaction_date',
];

const FALLBACK_METRIC_FIELDS = [
  'metric_value',
  'value',
  'sales_density',
  'density',
  'sales_count',
  'units_sold',
  'transaction_count',
  'total_sales_value',
  'rate_per_sq_ft',
  'avg_rate_psf',
];

const CITY_FIELDS = [
  'city',
  'city_name',
  'City',
  'CITY',
  'district',
  'state',
];

const TWO_D_TYPES = new Set([
  'marker_map',
  'cluster_map',
  '2d_overlay',
  '2d_heatmap',
  'region_choropleth',
  'comparison_map',
]);

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function stringValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getNestedRecordList(module2: Module2Output | null): Record<string, unknown>[] {
  if (!module2) return [];

  const visualizationOutput = module2.visualization_ready_output || {};
  const records = visualizationOutput.records;
  if (Array.isArray(records)) {
    return records.filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === 'object');
  }

  const dataset = module2.analysis_ready_dataset;
  if (Array.isArray(dataset)) {
    return dataset.filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === 'object');
  }

  return [];
}

function getIntentLocations(module1: Module1IntentOutput | null): string[] {
  const candidates: unknown[] = [
    module1?.structured_intent,
    module1?.map_output_requirements,
    module1?.spatial_requirements,
    module1?.intent_mapping,
  ];
  const found: string[] = [];

  const visit = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        const normalized = normalizeKey(key);
        if (
          normalized.includes('location') ||
          normalized.includes('locality') ||
          normalized.includes('village') ||
          normalized.includes('city') ||
          normalized.includes('geography')
        ) {
          if (typeof nested === 'string' || typeof nested === 'number') {
            const text = stringValue(nested);
            if (text) found.push(text);
          } else {
            visit(nested);
          }
        }
      });
    }
  };

  candidates.forEach(visit);
  return Array.from(new Set(found.flatMap((item) => item.split(/\s*(?:,| vs | versus | and )\s*/i)).map((item) => item.trim()).filter(Boolean)));
}

function findField(record: Record<string, unknown>, candidates: Array<string | null | undefined>): string | undefined {
  const normalizedEntries = new Map(Object.keys(record).map((key) => [normalizeKey(key), key]));
  for (const candidate of candidates) {
    if (!candidate) continue;
    const directKey = normalizedEntries.get(normalizeKey(candidate));
    if (directKey) return directKey;
  }
  return undefined;
}

function firstPresentValue(record: Record<string, unknown>, candidates: Array<string | null | undefined>) {
  const field = findField(record, candidates);
  return field ? record[field] : undefined;
}

function findNumericMetricField(
  record: Record<string, unknown>,
  candidates: Array<string | null | undefined>,
) {
  const direct = findField(record, candidates);
  if (direct && toFiniteNumber(record[direct]) != null) return direct;

  const blocked = new Set([...LATITUDE_FIELDS, ...LONGITUDE_FIELDS, ...TIME_FIELDS].map(normalizeKey));
  for (const key of Object.keys(record)) {
    const normalized = normalizeKey(key);
    if (blocked.has(normalized)) continue;
    if (toFiniteNumber(record[key]) != null) return key;
  }

  return direct;
}

/**
 * Smarter time-field resolver.
 * 1. First tries the explicit candidate list (mapped_fields, TIME_FIELDS).
 * 2. Falls back to scanning column VALUES across a sample of records for
 *    year-like integers (2000-2099) — catches 'YEAR', 'Year', 'transaction_year', etc.
 *    that may not exactly match the normalised TIME_FIELDS list.
 * 3. Finally checks string values matching a 4-digit year pattern.
 */
function findTimeFieldWithFallback(
  records: Record<string, unknown>[],
  candidates: Array<string | null | undefined>,
): string | undefined {
  if (records.length === 0) return undefined;
  const first = records[0];

  // Step 1 — standard candidate matching (normalised key comparison)
  const standard = findField(first, candidates);
  if (standard) return standard;

  // Step 2 — value-based scan: column whose values look like calendar years
  const sampleSize = Math.min(10, records.length);
  for (const key of Object.keys(first)) {
    const firstVal = toFiniteNumber(first[key]);
    if (firstVal === null || !Number.isInteger(firstVal) || firstVal < 2000 || firstVal > 2099) continue;
    // Confirm consistency across sample rows
    let yearLikeCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      const v = toFiniteNumber(records[i][key]);
      if (v !== null && Number.isInteger(v) && v >= 2000 && v <= 2099) yearLikeCount++;
    }
    if (yearLikeCount >= Math.ceil(sampleSize * 0.7)) return key;
  }

  // Step 3 — string year pattern ('2021', '2022', ...)
  for (const [key, value] of Object.entries(first)) {
    if (typeof value === 'string' && /^(19|20)\d{2}$/.test(value.trim())) return key;
  }

  return undefined;
}

function buildLabel(module1: Module1IntentOutput | null) {
  const objective = String(module1?.business_objective || '').trim();
  const fallbackMetric = String(module1?.map_output_requirements?.base_map_metric || 'Generated Visualization');
  const source = objective || titleCase(fallbackMetric);
  const cleaned = source.replace(/^(show|visualize|analyze)\s+/i, '').replace(/\.$/, '');
  return cleaned.length > 78 ? `${cleaned.slice(0, 75).trim()}...` : cleaned;
}

function metricLabel(module1: Module1IntentOutput | null, module2: Module2Output | null, metricField?: string) {
  const mapReq = module1?.map_output_requirements || {};
  const metric =
    mapReq.intensity_metric ||
    mapReq.base_map_metric ||
    module2?.map_readiness?.intensity_field ||
    metricField ||
    'metric_value';
  return titleCase(String(metric));
}

function classifyMapFamily(module1: Module1IntentOutput | null): GeneratedMapFamily {
  const mapReq = module1?.map_output_requirements || {};
  const primaryMapType = String(mapReq.primary_map_type || '').toLowerCase();
  const timelapseRequired = Boolean(mapReq.timelapse_required);
  const spatialActive = Boolean(
    (module1?.spatial_requirements as Record<string, unknown> | undefined)?.is_active
  );

  if (primaryMapType === '3d_timelapse') return '3d-timelapse';
  if (primaryMapType === 'proximity_map' || spatialActive) return 'spatial-analysis';
  if (primaryMapType === '3d_heatmap' && timelapseRequired) return 'heatmap-timelapse';
  if (primaryMapType === '3d_heatmap' || primaryMapType === '3d_building_plotting' || primaryMapType === '3d_floor_wise') return '3d';

  return '2d';
}

function normalizeRenderer(module1: Module1IntentOutput | null): GeneratedMapRenderer {
  const mapReq = module1?.map_output_requirements || {};
  const primaryMapType = String(mapReq.primary_map_type || '').toLowerCase();
  const spatialActive = Boolean(
    (module1?.spatial_requirements as Record<string, unknown> | undefined)?.is_active
  );

  if (primaryMapType === '3d_building_plotting') return '3d_building_plotting';
  if (primaryMapType === '3d_floor_wise') return '3d_floor_wise';
  if (primaryMapType === '3d_heatmap') return '3d_heatmap';
  if (primaryMapType === '3d_timelapse') return '3d_timelapse';
  if (spatialActive) return 'proximity_map';
  if (primaryMapType === 'proximity_map') return 'proximity_map';
  if (TWO_D_TYPES.has(primaryMapType)) return primaryMapType as GeneratedMapRenderer;
  return 'generic_point_map';
}

function extractGeneratedRecords(
  module1: Module1IntentOutput | null,
  module2: Module2Output | null,
) {
  const rawRecords = getNestedRecordList(module2);
  if (rawRecords.length === 0) {
    return {
      records: [] as GeneratedMapRecord[],
      latitudeField: undefined,
      longitudeField: undefined,
      metricField: undefined,
      geoLabelField: undefined,
      timeField: undefined,
    };
  }

  const mapped = module2?.mapped_fields || {};
  const mapReadiness = module2?.map_readiness || {};
  const mapReq = module1?.map_output_requirements || {};

  const first = rawRecords[0];
  const latitudeField = findField(first, [
    String(mapped.latitude_field || ''),
    String(mapped.lat_field || ''),
    ...LATITUDE_FIELDS,
  ]);
  const longitudeField = findField(first, [
    String(mapped.longitude_field || ''),
    String(mapped.lng_field || ''),
    ...LONGITUDE_FIELDS,
  ]);
  const geoLabelField = findField(first, [
    String(mapped.geo_field || ''),
    String(mapReadiness.plotting_level || ''),
    ...GEO_LABEL_FIELDS,
  ]);
  const timeField = findTimeFieldWithFallback(rawRecords, [
    String(mapReadiness.time_field || ''),
    String(mapped.time_field || ''),
    ...TIME_FIELDS,
  ]);
  const metricField = findNumericMetricField(first, [
    String(mapReadiness.intensity_field || ''),
    String(mapped.metric_field || ''),
    String(mapReq.intensity_metric || ''),
    String(mapReq.base_map_metric || ''),
    ...FALLBACK_METRIC_FIELDS,
  ]);
  const label = metricLabel(module1, module2, metricField);

  const records: GeneratedMapRecord[] = rawRecords.flatMap((record, index) => {
    const lat = latitudeField ? toFiniteNumber(record[latitudeField]) : toFiniteNumber(firstPresentValue(record, LATITUDE_FIELDS));
    const lng = longitudeField ? toFiniteNumber(record[longitudeField]) : toFiniteNumber(firstPresentValue(record, LONGITUDE_FIELDS));
    if (lat == null || lng == null) return [];

    const metricValue = metricField ? toFiniteNumber(record[metricField]) : null;
    const geoLabel =
      (geoLabelField ? String(record[geoLabelField] ?? '').trim() : '') ||
      String(firstPresentValue(record, GEO_LABEL_FIELDS) || '').trim() ||
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const timeFrame =
      (timeField ? String(record[timeField] ?? '').trim() : '') ||
      String(firstPresentValue(record, TIME_FIELDS) || '').trim() ||
      null;

    return [
      {
        id: `record-${index}`,
        lat,
        lng,
        geoLabel,
        metricValue,
        metricLabel: label,
        timeFrame,
        raw: record,
      },
    ];
  });

  return { records, latitudeField, longitudeField, metricField, geoLabelField, timeField };
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadiusM = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function buildRuntimeContext(
  module1: Module1IntentOutput,
  records: GeneratedMapRecord[],
): GeneratedMapRuntimeContext {
  const center = records.length > 0
    ? {
        lat: records.reduce((sum, record) => sum + record.lat, 0) / records.length,
        lng: records.reduce((sum, record) => sum + record.lng, 0) / records.length,
      }
    : { lat: 20.5937, lng: 78.9629 };
  const farthest = records.reduce((max, record) => Math.max(max, haversineMeters(record, center)), 0);
  const radius = Math.max(300, Math.min(2000, Math.ceil((farthest + 700) / 100) * 100));
  const recordLabels = Array.from(new Set(records.map((record) => record.geoLabel).filter(Boolean)));
  const intentLabels = getIntentLocations(module1);
  const locationLabels = Array.from(new Set([...intentLabels, ...recordLabels])).slice(0, 5);
  const cityFromRecords = records
    .map((record) => firstPresentValue(record.raw, CITY_FIELDS))
    .map(stringValue)
    .find(Boolean);
  const city = cityFromRecords || locationLabels.find((label) => /pune|mumbai|thane|bengaluru|hyderabad/i.test(label)) || 'Pune';
  const placeName = locationLabels.length > 0
    ? `${locationLabels.slice(0, 3).join(', ')}, ${city}, India`
    : `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`;

  return {
    center,
    radius,
    city,
    placeName,
    locationLabels,
  };
}

export function getModule31Readiness(
  module1: Module1IntentOutput | null,
  module2: Module2Output | null,
): Module31Readiness {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!module1) reasons.push('Run Module 1 intent finalization first.');
  if (!module2) reasons.push('Run Module 2 data restructuring first.');

  if (module2 && module2.next_module_ready !== true) {
    reasons.push('Module 2 is not marked ready for downstream map generation.');
  }

  const rawRecords = getNestedRecordList(module2);
  if (module2 && rawRecords.length === 0) {
    reasons.push('Module 2 did not return visualization records or an analysis-ready dataset.');
  }

  const extracted = extractGeneratedRecords(module1, module2);
  if (module2 && rawRecords.length > 0 && extracted.records.length === 0) {
    reasons.push('Module 2 records do not contain usable latitude and longitude fields.');
  }

  const mapReadiness = module2?.map_readiness || {};
  if (mapReadiness.needs_geo_enrichment) {
    warnings.push('Module 2 says geo-enrichment may still be needed, but lat/lng records are available.');
  }

  return {
    isReady: reasons.length === 0,
    reasons,
    warnings,
  };
}

export function buildGeneratedMapConfig(
  module1: Module1IntentOutput,
  module2: Module2Output,
): GeneratedMapConfig {
  const extracted = extractGeneratedRecords(module1, module2);
  if (extracted.records.length === 0) {
    throw new Error('Cannot generate map because no latitude/longitude records were found.');
  }

  const family = classifyMapFamily(module1);
  const renderer = normalizeRenderer(module1);
  const label = buildLabel(module1);
  const timeFrames = Array.from(
    new Set(
      extracted.records
        .map((record) => record.timeFrame)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
  const mapReq = module1.map_output_requirements || {};
  const runtimeContext = buildRuntimeContext(module1, extracted.records);

  return {
    id: `module31-${Date.now()}`,
    label,
    fullTitle: String(module1.business_objective || label),
    family,
    renderer,
    primaryMapType: String(mapReq.primary_map_type || renderer),
    category: family === '2d' ? 'Generated Visualizations' : 'Generated Maps',
    subtype: 'Generated Visualizations',
    metricLabel: metricLabel(module1, module2, extracted.metricField),
    geoLabelField: extracted.geoLabelField,
    latitudeField: extracted.latitudeField,
    longitudeField: extracted.longitudeField,
    metricField: extracted.metricField,
    timeField: extracted.timeField,
    timeFrames,
    records: extracted.records,
    runtimeContext,
    module1Summary: {
      businessObjective: module1.business_objective,
      primaryMapType: String(mapReq.primary_map_type || ''),
      requiredModules: module1.required_modules,
      timelapseRequired: Boolean(mapReq.timelapse_required),
    },
    module2Summary: {
      status: module2.status,
      nextModuleReady: module2.next_module_ready,
      sourceType: module2.source_type,
      recordsCount: extracted.records.length,
      mapReady: Boolean(module2.map_readiness?.is_map_ready),
      needsGeoEnrichment: Boolean(module2.map_readiness?.needs_geo_enrichment),
    },
    sourceModule1Intent: module1,
    sourceModule2Output: module2,
    createdAt: new Date().toISOString(),
  };
}
