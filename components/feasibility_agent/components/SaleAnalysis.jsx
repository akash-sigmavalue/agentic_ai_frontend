import React, { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { FaShoppingCart } from "react-icons/fa";
import {
  fetchLocationDetails,
  formatPrice1,
} from "@/components/AppUtils";
import { useGlobalState } from "@/components/GlobalContext"; // <-- added

const SaleAnalysis = () => {
  const [rowsYOY, setRowsYOY] = useState([]);
  const [rowsQOQ, setRowsQOQ] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMode,] = useState("YOY");
  const [selectedYear,] = useState("all");
  const [activeTab,] = useState("residential");
  const [flatShopFilter,] = useState("flat");
  const [bhkFilter,] = useState("2bhk");
  const [village, setVillage] = useState(JSON.parse(localStorage.getItem("landDetailsForm"))?.village || "");
  const [city, setCity] = useState(JSON.parse(localStorage.getItem("landDetailsForm"))?.location || "");
  const [gstate] = useGlobalState(); // <-- added
  const theme = gstate?.theme || "light"; // <-- added

  useEffect(() => {
    if (JSON.parse(localStorage.getItem("landDetailsForm"))) {
      setVillage(JSON.parse(localStorage.getItem("landDetailsForm")).village);
      setCity(JSON.parse(localStorage.getItem("landDetailsForm")).location);
    }
  }, [localStorage.getItem("landDetailsForm")]);

  // State for storing the backend response directly
  const [apiData, setApiData] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const landDetails = JSON.parse(localStorage.getItem("landDetailsForm"));
        const vId = landDetails?.village_id || landDetails?.villageId || "";
        
        const payload = {
          villageId: vId,
          villageName: village,
          year: selectedYear === "all" ? "All" : selectedYear,
          viewType: selectedMode === "YOY" ? "Year on Year" : "Quarter on Quarter",
          analysisView: "Overview",
          calculationMode: "carpet"
        };

        const response = await fetch('/new_rate_simulator/simulator/chart/agreement-price/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();
        
        if (data && data.success) {
            setApiData(data.data || {});
        } else {
            throw new Error(data.error || "Failed to fetch data");
        }
      } catch (err) {
        setError(err.message || "Error fetching data");
      } finally {
        setLoading(false);
      }
    };
    if (city && village) {
      loadData();
    }
  }, [city, village, selectedMode, selectedYear]);

  // Extract all unique periods across all categories
  const allPeriods = new Set();
  Object.values(apiData).forEach(catData => {
      if (Array.isArray(catData)) {
          catData.forEach(item => allPeriods.add(item.period));
      }
  });

  const commonCategories = Array.from(allPeriods).sort((a, b) => {
      if (selectedMode === "YOY") {
          return Number(a) - Number(b);
      } else {
          try {
            const [qA, yA] = a.split(' ');
            const [qB, yB] = b.split(' ');
            const valA = Number(yA) * 10 + Number(qA.replace('Q', ''));
            const valB = Number(yB) * 10 + Number(qB.replace('Q', ''));
            return valA - valB;
          } catch(e) { return 0; }
      }
  });

  const filteredData = commonCategories.length > 0 ? commonCategories : [];

  const getSeriesData = (metricKey) => {
      const resData = commonCategories.map((cat) => {
          const catData = apiData['residential'];
          if (!catData || !Array.isArray(catData)) return 0;
          const periodMatch = catData.find(item => item.period === cat);
          if (!periodMatch) return 0;
          return Math.round(Number(periodMatch[metricKey] || 0));
      });

      const commData = commonCategories.map((cat) => {
          let sum = 0;
          for (const key of ['shop', 'office']) {
              const catData = apiData[key];
              if (catData && Array.isArray(catData)) {
                  const periodMatch = catData.find(item => item.period === cat);
                  if (periodMatch) sum += Number(periodMatch[metricKey] || 0);
              }
          }
          return Math.round(sum);
      });

      const otherData = commonCategories.map(() => 0);

      return [
          { name: "residential", data: resData },
          { name: "commercial", data: commData },
          { name: "other", data: otherData }
      ];
  };

  // 1) Price series
  const priceSeries = getSeriesData("total_agreement_price_inr");

  // 2) Unit Sold series
  const unitSoldSeries = getSeriesData("transaction_count");

  // 3) Carpet Area Consumed series
  const carpetAreaSeries = getSeriesData("transaction_count");

  const chartOptions = useMemo(() => {
    const xaxisTitle = selectedMode === "YOY"
      ? "Year"
      : selectedYear === "all"
        ? "Quarter-Year"
        : "Quarter";

    return {
      chart: {
        type: "bar",
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false,
          },
        },
        foreColor: theme === "dark" ? "#fff" : "#000",
        background: "transparent",
      },
      xaxis: {
        categories: commonCategories,
        title: { text: xaxisTitle },
        labels: {
          style: { colors: theme === "dark" ? "#fff" : "#000" },
        },
      },
      yaxis: {
        labels: {
          formatter: formatPrice1,
          style: { colors: theme === "dark" ? "#fff" : "#000" },
        },
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth" },
      title: {
        text: "Total Agreement Price (Residential / Commercial / Other)",
        style: { color: theme === "dark" ? "#fff" : "#000" },
      },
      tooltip: {
        y: { formatter: formatPrice1 },
        theme: theme === "dark" ? "dark" : "light",
      },
      legend: {
        labels: { colors: theme === "dark" ? "#fff" : "#000" },
      },
      theme: { mode: theme === "dark" ? "dark" : "light" },
    };
  }, [theme, selectedMode, selectedYear, commonCategories, formatPrice1]);

  /* ───────── Render ───────── */
  return (
    <div className="card border-0 shadow-sm rounded-4 card-hover-lift h-100">
      <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
        <h5 className={`fw-bold ${theme === "dark" ? "text-white" : "text-dark"} mb-3`}>
          <div className="d-flex align-items-center">
            <div className="bg-success bg-opacity-10 text-success rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
               <FaShoppingCart />
            </div>
            Sales Analysis
          </div>
        </h5>
      </div>
      <div className="card-body">
        <div className="row g-3">

          {/* Loading and error messages */}
          {loading && <p className="text-center text-secondary">Loading...</p>}
          {error && <p className="text-center text-danger">{error}</p>}
          {!loading && !error && filteredData.length === 0 && (
            <p className="text-center text-secondary">No Data Available for {village}</p>
          )}

          {/* Render charts if data is present */}
          {!loading && !error && filteredData.length > 0 && (
            <div>
              {/* Residential tab */}
              {activeTab === "residential" && (
                <div
                  className={` rounded-3 p-2 ${
                    theme === "dark" ? "bg-dark" : "bg-white"
                  }`}
                  style={{ maxHeight: "80vh", overflow: "auto" }}
                >
                  <Chart
                    options={chartOptions}
                    series={priceSeries}
                    type="area"
                    height={400}
                  />
                </div>
              )}

              {/* Property Type tab */}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaleAnalysis;