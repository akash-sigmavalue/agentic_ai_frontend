import React, { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { FaWarehouse, FaArrowTrendUp } from "react-icons/fa6";
import {
  fetchLocationDetails,
  formatArea1,
  formatNumber,
} from "@/components/AppUtils";
import { useGlobalState } from "@/components/GlobalContext"; // <-- added

const SupplyDemandAnalysis = ({ option }) => {
  const [rowsYOY, setRowsYOY] = useState([]);
  const [rowsQOQ, setRowsQOQ] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMode, setSelectedMode] = useState("YOY");
  const [selectedYear, setSelectedYear] = useState("all");
  const [activeTab, setActiveTab] = useState("flat");
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [village, setVillage] = useState(JSON.parse(localStorage.getItem("landDetailsForm"))?.village || "");
  const [city, setCity] = useState(JSON.parse(localStorage.getItem("landDetailsForm"))?.location || "");
  const [gstate] = useGlobalState(); // <-- added
  const theme = gstate?.theme || "light"; // <-- added

  useEffect(() => {
    if (JSON.parse(localStorage.getItem("landDetailsForm"))) {
      setVillage(JSON.parse(localStorage.getItem("landDetailsForm"))?.village);
      setCity(JSON.parse(localStorage.getItem("landDetailsForm"))?.location);
    }
  }, [localStorage.getItem("landDetailsForm")]);

  // State for storing the backend response directly
  const [apiData, setApiData] = useState({});

  useEffect(() => {
    const load = async () => {
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
        
        // Supply maps to /supply-analysis/
        // Demand maps to /chart/agreement-price/ (which provides transaction counts by category)
        const endpoint = option === "supply" 
            ? '/new_rate_simulator/simulator/supply-analysis/' 
            : '/new_rate_simulator/simulator/chart/agreement-price/';

        const response = await fetch(endpoint, {
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
      load();
    }
  }, [city, village, selectedMode, selectedYear, option]);

  const titleGraph2 = selectedMode === "YOY" ? "Annual Unit Supply Analysis" : "Quarterly Unit Supply Analysis";
  const titleGraph4 = selectedMode === "YOY" ? "Yearly Trend of Units Absorbed [Primary+Secondary]" : "Quarterly Trend of Units Absorbed [Primary+Secondary]";

  // Extract categories (periods)
  let allPeriods = new Set();
  if (option === "demand") {
      Object.values(apiData).forEach(catData => {
          if (Array.isArray(catData)) {
              catData.forEach(item => allPeriods.add(item.period));
          }
      });
  } else {
      Object.keys(apiData).forEach(p => allPeriods.add(p));
  }

  const timeCategories = Array.from(allPeriods).sort((a, b) => {
      if (selectedMode === "YOY") {
          return Number(a) - Number(b);
      } else {
          try {
            const [qA, yA] = String(a).split(' ');
            const [qB, yB] = String(b).split(' ');
            const valA = Number(yA) * 10 + Number(qA.replace('Q', ''));
            const valB = Number(yB) * 10 + Number(qB.replace('Q', ''));
            return valA - valB;
          } catch(e) { return 0; }
      }
  });

  const filteredData = timeCategories.length > 0 ? timeCategories : [];
  
  // Need to structure graph data
  const getSeriesData = () => {
      const keys = [
          { backendDemandKey: 'residential', backendSupplyKey: 'residential', name: "Flat" },
          { backendDemandKey: 'shop', backendSupplyKey: 'shop', name: "Shop" },
          { backendDemandKey: 'office', backendSupplyKey: 'office', name: "Office" }
      ];
      
      return keys.map((col) => ({
        name: col.name,
        data: timeCategories.map((cat) => {
          if (option === "demand") {
              const catData = apiData[col.backendDemandKey];
              if (!catData || !Array.isArray(catData)) return 0;
              const periodMatch = catData.find(item => item.period === cat);
              return periodMatch ? Math.round(Number(periodMatch.transaction_count || 0)) : 0;
          } else {
              const periodData = apiData[cat];
              if (!periodData) return 0;
              // If backend supplies 'commercial', we allocate it to Shop (or we can just allocate to 'Commercial')
              // To avoid double counting, we'll put all commercial into Shop and 0 into Office.
              if (col.backendSupplyKey === 'shop') {
                  return Math.round(Number(periodData['commercial'] || periodData['shop'] || 0));
              }
              if (col.backendSupplyKey === 'office') {
                  return Math.round(Number(periodData['office'] || 0));
              }
              return Math.round(Number(periodData[col.backendSupplyKey] || 0));
          }
        }),
      }));
  };

  const rawSeries = getSeriesData();

  const aggregatedSeries = [{
      name: "All Properties",
      data: rawSeries[0]?.data.map((_, idx) =>
          rawSeries.reduce((sum, s) => sum + s.data[idx], 0)
      ) || [],
  }];

  let targetSeries = rawSeries;
  if (selectedProperty === "all") {
      targetSeries = aggregatedSeries;
  } else if (selectedProperty === "commercial") {
      // Sum Shop and Office if "commercial" is specifically asked for
      targetSeries = [{
          name: "Commercial (Shop+Office)",
          data: rawSeries[0]?.data.map((_, idx) =>
              rawSeries.filter(s => s.name === "Shop" || s.name === "Office")
                       .reduce((sum, s) => sum + s.data[idx], 0)
          ) || [],
      }];
  } else if (selectedProperty === "flat") {
      targetSeries = rawSeries.filter(s => s.name === "Flat");
  }

  const chartOptions = useMemo(() => {
    // Common options for both supply and demand charts
    const baseCommonOptions = {
      chart: {
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
        categories: timeCategories,
        title: { text: selectedMode === "YOY" ? "Year" : "Quarter" },
        labels: {
          style: { colors: theme === "dark" ? "#fff" : "#000" },
        },
      },
      dataLabels: {
        enabled: true,
        offsetY: -20,
        style: {
          fontSize: "12px",
          colors: [theme === "dark" ? "#fff" : "#000"],
        },
        formatter: (val) => formatNumber(val),
      },
      stroke: { curve: "smooth" },
      plotOptions: {
        bar: {
          dataLabels: {
            position: "top",
          },
        },
      },
      legend: {
        labels: { colors: theme === "dark" ? "#fff" : "#000" },
      },
      tooltip: {
        theme: theme === "dark" ? "dark" : "light",
      },
      theme: { mode: theme === "dark" ? "dark" : "light" },
    };

    // Supply chart options
    const supplyOptions = {
      ...baseCommonOptions,
      chart: { ...baseCommonOptions.chart, type: "bar" },
      title: {
        text: titleGraph2,
        style: { color: theme === "dark" ? "#fff" : "#000" },
      },
      yaxis: {
        labels: {
          formatter: formatNumber,
          style: { colors: theme === "dark" ? "#fff" : "#000" },
        },
      },
      tooltip: {
        ...baseCommonOptions.tooltip,
        y: { formatter: formatNumber },
      },
    };

    // Demand chart options
    const demandOptions = {
      ...baseCommonOptions,
      chart: { ...baseCommonOptions.chart, type: "bar" },
      title: {
        text: titleGraph4,
        style: { color: theme === "dark" ? "#fff" : "#000" },
      },
      yaxis: {
        labels: {
          formatter: formatNumber,
          style: { colors: theme === "dark" ? "#fff" : "#000" },
        },
      },
      tooltip: {
        ...baseCommonOptions.tooltip,
        y: { formatter: formatNumber },
      },
    };

    return { supplyOptions, demandOptions };
  }, [
    theme,
    selectedMode,
    timeCategories,
    titleGraph2,
    titleGraph4,
    formatNumber,
  ]);

  /* ───────── Render ───────── */
  return (
    <div className="card border-0 shadow-sm rounded-4 card-hover-lift h-100">
      <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
        <h5 className={`fw-bold ${theme === "dark" ? "text-white" : "text-dark"} mb-3`}>
          <div className="d-flex align-items-center">
            <div
              className={`${
                option === "supply"
                  ? "bg-info bg-opacity-10 text-info"
                  : "bg-warning bg-opacity-10 text-warning"
              } rounded-circle me-3 d-flex align-items-center justify-content-center`}
              style={{ width: "40px", height: "40px" }}
            >
              {option === "supply" ? <FaWarehouse /> : <FaArrowTrendUp />}
            </div>
            {option === "supply" ? "Supply Analysis" : "Demand Analysis"}
          </div>
        </h5>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {loading && <p className="text-center text-secondary">Loading...</p>}
          {error && <p className="text-center text-danger">{error}</p>}
          {filteredData.length === 0 && !loading && !error && (
            <p className="text-center text-secondary">
              No Data Available for {village}
            </p>
          )}
          {!loading && !error && filteredData.length > 0 && (
            <>
              <div
                style={{
                  overflow: "auto",
                  maxHeight: "90vh",
                  display: "grid",
                  gap: "20px",
                  margin: "auto",
                }}
              >
                {option === "supply" ? (
                  <div>
                    <Chart
                      options={chartOptions.supplyOptions}
                      series={targetSeries}
                      type="bar"
                      height={350}
                    />
                  </div>
                ) : (
                  <div>
                    <Chart
                      options={chartOptions.demandOptions}
                      series={targetSeries}
                      type="bar"
                      height={350}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplyDemandAnalysis;