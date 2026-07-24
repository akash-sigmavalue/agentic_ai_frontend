import { apiUrl } from "@/lib/api-client";
import React, { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { FaChartBar } from "react-icons/fa";


/**
 * PricerateAnalysis
 *
 * Reads city + villageName from localStorage['Market Analysis Payload']
 * and fetches year-on-year weighted average rate per sqft from
 * POST /new_rate_simulator/simulator/yoy-weighted-rate/
 *
 * localStorage payload shape:
 *   { villageName: "Al-Aweer", villageId: 119, city: "Dubai" }
 *
 * Mapping:
 *   city       ΓåÆ city_name (SQL WHERE)
 *   villageName ΓåÆ location_name (SQL WHERE)
 */

const formatRate = (val, city) => {
  const c = String(city || "").toLowerCase();
  const isDubai = c.includes("dubai") || c.includes("uae");
  const symbol = isDubai ? "AED " : "₹";
  if (val === null || val === undefined || isNaN(val)) return `${symbol}0`;
  const locale = isDubai ? "en-US" : "en-IN";
  return `${symbol}${Math.round(Number(val)).toLocaleString(locale)}`;
};

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

const PricerateAnalysis = () => {
  const theme = "light";

  const [city, setCity] = useState("");
  const [villageName, setVillageName] = useState("");
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Read from localStorage on mount and listen for updates
  useEffect(() => {
    const { city: c, villageName: v } = getMarketPayload();
    setCity(c);
    setVillageName(v);

    const handleUpdate = (e) => {
      const payload = e.detail || getMarketPayload();
      setCity(payload.city || "");
      setVillageName(payload.villageName || "");
    };

    const handleLandDetailsUpdate = () => {
      const payload = getMarketPayload();
      setCity(payload.city || "");
      setVillageName(payload.villageName || "");
    };

    window.addEventListener("marketAnalysisUpdated", handleUpdate);
    window.addEventListener("landDetailsUpdated", handleLandDetailsUpdate);

    return () => {
      window.removeEventListener("marketAnalysisUpdated", handleUpdate);
      window.removeEventListener("landDetailsUpdated", handleLandDetailsUpdate);
    };
  }, []);

  // Fetch YoY data whenever city or villageName changes
  useEffect(() => {
    if (!city || !villageName) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setChartData([]);

      try {
        const response = await fetch(
          apiUrl("/new_rate_simulator/simulator/yoy-weighted-rate/"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              city_name: city,
              location_name: villageName,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const json = await response.json();

        if (!json.success) {
          throw new Error(json.error || "Failed to fetch data");
        }

        setChartData(json.data || []);
      } catch (err) {
        setError(err.message || "An error occurred while fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [city, villageName]);

  const years = useMemo(() => {
    const allYears = chartData.map((d) => d.year);
    return Array.from(new Set(allYears)).sort((a, b) => a - b).map(String);
  }, [chartData]);

  const propertyTypes = useMemo(() => {
    const allTypes = chartData.map((d) => d.property_type);
    return Array.from(new Set(allTypes)).filter(Boolean).sort();
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
          {(city || villageName) && (
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
              {villageName}{city ? `, ${city}` : ""}
            </span>
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
