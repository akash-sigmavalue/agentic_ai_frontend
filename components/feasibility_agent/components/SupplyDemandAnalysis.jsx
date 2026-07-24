import { apiUrl } from "@/lib/api-client";
import React, { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { FaWarehouse, FaArrowTrendUp, FaChartBar } from "react-icons/fa6";


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

const getCountryFromCity = (city) => {
  if (!city) return "India";
  const c = city.toLowerCase();
  if (c.includes("dubai") || c.includes("uae") || c.includes("aweer")) {
    return "Dubai";
  }
  return "India";
};

const formatNumberRaw = (val, country = "India") => {
  if (val === null || val === undefined || isNaN(val)) return "0";
  const locale = country === "Dubai" ? "en-US" : "en-IN";
  return Math.round(Number(val)).toLocaleString(locale);
};

const SupplyDemandAnalysis = ({ option, viewMode = "location", catchmentRadius = 1000, selectedProject = "all", selectedProjectId = null }) => {
  const theme = "light";
  const isDark = false;

  // Common UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // States for Supply option (Reserved/WIP)
  const [village, setVillage] = useState("");
  const [city, setCity] = useState("");

  // States for Demand option
  const [demandData, setDemandData] = useState([]);
  const [demandCity, setDemandCity] = useState("");
  const [demandVillageName, setDemandVillageName] = useState("");
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const cacheRef = React.useRef({ location: null, catchment: {}, nearby: {} });

  // Sync state from Land Identification on mount/change
  useEffect(() => {
    const updatePayloadState = (data) => {
      cacheRef.current = { location: null, catchment: {}, nearby: {} };
      const c = data.location || data.city || "";
      const v = data.village || data.villageName || "";
      const latVal = data.polygonCenterLat || data.latitude || null;
      const lngVal = data.polygonCenterLng || data.longitude || null;
      setCity(c);
      setVillage(v);
      setDemandCity(c);
      setDemandVillageName(v);
      setLat(latVal ? parseFloat(latVal) : null);
      setLng(lngVal ? parseFloat(lngVal) : null);
    };

    updatePayloadState(getLandIdentificationPayload());

    const handleSave = (e) => {
      if (e.detail) {
        updatePayloadState(e.detail);
      } else {
        updatePayloadState(getLandIdentificationPayload());
      }
    };

    window.addEventListener("landIdentificationSaved", handleSave);
    return () => {
      window.removeEventListener("landIdentificationSaved", handleSave);
    };
  }, []);

  // Fetch demand data when option === "demand"
  useEffect(() => {
    if (option !== "demand") return;
    const radiusKm = (catchmentRadius || 1000) / 1000.0;
    const cacheKey = selectedProjectId || selectedProject;

    if (viewMode === "catchment") {
      if (!lat || !lng) {
        setDemandData([]);
        setLoading(false);
        return;
      }
      if (cacheRef.current?.catchment?.[catchmentRadius]) {
        setDemandData(cacheRef.current.catchment[catchmentRadius]);
        setError(null);
        setLoading(false);
        return;
      }
    } else if (viewMode === "nearby") {
      if (!lat || !lng) {
        setDemandData([]);
        setLoading(false);
        return;
      }
      if (cacheRef.current?.nearby?.[cacheKey]) {
        setDemandData(cacheRef.current.nearby[cacheKey]);
        setError(null);
        setLoading(false);
        return;
      }
    } else {
      if (!demandCity || !demandVillageName) {
        setDemandData([]);
        setLoading(false);
        return;
      }
      if (cacheRef.current?.location) {
        setDemandData(cacheRef.current.location);
        setError(null);
        setLoading(false);
        return;
      }
    }

    const loadDemand = async () => {
      setLoading(true);
      setError(null);

      let requestBody = { city_name: demandCity, location_name: demandVillageName, mode: "location" };
      if (viewMode === "catchment") {
        requestBody = { city_name: demandCity, latitude: lat, longitude: lng, radius_km: radiusKm, mode: "catchment" };
      } else if (viewMode === "nearby") {
        requestBody = { city_name: demandCity, location_name: demandVillageName, latitude: lat, longitude: lng, radius_km: 1.5, mode: "nearby", project_id: selectedProjectId, project_name: selectedProject };
      }

      try {
        const response = await fetch(apiUrl("/new_rate_simulator/simulator/yoy-demand/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) throw new Error("Failed to fetch demand data");
        const data = await response.json();

        if (data && data.success) {
          const fetchedData = data.data || [];
          if (viewMode === "catchment") {
            cacheRef.current.catchment[catchmentRadius] = fetchedData;
          } else if (viewMode === "nearby") {
            cacheRef.current.nearby[cacheKey] = fetchedData;
          } else {
            cacheRef.current.location = fetchedData;
          }
          setDemandData(fetchedData);
        } else {
          throw new Error(data.error || "Failed to fetch demand data");
        }
      } catch (err) {
        setError(err.message || "Error fetching demand data");
      } finally {
        setLoading(false);
      }
    };

    loadDemand();
  }, [demandCity, demandVillageName, lat, lng, option, viewMode, catchmentRadius, selectedProject, selectedProjectId]);

  // Determine country
  const currentCity = option === "supply" ? city : demandCity;
  const currentVillage = option === "supply" ? village : demandVillageName;
  const country = useMemo(() => getCountryFromCity(currentCity), [currentCity]);

  // Demand computations
  const demandYears = useMemo(() => demandData.map((d) => String(d.year)), [demandData]);
  const demandUnits = useMemo(() => demandData.map((d) => d.total_units_sold), [demandData]);

  // Styling & Theme options
  const textColor = isDark ? "#e2e8f0" : "#1e293b";
  const gridColor = isDark ? "#334155" : "#e2e8f0";

  const chartOptionsDemand = useMemo(() => {
    return {
      chart: {
        type: "bar",
        toolbar: { show: true },
        foreColor: textColor,
        background: "transparent",
      },
      title: {
        text: "Yearly Trend of Units Absorbed [Primary+Secondary]",
        style: { color: textColor, fontSize: "14px", fontWeight: 600 },
      },
      colors: [isDark ? "#f59e0b" : "#d97706"],
      xaxis: {
        categories: demandYears,
        title: { text: "Year" },
        labels: { style: { colors: textColor } },
      },
      yaxis: {
        title: { text: "Units Sold" },
        labels: {
          formatter: (val) => formatNumberRaw(val, country),
          style: { colors: [textColor] },
        },
      },
      dataLabels: {
        enabled: true,
        offsetY: -20,
        style: {
          fontSize: "11px",
          colors: [textColor],
          fontWeight: 600,
        },
        formatter: (val) => formatNumberRaw(val, country),
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: "50%",
          dataLabels: { position: "top" },
        },
      },
      grid: { borderColor: gridColor },
      legend: { show: false },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: {
          title: { formatter: () => "Units Sold:" },
          formatter: (val) => formatNumberRaw(val, country),
        },
      },
    };
  }, [demandYears, textColor, gridColor, isDark, country]);

  const hasData = demandData.length > 0;

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
                background: option === "supply"
                  ? (isDark ? "rgba(6,182,212,0.2)" : "rgba(8,145,178,0.1)")
                  : (isDark ? "rgba(245,158,11,0.2)" : "rgba(217,119,6,0.1)"),
                color: option === "supply" ? (isDark ? "#22d3ee" : "#0891b2") : (isDark ? "#fbbf24" : "#d97706"),
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {option === "supply" ? <FaWarehouse /> : <FaArrowTrendUp />}
            </div>
            {option === "supply" ? "Supply Analysis" : "Demand Analysis"}
          </h5>
          {viewMode === "catchment" ? (
            lat && lng && (
              <span
                style={{
                  fontSize: "11px",
                  background: option === "supply"
                    ? (isDark ? "rgba(6,182,212,0.15)" : "rgba(8,145,178,0.08)")
                    : (isDark ? "rgba(245,158,11,0.15)" : "rgba(217,119,6,0.08)"),
                  color: option === "supply" ? (isDark ? "#67e8f9" : "#0891b2") : (isDark ? "#fde047" : "#d97706"),
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
                background: option === "supply"
                  ? (isDark ? "rgba(6,182,212,0.15)" : "rgba(8,145,178,0.08)")
                  : (isDark ? "rgba(245,158,11,0.15)" : "rgba(217,119,6,0.08)"),
                color: option === "supply" ? (isDark ? "#67e8f9" : "#0891b2") : (isDark ? "#fde047" : "#d97706"),
                padding: "3px 10px",
                borderRadius: 20,
                fontWeight: 600,
              }}
            >
              🏢 {selectedProject}
            </span>
          ) : (
            (currentCity || currentVillage) && (
              <span
                style={{
                  fontSize: "11px",
                  background: option === "supply"
                    ? (isDark ? "rgba(6,182,212,0.15)" : "rgba(8,145,178,0.08)")
                    : (isDark ? "rgba(245,158,11,0.15)" : "rgba(217,119,6,0.08)"),
                  color: option === "supply" ? (isDark ? "#67e8f9" : "#0891b2") : (isDark ? "#fde047" : "#d97706"),
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontWeight: 600,
                }}
              >
                📍 {currentVillage}{currentCity ? `, ${currentCity}` : ""}
              </span>
            )
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body px-3 py-3">
        {option === "supply" ? (
          <div
            className="d-flex flex-column align-items-center justify-content-center"
            style={{ minHeight: 300 }}
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-circle mb-3"
              style={{
                width: 60,
                height: 60,
                background: isDark ? "rgba(6,182,212,0.15)" : "rgba(8,145,178,0.08)",
                color: isDark ? "#22d3ee" : "#0891b2",
                fontSize: 24,
              }}
            >
              🚧
            </div>
            <h6 className="fw-bold mb-1" style={{ color: textColor }}>
              Feature in Progress
            </h6>
            <p
              className="text-center mb-0 px-3"
              style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: "12px", maxWidth: 300 }}
            >
              Supply Analysis metrics and visual charts are currently under development and will be available soon.
            </p>
          </div>
        ) : (
          <>
            {/* Loading State */}
            {loading && (
              <div
                className="d-flex flex-column align-items-center justify-content-center"
                style={{ minHeight: 300 }}
              >
                <div
                  className="spinner-border mb-3"
                  style={{
                    color: isDark ? "#fbbf24" : "#d97706",
                    width: 36,
                    height: 36,
                  }}
                  role="status"
                />
                <p style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: "13px" }}>
                  Fetching data...
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
            {!loading && !error && !hasData && (
              <div
                className="d-flex flex-column align-items-center justify-content-center"
                style={{ minHeight: 300 }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{
                    width: 72,
                    height: 72,
                    background: isDark ? "rgba(245,158,11,0.12)" : "rgba(217,119,6,0.07)",
                    color: isDark ? "#fbbf24" : "#d97706",
                  }}
                >
                  <FaChartBar size={30} />
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
                  {currentVillage
                    ? `No transactional data found for "${currentVillage}".`
                    : "Set a location in the Market Analysis section to load data."}
                </p>
              </div>
            )}

            {/* Chart */}
            {!loading && !error && hasData && (
              <div style={{ overflow: "auto", maxHeight: "80vh" }}>
                <Chart
                  options={chartOptionsDemand}
                  series={[{ name: "Units Sold", data: demandUnits }]}
                  type="bar"
                  height={350}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SupplyDemandAnalysis;
