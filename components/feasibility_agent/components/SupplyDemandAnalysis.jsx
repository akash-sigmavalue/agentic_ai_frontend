import { apiUrl } from "@/lib/api-client";
import React, { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { FaWarehouse, FaArrowTrendUp } from "react-icons/fa6";


const getMarketPayload = () => {
  try {
    const raw = localStorage.getItem("Market Analysis Payload");
    if (!raw) return { city: "", villageName: "" };
    const parsed = JSON.parse(raw);
    return {
      city: parsed.city || "",
      villageName: parsed.villageName || "",
    };
  } catch {
    return { city: "", villageName: "" };
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

const SupplyDemandAnalysis = ({ option }) => {
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

  // Sync state from landDetailsForm on mount/change for Supply
  useEffect(() => {
    const handleLandFormSync = () => {
      try {
        const landForm = JSON.parse(localStorage.getItem("landDetailsForm"));
        if (landForm) {
          setVillage(landForm.village || "");
          setCity(landForm.location || "");
        }
      } catch (e) {
        console.error(e);
      }
    };

    handleLandFormSync();

    window.addEventListener("landDetailsUpdated", handleLandFormSync);
    return () => {
      window.removeEventListener("landDetailsUpdated", handleLandFormSync);
    };
  }, []);

  // Sync state from Market Analysis Payload on mount/change for Demand
  useEffect(() => {
    if (option !== "demand") return;

    const handleMarketPayloadSync = (e) => {
      const payload = e.detail || getMarketPayload();
      setDemandCity(payload.city || "");
      setDemandVillageName(payload.villageName || "");
    };

    const handleLandDetailsUpdate = () => {
      const payload = getMarketPayload();
      setDemandCity(payload.city || "");
      setDemandVillageName(payload.villageName || "");
    };

    const { city: c, villageName: v } = getMarketPayload();
    setDemandCity(c);
    setDemandVillageName(v);

    window.addEventListener("marketAnalysisUpdated", handleMarketPayloadSync);
    window.addEventListener("landDetailsUpdated", handleLandDetailsUpdate);

    return () => {
      window.removeEventListener("marketAnalysisUpdated", handleMarketPayloadSync);
      window.removeEventListener("landDetailsUpdated", handleLandDetailsUpdate);
    };
  }, [option]);

  // Load Demand data
  useEffect(() => {
    if (option !== "demand" || !demandCity || !demandVillageName) return;

    const loadDemand = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(apiUrl("/new_rate_simulator/simulator/yoy-demand/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            city_name: demandCity,
            location_name: demandVillageName,
          }),
        });

        if (!response.ok) throw new Error("Failed to fetch demand data");
        const data = await response.json();

        if (data && data.success) {
          setDemandData(data.data || []);
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
  }, [demandCity, demandVillageName, option]);

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
          {(currentCity || currentVillage) && (
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
              {currentVillage}{currentCity ? `, ${currentCity}` : ""}
            </span>
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
                <div style={{ fontSize: 40, marginBottom: 12 }}>≡ƒôè</div>
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
