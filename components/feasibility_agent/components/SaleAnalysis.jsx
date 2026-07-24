import { apiUrl } from "@/lib/api-client";
import React, { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { FaShoppingCart } from "react-icons/fa";

const formatPrice1 = (price) => {
  price = Math.floor(price);
  if (price >= 10000000) return `₹ ${Math.round(price / 10000000)} Cr`;
  if (price >= 100000) return `₹ ${Math.round(price / 100000)} lakh`;
  return `₹ ${price.toLocaleString("en-IN")}`;
};

/**
 * SaleAnalysis
 *
 * Reads city + villageName from localStorage['Market Analysis Payload']
 * and fetches year-on-year sales analysis from
 * POST /new_rate_simulator/simulator/yoy-sales-analysis/
 *
 * localStorage payload shape:
 *   { villageName: "Al-Aweer", villageId: 119, city: "Dubai" }
 *
 * Mapping:
 *   city       ΓåÆ city_name (SQL WHERE)
 *   villageName ΓåÆ location_name (SQL WHERE)
 */

const formatValueDubai = (val) => {
  const v = Math.round(val);
  if (v >= 1000000) {
    return `AED ${(v / 1000000).toFixed(1)} M`;
  } else if (v >= 1000) {
    return `AED ${(v / 1000).toFixed(1)} K`;
  }
  return `AED ${v.toLocaleString("en-US")}`;
};

const formatNumberRaw = (val, isCurrency = false, isDubai = false) => {
  if (val === null || val === undefined || isNaN(val)) {
    return isCurrency ? (isDubai ? "AED 0" : "Rs0") : "0";
  }
  if (isCurrency) {
    if (isDubai) {
      return formatValueDubai(val);
    }
    return formatPrice1(val);
  }
  const locale = isDubai ? "en-US" : "en-IN";
  return Math.round(Number(val)).toLocaleString(locale);
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

const SaleAnalysis = () => {
  const theme = "light";
  const isDark = false;

  const [city, setCity] = useState("");
  const [villageName, setVillageName] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // metric can be "value" (total_agreement_price) or "volume" (total_transactions)
  const [metric, setMetric] = useState("value");

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

  // Fetch YoY sales analysis whenever city or villageName changes
  useEffect(() => {
    if (!city || !villageName) return;

    const fetchSalesData = async () => {
      setLoading(true);
      setError(null);
      setSalesData([]);

      try {
        const response = await fetch(
          apiUrl("/new_rate_simulator/simulator/yoy-sales-analysis/"),
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

        setSalesData(json.data || []);
      } catch (err) {
        setError(err.message || "An error occurred while fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [city, villageName]);

  // Determine country/city context
  const isDubai = useMemo(() => {
    const c = String(city || "").toLowerCase();
    return c.includes("dubai") || c.includes("uae");
  }, [city]);

  // Compute unique years and property types dynamically for ApexCharts
  const years = useMemo(() => {
    const allYears = salesData.map((d) => d.year);
    return Array.from(new Set(allYears)).sort((a, b) => a - b);
  }, [salesData]);

  const propertyTypes = useMemo(() => {
    const allTypes = salesData.map((d) => d.property_type);
    return Array.from(new Set(allTypes)).filter(Boolean).sort();
  }, [salesData]);

  // Map backend data to series structure dynamically by property type
  const series = useMemo(() => {
    return propertyTypes.map((type) => {
      return {
        name: type,
        data: years.map((yr) => {
          const record = salesData.find(
            (d) => d.year === yr && d.property_type === type
          );
          if (!record) return 0;
          return metric === "value"
            ? record.total_agreement_price
            : record.total_transactions;
        }),
      };
    });
  }, [years, propertyTypes, salesData, metric]);

  const textColor = isDark ? "#e2e8f0" : "#1e293b";
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const isCurrency = metric === "value";

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        stacked: false,
        toolbar: { show: true },
        foreColor: textColor,
        background: "transparent",
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      xaxis: {
        categories: years.map(String),
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
          text: isCurrency ? (isDubai ? "Total Value (AED)" : "Total Value (₹)") : "Total Transactions",
          style: { color: textColor, fontSize: "12px", fontWeight: 600 },
        },
        labels: {
          formatter: (val) => formatNumberRaw(val, isCurrency, isDubai),
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
          formatter: (val) => formatNumberRaw(val, isCurrency, isDubai),
        },
      },
    }),
    [years, textColor, gridColor, isCurrency, isDark, isDubai]
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
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <h5
            className="fw-bold mb-0 d-flex align-items-center gap-2"
            style={{ color: textColor, fontSize: "15px" }}
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: 38,
                height: 38,
                background: isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.1)",
                color: "#22c55e",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              <FaShoppingCart />
            </div>
            Sales Analysis
          </h5>

          {/* Metric Selector Buttons */}
          <div className="d-flex align-items-center gap-2">
            <div
              className="btn-group p-0.5 rounded-3"
              style={{
                background: isDark ? "#334155" : "#f1f5f9",
                border: `1px solid ${isDark ? "#475569" : "#e2e8f0"}`,
              }}
            >
              <button
                type="button"
                className="btn btn-sm px-3 rounded-2 fw-semibold"
                onClick={() => setMetric("value")}
                style={{
                  fontSize: "11px",
                  border: "none",
                  background: metric === "value" ? (isDark ? "#475569" : "#ffffff") : "transparent",
                  color: metric === "value" ? textColor : (isDark ? "#94a3b8" : "#64748b"),
                  boxShadow: metric === "value" && !isDark ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                Value ({isDubai ? "AED" : "₹"})
              </button>
              <button
                type="button"
                className="btn btn-sm px-3 rounded-2 fw-semibold"
                onClick={() => setMetric("volume")}
                style={{
                  fontSize: "11px",
                  border: "none",
                  background: metric === "volume" ? (isDark ? "#475569" : "#ffffff") : "transparent",
                  color: metric === "volume" ? textColor : (isDark ? "#94a3b8" : "#64748b"),
                  boxShadow: metric === "volume" && !isDark ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                Volume (Txns)
              </button>
            </div>

            {(city || villageName) && (
              <span
                style={{
                  fontSize: "11px",
                  background: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.08)",
                  color: "#22c55e",
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontWeight: 600,
                }}
              >
                {villageName}{city ? `, ${city}` : ""}
              </span>
            )}
          </div>
        </div>
        <p
          className="mb-0 mt-1"
          style={{ fontSize: "12px", color: isDark ? "#94a3b8" : "#64748b" }}
        >
          {isDubai
            ? "Total Agreement Price (AED) - Property Type Wise"
            : "Total Agreement Price (₹) - Property Type Wise"}
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
              style={{ color: "#22c55e", width: 36, height: 36 }}
              role="status"
            />
            <p style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: "13px" }}>
              Fetching sales data...
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
                ? `No sales data found for "${villageName}" from 2020 onwards.`
                : "Set a location in the Market Analysis section to load sales data."}
            </p>
          </div>
        )}

        {/* Chart */}
        {!loading && !error && years.length > 0 && (
          <div style={{ overflow: "auto", maxHeight: "80vh" }}>
            <Chart
              options={chartOptions}
              series={series}
              type="area"
              height={380}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SaleAnalysis;
