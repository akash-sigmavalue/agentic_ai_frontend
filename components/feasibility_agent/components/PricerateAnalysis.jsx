import { apiUrl } from "@/lib/api-client";
import React, { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { FaChartBar, FaChartArea } from "react-icons/fa";


/**
 * PricerateAnalysis
 *
 * Reads city (location) + villageName (village) from localStorage['Land Identification']
 * and fetches year-on-year weighted average rate per sqft from
 * POST /new_rate_simulator/simulator/yoy-weighted-rate/
 *
 * localStorage payload shape (Land Identification):
 *   { location: "Pune", village: "Wakad", ... }
 *
 * Mapping:
 *   location    → city_name (SQL WHERE)
 *   village     → location_name (SQL WHERE)
 */

const formatRate = (val, city) => {
  const c = String(city || "").toLowerCase();
  const isDubai = c.includes("dubai") || c.includes("uae");
  const symbol = isDubai ? "AED " : "₹";
  if (val === null || val === undefined || isNaN(val)) return `${symbol}0`;
  const locale = isDubai ? "en-US" : "en-IN";
  return `${symbol}${Math.round(Number(val)).toLocaleString(locale)}`;
};

const getLandIdentificationPayload = () => {
  try {
    const raw = localStorage.getItem("Land Identification");
    if (!raw) return { city: "", villageName: "", lat: null, lng: null };
    const parsed = JSON.parse(raw);
    const lat = parsed.polygonCenterLat || parsed.latitude || null;
    const lng = parsed.polygonCenterLng || parsed.longitude || null;
    return {
      city: parsed.location || "",
      villageName: parsed.village || "",
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
    };
  } catch {
    return { city: "", villageName: "", lat: null, lng: null };
  }
};

const PricerateAnalysis = ({ viewMode = "location", catchmentRadius = 1000, selectedProject = "all", selectedProjectId = null }) => {
  const theme = "light";

  const [city, setCity] = useState("");
  const [villageName, setVillageName] = useState("");
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = React.useRef({ location: null, catchment: {}, nearby: {} });

  // Read from Land Identification localStorage on mount and listen for updates
  useEffect(() => {
    const updatePayloadState = (data) => {
      cacheRef.current = { location: null, catchment: {}, nearby: {} };
      const c = data.location || data.city || "";
      const v = data.village || data.villageName || "";
      const latVal = data.polygonCenterLat || data.latitude || null;
      const lngVal = data.polygonCenterLng || data.longitude || null;
      setCity(c);
      setVillageName(v);
      setLat(latVal ? parseFloat(latVal) : null);
      setLng(lngVal ? parseFloat(lngVal) : null);
    };

    const initialPayload = getLandIdentificationPayload();
    setCity(initialPayload.city);
    setVillageName(initialPayload.villageName);
    setLat(initialPayload.lat);
    setLng(initialPayload.lng);

    const handleLandIdUpdate = (e) => {
      const detail = e.detail;
      if (detail) {
        updatePayloadState(detail);
      } else {
        cacheRef.current = { location: null, catchment: {}, nearby: {} };
        const payload = getLandIdentificationPayload();
        setCity(payload.city);
        setVillageName(payload.villageName);
        setLat(payload.lat);
        setLng(payload.lng);
      }
    };

    window.addEventListener("landIdentificationSaved", handleLandIdUpdate);

    return () => {
      window.removeEventListener("landIdentificationSaved", handleLandIdUpdate);
    };
  }, []);

  // Fetch YoY data whenever dependencies change
  useEffect(() => {
    const cacheKey = selectedProjectId || selectedProject;
    if (viewMode === "catchment") {
      if (!lat || !lng) {
        setChartData([]);
        setLoading(false);
        return;
      }
      if (cacheRef.current?.catchment?.[catchmentRadius]) {
        setChartData(cacheRef.current.catchment[catchmentRadius]);
        setError(null);
        setLoading(false);
        return;
      }
    } else if (viewMode === "nearby") {
      if (!lat || !lng) {
        setChartData([]);
        setLoading(false);
        return;
      }
      if (cacheRef.current?.nearby?.[cacheKey]) {
        setChartData(cacheRef.current.nearby[cacheKey]);
        setError(null);
        setLoading(false);
        return;
      }
    } else {
      if (!city || !villageName) {
        setChartData([]);
        setLoading(false);
        return;
      }
      if (cacheRef.current?.location) {
        setChartData(cacheRef.current.location);
        setError(null);
        setLoading(false);
        return;
      }
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

    const radiusKm = (catchmentRadius || 1000) / 1000.0;

    let requestBody = { city_name: city, location_name: villageName, mode: "location" };
    if (viewMode === "catchment") {
      requestBody = { city_name: city, latitude: lat, longitude: lng, radius_km: radiusKm, mode: "catchment" };
    } else if (viewMode === "nearby") {
      requestBody = { city_name: city, location_name: villageName, latitude: lat, longitude: lng, radius_km: 1.5, mode: "nearby", project_id: selectedProjectId, project_name: selectedProject };
    }

      try {
        const response = await fetch(
          apiUrl("/new_rate_simulator/simulator/yoy-weighted-rate/"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const json = await response.json();

        if (!json.success) {
          throw new Error(json.error || "Failed to fetch data");
        }

        const fetchedData = json.data || [];
        if (viewMode === "catchment") {
          cacheRef.current.catchment[catchmentRadius] = fetchedData;
        } else if (viewMode === "nearby") {
          cacheRef.current.nearby[cacheKey] = fetchedData;
        } else {
          cacheRef.current.location = fetchedData;
        }
        setChartData(fetchedData);
      } catch (err) {
        setError(err.message || "An error occurred while fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [city, villageName, lat, lng, viewMode, catchmentRadius, selectedProject, selectedProjectId]);

  const years = useMemo(() => {
    const allYears = chartData.map((d) => d.year);
    return Array.from(new Set(allYears)).sort((a, b) => a - b).map(String);
  }, [chartData]);

  const propertyTypes = useMemo(() => {
    const allTypes = chartData.map((d) => d.property_type);
    return Array.from(new Set(allTypes))
      .filter((type) => Boolean(type) && !String(type).toLowerCase().startsWith("other"))
      .sort();
  }, [chartData]);

  // Generate dynamic series per property type
  const series = useMemo(() => {
    return propertyTypes.map((type) => {
      return {
        name: type,
        data: years.map((yr) => {
          const record = chartData.find(
            (d) => String(d.year) === yr && d.property_type === type
          );
          return record ? Math.round(record.avg_rate_per_sqft) : 0;
        }),
      };
    });
  }, [years, propertyTypes, chartData]);

  const isDark = theme === "dark";
  const textColor = isDark ? "#e2e8f0" : "#1e293b";
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const cLower = String(city || "").toLowerCase();
  const isDubai = cLower.includes("dubai") || cLower.includes("uae");

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: true },
        foreColor: textColor,
        background: "transparent",
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 600,
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: "55%",
          dataLabels: { position: "top" },
        },
      },
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        categories: years,
        title: {
          text: "Year",
          style: { color: textColor, fontSize: "12px", fontWeight: 600 },
        },
        labels: {
          style: { colors: textColor, fontSize: "12px" },
        },
        axisBorder: { color: gridColor },
        axisTicks: { color: gridColor },
      },
      yaxis: {
        title: {
          text: isDubai ? "Avg Rate (AED/sqft)" : "Avg Rate (₹/sqft)",
          style: { color: textColor, fontSize: "12px", fontWeight: 600 },
        },
        labels: {
          formatter: (val) => formatRate(val, city),
          style: { colors: [textColor], fontSize: "11px" },
        },
      },
      grid: {
        borderColor: gridColor,
        strokeDashArray: 4,
      },
      legend: {
        position: "top",
        horizontalAlign: "left",
        labels: { colors: textColor },
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: isDark ? "dark" : "light",
        y: {
          formatter: (val) => formatRate(val, city),
        },
      },
    }),
    [years, textColor, gridColor, isDark, city, isDubai]
  );

  return (
    <div
      className="card border-0 shadow-sm rounded-4 h-100"
      style={{ background: isDark ? "#1e293b" : "#ffffff" }}
    >
      {/* Card Header */}
      <div
        className="card-header border-bottom pt-4 px-4 pb-3"
        style={{
          background: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
        }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <h5
            className="fw-bold mb-0 d-flex align-items-center gap-2"
            style={{ color: textColor, fontSize: "15px" }}
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: 38,
                height: 38,
                background: isDark ? "rgba(99,102,241,0.2)" : "rgba(79,70,229,0.1)",
                color: isDark ? "#818cf8" : "#4f46e5",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              <FaChartBar />
            </div>
            Weighted Average Rate
          </h5>
          {viewMode === "catchment" ? (
            lat && lng && (
              <span
                style={{
                  fontSize: "11px",
                  background: isDark ? "rgba(99,102,241,0.15)" : "rgba(79,70,229,0.08)",
                  color: isDark ? "#a5b4fc" : "#4f46e5",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontWeight: 600,
                }}
              >
                🎯 {catchmentRadius >= 1000 ? `${(catchmentRadius / 1000).toFixed(1)}km` : `${catchmentRadius}m`} Catchment
              </span>
            )
          ) : viewMode === "nearby" && selectedProject && selectedProject !== "all" ? (
            <span
              style={{
                fontSize: "11px",
                background: isDark ? "rgba(99,102,241,0.15)" : "rgba(79,70,229,0.08)",
                color: isDark ? "#a5b4fc" : "#4f46e5",
                padding: "3px 10px",
                borderRadius: 20,
                fontWeight: 600,
              }}
            >
              🏢 {selectedProject}
            </span>
          ) : (
            (city || villageName) && (
              <span
                style={{
                  fontSize: "11px",
                  background: isDark ? "rgba(99,102,241,0.15)" : "rgba(79,70,229,0.08)",
                  color: isDark ? "#a5b4fc" : "#4f46e5",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontWeight: 600,
                }}
              >
                📍 {villageName}{city ? `, ${city}` : ""}
              </span>
            )
          )}
        </div>
        <p
          className="mb-0 mt-1"
          style={{ fontSize: "12px", color: isDark ? "#94a3b8" : "#64748b" }}
        >
          Year-on-year average transaction rate ({isDubai ? "AED" : "₹"}/sqft) on carpet area grouped by property type
        </p>
      </div>

      {/* Card Body */}
      <div className="card-body px-3 py-3">
        {/* Loading State */}
        {loading && (
          <div
            className="d-flex flex-column align-items-center justify-content-center"
            style={{ minHeight: 300 }}
          >
            <div
              className="spinner-border mb-3"
              style={{ color: isDark ? "#818cf8" : "#4f46e5", width: 36, height: 36 }}
              role="status"
            />
            <p style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: "13px" }}>
              Fetching rate data...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            className="d-flex flex-column align-items-center justify-content-center"
            style={{ minHeight: 300 }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚧</div>
            <p
              className="text-center"
              style={{ color: "#ef4444", fontSize: "13px", maxWidth: 340 }}
            >
              {error}
            </p>
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && years.length === 0 && (
          <div
            className="d-flex flex-column align-items-center justify-content-center"
            style={{ minHeight: 300 }}
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-circle mb-3"
              style={{
                width: 72,
                height: 72,
                background: isDark ? "rgba(99,102,241,0.12)" : "rgba(79,70,229,0.07)",
                color: isDark ? "#818cf8" : "#4f46e5",
              }}
            >
              <FaChartArea size={30} />
            </div>
            <p
              className="text-center mb-1"
              style={{ color: textColor, fontWeight: 600, fontSize: "14px" }}
            >
              No Data Available
            </p>
            <p
              className="text-center"
              style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: "12px" }}
            >
              {villageName
                ? `No rate data found for "${villageName}" from 2020 onwards.`
                : "Set a location in the Market Analysis section to load rate data."}
            </p>
          </div>
        )}

        {/* Chart */}
        {!loading && !error && years.length > 0 && (
          <div style={{ overflow: "auto", maxHeight: "80vh" }}>
            <Chart
              options={chartOptions}
              series={series}
              type="bar"
              height={380}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PricerateAnalysis;
