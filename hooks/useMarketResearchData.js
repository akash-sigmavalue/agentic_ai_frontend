import { useState, useEffect, useRef, useCallback } from "react";
import { apiUrl } from "@/lib/api-client";

// In-memory client cache to prevent refetching during session toggles
const memoryCache = new Map();

function getCacheKey(params) {
  const mode = params.mode || "location";
  const city = (params.city_name || "").trim().toLowerCase();
  const location = (params.location_name || "").trim().toLowerCase();
  const lat = params.latitude != null ? Number(params.latitude).toFixed(4) : "none";
  const lng = params.longitude != null ? Number(params.longitude).toFixed(4) : "none";
  const radius = params.radius_km || 1.0;
  const projectId = params.project_id || "";
  const projectName = (params.project_name || "").trim().toLowerCase();
  return `${mode}::${city}::${location}::${lat}::${lng}::${radius}::${projectId}::${projectName}`;
}

export function useMarketResearchData({
  viewMode = "location",
  catchmentRadius = 1000,
  selectedProject = "all",
  selectedProjectId = null,
  city = "",
  villageName = "",
  lat = null,
  lng = null,
  enabled = true,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const fetchData = useCallback(
    async (force = false) => {
      if (!enabled) return;

      const radiusKm = (Number(catchmentRadius) || 1000) / 1000.0;

      let effectiveLat = lat;
      let effectiveLng = lng;
      let effectiveCity = city;
      let effectiveVillage = villageName;

      if ((effectiveLat == null || effectiveLng == null || isNaN(Number(effectiveLat)) || isNaN(Number(effectiveLng))) && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("Land Identification");
          if (raw) {
            const parsed = JSON.parse(raw);
            const lLat = parsed.polygonCenterLat || parsed.latitude;
            const lLng = parsed.polygonCenterLng || parsed.longitude;
            if (lLat != null && lLng != null && !isNaN(Number(lLat)) && !isNaN(Number(lLng))) {
              effectiveLat = parseFloat(lLat);
              effectiveLng = parseFloat(lLng);
            }
            if (!effectiveCity) effectiveCity = parsed.location || parsed.city || "";
            if (!effectiveVillage) effectiveVillage = parsed.village || parsed.villageName || "";
          }
        } catch {
          // ignore
        }
      }

      const hasValidCoords = effectiveLat != null && effectiveLng != null && !isNaN(Number(effectiveLat)) && !isNaN(Number(effectiveLng));
      const hasValidProject = (selectedProjectId && String(selectedProjectId).toLowerCase() !== "all") || (selectedProject && String(selectedProject).toLowerCase() !== "all");

      // Precondition validation
      if (viewMode === "catchment") {
        if (!hasValidCoords) {
          setData(null);
          setLoading(false);
          return;
        }
      } else if (viewMode === "nearby") {
        if (!hasValidProject && !hasValidCoords) {
          setData(null);
          setLoading(false);
          return;
        }
      } else {
        // Location mode requires at least city or villageName
        if (!effectiveCity && !effectiveVillage) {
          setData(null);
          setLoading(false);
          return;
        }
      }

      let requestBody = {
        city_name: effectiveCity,
        location_name: effectiveVillage,
        mode: "location",
      };

      if (viewMode === "catchment") {
        requestBody = {
          city_name: effectiveCity,
          latitude: Number(effectiveLat),
          longitude: Number(effectiveLng),
          radius_km: radiusKm,
          mode: "catchment",
        };
      } else if (viewMode === "nearby") {
        requestBody = {
          city_name: effectiveCity,
          location_name: effectiveVillage,
          latitude: hasValidCoords ? Number(effectiveLat) : null,
          longitude: hasValidCoords ? Number(effectiveLng) : null,
          radius_km: 1.5,
          mode: "nearby",
          project_id: selectedProjectId,
          project_name: selectedProject,
        };
      }

      const cacheKey = getCacheKey(requestBody);

      if (!force && memoryCache.has(cacheKey)) {
        setData(memoryCache.get(cacheKey));
        setLoading(false);
        setError(null);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          apiUrl("/new_rate_simulator/simulator/market-research/bundle/"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const json = await response.json();
        if (!json.success) {
          throw new Error(json.error || "Failed to fetch market research data");
        }

        const bundleData = json.data || {};
        memoryCache.set(cacheKey, bundleData);
        setData(bundleData);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Market research fetch error:", err);
          setError(err.message || "Failed to load market research");
        }
      } finally {
        setLoading(false);
      }
    },
    [
      enabled,
      viewMode,
      catchmentRadius,
      selectedProject,
      selectedProjectId,
      city,
      villageName,
      lat,
      lng,
    ]
  );

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    weightedRate: data?.weighted_rate || [],
    salesAnalysis: data?.sales_analysis || [],
    demand: data?.demand || [],
    loading,
    error,
    refetch: () => fetchData(true),
  };
}
