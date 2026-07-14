import { useEffect, useMemo, useState } from "react";
import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
import { MapContainer, TileLayer, Circle, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { get_data, refreshToken } from "@/components/AppUtils";
import {
  FaArrowLeft,
  FaBolt,
  FaMapMarkerAlt,
  FaRulerCombined,
  FaDatabase,
  FaSlidersH,
  FaSearch,
  FaChartLine,
  FaFileAlt,
  FaSitemap,          // replaces "fa-project-diagram"
  FaCalendarAlt,
  FaSave,
  FaTable
} from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

if (typeof window !== "undefined" && L?.Icon?.Default) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}

const TAB_KEYS = {
  MAP: "map",
  TABLE: "table",
  PROJECTION: "projection",
};

const DEFAULT_FORM_STATE = {
  subjectName: "Subject project",
  subjectLat: "18.623724862994372",
  subjectLng: "73.72456598545715",
  radiusKm: "3",
  totalUnits: "100",
  startDate: "",
  endDate: "",
};

const CHART_COLORS = [
  { border: "#0d6efd", background: "rgba(13,110,253,0.15)" },
  { border: "#ff6b6b", background: "rgba(255,107,107,0.2)" },
  { border: "#20c997", background: "rgba(32,201,151,0.2)" },
  { border: "#fd7e14", background: "rgba(253,126,20,0.2)" },
  { border: "#6f42c1", background: "rgba(111,66,193,0.2)" },
];

const SCENARIO_COLORS = {
  Mean: { border: "#0d6efd", background: "rgba(13,110,253,0.15)" },
  Pessimistic: { border: "#dc3545", background: "rgba(220,53,69,0.15)" },
  Optimistic: { border: "#198754", background: "rgba(25,135,84,0.15)" },
};

const SalesVelocity = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TAB_KEYS.MAP);
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE);
  const [filterResult, setFilterResult] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState("");

  const [comparisonInput, setComparisonInput] = useState("");
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState("");
 
  const [projectionResult, setProjectionResult] = useState(null);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [projectionError, setProjectionError] = useState("");

  const handleSaveProjection = () => {
    const quarterLabel =
      projectionResult?.subject_projection?.mean_sellout_quarter;

    if (!projectionResult || !quarterLabel) {
      alert("Generate a projection first to save sell-out details.");
      return;
    }

    const parseQuarterLabel = (label) => {
      if (!label || typeof label !== "string") return null;

      const trimmed = label.trim();

      // Common patterns: "Q1-2027", "Q1 2027", "2027-Q1", "2027 Q1", "2027Q1"
      const match =
        trimmed.match(/Q([1-4])\s*[- ]\s*(\d{4})/) || // Q1-2027 or Q1 2027
        trimmed.match(/(\d{4})\s*[- ]\s*Q([1-4])/) || // 2027-Q1 or 2027 Q1
        trimmed.match(/(\d{4})\s*Q([1-4])/) || // 2027Q1
        trimmed.match(/Q([1-4])(\d{4})/); // Q12027

      if (!match) return null;

      let quarter;
      let year;

      if (match[0].includes("Q") && match[0].indexOf("Q") === 0) {
        // Patterns starting with Q
        quarter = Number(match[1]);
        year = Number(match[2]);
      } else {
        // Patterns starting with year
        year = Number(match[1]);
        quarter = Number(match[2]);
      }

      if (!year || !quarter || quarter < 1 || quarter > 4) return null;

      // Map quarter to last month/day
      let month;
      let day;
      if (quarter === 1) {
        month = 2; // March (0-based)
        day = 31;
      } else if (quarter === 2) {
        month = 5; // June
        day = 30;
      } else if (quarter === 3) {
        month = 8; // September
        day = 30;
      } else {
        month = 11; // December
        day = 31;
      }

      return new Date(year, month, day);
    };

    const selloutDate = parseQuarterLabel(quarterLabel);

    if (!selloutDate || isNaN(selloutDate.getTime())) {
      alert(
        "Could not interpret the sell-out quarter label to a date. Please check the projection output."
      );
      return;
    }

    const formattedSelloutDate = selloutDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Save the Subject projection table with all columns
    const projectionTable = projectionResult.subject_projection?.table || [];
    const tableData = projectionTable.map((row) => ({
      Quarter: row.Quarter,
      "Predicted Velocity %": row["Predicted Velocity %"],
      "Predicted Units": row["Predicted Units"],
      "Cumulative Sold": row["Cumulative Sold"],
      "Remaining Units": row["Remaining Units"],
    }));

    // Save Quarter as key and Predicted Velocity % as value (separate object)
    const quarterVelocityMap = {};
    projectionTable.forEach((row) => {
      if (row.Quarter && row["Predicted Velocity %"] !== undefined) {
        quarterVelocityMap[row.Quarter] = row["Predicted Velocity %"];
      }
    });

    const payloadToSave = {
      meanSelloutQuarter: quarterLabel,
      meanSelloutDateISO: selloutDate.toISOString(),
      meanSelloutDateFormatted: formattedSelloutDate,
      savedAt: new Date().toISOString(),
      subjectName: formState.subjectName,
      totalUnits: formState.totalUnits,
      radiusKm: formState.radiusKm,
      projectionTable: tableData, // Full table with all columns
      quarterVelocityMap: quarterVelocityMap, // Quarter -> Predicted Velocity % mapping
    };

    localStorage.setItem(
      "salesVelocityProjectionSummary",
      JSON.stringify(payloadToSave)
    );

    alert("Projection sell-out details and table have been saved on this device.");
  };

  // Get default start date from Construction Timetable, depending on selected mode
  const getStartDateFromConstructionTimetable = () => {
    try {
      const savedState = localStorage.getItem("constructionTimetableState");
      if (!savedState) return "";

      const parsed = JSON.parse(savedState);
      const mode = parsed.mode;

      // If "Calculate My Construction Schedule" was selected, use auto form startDate
      if (mode === "auto" && parsed.formData && parsed.formData.startDate) {
        return parsed.formData.startDate;
      }

      // If "I Already Have the Schedule" was selected, use manual startDate
      if (parsed.manualDates && parsed.manualDates.startDate) {
        return parsed.manualDates.startDate;
      }

      return "";
    } catch (error) {
      console.error("Failed to read construction timetable state for default start date", error);
      return "";
    }
  };

  useEffect(() => {
    const savedForm = localStorage.getItem("salesVelocityForm");
    const savedResult = localStorage.getItem("salesVelocityResponse");

    // Build initial form state
    let initialForm = DEFAULT_FORM_STATE;

    if (savedForm) {
      try {
        const parsedForm = JSON.parse(savedForm);
        initialForm = {
          ...initialForm,
          ...parsedForm,
        };
      } catch {
        initialForm = DEFAULT_FORM_STATE;
      }
    }

    // If no start date saved for Sales Velocity, try to pull it from Construction Timetable
    if (!initialForm.startDate) {
      const timetableStartDate = getStartDateFromConstructionTimetable();
      if (timetableStartDate) {
        initialForm = {
          ...initialForm,
          startDate: timetableStartDate,
        };
      }
    }

    setFormState(initialForm);

    if (savedResult) {
      try {
        setFilterResult(JSON.parse(savedResult));
      } catch {
        setFilterResult(null);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("salesVelocityForm", JSON.stringify(formState));
  }, [formState]);

  useEffect(() => {
    if (filterResult) {
      localStorage.setItem(
        "salesVelocityResponse",
        JSON.stringify(filterResult)
      );
    }
  }, [filterResult]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = async (event) => {
    event.preventDefault();
    setFilterLoading(true);
    setFilterError("");
    setComparisonResult(null);

    const payload = {
      subject_name: formState.subjectName,
      subject_lat: Number(formState.subjectLat),
      subject_lng: Number(formState.subjectLng),
      radius_km: Number(formState.radiusKm),
      // Do not use dates as filters for data shortlisting
      start_date: null,
      end_date: null,
    };

    try {
      const data = await get_data(
        "/new_rate_simulator/simulator/sales-velocity/filter",
        {
          ...refreshToken(),
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (data?.error) {
        setFilterError(data.error);
        setFilterResult(null);
      } else {
        setFilterResult(data);
      }
    } catch (error) {
      console.error("SalesVelocity filter error", error);
      setFilterError("Unable to fetch sales velocity insights.");
    } finally {
      setFilterLoading(false);
    }
  };

  const handleComparisonSubmit = async (event) => {
    event.preventDefault();
    setComparisonLoading(true);
    setComparisonError("");

    const indices = comparisonInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!indices.length) {
      setComparisonError("Please enter at least one index number.");
      setComparisonLoading(false);
      return;
    }

    const payload = {
      indices,
      // Do not use dates as filters for comparison data
      start_date: null,
      end_date: null,
    };

    try {
      const data = await get_data(
        "/new_rate_simulator/simulator/sales-velocity/comparison",
        {
          ...refreshToken(),
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (data?.error) {
        setComparisonError(data.error);
        setComparisonResult(null);
      } else {
        setComparisonResult(data);
      }
    } catch (error) {
      console.error("SalesVelocity comparison error", error);
      setComparisonError("Unable to fetch comparison data.");
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleProjectionSubmit = async () => {
    if (!filterResult) {
      setProjectionError("Run the neighborhood analysis first.");
      return;
    }
    if (!formState.totalUnits) {
      setProjectionError("Enter total units in the Sales Velocity Intelligence section.");
      return;
    }

    setProjectionLoading(true);
    setProjectionError("");
    const payload = {
      subject_name: formState.subjectName,
      subject_lat: Number(formState.subjectLat),
      subject_lng: Number(formState.subjectLng),
      comparable_radius_km: Number(formState.radiusKm),
      subject_total_units: Number(formState.totalUnits),
      subject_start_date: formState.startDate || null,
      subject_end_date: formState.endDate || null,
    };

    try {
      const data = await get_data(
        "/new_rate_simulator/simulator/sales-velocity/projection",
        {
          ...refreshToken(),
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (data?.error) {
        setProjectionError(data.error);
        setProjectionResult(null);
      } else {
        setProjectionResult(data);
      }
    } catch (error) {
      console.error("SalesVelocity projection error", error);
      setProjectionError("Unable to build projections.");
    } finally {
      setProjectionLoading(false);
    }
  };

  const metrics = filterResult?.metrics || null;
  const previewRows = filterResult?.preview || [];
  const projects = filterResult?.projects || [];

  const mapCenter = useMemo(
    () => [
      Number(formState.subjectLat) || 0,
      Number(formState.subjectLng) || 0,
    ],
    [formState.subjectLat, formState.subjectLng]
  );

  const validProjects = useMemo(
    () =>
      projects.filter(
        (project) => typeof project.lat === "number" && typeof project.lng === "number"
      ),
    [projects]
  );

  const formattedIndices = useMemo(() => {
    if (!comparisonResult?.indices) return [];
    return comparisonResult.indices.map((idx) => idx.toString());
  }, [comparisonResult]);

  const comparisonCharts = useMemo(() => {
    if (!comparisonResult?.series) return [];
    return formattedIndices.map((idx, index) => {
      const series = comparisonResult.series[idx] || [];
      const palette = CHART_COLORS[index % CHART_COLORS.length];
      return {
        index: idx,
        data: {
          labels: series.map((item) => item.label),
          datasets: [
            {
              label: `Index ${idx}`,
              data: series.map((item) => item.value),
              borderColor: palette.border,
              backgroundColor: palette.background,
              tension: 0.3,
              fill: true,
            },
          ],
        },
      };
    });
  }, [comparisonResult, formattedIndices]);

  const areaVelocityChartData = useMemo(() => {
    const series = projectionResult?.area_velocity_series;
    if (!series?.length) return null;
    return {
      labels: series.map((item) => item.quarter),
      datasets: [
        {
          label: "Area velocity (%)",
          data: series.map((item) => item.velocity
        ),
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13,110,253,0.15)",
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [projectionResult]);

  const forecastChartData = useMemo(() => {
    const series = projectionResult?.forecast_series;
    if (!series?.length) return null;
    return {
      labels: series.map((item) => item.quarter),
      datasets: [
        {
          label: "Mean",
          data: series.map((item) => item.mean),
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13,110,253,0.1)",
          fill: false,
          tension: 0.3,
        },
        {
          label: "Upper bound",
          data: series.map((item) => item.upper),
          borderColor: "#198754",
          backgroundColor: "rgba(25,135,84,0.1)",
          fill: false,
          borderDash: [6, 6],
          tension: 0.3,
        },
        {
          label: "Lower bound",
          data: series.map((item) => item.lower),
          borderColor: "#dc3545",
          backgroundColor: "rgba(220,53,69,0.1)",
          fill: false,
          borderDash: [6, 6],
          tension: 0.3,
        },
      ],
    };
  }, [projectionResult]);

  const fitChartData = useMemo(() => {
    const series = projectionResult?.fit_series;
    if (!series?.length) return null;
    return {
      labels: series.map((item) => item.Quarter),
      datasets: [
        {
          label: "Observed",
          data: series.map((item) => item.Observed),
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13,110,253,0.15)",
          fill: false,
          tension: 0.3,
        },
        {
          label: "Predicted",
          data: series.map((item) => item.Predicted),
          borderColor: "#20c997",
          backgroundColor: "rgba(32,201,151,0.15)",
          fill: false,
          borderDash: [4, 4],
          tension: 0.3,
        },
      ],
    };
  }, [projectionResult]);

  const scenarioChartData = useMemo(() => {
    const data = projectionResult?.subject_projection?.scenario_chart;
    if (!data?.length) return null;
    const labels = [...new Set(data.map((item) => item.quarter))];
    const datasets = Object.keys(SCENARIO_COLORS).map((scenario) => ({
      label: scenario,
      data: labels.map((label) => {
        const match = data.find(
          (item) => item.quarter === label && item.scenario === scenario
        );
        return match ? match.value : null;
      }),
      borderColor: SCENARIO_COLORS[scenario].border,
      backgroundColor: SCENARIO_COLORS[scenario].background,
      fill: false,
      tension: 0.3,
    }));
    return { labels, datasets };
  }, [projectionResult]);

  const unitsBarData = useMemo(() => {
    const data = projectionResult?.subject_projection?.units_chart;
    if (!data?.length) return null;
    return {
      labels: data.map((item) => item.quarter),
      datasets: [
        {
          label: "Predicted units",
          data: data.map((item) => item.units),
          backgroundColor: "rgba(13,110,253,0.3)",
        },
      ],
    };
  }, [projectionResult]);

  const formatNumber = (value, digits = 0) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return "-";
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(parsed);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "-";
    }
    return `${Number(value).toFixed(2)}%`;
  };

  const formatDistance = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "-";
    }
    return `${Number(value).toFixed(2)} km`;
  };

  const renderVelocityDetails = (velocity) => {
    const yearly = Object.entries(velocity?.yearly || {}).sort(
      (a, b) => Number(a[0]) - Number(b[0])
    );
    const quarterly = Object.entries(velocity?.quarterly || {}).sort((a, b) => {
      const [qa, ya] = a[0].split("-");
      const [qb, yb] = b[0].split("-");
      const yaNum = Number(ya);
      const ybNum = Number(yb);
      if (yaNum === ybNum) {
        return Number(qa.replace("Q", "")) - Number(qb.replace("Q", ""));
      }
      return yaNum - ybNum;
    });

    if (!yearly.length && !quarterly.length) {
      return <span className="text-muted small">No recorded velocity</span>;
    }

    return (
      <div className="small">
        {yearly.length > 0 && (
          <div className="mb-1">
            <span className="fw-semibold text-primary me-2">Yearly:</span>
            {yearly.map(([year, value]) => (
              <span key={year} className="me-2">
                {year}: {value.toFixed(2)}%
              </span>
            ))}
          </div>
        )}
        {quarterly.length > 0 && (
          <div>
            <span className="fw-semibold text-primary me-2">Quarterly:</span>
            {quarterly.map(([quarter, value]) => (
              <span key={quarter} className="me-2">
                {quarter}: {value.toFixed(2)}%
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMapSection = () => (
    <>
      <div className="mb-4 rounded-3 overflow-hidden">
        {validProjects.length ? (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "460px", width: "100%", borderRadius: "0.5rem" }}
            scrollWheelZoom
            key={`${mapCenter[0]}-${mapCenter[1]}`}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={mapCenter}>
              <Popup>
                <div className="fw-semibold text-primary">
                  {formState.subjectName}
                </div>
                <div className="small mb-1">
                  {mapCenter[0].toFixed(6)}, {mapCenter[1].toFixed(6)}
                </div>
                <div className="small text-muted">
                  Radius: {formatDistance(formState.radiusKm)}
                </div>
              </Popup>
            </Marker>
            {Number(formState.radiusKm) > 0 && (
              <Circle
                center={mapCenter}
                radius={Number(formState.radiusKm) * 1000}
                pathOptions={{ color: "#0d6efd", fillOpacity: 0.08 }}
              />
            )}
            {validProjects.map((project) => (
              <Marker
                key={project.index}
                position={[project.lat, project.lng]}
              >
                <Popup>
                  <div className="fw-semibold mb-1">
                    #{project.index} · {project.project_name}
                  </div>
                  <div className="small">
                    Village: {project.igr_village || "N/A"}
                  </div>
                  <div className="small">
                    Distance: {formatDistance(project.distance_km)}
                  </div>
                  <div className="small">
                    Total units: {formatNumber(project.total_units)}
                  </div>
                  <div className="small">
                    Sold units: {formatNumber(project.sold_units)}
                  </div>
                  <hr />
                  {renderVelocityDetails(project.sales_velocity)}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="alert alert-info rounded-3 border-0 shadow-sm mb-0">
            Run the neighborhood analysis to view the interactive map.
          </div>
        )}
      </div>

      {metrics && (
        <div className="row g-4 mb-5">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-1 small">Projects in radius</p>
                    <h4 className="mb-0 text-primary fw-bold">
                      {metrics.projects_in_radius}
                    </h4>
                  </div>
                  <div className="icon-shape bg-primary bg-opacity-10 text-primary rounded-circle p-2">
                    <FaMapMarkerAlt />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-1 small">Radius applied</p>
                    <h4 className="mb-0 text-primary fw-bold">
                      {formatDistance(metrics.radius_km)}
                    </h4>
                  </div>
                  <div className="icon-shape bg-info bg-opacity-10 text-info rounded-circle p-2">
                    <FaRulerCombined />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-1 small">Dataset size</p>
                    <h4 className="mb-0 text-primary fw-bold">
                      {metrics.total_records}
                    </h4>
                  </div>
                  <div className="icon-shape bg-success bg-opacity-10 text-success rounded-circle p-2">
                    <FaDatabase />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="mb-2">
          <h5 className="fw-bold text-primary mb-4">
            Comparable project velocity
          </h5>
          <div className="row g-4">
            {projects.map((project) => (
              <div className="col-lg-6" key={project.index}>
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="mb-1 fw-bold text-primary">
                          {project.project_name}
                        </h6>
                        <small className="text-muted">
                          #{project.index} · {project.igr_village}
                        </small>
                      </div>
                      <span className="badge bg-light text-dark rounded-pill">
                        {formatDistance(project.distance_km)}
                      </span>
                    </div>
                    <div className="row text-center border rounded-3 py-3 mb-3 mx-0 bg-light-subtle">
                      <div className="col">
                        <p className="text-muted mb-1 small">IGR units</p>
                        <p className="fw-semibold mb-0">
                          {formatNumber(project.aggregated?.total_units_sum ?? 0)}
                        </p>
                      </div>
                      <div className="col">
                        <p className="text-muted mb-1 small">IGR sold</p>
                        <p className="fw-semibold mb-0">
                          {formatNumber(project.aggregated?.sold_units_sum ?? 0)}
                        </p>
                      </div>
                      <div className="col">
                        <p className="text-muted mb-1 small">Records</p>
                        <p className="fw-semibold mb-0">
                          {project.aggregated?.duplication_count ?? "-"}
                        </p>
                      </div>
                    </div>
                    <details>
                      <summary
                        className="text-primary fw-semibold"
                        style={{ cursor: "pointer" }}
                      >
                        Velocity breakdown
                      </summary>
                      <div className="mt-3">
                        {renderVelocityDetails(project.sales_velocity)}
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderComparisonSection = () => (
    <>
      {previewRows.length > 0 ? (
        <div className="table-responsive rounded-3 border bg-white shadow-sm mb-4">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light text-secondary">
              <tr>
                <th className="py-3 px-4 fw-semibold small text-uppercase" style={{ letterSpacing: "0.5px" }}>Index</th>
                <th className="py-3 px-4 fw-semibold small text-uppercase" style={{ letterSpacing: "0.5px" }}>Project</th>
                <th className="py-3 px-4 fw-semibold small text-uppercase" style={{ letterSpacing: "0.5px" }}>Village</th>
                <th className="py-3 px-4 fw-semibold small text-uppercase text-end" style={{ letterSpacing: "0.5px" }}>Total Units</th>
                <th className="py-3 px-4 fw-semibold small text-uppercase text-end" style={{ letterSpacing: "0.5px" }}>Sold Units</th>
                <th className="py-3 px-4 fw-semibold small text-uppercase text-end" style={{ letterSpacing: "0.5px" }}>Latitude</th>
                <th className="py-3 px-4 fw-semibold small text-uppercase text-end" style={{ letterSpacing: "0.5px" }}>Longitude</th>
                <th className="py-3 px-4 fw-semibold small text-uppercase text-end" style={{ letterSpacing: "0.5px" }}>Distance (km)</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row) => (
                <tr key={`${row.index}-${row.distance_km}`} className="border-bottom">
                  <td className="px-4 fw-semibold text-dark">{row.index}</td>
                  <td className="px-4">{row.project_name}</td>
                  <td className="px-4">{row.igr_village}</td>
                  <td className="px-4 text-end fw-medium text-dark">{formatNumber(row.total_units)}</td>
                  <td className="px-4 text-end fw-medium text-dark">{formatNumber(row.sold_units)}</td>
                  <td className="px-4 text-end text-muted">
                    {typeof row.lat === "number" ? row.lat.toFixed(4) : "-"}
                  </td>
                  <td className="px-4 text-end text-muted">
                    {typeof row.lng === "number" ? row.lng.toFixed(4) : "-"}
                  </td>
                  <td className="px-4 text-end fw-medium text-dark">{formatDistance(row.distance_km)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info rounded-3 border-0 shadow-sm mb-4">
          Run the analysis to view nearby projects and comparison tools.
        </div>
      )}

      {filterResult && (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-1">Velocity comparison</h5>
                <p className="text-muted small mb-0">Benchmark up to five project indices</p>
              </div>
              <div className="icon-shape bg-info bg-opacity-10 text-info rounded-circle p-2">
                <FaSlidersH />
              </div>
            </div>
          </div>
          <div className="card-body p-4">
            <form className="row g-4" onSubmit={handleComparisonSubmit}>
              <div className="col-md-9">
                <label className="form-label fw-semibold">
                  Enter Index Numbers (comma separated)
                </label>
                <input
                  type="text"
                  className="form-control rounded-3"
                  placeholder="1001, 1002, 1003"
                  value={comparisonInput}
                  onChange={(event) => setComparisonInput(event.target.value)}
                  required
                />
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button
                  type="submit"
                  className="btn btn-outline-primary rounded-pill w-100"
                  disabled={comparisonLoading}
                >
                  {comparisonLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <FaSlidersH className="me-2" />
                      Compare Velocity
                    </>
                  )}
                </button>
              </div>
            </form>
            {comparisonError && (
              <div className="alert alert-danger rounded-3 border-0 shadow-sm mt-4 mb-0">
                {comparisonError}
              </div>
            )}
            {comparisonResult?.rows?.length > 0 && (
              <>
                <div className="table-responsive rounded-3 border bg-white shadow-sm mt-4">
                  <table className="table table-bordered mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="py-3 px-4 fw-bold text-secondary text-uppercase small">Period</th>
                        {formattedIndices.map((idx) => (
                          <th key={idx} className="py-3 px-4 text-end fw-bold text-secondary text-uppercase small">
                            #{idx}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.rows.map((row) => (
                        <tr key={row.label} className="border-bottom">
                          <td className="px-4 fw-semibold text-dark">{row.label}</td>
                          {formattedIndices.map((idx) => (
                            <td
                              key={`${row.label}-${idx}`}
                              className="px-4 text-end fw-medium text-dark"
                            >
                              {formatPercentage(row.values[idx])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {comparisonCharts.length > 0 && (
                  <div className="row g-4 mt-2">
                    {comparisonCharts.map((chart) => (
                      <div className="col-lg-6" key={chart.index}>
                        <div className="card border-0 shadow-sm rounded-4 h-100">
                          <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                            <h6 className="mb-1 fw-semibold">Index {chart.index} trend</h6>
                          </div>
                          <div className="card-body p-4" style={{ height: 280 }}>
                            <Line data={chart.data} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {comparisonResult && comparisonResult.has_data === false && (
              <div className="alert alert-info rounded-3 border-0 shadow-sm mt-4 mb-0">
                No overlapping velocity periods were found for the selected indices.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  const renderProjectionSection = () => (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="fw-bold text-dark mb-1">Sales velocity projections</h5>
            <p className="text-muted small mb-0">Uses the subject inputs and total units from the Sales Velocity Intelligence section</p>
          </div>
          <button
            type="button"
            className="btn btn-primary rounded-pill"
            onClick={handleProjectionSubmit}
            disabled={projectionLoading}
          >
            {projectionLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />
                Computing...
              </>
            ) : (
              <>
                <FaChartLine className="me-2" />
                Generate projection
              </>
            )}
          </button>
        </div>
      </div>
      <div className="card-body p-4">
        {projectionError && (
          <div className="alert alert-danger rounded-3 border-0 shadow-sm mb-4">
            {projectionError}
          </div>
        )}
        {projectionResult ? (
          <div className="row g-4">
            <div className="col-12">
              <div className="row g-4 mb-4">
                <div className="col-md-3">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small">Comparable records</p>
                          <h5 className="mb-0 text-primary fw-bold">
                            {projectionResult.summary.records_in_radius}
                          </h5>
                        </div>
                        <div className="icon-shape bg-primary bg-opacity-10 text-primary rounded-circle p-2">
                          <FaFileAlt />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small">Unique projects</p>
                          <h5 className="mb-0 text-primary fw-bold">
                            {projectionResult.summary.unique_projects}
                          </h5>
                        </div>
                        <div className="icon-shape bg-info bg-opacity-10 text-info rounded-circle p-2">
                          <FaSitemap />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small">Radius (km)</p>
                          <h5 className="mb-0 text-primary fw-bold">
                            {formatDistance(projectionResult.summary.radius_km)}
                          </h5>
                        </div>
                        <div className="icon-shape bg-success bg-opacity-10 text-success rounded-circle p-2">
                          <FaRulerCombined />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small">Start quarter</p>
                          <h5 className="mb-0 text-primary fw-bold">
                            {projectionResult.summary.subject_start_quarter}
                          </h5>
                        </div>
                        <div className="icon-shape bg-warning bg-opacity-10 text-warning rounded-circle p-2">
                          <FaCalendarAlt />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {projectionResult.comparable_projects?.length > 0 && (
              <div className="col-12 mb-4">
                <h6 className="fw-bold text-primary mb-3">
                  Comparable projects (sample)
                </h6>
                <div className="table-responsive rounded-3 border bg-white shadow-sm">
                  <table className="table table-sm table-bordered mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small">Index</th>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small">Project</th>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small">Village</th>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small text-end">Total</th>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small text-end">Sold</th>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small text-end">Distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectionResult.comparable_projects.map((row) => (
                        <tr key={row.Index} className="border-bottom">
                          <td className="px-3 fw-medium text-dark">{row.Index}</td>
                          <td className="px-3">{row.Project_name__Selected}</td>
                          <td className="px-3">{row.IGR_Village}</td>
                          <td className="px-3 text-end fw-medium text-dark">{formatNumber(row.Total_Units_As_per_RERA)}</td>
                          <td className="px-3 text-end fw-medium text-dark">{formatNumber(row.Sold_Units_As_per_RERA)}</td>
                          <td className="px-3 text-end fw-medium text-dark">{formatDistance(row.distance_km)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {areaVelocityChartData && (
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                    <h6 className="mb-1 fw-semibold">Area velocity trend</h6>
                  </div>
                  <div className="card-body p-4" style={{ height: 320 }}>
                    <Line
                      data={areaVelocityChartData}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              </div>
            )}

            {forecastChartData && (
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                    <h6 className="mb-1 fw-semibold">Forecasted velocity</h6>
                  </div>
                  <div className="card-body p-4" style={{ height: 320 }}>
                    <Line
                      data={forecastChartData}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              </div>
            )}

            {fitChartData && (
              <div className="col-12">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                    <h6 className="mb-1 fw-semibold">Model fit check</h6>
                  </div>
                  <div className="card-body p-4" style={{ height: 320 }}>
                    <Line
                      data={fitChartData}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              </div>
            )}

            {scenarioChartData && (
              <div className="col-12">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                    <h6 className="mb-1 fw-semibold">Sell-out scenarios</h6>
                  </div>
                  <div className="card-body p-4" style={{ height: 320 }}>
                    <Line
                      data={scenarioChartData}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              </div>
            )}

            {unitsBarData && (
              <div className="col-12">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                    <h6 className="mb-1 fw-semibold">Quarterly units (mean)</h6>
                  </div>
                  <div className="card-body p-4" style={{ height: 280 }}>
                    <Bar
                      data={unitsBarData}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              </div>
            )}

            {projectionResult.subject_projection?.table && (
              <div className="col-12">
                <h6 className="fw-bold text-primary mb-3">
                  Subject projection table
                </h6>
                <div className="table-responsive rounded-3 border bg-white shadow-sm">
                  <table className="table table-sm table-bordered mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small">Quarter</th>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small">Predicted Velocity %</th>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small">Predicted Units</th>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small">Cumulative Sold</th>
                        <th className="py-2 px-3 fw-bold text-secondary text-uppercase small">Remaining Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectionResult.subject_projection.table.map((row) => (
                        <tr key={row.Quarter} className="border-bottom">
                          <td className="px-3 fw-medium text-dark">{row.Quarter}</td>
                          <td className="px-3 text-end fw-medium text-dark">{formatPercentage(row["Predicted Velocity %"])}</td>
                          <td className="px-3 text-end fw-medium text-dark">{formatNumber(row["Predicted Units"], 2)}</td>
                          <td className="px-3 text-end fw-medium text-dark">{formatNumber(row["Cumulative Sold"], 2)}</td>
                          <td className="px-3 text-end fw-medium text-dark">{formatNumber(row["Remaining Units"], 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="alert alert-info rounded-3 border-0 shadow-sm mt-3 mb-0">
                  Mean sell-out quarter:{" "}
                  <strong>
                    {projectionResult.subject_projection.mean_sellout_quarter}
                  </strong>{" "}
                  · Quarters to sell out:{" "}
                  <strong>
                    {projectionResult.subject_projection.mean_quarter_count}
                  </strong>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="alert alert-info rounded-3 border-0 shadow-sm mb-0">
            Click "Generate projection" to build a sell-out forecast using the current subject inputs.
          </div>
        )}
        <div className="mt-4 text-end">
          <button
            type="button"
            className="btn btn-success rounded-pill px-4"
            onClick={handleSaveProjection}
            disabled={!projectionResult}
          >
            <FaSave className="me-2" />
            Save projection
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#f3f5f9", fontFamily: "'Inter', sans-serif" }}>
      <main className="container-fluid py-5 px-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 pb-3 border-bottom border-2" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <div>
            <div className="d-flex align-items-center mb-2">
              <button className="btn btn-outline-secondary btn-sm me-3 shadow-sm rounded-pill px-3" onClick={() => navigate("/construction-timetable")}>
                <FaArrowLeft className="me-1" /> Back
              </button>
              <h1 className="display-6 fw-bold text-dark mb-0">
                <FaBolt className="text-primary me-3" />Sales Velocity Intelligence
              </h1>
            </div>
            <p className="text-secondary mb-0 ms-1 fw-medium text-dark">Compare nearby project absorption trends and forecast sell-out</p>
          </div>
        </div>

        <div className="card border-0 shadow-sm rounded-4 mb-5">
          <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
            <h5 className="fw-bold text-dark mb-1">Project Information</h5>
            <p className="text-muted small mb-0">Enter subject project details for analysis</p>
          </div>
          <div className="card-body p-4">
            <form onSubmit={handleFilterSubmit} className="row g-4">
              <div className="col-md-4">
                <label className="form-label fw-semibold">Subject project name</label>
                <input
                  type="text"
                  className="form-control rounded-3"
                  name="subjectName"
                  value={formState.subjectName}
                  onChange={handleFormChange}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  className="form-control rounded-3"
                  name="subjectLat"
                  value={formState.subjectLat}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  className="form-control rounded-3"
                  name="subjectLng"
                  value={formState.subjectLng}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Radius (km)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="form-control rounded-3"
                  name="radiusKm"
                  value={formState.radiusKm}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Total units</label>
                <input
                  type="number"
                  min="1"
                  className="form-control rounded-3"
                  name="totalUnits"
                  value={formState.totalUnits}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Start date</label>
                <input
                  type="date"
                  className="form-control rounded-3"
                  name="startDate"
                  value={formState.startDate}
                  onChange={handleFormChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">End date</label>
                <input
                  type="date"
                  className="form-control rounded-3"
                  name="endDate"
                  value={formState.endDate}
                  onChange={handleFormChange}
                />
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button
                  type="submit"
                  className="btn btn-primary rounded-pill px-4 w-100 d-flex align-items-center justify-content-center"
                  disabled={filterLoading}
                >
                  {filterLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <FaSearch className="me-2" />
                      Analyze
                    </>
                  )}
                </button>
              </div>
              {filterError && (
                <div className="col-12">
                  <div className="alert alert-danger rounded-3 border-0 shadow-sm mb-0">
                    {filterError}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        <ul className="nav nav-tabs mb-4">
          {Object.entries(TAB_KEYS).map(([label, key]) => (
            <li className="nav-item" key={key}>
              <button
                className={`nav-link rounded-0 ${
                  activeTab === key ? "active fw-semibold border-bottom border-3 border-primary" : ""
                }`}
                onClick={() => setActiveTab(key)}
              >
                {label === "MAP"
                  ? "Map & Nearby Projects"
                  : label === "TABLE"
                  ? "Data & Comparison"
                  : "Projections"}
              </button>
            </li>
          ))}
        </ul>

        <div className="border rounded-4 p-4 bg-white shadow-sm">
          {activeTab === TAB_KEYS.MAP && renderMapSection()}
          {activeTab === TAB_KEYS.TABLE && renderComparisonSection()}
          {activeTab === TAB_KEYS.PROJECTION && renderProjectionSection()}
        </div>

        <div className="mt-5 text-center">
          <button 
            className="btn btn-primary btn-lg rounded-pill px-5 fw-semibold shadow-sm" 
            onClick={() => navigate('/construction-table')}
          >
            <i className="fa-solid fa-table me-2"></i>
            Create a construction table 
          </button>
        </div>
      </main>

      <style>{`
        .ls-1 { letter-spacing: 1px; }
        .card-hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover-lift:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
        .form-control:focus { box-shadow: none; border-color: var(--bs-primary) !important; }
        /* Scrollbar styling for tables */
        .table-responsive::-webkit-scrollbar { height: 8px; width: 8px; }
        .table-responsive::-webkit-scrollbar-track { background: #f1f1f1; }
        .table-responsive::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .table-responsive::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        
        /* Enhanced UI Styles */
        .icon-shape {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .table-hover tbody tr {
          transition: background-color 0.2s ease;
        }
        
        .table-hover tbody tr:hover {
          background-color: rgba(0,0,0,0.02);
        }
        
        .btn:hover {
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
        
        .btn:active {
          transform: translateY(0);
        }
        
        .nav-tabs .nav-link {
          color: #6c757d;
          border: none;
          padding: 12px 20px;
        }
        
        .nav-tabs .nav-link.active {
          color: #0d6efd;
          background-color: transparent;
        }
        
        .nav-tabs .nav-link:hover {
          border-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default SalesVelocity;

