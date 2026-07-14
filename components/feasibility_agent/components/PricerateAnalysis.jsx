// import React, { useEffect, useState } from "react";
// import Chart from "react-apexcharts";
// import { FaChartBar } from "react-icons/fa"; 
// import {
//   fetchLocationDetails,
//   formatPrice1,
// } from "@/components/AppUtils";
// import { useGlobalState } from "@/components/GlobalContext";



// const quarterSortValue = (q) => {
//   // e.g. "Q3-2023" => qtr="Q3", yr="2023" => numericValue = 2023*10 + 3
//   const [qtr, yr] = q.split("-");
//   return Number(yr) * 10 + Number(qtr.replace("Q", ""));
// };

// /* ───────── The Component ───────── */
// const PricerateAnalysis = () => {
//   /* State variables */
//   const [rowsYOY, setRowsYOY] = useState([]);
//   const [rowsQOQ, setRowsQOQ] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [village, setVillage] = useState(JSON.parse(localStorage.getItem("landDetailsForm"))?.village || "");
//   const [city, setCity] = useState(JSON.parse(localStorage.getItem("landDetailsForm"))?.location || "");
//   // user selections
//   const [selectedMode, setSelectedMode] = useState("YOY");
//   const [selectedTab, setSelectedTab] = useState("price");
//   const [selectedPercentile, setSelectedPercentile] = useState("weighted");
//   const [propertyFilter, setPropertyFilter] = useState("flat");
//   const [selectedYear, setSelectedYear] = useState("all");
//   const [gstate] = useGlobalState();
//   const theme = gstate?.theme || "light"

//   const validYears = [2020, 2021, 2022, 2023, 2024];

//   useEffect(() => {
//     if (JSON.parse(localStorage.getItem("landDetailsForm"))) {
//       setVillage(JSON.parse(localStorage.getItem("landDetailsForm"))?.village);
//       setCity(JSON.parse(localStorage.getItem("landDetailsForm"))?.location);
//     }

//   }, [localStorage.getItem("landDetailsForm")])



//   /* Data fetch using useEffect */
//   useEffect(() => {
//     const load = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         // Columns that we want from the backend
//         const metricCols = [
//           "final location",
//           "flat - 50th percentile rate",
//           "flat - 75th percentile rate",
//           "flat - 90th percentile rate",
//           "flat - weighted average rate",
//           "shop - 50th percentile rate",
//           "shop - 75th percentile rate",
//           "shop - 90th percentile rate",
//           "shop - weighted average rate",
//           "office - 50th percentile rate",
//           "office - 75th percentile rate",
//           "office - 90th percentile rate",
//           "office - weighted average rate",
//           "others - 50th percentile rate",
//           "others - 75th percentile rate",
//           "others - 90th percentile rate",
//           "others - weighted average rate",
//           "flat - rate range total sales",
//           "shop - rate range total sales",
//           "office - rate range total sales",
//           "others - rate range total sales",
//           "flat - rate range unit sold",
//           "shop - rate range unit sold",
//           "office - rate range unit sold",
//           "others - rate range unit sold",
//           "flat - rate range carpet area consumed in sqft",
//           "shop - rate range carpet area consumed in sqft",
//           "office - rate range carpet area consumed in sqft",
//           "others - rate range carpet area consumed in sqft",
//           "flat - agreement price range total sales",
//           "shop - agreement price range total sales",
//           "office - agreement price range total sales",
//           "others - agreement price range total sales",
//           "flat - agreement price range unit sold",
//           "shop - agreement price range unit sold",
//           "office - agreement price range unit sold",
//           "others - agreement price range unit sold",
//           "flat - agreement price range carpet area consumed in sqft",
//           "shop - agreement price range carpet area consumed in sqft",
//           "office - agreement price range carpet area consumed in sqft",
//           "others - agreement price range carpet area consumed in sqft",
//           "<1bhk - rate range total sales",
//           "1bhk - rate range total sales",
//           "1.5bhk - rate range total sales",
//           "2bhk - rate range total sales",
//           "2.25bhk - rate range total sales",
//           "2.5bhk - rate range total sales",
//           "2.75bhk - rate range total sales",
//           "3bhk - rate range total sales",
//           ">3bhk - rate range total sales",
//           "<1bhk - rate range unit sold",
//           "1bhk - rate range unit sold",
//           "1.5bhk - rate range unit sold",
//           "2bhk - rate range unit sold",
//           "2.25bhk - rate range unit sold",
//           "2.5bhk - rate range unit sold",
//           "2.75bhk - rate range unit sold",
//           "3bhk - rate range unit sold",
//           ">3bhk - rate range unit sold",
//           "<1bhk - rate range carpet area consumed in sqft",
//           "1bhk - rate range carpet area consumed in sqft",
//           "1.5bhk - rate range carpet area consumed in sqft",
//           "2bhk - rate range carpet area consumed in sqft",
//           "2.25bhk - rate range carpet area consumed in sqft",
//           "2.5bhk - rate range carpet area consumed in sqft",
//           "2.75bhk - rate range carpet area consumed in sqft",
//           "3bhk - rate range carpet area consumed in sqft",
//           ">3bhk - rate range carpet area consumed in sqft",
//           "<1bhk - agreement price range total sales",
//           "1bhk - agreement price range total sales",
//           "1.5bhk - agreement price range total sales",
//           "2bhk - agreement price range total sales",
//           "2.25bhk - agreement price range total sales",
//           "2.5bhk - agreement price range total sales",
//           "2.75bhk - agreement price range total sales",
//           "3bhk - agreement price range total sales",
//           ">3bhk - agreement price range total sales",
//           "<1bhk - agreement price range unit sold",
//           "1bhk - agreement price range unit sold",
//           "1.5bhk - agreement price range unit sold",
//           "2bhk - agreement price range unit sold",
//           "2.25bhk - agreement price range unit sold",
//           "2.5bhk - agreement price range unit sold",
//           "2.75bhk - agreement price range unit sold",
//           "3bhk - agreement price range unit sold",
//           ">3bhk - agreement price range unit sold",
//           "<1bhk - agreement price range carpet area consumed in sqft",
//           "1bhk - agreement price range carpet area consumed in sqft",
//           "1.5bhk - agreement price range carpet area consumed in sqft",
//           "2bhk - agreement price range carpet area consumed in sqft",
//           "2.25bhk - agreement price range carpet area consumed in sqft",
//           "2.5bhk - agreement price range carpet area consumed in sqft",
//           "2.75bhk - agreement price range carpet area consumed in sqft",
//           "3bhk - agreement price range carpet area consumed in sqft",
//           ">3bhk - agreement price range carpet area consumed in sqft",
//         ];

//         const yoyCols = ["year", ...metricCols];
//         const qoqCols = ["quarter", ...metricCols];

//         const [yoyRes, qoqRes] = await Promise.all([
//           fetchLocationDetails(city, "Location_YOY", yoyCols),
//           fetchLocationDetails(city, "Location_QOQ", qoqCols),
//         ]);

//         setRowsYOY(yoyRes.data);
//         setRowsQOQ(qoqRes.data);
//       } catch (err) {
//         setError(err.message || "Error fetching data");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (city) {
//       load();
//     }
//   }, [city, village]);

//   /* Filter out data for the selected village & year */
//   const allSupplyDemandData = selectedMode === "YOY" ? rowsYOY : rowsQOQ;

//   // only rows that match the user-specified 'village'
//   const villageData = allSupplyDemandData.filter(
//     (r) =>
//       village &&
//       (r["final location"] || "").toLowerCase() === village.toLowerCase()
//   );

//   // further filter by year (or quarter's year)
//   const filteredData = villageData.filter((r) => {
//     if (selectedMode === "YOY") {
//       const yr = Number(r.year);
//       if (!validYears.includes(yr)) return false;
//       if (selectedYear !== "all" && String(yr) !== selectedYear) return false;
//       return true;
//     } else {
//       // QOQ mode
//       const yr = Number((r.quarter || "").split("-")[1]);
//       if (!validYears.includes(yr)) return false;
//       if (selectedYear !== "all" && String(yr) !== selectedYear) return false;
//       return true;
//     }
//   });

//   // X-axis categories for the line/bar chart in "price" tab only
//   const categories =
//     selectedMode === "YOY"
//       ? [...new Set(filteredData.map((r) => r.year))].sort(
//         (a, b) => Number(a) - Number(b)
//       )
//       : [...new Set(filteredData.map((r) => r.quarter))].sort(
//         (a, b) => quarterSortValue(a) - quarterSortValue(b)
//       );

//   /* Rate (or Price) Trend Series for the "Price Analysis" tab */
//   const percentileSuffix =
//     selectedPercentile === "weighted"
//       ? "weighted average rate"
//       : `${selectedPercentile}th percentile rate`;

//   // we build 4 sub-series => Flat, Shop, Office, Others
//   const graph01Raw = [
//     { key: `flat - ${percentileSuffix}`, name: "Flat" },
//     { key: `shop - ${percentileSuffix}`, name: "Shop" },
//     { key: `office - ${percentileSuffix}`, name: "Office" },
//     { key: `others - ${percentileSuffix}`, name: "Others" },
//   ].map((col) => ({
//     name: col.name,
//     data: categories.map((cat) => {
//       const rec = filteredData.find(
//         (d) => (selectedMode === "YOY" ? d.year : d.quarter) === cat
//       );
//       return Math.round(Number(rec ? rec[col.key] : 0) || 0);
//     }),
//   }));

//   // aggregated "ALL" property type
//   const aggregatedGraph01 = {
//     name: "All",
//     data: graph01Raw[0].data.map((_, idx) =>
//       graph01Raw.reduce((sum, s) => sum + s.data[idx], 0)
//     ),
//   };

//   // if user picks propertyFilter="all", we show a single "All" series; else just e.g. "Flat"
//   const filteredGraph01 =
//     propertyFilter === "all"
//       ? [aggregatedGraph01]
//       : graph01Raw.filter((s) => s.name.toLowerCase() === propertyFilter);



//   /* Chart options */
//   const commonOptions = {
//     chart: { toolbar: { show: true } },
//     dataLabels: { enabled: false },
//     stroke: { curve: "smooth" },
//     legend: { position: "top" },
//   };

//   // For the "Price Analysis" chart
//   const optionsGraph01 = {
//     ...commonOptions,
//     chart: {
//       ...commonOptions.chart,
//       type: "bar",
//     },
//     title: { text: "Rate Trend Analysis" },
//     xaxis: {
//       categories,
//       title: { text: selectedMode === "YOY" ? "Year" : "Quarter" },
//     },
//     yaxis: {
//       title: { text: "Rate (₹)" },
//       labels: { formatter: formatPrice1 },
//     },
//     tooltip: { y: { formatter: formatPrice1 } },
//   };



//   /* ───────── Render ───────── */
//   return (
//     <div className="card border-0 shadow-sm rounded-4 card-hover-lift h-100">
//       <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
//         <h5 className={`fw-bold ${theme =="dark"? "text-white":"text-dark"} mb-3`}>
//           <div className="d-flex align-items-center">
//             <div className="bg-primary bg-opacity-10 text-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
//               <FaChartBar />
//             </div>
//             Weighted Average Rate
//           </div>
//         </h5>
//       </div>
//       <div className="card-body">
//         <div className="row g-3">
//           {/* Status messages */}
//           {loading && <p className="text-center text-secondary">Loading...</p>}
//           {error && <p className="text-center text-danger">{error}</p>}
//           {!loading && !error && filteredData.length === 0 && (
//             <p className="text-center text-secondary">No Data Available for {village}</p>
//           )}

//           {/* Actual charts */}
//           {!loading && !error && filteredData.length > 0 && (
//             <>
//               {/* Price Analysis Tab */}
//               {selectedTab === "price" && (
//                 <div
//                 className="border border-success" style={{ maxHeight: "80vh", overflow: "auto" ,color : theme=="dark"? "#fff":"#000000"}}>
//                   <Chart
//                     options={optionsGraph01}
//                     series={filteredGraph01}
//                     type="bar"
//                     height={400}
//                   />

//                 </div>
//               )}

//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PricerateAnalysis;



import React, { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { FaChartBar } from "react-icons/fa";
import {
  fetchLocationDetails,
  formatPrice1,
} from "@/components/AppUtils";
import { useGlobalState } from "@/components/GlobalContext";

const quarterSortValue = (q) => {
  const [qtr, yr] = q.split("-");
  return Number(yr) * 10 + Number(qtr.replace("Q", ""));
};

const PricerateAnalysis = () => {
  const [rowsYOY, setRowsYOY] = useState([]);
  const [rowsQOQ, setRowsQOQ] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [village, setVillage] = useState(
    JSON.parse(localStorage.getItem("landDetailsForm"))?.village || ""
  );
  const [city, setCity] = useState(
    JSON.parse(localStorage.getItem("landDetailsForm"))?.location || ""
  );
  const [selectedMode, setSelectedMode] = useState("YOY");
  const [selectedTab, setSelectedTab] = useState("price");
  const [selectedPercentile, setSelectedPercentile] = useState("weighted");
  const [propertyFilter, setPropertyFilter] = useState("flat");
  const [selectedYear, setSelectedYear] = useState("all");
  const [gstate] = useGlobalState();
  const theme = gstate?.theme || "light";

  const validYears = [2020, 2021, 2022, 2023, 2024];

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
          calculationMode: "carpet" // Can be dynamic if needed
        };

        const response = await fetch('/new_rate_simulator/simulator/chart-rate/', {
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
  }, [city, village, selectedMode, selectedYear]);

  // Extract all unique periods across all categories
  const allPeriods = new Set();
  Object.values(apiData).forEach(catData => {
      if (Array.isArray(catData)) {
          catData.forEach(item => allPeriods.add(item.period));
      }
  });

  // Convert apiData to ApexCharts format
  const categories = Array.from(allPeriods).sort((a, b) => {
      if (selectedMode === "YOY") {
          return Number(a) - Number(b);
      } else {
          // Quarter format "Q1 2020"
          try {
            const [qA, yA] = a.split(' ');
            const [qB, yB] = b.split(' ');
            const valA = Number(yA) * 10 + Number(qA.replace('Q', ''));
            const valB = Number(yB) * 10 + Number(qB.replace('Q', ''));
            return valA - valB;
          } catch(e) { return 0; }
      }
  });

  const graph01Raw = [
    { key: 'residential', name: "Flat" },
    { key: 'shop', name: "Shop" },
    { key: 'office', name: "Office" }
  ].map((col) => ({
    name: col.name,
    data: categories.map((cat) => {
      const catData = apiData[col.key];
      if (!catData || !Array.isArray(catData)) return 0;
      const periodMatch = catData.find(item => item.period === cat);
      if (!periodMatch) return 0;
      return Math.round(Number(periodMatch.average_rate || 0));
    }),
  }));

  const aggregatedGraph01 = {
    name: "All",
    data: graph01Raw[0]?.data.map((_, idx) =>
      graph01Raw.reduce((sum, s) => sum + s.data[idx], 0) / graph01Raw.filter(s => s.data[idx] > 0).length || 0
    ) || [],
  };

  const filteredGraph01 = propertyFilter === "all" ? [aggregatedGraph01] : graph01Raw.filter((s) => s.name.toLowerCase() === propertyFilter);
  
  // Need to provide filteredData for the return statement (which checks filteredData.length === 0 to show "No Data")
  const filteredData = categories.length > 0 ? categories : [];

  // Dynamic chart options that respect the theme
  const chartOptions = useMemo(() => {
    return {
      chart: {
        toolbar: { show: true },
        type: "bar",
        foreColor: theme === "dark" ? "#fff" : "#000",
        background: "transparent",
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth" },
      legend: {
        position: "top",
        labels: { colors: theme === "dark" ? "#fff" : "#000" },
      },
      title: {
        text: "Rate Trend Analysis",
        style: { color: theme === "dark" ? "#fff" : "#000" },
      },
      xaxis: {
        categories,
        title: { text: selectedMode === "YOY" ? "Year" : "Quarter" },
        labels: {
          style: { colors: theme === "dark" ? "#fff" : "#000" },
        },
      },
      yaxis: {
        title: { text: "Rate (₹)" },
        labels: {
          formatter: formatPrice1,
          style: { colors: theme === "dark" ? "#fff" : "#000" },
        },
      },
      tooltip: {
        y: { formatter: formatPrice1 },
        theme: theme === "dark" ? "dark" : "light",
      },
      theme: { mode: theme === "dark" ? "dark" : "light" },
    };
  }, [theme, selectedMode, categories, formatPrice1]);

  return (
    <div className="card border-0 shadow-sm rounded-4 card-hover-lift h-100">
      <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
        <h5
          className={`fw-bold ${theme === "dark" ? "text-white" : "text-dark"} mb-3`}
        >
          <div className="d-flex align-items-center">
            <div
              className="bg-primary bg-opacity-10 text-primary rounded-circle me-3 d-flex align-items-center justify-content-center"
              style={{ width: "40px", height: "40px" }}
            >
              <FaChartBar />
            </div>
            Weighted Average Rate
          </div>
        </h5>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {loading && <p className="text-center text-secondary">Loading...</p>}
          {error && <p className="text-center text-danger">{error}</p>}
          {!loading && !error && filteredData.length === 0 && (
            <p className="text-center text-secondary">
              No Data Available for {village}
            </p>
          )}

          {!loading && !error && filteredData.length > 0 && (
            <>
              {selectedTab === "price" && (
                <div
                  className={`rounded-3 p-2 ${
                    theme === "dark" ? "bg-dark" : "bg-white"
                  }`}
                  style={{ maxHeight: "80vh", overflow: "auto" }}
                >
                  <Chart
                    options={chartOptions}
                    series={filteredGraph01}
                    type="bar"
                    height={400}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricerateAnalysis;