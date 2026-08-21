// import { useState, useEffect } from "react";
// import {
//   FaMountainCity,
//   FaHandHoldingDollar,
//   FaCompassDrafting,
//   FaEllipsis,
//   FaChartLine
// } from 'react-icons/fa6';
// import Header from "./Header";
// import LandDetailsForm from "./LandDetailsForm";
// import LandDetailsOutput from "./LandDetailsOutput";
// import FSIProposalForm from "./FSIProposalForm";
// import FSIProposalOutput from "./FSIProposalOutput";
// import RevenueForm from "./LocationForm";
// import RevenueOutput from "./LocationOutput";
// import CostForm from "./CostForm";
// import CostOutput from "./CostOutput";
// import Dashboard from "./Dashboard";
// import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
// import PricerateAnalysis from "./components/PricerateAnalysis";
// import SupplyDemandAnalysis from "./components/SupplyDemandAnalysis";
// import SaleAnalysis from "./components/SaleAnalysis";
// import AreaCalculationForm from "./AreaCalculationForm";
// import AreaCalculationResult from "./AreaCalculationResult";
// import UnitDesignStructure from "./UnitDesignStructure";
// import RequiredParking from "./RequiredParking";
// import BuildingDesign from "./BuildingDesign";
// import BuildingResults from "./BuildingResults";
// import UnitDesignResult from "./UnitDesignResult";
// import RevenueProjection2 from "./revenuep2";
// import RevSimulation from "./revsimulation";
// import Marketanalysis from "./Marketanalysis";

// const Index = () => {
//   const navigate = useNavigate();
//   const [landResults, setLandResults] = useState(null);
//   const [fsiProposalData, setFSIProposalData] = useState(null);
//   const [areaCalculationData, setAreaCalculationData] = useState(null);
//   const [revenueData, setRevenueData] = useState(null);
//   const [costData, setCostData] = useState(null);
//   const [showDashboard, setShowDashboard] = useState(false);
//   const [zoningType, setZoningType] = useState("");
//   const [location, setLocation] = useState("");
//   const [updateingUI, setUpdateUI] = useState(false);
//   const [activeSection, setActiveSection] = useState("land-fsi");
//   const [calculationMode, setCalculationMode] = useState('carpet'); // Lifted state: 'carpet' or 'saleable'

//   const sidebarButtons = [
//     { id: "land-fsi", label: "Land and FSI Details", icon: <FaMountainCity /> },
//     { id: "revenue", label: "Revenue calculation", icon: <FaHandHoldingDollar /> },
//     { id: "building", label: "Building Design", icon: <FaCompassDrafting /> },
//     { id: "others", label: "Others", icon: <FaEllipsis /> },
//     { id: "Dashboard", label: "Dashboard", icon: <FaChartLine /> },
//   ];

//   // Load saved data from localStorage on mount
//   useEffect(() => {
//     const savedLandResults = localStorage.getItem("landDetailsResults");
//     const savedZoning = localStorage.getItem("zoningType");
//     const savedLandForm = localStorage.getItem("landDetailsForm");
//     const savedFSI = localStorage.getItem("fsiProposalData");
//     const savedArea = localStorage.getItem("areaCalculationForm");
//     const savedRevenue = localStorage.getItem("revenueForm");
//     const savedCost = localStorage.getItem("costForm");

//     if (savedLandResults) setLandResults(JSON.parse(savedLandResults));
//     if (savedZoning) setZoningType(savedZoning);
//     if (savedLandForm) {
//       const landForm = JSON.parse(savedLandForm);
//       setLocation(landForm.location || "");
//     }
//     if (savedFSI) setFSIProposalData(JSON.parse(savedFSI));
//     if (savedArea) setAreaCalculationData(JSON.parse(savedArea));
//     if (savedRevenue) setRevenueData(JSON.parse(savedRevenue));
//     if (savedCost) setCostData(JSON.parse(savedCost));
//   }, []);

//   const handleLandCalculation = (results, zoning, loc) => {
//     setLandResults(results);
//     setZoningType(zoning);
//     if (loc) setLocation(loc);
//   };

//   const handleFSIProposalSave = (data) => {
//     setFSIProposalData(data);
//   };

//   const handleAreaCalculationSave = (data) => {
//     setAreaCalculationData(data);
//   };

//   const handleRevenueSave = (data) => {
//     setRevenueData(data);
//   };

//   const handleCostSave = (data) => {
//     setCostData(data);
//   };

//   const handleUnitDesignSave = () => { };

//   return (
//     <div className="min-vh-100" style={{ backgroundColor: "#f3f5f9" }}>
//       <Header />

//       <div className="dashboard-container">
//         {/* Sidebar Nav Component */}
//         <aside className="sidebar">
//           <div className="sidebar-header mb-4">
//             <h4 className="fw-bold mb-0" style={{ color: '#fff' }}>Simulator 361</h4>
//             <small className="opacity-75">"Extra Degree of Insight"</small>
//           </div>

//           <ul className="sidebar-nav">
//             {sidebarButtons.map((btn) => (
//               <li key={btn.id}>
//                 <button
//                   className={`nav-btn ${activeSection === btn.id ? "active" : ""}`}
//                   onClick={() => {
//                     if (btn.id === "Dashboard") {
//                       setShowDashboard(true);
//                     } else {
//                       setActiveSection(btn.id);
//                       document.getElementById(`section-${btn.id}`)?.scrollIntoView({ behavior: 'smooth' });
//                     }
//                   }}
//                 >
//                   {/* <i className={`fas ${btn.icon}`}></i> */}
//                   {btn.icon}
//                   {btn.label}
//                 </button>
//               </li>
//             ))}
//           </ul>

//           <div className="mt-auto pt-4">
//             <div className="bg-white bg-opacity-10 rounded-4 p-3 border border-white border-opacity-10">
//               <p className="small mb-0 opacity-75">
//                 <i className="fas fa-info-circle me-2"></i>
//                 Sidebar navigation provides quick access to simulation stages.
//               </p>
//             </div>
//           </div>
//         </aside>

//         {/* Main Content Component */}
//         <main className="content-area">
//           {/* Section 1: Land Details */}
//           <div id="section-land-fsi" className="text-center mb-5 fade-in-up">
//             <h1 className="display-5 fw-bold text-dark mb-2">
//               {/* <i className="fas fa-mountain-city me-3" style={{ color: '#448C74' }}></i> */}
//               <FaMountainCity
//                 className="me-3"  // Bootstrap-style right margin
//                 style={{ color: '#448C74' }}
//                 size={55}
//               />
//               Land And FSI Details
//             </h1>
//           </div>

//           <style>{`
//           /* Text Colors - Explicitly Defined */
//           .text-dark { color: #212529 !important; }
//           .text-secondary { color: #6c757d !important; }
//           .text-primary { color: #0d6efd !important; }
//           .text-success { color: #198754 !important; }
//           .text-warning { color: #ffc107 !important; }
//           .text-info { color: #0dcaf0 !important; }
//           .text-danger { color: #dc3545 !important; }

//           /* Form Elements */
//           .form-label { color: #212529; font-weight: 600; }
//           .form-control, .form-select { 
//             background-color: #f8f9fa; 
//             border: 1px solid transparent;
//             color: #212529;
//           }
//           .form-control:focus, .form-select:focus {
//             background-color: #fff;
//             border-color: #0d6efd;
//             color: #212529;
//             box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
//           }

//           /* Card Styling */
//           .card-header { 
//             background-color: #ffffff;
//             border-bottom: 1px solid #e9ecef;
//             color: #212529;
//           }
//           .card-title { color: #0d6efd; font-weight: 700; }

//           /* Animations */
//           .fade-in-up {
//             animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
//             opacity: 0;
//             transform: translateY(20px);
//           }
//           @keyframes fadeInUp {
//             from { opacity: 0; transform: translateY(20px); }
//             to { opacity: 1; transform: translateY(0); }
//           }

//           .stagger-1 { animation-delay: 0.1s; }
//           .stagger-2 { animation-delay: 0.2s; }
//           .stagger-3 { animation-delay: 0.3s; }
//           .stagger-4 { animation-delay: 0.4s; }
//           .stagger-5 { animation-delay: 0.5s; }
//           .stagger-6 { animation-delay: 0.6s; }
//           .stagger-7 { animation-delay: 0.7s; }

//           .card-hover-lift { 
//             transition: transform 0.2s ease, box-shadow 0.2s ease; 
//           }
//           .card-hover-lift:hover { 
//             transform: translateY(-5px); 
//             box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; 
//           }

//           .pulse-animation {
//             animation: pulse 2s infinite;
//           }
//           @keyframes pulse {
//             0% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.4); }
//             70% { box-shadow: 0 0 0 10px rgba(13, 110, 253, 0); }
//             100% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0); }
//           }

//           /* Global Dashboard Container */
//           .dashboard-container {
//             display: flex;
//             height: calc(100vh - 72px); /* Adjust based on header height */
//             width: 100%;
//             overflow: hidden;
//           }

//           /* Sidebar Styling */
//           .sidebar {
//             width: 300px;
//             background-color: #1a1c1e; /* Sophisticated dark theme */
//             color: #fff;
//             padding: 30px 20px;
//             display: flex;
//             flex-direction: column;
//             overflow-y: auto;
//             box-shadow: 4px 0 15px rgba(0,0,0,0.1);
//             z-index: 100;
//           }

//           .sidebar-nav {
//             list-style: none;
//             padding: 0;
//             margin: 20px 0;
//           }

//           .sidebar-nav li {
//             margin-bottom: 12px;
//           }

//           .nav-btn {
//             width: 100%;
//             background: transparent;
//             border: none;
//             text-align: left;
//             font-size: 15px;
//             color: rgba(255, 255, 255, 0.7);
//             padding: 14px 20px;
//             border-radius: 12px;
//             cursor: pointer;
//             transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
//             display: flex;
//             align-items: center;
//             gap: 12px;
//             font-weight: 500;
//           }

//           .nav-btn:hover {
//             background: rgba(255, 255, 255, 0.05);
//             color: #fff;
//             transform: translateX(5px);
//           }

//           .nav-btn.active {
//             background: #448C74; /* Brand Green Accents */
//             color: #fff;
//             font-weight: 600;
//             box-shadow: 0 4px 12px rgba(68, 140, 116, 0.3);
//           }

//           .nav-btn.active i {
//             color: #fff;
//           }

//           .nav-btn i {
//             font-size: 18px;
//             width: 24px;
//             text-align: center;
//             color: rgba(255, 255, 255, 0.5);
//             transition: color 0.2s;
//           }

//           /* Content Area Styling */
//           .content-area {
//             flex: 1;
//             overflow-y: auto;
//             background-color: #f3f5f9;
//             padding: 40px;
//             scrollbar-width: thin;
//             scrollbar-color: #cbd5e0 #edf2f7;
//           }

//           @media (max-width: 992px) {
//             .dashboard-container {
//               flex-direction: column;
//               height: auto;
//             }
//             .sidebar {
//               width: 100%;
//               height: auto;
//               padding: 20px;
//               box-shadow: 0 4px 10px rgba(0,0,0,0.05);
//             }
//             .sidebar-nav {
//               display: flex;
//               gap: 10px;
//               overflow-x: auto;
//               margin: 10px 0;
//               padding-bottom: 5px;
//             }
//             .sidebar-nav li {
//               margin-bottom: 0;
//               flex-shrink: 0;
//             }
//             .nav-btn {
//               padding: 10px 16px;
//               font-size: 14px;
//             }
//             .content-area {
//               padding: 20px;
//             }
//           }
//         `}</style>

//           <div className="row g-4">
//             {/* Section 1: Land Details */}
//             <div className="col-12 fade-in-up stagger-1">
//               <div className="row g-4">
//                 <div className="col-lg-8">
//                   <LandDetailsForm onCalculate={handleLandCalculation} updateingUI={updateingUI} setUpdateUI={setUpdateUI} />
//                 </div>
//                 <div className="col-lg-4">
//                   <LandDetailsOutput results={landResults} updateingUI={updateingUI} />
//                 </div>
//               </div>
//             </div>

//             {/* Section 1.2: Permissible FSI and Proposed FSI */}
//             <div className="col-12 fade-in-up stagger-2">
//               <div className="row g-4">
//                 <div className="col-lg-8">
//                   <FSIProposalForm
//                     landResults={landResults}
//                     zoningType={zoningType}
//                     location={location}
//                     onSave={handleFSIProposalSave}
//                   />
//                 </div>
//                 <div className="col-lg-4">
//                   <FSIProposalOutput
//                     data={fsiProposalData}
//                     landResults={landResults}
//                     zoningType={zoningType}
//                     location={location}
//                   />
//                 </div>
//               </div>
//             </div>



//             {/* New Section 1.3: Area Calculation */}
//             <div className="col-12 fade-in-up stagger-3">
//               <div className="row g-4">
//                 <div className="col-lg-8">
//                   <AreaCalculationForm
//                     onSave={handleAreaCalculationSave}
//                     landResults={landResults}
//                     fsiProposalData={fsiProposalData}
//                     zoningType={zoningType}
//                     location={location}
//                   />
//                 </div>
//                 <div className="col-lg-4">
//                   <AreaCalculationResult
//                     data={areaCalculationData}
//                     landResults={landResults}
//                     fsiProposalData={fsiProposalData}
//                     zoningType={zoningType}
//                     location={location}
//                   />
//                 </div>
//               </div>
//             </div>
//             {/* Section 2: Revenue Calculation Header */}
//             <div id="section-revenue" className="text-center mb-4 mt-5 fade-in-up">
//               <h1 className="display-5 fw-bold text-dark mb-1">
//                 {/* <i className="fa-solid fa-hand-holding-dollar me-3" style={{ color: '#448C74' }}></i> */}
//                 <FaHandHoldingDollar
//                   className="me-3"  // Bootstrap-style right margin
//                   style={{ color: '#448C74' }}
//                   size={55}
//                 />

//                 Revenue calculation
//               </h1>
//             </div>

//             {/* Market Analysis Charts Section */}
//             <div className="col-12 fade-in-up stagger-4 mt-5">
//               <div className="text-center mb-4">
//                 <h3 className="fw-bold text-dark mb-1">
//                   {/* <i className="fas fa-chart-line me-3" style={{ color: '#448C74' }}></i> */}
//                   <FaChartLine
//                     className="me-3"
//                     style={{ color: '#448C74' }}
//                   />
//                   Market Analysis
//                 </h3>
//               </div>
//               <div className="row g-4">
//                 <div className="col-lg-6">
//                   <PricerateAnalysis />
//                 </div>
//                 <div className="col-lg-6">
//                   <SaleAnalysis />
//                 </div>
//                 <div className="col-lg-6">
//                   <SupplyDemandAnalysis option="demand" />
//                 </div>
//                 <div className="col-lg-6">
//                   <SupplyDemandAnalysis option="supply" />
//                 </div>
//               </div>
//             </div>

//             {/* Section 1.4: Unit Design */}
//             <div className="col-12 fade-in-up stagger-5">
//               <div className="row g-4">
//                  <div className="col-12">
//                   <Marketanalysis calculationMode={calculationMode} setCalculationMode={setCalculationMode} />
//                   <div className="row g-4 align-items-stretch">
//                     <div className="col-12 d-flex">
//                       <UnitDesignStructure onSave={handleUnitDesignSave} calculationMode={calculationMode} setCalculationMode={setCalculationMode} />
//                     </div>
//                   </div>
//                 </div>

//                 {/* Revenue Projection (same as /revenuep2) - between Unit Design Structure and Required Parking */}
//                 <div className="col-12 fade-in-up stagger-5">
//                   <RevenueProjection2 embedded />
//                   <RevSimulation embedded />
//                 </div>
//                 {/* Section 3: Building Design Header */}
//                 <div id="section-building" className="text-center mb-4 mt-5 fade-in-up">
//                   <h1 className="display-5 fw-bold text-dark mb-1">
//                     {/* <i className="fa-solid fa-compass-drafting me-3" style={{ color: '#448C74' }}></i> */}
//                     <FaCompassDrafting
//                       className="me-3"
//                       style={{ color: '#448C74' }}
//                     />
//                     Building Design
//                   </h1>
//                 </div>

//                 <div className="col-12">
//                   <RequiredParking />
//                 </div>
//                 {/* <div className="col-12">
//                 <div className="row g-4 align-items-stretch">
//                   <div className="col-lg-8 d-flex">
//                     <BuildingDesign />
//                   </div>
//                   <div className="col-lg-4 d-flex">
//                     <BuildingResults />
//                   </div>
//                 </div>
//               </div> */}
//               </div>
//             </div>

//             {/* Section: Charts - Hidden for now as they are integrated in RevenueProjection2 */}
//             {/* <div className="col-12 fade-in-up stagger-6">
//   <div className="row g-4">
//     <div className="col-lg-3">
//       <PricerateAnalysis />
//     </div>
//     <div className="col-lg-3">
//       <SaleAnalysis />
//     </div>
//     <div className="col-lg-3">
//       <SupplyDemandAnalysis option="demand" />
//     </div>
//     <div className="col-lg-3">
//       <SupplyDemandAnalysis option="supply" />
//     </div>
//   </div>
// </div> */}

//             {/* Section 2: Revenue Details */}
//             <div className="col-12 fade-in-up stagger-7">
//               <div className="row g-4">
//                 <div className="col-lg-8">
//                   <RevenueForm onSave={handleRevenueSave} />
//                 </div>
//                 <div className="col-lg-4">
//                   <RevenueOutput data={revenueData} />
//                 </div>
//               </div>
//             </div>

//             {/* Section 3: Cost Details */}
//             <div className="col-12 fade-in-up stagger-7">
//               <div className="row g-4">
//                 <div className="col-lg-8">
//                   <CostForm onSave={handleCostSave} />
//                 </div>
//                 <div className="col-lg-4">
//                   <CostOutput data={costData} />
//                 </div>
//               </div>
//             </div>

//             {/* Dashboard Buttons */}
//             <div className="col-12 text-center pt-4 fade-in-up" style={{ animationDelay: '0.9s' }}>
//               <div className="d-flex justify-content-center align-items-center gap-4">
//                 <button
//                   className="btn btn-primary btn-lg rounded-pill px-5 py-3 fw-semibold shadow-sm card-hover-lift"
//                   onClick={() => setShowDashboard(true)}
//                 >
//                   <i className="fas fa-chart-line me-2"></i>
//                   View Dashboard
//                 </button>
//                 <button
//                   className="btn btn-success btn-lg rounded-pill px-5 py-3 fw-semibold shadow-sm card-hover-lift"
//                   onClick={() => navigate('/ownership-check')}
//                 >
//                   <i className="fas fa-users me-2"></i>
//                   Developer Share
//                 </button>
//               </div>
//             </div>
//           </div>
//         </main>
//       </div>

//       {/* Dashboard Modal */}
//       <Dashboard
//         isOpen={showDashboard}
//         onClose={() => setShowDashboard(false)}
//       />
//     </div>
//   );
// };

// export default Index; 

import {
  FaMountainCity,
  FaChartLine,
  FaChartBar,
  FaCompassDrafting,
  FaHandHoldingDollar,
  FaEllipsis,
  FaCircleInfo,
  FaCalculator,
  FaUsers,
  FaScaleBalanced,
  FaDatabase,
  FaMapLocationDot,
} from "react-icons/fa6";
import { FaTools, FaCalendarAlt, FaParking, FaRoad, FaLayerGroup, FaChevronRight, FaMapMarkerAlt, FaCrosshairs, FaRulerCombined, FaCheck, FaSlidersH, FaFilter, FaBuilding, FaPlus, FaRegBuilding, FaFilePdf, FaDownload } from "react-icons/fa";
import Select from "react-select";
import { useState, useEffect } from "react";
import Header from "./Header";

const formatProjectOption = ({ project, index }, { context }) => {
  if (context === "value") {
    return (
      <div className="d-flex align-items-center gap-2">
        <FaRegBuilding size={13} className="text-secondary" />
        <span className="fw-bold text-dark" style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ color: "#94a3b8", marginRight: "4px" }}>{index}.</span>
          {project.project_name}
        </span>
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center justify-content-between w-100">
      <div className="d-flex align-items-center gap-2">
        <div className="bg-light rounded p-1 d-flex align-items-center justify-content-center text-secondary">
          <FaRegBuilding size={14} />
        </div>
        <div className="d-flex flex-column">
          <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
            <span style={{ color: "#94a3b8", marginRight: "4px" }}>{index}.</span>
            {project.project_name}
          </span>
          <span className="text-muted" style={{ fontSize: "11px", lineHeight: "1.2" }}>
            {project.distance_formatted} away
          </span>
        </div>
      </div>
      <div className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-2 py-1 ms-2" style={{ fontSize: "10px" }}>
        {project.total_transactions} sales
      </div>
    </div>
  );
};

const customSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: "34px",
    height: "34px",
    fontSize: "13px",
    fontWeight: "bold",
    borderRadius: "0.375rem",
    borderColor: "#cbd5e1",
    minWidth: "250px",
    boxShadow: "none",
    "&:hover": { borderColor: "#94a3b8" }
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 8px",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#1e293b",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "#eef7f4" : state.isFocused ? "#f8fafc" : "transparent",
    color: "#1e293b",
    cursor: "pointer",
    padding: "8px 12px",
    "&:active": { backgroundColor: "#d1fae5" }
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    borderRadius: "0.5rem",
    overflow: "hidden",
    minWidth: "300px"
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: "300px",
    paddingRight: "2px"
  }),
};
import LandDetailsForm from "./LandDetailsForm";

import RevenueForm from "./LocationForm";
import RevenueOutput from "./LocationOutput";
import CostForm from "./CostForm";
import CostOutput from "./CostOutput";
import CostOfProjectDetails from "./components/CostOfProjectDetails";
import MeansOfFinance from "./MeansOfFinance";
import Dashboard from "./Dashboard";
import { useLegacyNavigate as useNavigate, useLegacyLocation as useLocation } from "@/components/feasibility_agent/useLegacyNavigate"; import Link from "next/link";
import UnitDesignStructure from "./UnitDesignStructure";
import ProductMixTicketSize from "./ProductMixTicketSize";
import RateSim from "./ratesim";
import RequiredParking from "./RequiredParking";
import RevenueProjection2 from "./revenuep2";
import Marketanalysis from "./Marketanalysis";
import AlignedSimulationView from "./components/AlignedSimulationView";
import ExpectedRevenueComparison from "./components/ExpectedRevenueComparison";
import TicketSizeSummary from "./components/TicketSizeSummary";
import PricerateAnalysis from "./components/PricerateAnalysis";
import SaleAnalysis from "./components/SaleAnalysis";
import SupplyDemandAnalysis from "./components/SupplyDemandAnalysis";
import LandIdentification from "./LandIdentification";
import RegulatoryIntelligence from "./RegulatoryIntelligence";
import ScenarioRevenueDashboard from "./components/ScenarioRevenueDashboard";
import FeasibilityIrrSection from "./components/FeasibilityIrrSection";
import { downloadFeasibilityPDF, checkFeasibilityCompleteness } from "./FeasibilityReport";
import { apiUrl } from "@/lib/api-client";
import SectionHero from "./components/SectionHero";
import { TokenLedgerProvider } from "./contexts/TokenLedgerContext";
import UsageCostTab from "./components/UsageCostTab";

const BRAND_ACCENT = "#448C74";
const BRAND_ACCENT_DARK = "#2d6b55";
const BRAND_ACCENT_BG = "#e6f4f1";
const BRAND_ACCENT_LIGHT = "#f0fdf9";

const sidebarButtons = [
  {
    id: "land-identification",
    label: "Land Identification",
    subtitle: "Coordinate auto-fill",
    description: "Locate parcels on map, define boundary coordinates, and auto-populate site parameters.",
    icon: FaMapLocationDot,
  },
  {
    id: "regulatory-intelligence",
    label: "Regulatory Intelligence",
    subtitle: "Zoning & document bylaws",
    description: "AI-powered zoning extraction, document parsing, setbacks, and local planning regulations.",
    icon: FaScaleBalanced,
  },
  {
    id: "land-fsi",
    label: "Land & FSI Details",
    subtitle: "Web + document assisted",
    description: "Calculate permissible FSI, TDR loading, road width entitlements, and buildable potential.",
    icon: FaMountainCity,
  },
  {
    id: "market-analysis",
    label: "Market Research",
    subtitle: "Catchment trends & comps",
    description: "Micro-market intelligence, competitor sales data, historical pricing, and absorption trends.",
    icon: FaChartLine,
  },
  {
    id: "predictive-rate-sim",
    label: "Predictive Rate Simulator",
    subtitle: "Rate simulation engine",
    description: "Simulate future rate appreciation, launch price corridors, and sensitivity trajectories.",
    icon: FaChartBar,
  },
  {
    id: "building",
    label: "Product Mix Design",
    subtitle: "Unit typologies & layout",
    description: "Configure unit typologies (1/2/3 BHK), carpet area distribution, and target ticket sizing.",
    icon: FaCompassDrafting,
  },
  {
    id: "revenue-details",
    label: "Revenue Projection",
    subtitle: "Detailed revenue forecast",
    description: "Phased sales milestones, collection schedules, and gross development value (GDV) forecast.",
    icon: FaHandHoldingDollar,
  },
  {
    id: "cost-details",
    label: "Cost Details",
    subtitle: "Project cost breakdown",
    description: "Comprehensive budget breakdown including approvals, civil construction, infra, and contingency.",
    icon: FaCalculator,
  },
  {
    id: "means-finance",
    label: "Means Of Finance",
    subtitle: "Funding & capital sources",
    description: "Structure promoter equity, construction finance loans, mezzanine debt, and customer advances.",
    icon: FaUsers,
  },
  {
    id: "irr-calculator",
    label: "IRR Calculator",
    subtitle: "Cash inflow & returns",
    description: "Compute Project IRR, Equity IRR, Net Present Value (NPV), and equity multiple return metrics.",
    icon: FaScaleBalanced,
  },
  {
    id: "generate-report",
    label: "Generate Report",
    subtitle: "Export PDF feasibility",
    description: "Export an executive-ready comprehensive Feasibility PDF report with charts and financial metrics.",
    icon: FaFilePdf,
  },
];

const Index = () => {
  const theme = "light";
  const navigate = useNavigate();
  const [landResults, setLandResults] = useState(null);

  const [revenueData, setRevenueData] = useState(null);
  const [costData, setCostData] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [zoningType, setZoningType] = useState("");
  const [location, setLocation] = useState("");
  const [updateingUI, setUpdateUI] = useState(false);
  const [activeSection, setActiveSection] = useState("land-identification");
  const [calculationMode, setCalculationMode] = useState("carpet"); // Lifted state: 'carpet' or 'saleable'
  const [marketViewMode, setMarketViewMode] = useState("location");
  const [appliedRadius, setAppliedRadius] = useState(1000);
  const [inputRadius, setInputRadius] = useState(1000);
  const [selectedProject, setSelectedProject] = useState(() => {
    if (typeof window === "undefined") return "all";
    try {
      const saved = localStorage.getItem("market research");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.selectedProject) return parsed.selectedProject;
      }
    } catch (e) {
      console.error("Error reading selectedProject payload:", e);
    }
    return "all";
  });

  const [nearbyProjects, setNearbyProjects] = useState([]);
  const [nearbyLimit, setNearbyLimit] = useState(5);
  const [loadingNearbyProjects, setLoadingNearbyProjects] = useState(false);

  useEffect(() => {
    try {
      const existingRaw = localStorage.getItem("market research");
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const updated = { ...existing, viewMode: marketViewMode, radius: appliedRadius, selectedProject };
      localStorage.setItem("market research", JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving market research payload:", e);
    }
  }, [marketViewMode, appliedRadius, selectedProject]);

  useEffect(() => {
    if (marketViewMode !== "nearby") return;

    let lat = null;
    let lng = null;
    let city = "";

    try {
      const landRaw = localStorage.getItem("Land Identification");
      if (landRaw) {
        const parsed = JSON.parse(landRaw);
        lat = parsed?.polygonCenterLat || parsed?.latitude || null;
        lng = parsed?.polygonCenterLng || parsed?.longitude || null;
        city = parsed?.location || parsed?.city || "";
      }
    } catch (e) {
      console.error("Error parsing Land Identification for nearby projects:", e);
    }

    if (!lat || !lng) return;

    const fetchNearby = async () => {
      setLoadingNearbyProjects(true);
      try {
        const response = await fetch(apiUrl("/new_rate_simulator/simulator/nearby-projects/"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city_name: city, latitude: lat, longitude: lng, limit: nearbyLimit })
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.projects)) {
          setNearbyProjects(data.projects);
          if (data.projects.length > 0) {
            setSelectedProject((prev) => {
              if (!prev || prev === "all") {
                const first = data.projects[0];
                return first.project_id ? `id:${first.project_id}:${first.project_name}` : first.project_name;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error("Error fetching nearby projects:", err);
      } finally {
        setLoadingNearbyProjects(false);
      }
    };

    fetchNearby();
  }, [marketViewMode, nearbyLimit]);

  const [excelLogicSelected, setExcelLogicSelected] = useState(true);
  const [bayesianOptimizationSelected, setBayesianOptimizationSelected] =
    useState(true);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [isLandV2Active, setIsLandV2Active] = useState(false);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [reportError, setReportError] = useState("");
  const routerLocation = useLocation();

  const handleDownloadReport = async () => {
    setReportError("");
    const { complete, missing } = checkFeasibilityCompleteness();
    if (!complete) {
      setReportError(`Complete all sections before downloading the report. Missing: ${missing.join(", ")}`);
      setTimeout(() => setReportError(""), 8000);
      return;
    }
    setReportDownloading(true);
    try {
      await downloadFeasibilityPDF();
    } catch (err) {
      console.error("Report download error:", err);
      setReportError("Failed to generate report. Please try again.");
      setTimeout(() => setReportError(""), 5000);
    } finally {
      setReportDownloading(false);
    }
  };

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedLandResults = localStorage.getItem("landDetailsResults");
    const savedZoning = localStorage.getItem("zoningType");
    const savedLandForm = localStorage.getItem("landDetailsForm");

    const savedRevenue = localStorage.getItem("revenueForm");
    const savedCost = localStorage.getItem("costForm");

    if (savedLandResults) setLandResults(JSON.parse(savedLandResults));
    if (savedZoning) setZoningType(savedZoning);
    if (savedLandForm) {
      const landForm = JSON.parse(savedLandForm);
      setLocation(landForm.location || "");
    }

    if (savedRevenue) setRevenueData(JSON.parse(savedRevenue));
    if (savedCost) setCostData(JSON.parse(savedCost));
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (showToolsDropdown) {
        setShowToolsDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showToolsDropdown]);

  // Scroll spy effect: Auto-highlight current section in sidebar as user scrolls up/down
  useEffect(() => {
    const contentArea = document.querySelector(".content-area");
    if (!contentArea) return;

    const handleScroll = () => {
      const sectionMap = [
        { id: "land-identification", elementId: "section-land-identification" },
        { id: "regulatory-intelligence", elementId: "section-regulatory-intelligence" },
        { id: "land-fsi", elementId: "section-land-fsi" },
        { id: "market-analysis", elementId: "section-market-analysis" },
        { id: "predictive-rate-sim", elementId: "predictive-rate-sim" },
        { id: "building", elementId: "section-building" },
        { id: "ticket-size", elementId: "section-ticket-size" },
        { id: "revenue", elementId: "section-revenue" },
        { id: "revenue-details", elementId: "section-revenue-heading" },
        { id: "cost-details", elementId: "section-cost-heading" },
        { id: "means-finance", elementId: "section-means-finance-heading" },
        { id: "irr-calculator", elementId: "section-irr-calculator-heading" },
        { id: "generate-report", elementId: "section-generate-report" },
        { id: "cashflows", elementId: "section-cashflows" },
      ];

      const containerRect = contentArea.getBoundingClientRect();
      const triggerPoint = containerRect.top + 200; // Offset threshold

      let currentActiveId = null;

      for (let i = 0; i < sectionMap.length; i++) {
        const el = document.getElementById(sectionMap[i].elementId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= triggerPoint) {
            currentActiveId = sectionMap[i].id;
          }
        }
      }

      if (currentActiveId) {
        setActiveSection(currentActiveId);
      }
    };

    contentArea.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      contentArea.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Auto-scroll sidebar item into view when activeSection changes
  useEffect(() => {
    if (activeSection) {
      const activeBtn = document.querySelector(".nav-btn-modern.active");
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [activeSection]);

  const handleToolsDropdownToggle = (event) => {
    event.stopPropagation();
    setShowToolsDropdown((prev) => !prev);
  };

  const handleLandCalculation = (results, zoning, loc) => {
    setLandResults(results);
    setZoningType(zoning);
    if (loc) setLocation(loc);
  };



  const handleRevenueSave = (data) => {
    setRevenueData(data);
  };

  const handleCostSave = (data) => {
    setCostData(data);
  };

  const handleUnitDesignSave = () => { };

  return (
    <TokenLedgerProvider>
    <div
      className={`theme-${theme}`}
      style={{
        backgroundColor: theme === "dark" ? "#1e1e2f" : "#f3f5f9",
        height: "calc(100vh - 80px)",
        marginTop: "80px",
        overflow: "hidden",
      }}
    >

      <div className="dashboard-container">
        {/* Sidebar Nav Component */}
        <aside
          className="sidebar"
          style={{
            backgroundColor: theme === "dark" ? "#2c2e31" : "#ffffff",
          }}
        >
          {/* Sidebar Header */}
          <div className="sidebar-header-premium">
            <div className="sidebar-header-top">
              <div className="sidebar-logo-icon-premium">
                <FaLayerGroup size={18} color="#fff" />
              </div>
              <div className="sidebar-title-block">
                <div className="sidebar-title-text">Feasibility Agent</div>
                <div className="sidebar-title-sub">Section workflow</div>
              </div>
            </div>
            <div className="sidebar-progress-bar-wrap">
              <div className="sidebar-progress-label">
                <span>Workflow Progress</span>
                <span className="sidebar-progress-pct">
                  {Math.round(((sidebarButtons.findIndex(b => b.id === activeSection) + 1) / sidebarButtons.length) * 100)}%
                </span>
              </div>
              <div className="sidebar-progress-track">
                <div
                  className="sidebar-progress-fill"
                  style={{ width: `${Math.round(((sidebarButtons.findIndex(b => b.id === activeSection) + 1) / sidebarButtons.length) * 100)}%` }}
                />
              </div>
            </div>
          </div>



          <ul className="sidebar-nav-premium">
            {sidebarButtons.map((btn, index) => {
              const isActive = activeSection === btn.id;
              const Icon = btn.icon;

              return (
                <li key={btn.id} className="sidebar-nav-item-wrap">
                  <button
                    className={`nav-btn-premium ${isActive ? "active" : ""}`}
                    title={`${btn.label} — ${btn.description}`}
                    onClick={() => {
                      if (btn.id === "Dashboard") {
                        setShowDashboard(true);
                      } else if (btn.id === "revenue-details") {
                        setActiveSection(btn.id);
                        document.getElementById("section-revenue-heading")?.scrollIntoView({ behavior: "smooth" });
                      } else if (btn.id === "cost-details") {
                        setActiveSection(btn.id);
                        document.getElementById("section-cost-heading")?.scrollIntoView({ behavior: "smooth" });
                      } else if (btn.id === "means-finance") {
                        setActiveSection(btn.id);
                        document.getElementById("section-means-finance-heading")?.scrollIntoView({ behavior: "smooth" });
                      } else if (btn.id === "irr-calculator") {
                        setActiveSection(btn.id);
                        document.getElementById("section-irr-calculator-heading")?.scrollIntoView({ behavior: "smooth" });
                      } else if (btn.id === "generate-report") {
                        setActiveSection(btn.id);
                        document.getElementById("section-generate-report")?.scrollIntoView({ behavior: "smooth" });
                      } else if (btn.id === "usage-cost") {
                        setActiveSection(btn.id);
                      } else if (btn.id === "cashflows") {
                        navigate("/irr");
                      } else if (btn.id === "predictive-rate-sim") {
                        setActiveSection(btn.id);
                        document.getElementById("predictive-rate-sim")?.scrollIntoView({ behavior: "smooth" });
                      } else {
                        setActiveSection(btn.id);
                        document.getElementById(`section-${btn.id}`)?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    {/* Icon */}
                    <div className={`nav-premium-icon-wrap ${isActive ? "active" : ""}`}>
                      <Icon size={14} />
                    </div>

                    {/* Text */}
                    <div className="nav-premium-text">
                      <div className="nav-premium-title" style={{ color: isActive ? "#0f172a" : "#1e293b" }}>
                        {btn.label}
                      </div>
                      <div className="nav-premium-subtitle">{btn.subtitle}</div>
                    </div>

                    {/* Step number + chevron */}
                    <div className="nav-premium-right">
                      <span className={`nav-premium-step-num ${isActive ? "active" : ""}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <FaChevronRight
                        size={9}
                        style={{
                          color: isActive ? BRAND_ACCENT : "#94a3b8",
                          transition: "transform 0.2s ease",
                          transform: isActive ? "translateX(2px)" : "none",
                        }}
                      />
                    </div>
                  </button>

                  {/* Hover Tooltip Card */}
                  <div className="nav-hover-tooltip">
                    <div className="nav-tooltip-header">
                      <span className="nav-tooltip-step">
                        Step {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="nav-tooltip-title">{btn.label}</span>
                    </div>
                    <div className="nav-tooltip-desc">{btn.description}</div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Separated Monitoring / Token Counter Section */}
          <div className="mt-auto pt-3" style={{ borderTop: "1px solid #f0f2f8" }}>
            <button
              className={`nav-btn-premium w-100 ${activeSection === "usage-cost" ? "active" : ""}`}
              onClick={() => setActiveSection("usage-cost")}
            >
              <div className={`nav-premium-icon-wrap ${activeSection === "usage-cost" ? "active" : ""}`}>
                <FaDatabase size={14} />
              </div>
              <div className="nav-premium-text">
                <div className="nav-premium-title" style={{ color: activeSection === "usage-cost" ? "#0f172a" : "#1e293b" }}>
                  Usage &amp; Cost
                </div>
                <div className="nav-premium-subtitle">Token &amp; API Counter</div>
              </div>
              <div className="nav-premium-right">
                <FaChevronRight
                  size={9}
                  style={{
                    color: activeSection === "usage-cost" ? BRAND_ACCENT : "#94a3b8",
                    transition: "transform 0.2s ease",
                    transform: activeSection === "usage-cost" ? "translateX(2px)" : "none",
                  }}
                />
              </div>
            </button>
          </div>
        </aside>

        {/* Main Content Component */}
        <main className="content-area">
          <div className="d-none justify-content-end mb-4 gap-2 align-items-start">
            {reportError && (
              <div className="alert alert-warning py-2 px-3 mb-0 d-flex align-items-center gap-2" style={{ fontSize: "13px", borderRadius: "10px", maxWidth: "500px" }}>
                <FaCircleInfo />
                <span>{reportError}</span>
              </div>
            )}
            <button
              className="btn btn-outline-success rounded-pill px-4 py-2 fw-semibold shadow-sm d-flex align-items-center gap-2"
              onClick={handleDownloadReport}
              disabled={reportDownloading}
              title="Download Feasibility Report as PDF"
              style={{ whiteSpace: "nowrap" }}
            >
              {reportDownloading ? (
                <span className="spinner-border spinner-border-sm" role="status" />
              ) : (
                <FaChartLine />
              )}
              {reportDownloading ? "Generating..." : "Download Report"}
            </button>
            <div className="position-relative">
              <button
                className="btn btn-outline-primary dropdown-toggle"
                type="button"
                onClick={handleToolsDropdownToggle}
                aria-expanded={showToolsDropdown}
              >
                <FaTools className="me-1" />
                Tools
              </button>
              <ul
                className={`dropdown-menu mt-2 ${showToolsDropdown ? "show" : ""}`}
                style={{
                  right: 0,
                  left: "auto",
                  minWidth: "220px",
                  zIndex: 1000,
                }}
              >
                <li>
                  <Link
                    className={`dropdown-item ${routerLocation.pathname === "/construction-timetable/" ? "active bg-primary text-white" : ""}`}
                    href="/feasibility/construction-timetable/"
                    onClick={() => setShowToolsDropdown(false)}
                  >
                    <FaCalendarAlt className="me-2" />
                    Construction Timetable
                  </Link>
                </li>
                <li>
                  <Link
                    className={`dropdown-item ${routerLocation.pathname === "/parking-logic/" ? "active bg-primary text-white" : ""}`}
                    href="/feasibility/parking-logic/"
                    onClick={() => setShowToolsDropdown(false)}
                  >
                    <FaParking className="me-2" />
                    Parking Logic
                  </Link>
                </li>
                <li>
                  <Link
                    className={`dropdown-item ${routerLocation.pathname === "/osm-logic/" ? "active bg-primary text-white" : ""}`}
                    href="/feasibility/osm-logic/"
                    onClick={() => setShowToolsDropdown(false)}
                  >
                    <FaRoad className="me-2" />
                    OSM logic
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 0.1: Land Identification */}
          <SectionHero
            id="section-land-identification"
            title="Land Identification"
            description="Identify and locate potential land parcels using advanced mapping and spatial intelligence."
            icon={FaMountainCity}
            illustration="/assets/illustrations/land-identification.jpg"
          />

          <div className="row g-4 mb-5">
            <div className="col-12 fade-in-up stagger-1">
              <LandIdentification />
            </div>
          </div>

          {/* Section 0.2: Regulatory Intelligence */}
          <SectionHero
            id="section-regulatory-intelligence"
            title="Regulatory & Document Intelligence"
            description="Leverage AI to automatically analyze, summarize, and extract insights from zoning, compliance, and regulatory documents."
            icon={FaCircleInfo}
            illustration="/assets/illustrations/regulatory-intelligence.jpg"
          />

          <div className="row g-4 mb-5">
            <div className="col-12 fade-in-up stagger-1">
              <RegulatoryIntelligence />
            </div>
          </div>

          {/* Section 1: Land Details */}
          <SectionHero
            id="section-land-fsi"
            title="Land And FSI Details"
            description="View extracted details about plot boundary, land area, and building footprint for accurate floor space index projections."
            icon={FaMountainCity}
            illustration="/assets/illustrations/land-fsi.jpg"
          />

          <style>{`
          /* Custom Select Scrollbar */
          .custom-select__menu-list {
            scrollbar-width: thin !important;
            scrollbar-color: #94a3b8 #f1f5f9 !important;
          }
          .custom-select__menu-list::-webkit-scrollbar {
            width: 8px !important;
            height: 8px !important;
            display: block !important;
          }
          .custom-select__menu-list::-webkit-scrollbar-track {
            background: #f1f5f9 !important;
            border-radius: 4px !important;
          }
          .custom-select__menu-list::-webkit-scrollbar-thumb {
            background-color: #94a3b8 !important;
            border-radius: 4px !important;
          }
          .custom-select__menu-list::-webkit-scrollbar-thumb:hover {
            background-color: #64748b !important;
          }

          /* Text Colors - Explicitly Defined */
          .text-dark { color: #212529 !important; }
          .text-secondary { color: #6c757d !important; }
          .text-primary { color: #0d6efd !important; }
          .text-success { color: #198754 !important; }
          .text-warning { color: #ffc107 !important; }
          .text-info { color: #0dcaf0 !important; }
          .text-danger { color: #dc3545 !important; }

          /* Form Elements */
          .form-label { color: #0a0a0a; font-weight: 600; }
          .form-control, .form-select { 
            background-color: #f8f9fa; 
            border: 1px solid transparent;
            color: #0f0f0f;
          }
          .form-control:focus, .form-select:focus {
            background-color: #fff;
            border-color: #0d6efd;
            color: #212529;
            box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
          }

          /* Card Styling */
          .card-header { 
            background-color: #ffffff;
            border-bottom: 1px solid #e9ecef;
            color: #212529;
          }
          .card-title { color: #0d6efd; font-weight: 700; }

          /* Animations */
          .fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
            transform: translateY(20px);
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .stagger-1 { animation-delay: 0.1s; }
          .stagger-2 { animation-delay: 0.2s; }
          .stagger-3 { animation-delay: 0.3s; }
          .stagger-4 { animation-delay: 0.4s; }
          .stagger-5 { animation-delay: 0.5s; }
          .stagger-6 { animation-delay: 0.6s; }
          .stagger-7 { animation-delay: 0.7s; }

          .card-hover-lift { 
            transition: transform 0.2s ease, box-shadow 0.2s ease; 
          }
          .card-hover-lift:hover { 
            transform: translateY(-5px); 
            box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; 
          }

          .pulse-animation {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(13, 110, 253, 0); }
            100% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0); }
          }

          /* Global Dashboard Container */
          .dashboard-container {
            display: flex;
            height: 100%;
            width: 100%;
            overflow: hidden;
            margin-top: 0;
          }

          /* ── Premium Sidebar ── */
          .sidebar {
            width: 300px;
            min-width: 300px;
            color: #333;
            padding: 16px 12px;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            overflow-x: visible;
            border-right: 1px solid #e2e8f0;
            z-index: 100;
            background: #ffffff;
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 transparent;
            box-shadow: 2px 0 12px rgba(0,0,0,0.02);
          }

          /* ── Sidebar Header ── */
          .sidebar-header-premium {
            margin-bottom: 14px;
            padding: 14px;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0d4a3c 100%);
            border-radius: 14px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 14px rgba(15,23,42,0.15);
          }
          .sidebar-header-premium::before {
            content: '';
            position: absolute;
            top: -24px; right: -24px;
            width: 85px; height: 85px;
            background: rgba(68,140,116,0.25);
            border-radius: 50%;
          }
          .sidebar-header-top {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
            position: relative;
            z-index: 1;
          }
          .sidebar-logo-icon-premium {
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(4px);
            width: 36px;
            height: 36px;
            min-width: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.22);
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          }
          .sidebar-title-block { flex: 1; }
          .sidebar-title-text {
            font-weight: 800;
            font-size: 14px;
            color: #ffffff;
            line-height: 1.2;
            letter-spacing: -0.01em;
          }
          .sidebar-title-sub {
            font-size: 10px;
            color: rgba(255,255,255,0.65);
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin-top: 2px;
            font-weight: 600;
          }
          .sidebar-progress-bar-wrap { position: relative; z-index: 1; }
          .sidebar-progress-label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
            font-size: 10px;
            color: rgba(255,255,255,0.7);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
          }
          .sidebar-progress-pct {
            font-weight: 800;
            color: #4ade80;
            font-size: 11px;
          }
          .sidebar-progress-track {
            height: 4px;
            background: rgba(255,255,255,0.18);
            border-radius: 100px;
            overflow: hidden;
          }
          .sidebar-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #4ade80);
            border-radius: 100px;
            transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          /* ── Nav List ── */
          .sidebar-nav-premium {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .sidebar-nav-item-wrap {
            position: relative;
          }

          /* ── Nav Button ── */
          .nav-btn-premium {
            position: relative;
            z-index: 1;
            width: 100%;
            background: #ffffff;
            border: 1px solid #f1f5f9;
            border-radius: 11px !important;
            padding: 8px 10px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 4px;
            text-align: left;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          }
          .nav-btn-premium:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            transform: translateX(2px);
            box-shadow: 0 3px 8px rgba(0,0,0,0.05);
          }
          .nav-btn-premium.active {
            background: linear-gradient(135deg, rgba(68,140,116,0.11) 0%, rgba(68,140,116,0.03) 100%) !important;
            border-color: #448C74 !important;
            border-left: 3.5px solid #448C74 !important;
            box-shadow: 0 3px 12px rgba(68,140,116,0.15) !important;
          }

          /* ── Icon ── */
          .nav-premium-icon-wrap {
            width: 32px;
            height: 32px;
            min-width: 32px;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            background: #f0fdf9;
            color: #448C74;
            border: 1px solid rgba(68, 140, 116, 0.18);
            box-shadow: 0 1px 2px rgba(68, 140, 116, 0.05);
          }
          .nav-premium-icon-wrap.active {
            background: #e6f4f1;
            color: #2d6b55;
            border: 1.5px solid #448C74;
          }
          .nav-btn-premium:hover .nav-premium-icon-wrap {
            transform: scale(1.05);
            background: #e6f4f1;
          }

          /* ── Text ── */
          .nav-premium-text {
            flex: 1;
            min-width: 0;
          }
          .nav-premium-title {
            font-weight: 700;
            font-size: 12.5px;
            line-height: 1.25;
            margin-bottom: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.18s;
          }
          .nav-premium-subtitle {
            font-size: 10.5px;
            color: #64748b;
            line-height: 1.2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 500;
          }

          /* ── Right (step num + chevron) ── */
          .nav-premium-right {
            display: flex;
            align-items: center;
            gap: 5px;
            flex-shrink: 0;
          }
          .nav-premium-step-num {
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 0.02em;
            padding: 2px 5px;
            border-radius: 6px;
            transition: all 0.18s;
            color: #64748b;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .nav-premium-step-num.active {
            color: #2d6b55;
            background: #e6f4f1;
            border: 1px solid rgba(68, 140, 116, 0.35);
            font-weight: 800;
          }

          /* ── Hover Tooltip Card ── */
          .nav-hover-tooltip {
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%) translateX(8px);
            width: 250px;
            background: #ffffff;
            color: #1e293b;
            padding: 10px 12px;
            border-radius: 10px;
            box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
            z-index: 9999;
          }
          .nav-hover-tooltip::before {
            content: '';
            position: absolute;
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-width: 5px;
            border-style: solid;
            border-color: transparent #ffffff transparent transparent;
          }
          .sidebar-nav-item-wrap:hover .nav-hover-tooltip {
            opacity: 1;
            visibility: visible;
            transform: translateY(-50%) translateX(12px);
          }
          .nav-tooltip-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
          }
          .nav-tooltip-step {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 1px 5px;
            border-radius: 4px;
            background: #e6f4f1;
            color: #2d6b55;
            border: 1px solid rgba(68, 140, 116, 0.25);
          }
          .nav-tooltip-title {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .nav-tooltip-desc {
            font-size: 11px;
            line-height: 1.35;
            color: #64748b;
          }

          /* Legacy */
          .config-badge {
            background-color: #d1fae5;
            color: #065f46;
            font-weight: 600;
            padding: 6px 12px;
          }

          /* Content Area Styling */
          .content-area {
            flex: 1;
            overflow-y: auto;
            background-color: #f3f5f9;
            padding: 20px 40px;
            scrollbar-width: thin;
            scrollbar-color: #cbd5e0 #edf2f7;
          }

          @media (max-width: 992px) {
            .dashboard-container {
              flex-direction: column;
              height: auto;
            }
            .sidebar {
              width: 100%;
              height: auto;
              padding: 20px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            }
            .sidebar-nav {
              display: flex;
              gap: 10px;
              overflow-x: auto;
              margin: 10px 0;
              padding-bottom: 5px;
            }
            .sidebar-nav li {
              margin-bottom: 0;
              flex-shrink: 0;
            }
            .nav-btn {
              padding: 10px 16px;
              font-size: 14px;
            }
            .content-area {
              padding: 20px;
            }
          }
        `}</style>

          {/* Dark Theme Overrides */}
          {theme === "dark" && (
            <style>{`
              .theme-dark .content-area {
                background-color: #050505b6;
              }
              .theme-dark .text-dark {
                color: #e4e6ef !important;
              }
              .theme-dark .text-secondary {
                color: #a1a5b7 !important;
              }
              .theme-dark .form-label {
                color: #e4e6ef;
              }
              .theme-dark .form-control,
              .theme-dark .form-select {
                background-color: #2c2e31;
                border-color: #404347;
                color: #e4e6ef;
              }
              .theme-dark .form-control:focus,
              .theme-dark .form-select:focus {
                background-color: #2c2e31;
                border-color: #448C74;
                color: #e4e6ef;
                box-shadow: 0 0 0 0.25rem rgba(68, 140, 116, 0.25);
              }
              .theme-dark .card-header {
                background-color: #2c2e31;
                border-bottom-color: #404347;
                color: #e4e6ef;
              }
              .theme-dark .card-title {
                color: #448C74;
              }
              .theme-dark .card {
                background-color: #2c2e31;
                border-color: #404347;
              }
              .theme-dark .bg-light {
                background-color: #2c2e31 !important;
              }
              .theme-dark .border {
                border-color: #404347 !important;
              }
              .theme-dark .btn-outline-primary {
                color: #448C74;
                border-color: #448C74;
              }
              .theme-dark .btn-outline-primary:hover {
                background-color: #448C74;
                color: #fff;
              }
              .theme-dark .btn-outline-success {
                color: #198754;
                border-color: #198754;
              }
              .theme-dark .btn-outline-success:hover {
                background-color: #198754;
                color: #fff;
              }
              .theme-dark .dashboard-container {
                background-color: #1e1e2f;
              }
            `}</style>
          )}

          <div className="row g-4">
            {/* Section 1: Land Details */}
            <div className="col-12 fade-in-up stagger-1">
              <div className="row g-4">
                <div className="col-lg-12">
                  <LandDetailsForm
                    onCalculate={handleLandCalculation}
                    updateingUI={updateingUI}
                    setUpdateUI={setUpdateUI}
                    onViewChange={(view) => setIsLandV2Active(view !== "V1")}
                  />
                </div>

              </div>
            </div>





            {/* Market Analysis Charts Section */}
            <div
              id="section-market-analysis-wrapper"
              className="col-12 fade-in-up stagger-4 mt-5"
              style={{ scrollMarginTop: "120px" }}
            >
              <SectionHero
                id="section-market-analysis"
                title="Market Research"
                description="Analyze market trends, benchmark performance, and discover segmented growth opportunities across regions."
                icon={FaChartLine}
                illustration="/assets/illustrations/market-research.jpg"
              />
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <a
                    href="/valuation"
                    target="_blank"
                    rel="noreferrer"
                    className="d-flex align-items-center gap-3 text-decoration-none border rounded-4 p-3 h-100 bg-white shadow-sm card-hover-lift"
                    style={{ borderColor: "#d8e1ec" }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{ width: 46, height: 46, background: "#eef6f2", color: "#448C74" }}
                    >
                      <FaScaleBalanced size={18} />
                    </div>
                    <div>
                      <div className="fw-bold text-dark">Valuation Agent</div>
                      <div className="small text-secondary">Open the valuation workspace</div>
                    </div>
                  </a>
                </div>
                <div className="col-md-4">
                  <a
                    href="/data_retrieval"
                    target="_blank"
                    rel="noreferrer"
                    className="d-flex align-items-center gap-3 text-decoration-none border rounded-4 p-3 h-100 bg-white shadow-sm card-hover-lift"
                    style={{ borderColor: "#d8e1ec" }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{ width: 46, height: 46, background: "#eef3fb", color: "#0d6efd" }}
                    >
                      <FaDatabase size={18} />
                    </div>
                    <div>
                      <div className="fw-bold text-dark">Data Retrieval Agent</div>
                      <div className="small text-secondary">Open the data retrieval workspace</div>
                    </div>
                  </a>
                </div>
                <div className="col-md-4">
                  <a
                    href="/visualization_agent"
                    target="_blank"
                    rel="noreferrer"
                    className="d-flex align-items-center gap-3 text-decoration-none border rounded-4 p-3 h-100 bg-white shadow-sm card-hover-lift"
                    style={{ borderColor: "#d8e1ec" }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{ width: 46, height: 46, background: "#eef2ff", color: "#4f46e5" }}
                    >
                      <FaMapLocationDot size={18} />
                    </div>
                    <div>
                      <div className="fw-bold text-dark">Land/GIS Agent</div>
                      <div className="small text-secondary">Open the Land/GIS workspace</div>
                    </div>
                  </a>
                </div>
              </div>
              {/* Market Research Scope Filter Card */}
              <div
                className="card border-0 shadow-sm rounded-4 mb-4"
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
                }}
              >
                <div className="card-body p-3.5 d-flex align-items-center flex-wrap gap-3">
                  {/* Scope Info Label */}
                  <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ flexBasis: "0", minWidth: "250px" }}>
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 px-3 py-2.5"
                      style={{ backgroundColor: "#eef7f4", color: "#448C74" }}
                    >
                      <FaFilter size={16} />
                    </div>
                    <div>
                      <div className="fw-bold text-dark" style={{ fontSize: "15px", lineHeight: "1.2" }}>
                        Market Research Filter
                      </div>
                      <div className="text-secondary fw-medium" style={{ fontSize: "12px" }}>
                        {marketViewMode === "location"
                          ? "Showing overall city/location statistics"
                          : marketViewMode === "catchment"
                          ? `Showing ${appliedRadius >= 1000 ? `${appliedRadius / 1000}km` : `${appliedRadius}m`} radius catchment around project`
                          : `Showing statistics for selected project: ${selectedProject && selectedProject.startsWith("id:") ? selectedProject.split(":").slice(2).join(":") : selectedProject}`}
                      </div>
                    </div>
                  </div>

                  {/* View Mode Toggle Pill Container (Center) */}
                  <div className="d-flex justify-content-center">
                    <div
                      className="d-inline-flex p-1 bg-light rounded-pill border shadow-xs"
                      style={{ borderColor: "#cbd5e1" }}
                    >
                      <button
                        type="button"
                        className="btn btn-sm rounded-pill px-3.5 py-1.5 fw-bold d-flex align-items-center gap-2 transition-all"
                        style={{
                          fontSize: "13px",
                          backgroundColor: marketViewMode === "location" ? "#448C74" : "transparent",
                          borderColor: "transparent",
                          color: marketViewMode === "location" ? "#ffffff" : "#475569",
                          boxShadow: marketViewMode === "location" ? "0 2px 8px rgba(68,140,116,0.35)" : "none"
                        }}
                        onClick={() => setMarketViewMode("location")}
                      >
                        <FaMapMarkerAlt size={14} style={{ color: marketViewMode === "location" ? "#ffffff" : "#448C74" }} />
                        <span>Location</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm rounded-pill px-3.5 py-1.5 fw-bold d-flex align-items-center gap-2 transition-all"
                        style={{
                          fontSize: "13px",
                          backgroundColor: marketViewMode === "catchment" ? "#448C74" : "transparent",
                          borderColor: "transparent",
                          color: marketViewMode === "catchment" ? "#ffffff" : "#475569",
                          boxShadow: marketViewMode === "catchment" ? "0 2px 8px rgba(68,140,116,0.35)" : "none"
                        }}
                        onClick={() => setMarketViewMode("catchment")}
                      >
                        <FaCrosshairs size={14} style={{ color: marketViewMode === "catchment" ? "#ffffff" : "#448C74" }} />
                        <span>Catchment ({appliedRadius >= 1000 ? `${appliedRadius / 1000}km` : `${appliedRadius}m`})</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm rounded-pill px-3.5 py-1.5 fw-bold d-flex align-items-center gap-2 transition-all"
                        style={{
                          fontSize: "13px",
                          backgroundColor: marketViewMode === "nearby" ? "#448C74" : "transparent",
                          borderColor: "transparent",
                          color: marketViewMode === "nearby" ? "#ffffff" : "#475569",
                          boxShadow: marketViewMode === "nearby" ? "0 2px 8px rgba(68,140,116,0.35)" : "none"
                        }}
                        onClick={() => setMarketViewMode("nearby")}
                      >
                        <FaBuilding size={14} style={{ color: marketViewMode === "nearby" ? "#ffffff" : "#448C74" }} />
                        <span>Nearby Projects</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Settings Container (Right) */}
                  <div className="d-flex align-items-center justify-content-end gap-3 flex-grow-1 flex-wrap" style={{ flexBasis: "0", minWidth: "250px" }}>
                    {/* Catchment Radius Settings */}
                    {marketViewMode === "catchment" && (
                      <div
                        className="d-inline-flex align-items-center gap-2 bg-light px-3 py-1.5 rounded-pill border shadow-xs"
                        style={{ borderColor: "#cbd5e1" }}
                      >
                        <div className="d-flex align-items-center gap-1 text-secondary pe-2 border-end me-1" style={{ borderColor: "#cbd5e1" }}>
                          <FaRulerCombined size={13} style={{ color: "#448C74" }} />
                          <span className="fw-bold text-dark ms-1" style={{ fontSize: "13px" }}>Radius:</span>
                        </div>

                        <select
                          value={[500, 1000, 2000, 3000, 5000].includes(Number(inputRadius)) ? inputRadius : "custom"}
                          onChange={(e) => {
                            if (e.target.value !== "custom") {
                              const val = Number(e.target.value);
                              setInputRadius(val);
                              setAppliedRadius(val);
                            }
                          }}
                          className="form-select form-select-sm px-2.5 py-1 fw-bold rounded-2 border"
                          style={{
                            fontSize: "13px",
                            color: "#1e293b",
                            backgroundColor: "#ffffff",
                            borderColor: "#cbd5e1",
                            cursor: "pointer",
                            width: "auto"
                          }}
                        >
                          <option value="500">500m (0.5km)</option>
                          <option value="1000">1000m (1.0km)</option>
                          <option value="2000">2000m (2.0km)</option>
                          <option value="3000">3000m (3.0km)</option>
                          <option value="5000">5000m (5.0km)</option>
                          <option value="custom">Custom Value...</option>
                        </select>

                        <div className="d-flex align-items-center ms-1">
                          <input
                            type="number"
                            min="100"
                            max="20000"
                            step="100"
                            value={inputRadius}
                            onChange={(e) => setInputRadius(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = Math.max(100, Number(inputRadius) || 1000);
                                setInputRadius(val);
                                setAppliedRadius(val);
                              }
                            }}
                            className="form-control form-control-sm px-2.5 py-1 text-center fw-bold rounded-2 border shadow-inner"
                            style={{
                              width: "80px",
                              backgroundColor: "#ffffff",
                              fontSize: "13px",
                              color: "#1e293b",
                              borderColor: "#cbd5e1",
                              outline: "none"
                            }}
                            placeholder="Meters"
                          />
                          <span className="text-muted fw-bold ms-1" style={{ fontSize: "12px" }}>mtrs</span>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm rounded-pill px-3.5 py-1 fw-bold text-white d-flex align-items-center gap-1.5 shadow-sm transition-all ms-1"
                          style={{
                            backgroundColor: "#448C74",
                            borderColor: "#448C74",
                            fontSize: "13px",
                            boxShadow: "0 2px 6px rgba(68,140,116,0.3)"
                          }}
                          onClick={() => {
                            const val = Math.max(100, Number(inputRadius) || 1000);
                            setInputRadius(val);
                            setAppliedRadius(val);
                          }}
                        >
                          <FaCheck size={11} />
                          <span>Apply</span>
                        </button>
                      </div>
                    )}

                    {/* Nearby Projects Selector */}
                    {marketViewMode === "nearby" && (
                      <div
                        className="d-inline-flex align-items-center gap-2 bg-light px-3 py-1.5 rounded-pill border shadow-xs"
                        style={{ borderColor: "#cbd5e1" }}
                      >
                        <div className="d-flex align-items-center gap-1 text-secondary pe-2 border-end me-1" style={{ borderColor: "#cbd5e1" }}>
                          <FaBuilding size={13} style={{ color: "#448C74" }} />
                          <span className="fw-bold text-dark ms-1" style={{ fontSize: "13px" }}>Select Project:</span>
                        </div>

                        {(() => {
                          const projectOptions = nearbyProjects.map((p, idx) => ({
                            value: p.project_id ? `id:${p.project_id}:${p.project_name}` : p.project_name,
                            label: `${p.project_name} (${p.distance_formatted} away • ${p.total_transactions} sales)`,
                            project: p,
                            index: idx + 1
                          }));
                          return (
                            <Select
                              options={projectOptions}
                              value={projectOptions.find(opt => opt.value === selectedProject) || null}
                              onChange={(selectedOption) => setSelectedProject(selectedOption ? selectedOption.value : "all")}
                              formatOptionLabel={formatProjectOption}
                              styles={customSelectStyles}
                              placeholder="Select a project..."
                              isSearchable={true}
                              classNamePrefix="custom-select"
                            />
                          );
                        })()}

                        <button
                          type="button"
                          className="btn btn-sm rounded-pill px-3 py-1 fw-bold d-flex align-items-center gap-1.5 shadow-xs transition-all ms-1"
                          style={{
                            fontSize: "12px",
                            backgroundColor: "#eef7f4",
                            color: "#448C74",
                            borderColor: "#a3d9c9"
                          }}
                          disabled={loadingNearbyProjects}
                          onClick={() => setNearbyLimit((prev) => prev + 5)}
                          title="Load the next 5 nearest competitor projects"
                        >
                          <FaPlus size={10} />
                          <span>Show More (+5)</span>
                        </button>

                        {loadingNearbyProjects && (
                          <span className="spinner-border spinner-border-sm text-success ms-1" role="status" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {(() => {
                let pId = null;
                let pName = "all";
                if (selectedProject && selectedProject !== "all") {
                  if (String(selectedProject).startsWith("id:")) {
                    const parts = selectedProject.split(":");
                    pId = parts[1];
                    pName = parts.slice(2).join(":");
                  } else {
                    const found = nearbyProjects.find(p => String(p.project_id) === String(selectedProject) || p.project_name === selectedProject);
                    if (found) {
                      pId = found.project_id;
                      pName = found.project_name;
                    } else {
                      pName = selectedProject;
                    }
                  }
                }
                return (
                  <div className="row g-4">
                    <div className="col-lg-6">
                      <PricerateAnalysis viewMode={marketViewMode} catchmentRadius={appliedRadius} selectedProject={pName} selectedProjectId={pId} />
                    </div>
                    <div className="col-lg-6">
                      <SaleAnalysis viewMode={marketViewMode} catchmentRadius={appliedRadius} selectedProject={pName} selectedProjectId={pId} />
                    </div>
                    <div className="col-lg-6">
                      <SupplyDemandAnalysis option="demand" viewMode={marketViewMode} catchmentRadius={appliedRadius} selectedProject={pName} selectedProjectId={pId} />
                    </div>
                    <div className="col-lg-6">
                      <SupplyDemandAnalysis option="supply" viewMode={marketViewMode} catchmentRadius={appliedRadius} selectedProject={pName} selectedProjectId={pId} />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Section 1.4: Unit Design */}
            <div className="col-12 fade-in-up stagger-5">
              <div className="row g-4">
                <div className="col-12">
                  {/* <Marketanalysis calculationMode={calculationMode} setCalculationMode={setCalculationMode} />*/}

                  {/* Rate Simulator Section */}

                  {/* Predictive Rate Simulator Section */}
                  &nbsp;
                  &nbsp;
                  {/* Predictive Rate Simulator Section - Moved OUTSIDE market-analysis div */}
                  <div
                    id="predictive-rate-sim"
                    className="col-12 fade-in-up stagger-5"
                    style={{ scrollMarginTop: "120px" }}
                  >
                    <SectionHero
                      id="predictive-rate-sim-hero"
                      title="Predictive Rate Simulator"
                      description="Simulate current trends and model predictive market rates using historical indicators and risk factors."
                      icon={FaChartBar}
                      illustration="/assets/illustrations/predictive-rate.jpg"
                      comingSoon={true}
                    />
                    <div className="row g-4 align-items-stretch mt-2 d-none">
                      <div className="col-12 d-flex">
                        <RateSim />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Building Design Header */}
                  <SectionHero
                    id="section-building"
                    title="Product Mix Design"
                    description="Strategically design your product mix architecture to maximize ecosystem value and drive sustainable growth."
                    icon={FaCompassDrafting}
                    illustration="/assets/illustrations/product-mix.jpg"
                  />



                  <div className="row g-4 align-items-stretch mt-4">
                    <div className="col-12 d-flex">
                      <ProductMixTicketSize />
                    </div>
                  </div>
                </div>


                <div className="col-12">
                  <RequiredParking />
                </div>
                {/* <div className="col-12">
                <div className="row g-4 align-items-stretch">
                  <div className="col-lg-8 d-flex">
                    <BuildingDesign />
                  </div>
                  <div className="col-lg-4 d-flex">
                    <BuildingResults />
                  </div>
                </div>
              </div> */}
              </div>
            </div>

            {/* Section: Charts - Hidden for now as they are integrated in RevenueProjection2 */}
            {/* <div className="col-12 fade-in-up stagger-6">
  <div className="row g-4">
    <div className="col-lg-3">
      <PricerateAnalysis />
    </div>
    <div className="col-lg-3">
      <SaleAnalysis />
    </div>
    <div className="col-lg-3">
      <SupplyDemandAnalysis option="demand" />
    </div>
    <div className="col-lg-3">
      <SupplyDemandAnalysis option="supply" />
    </div>
  </div>
</div> */}

            <SectionHero
              id="section-revenue-heading"
              title="Revenue"
              description="Forecast potential revenue and map exponential growth trajectories based on dynamic pricing models."
              icon={FaHandHoldingDollar}
              illustration="/assets/illustrations/revenue.jpg"
            />

            {/* Scenario Revenue Dashboard */}
            <div className="col-12 fade-in-up stagger-7">
              <ScenarioRevenueDashboard />
            </div>


            <SectionHero
              id="section-cost-heading"
              title="Cost Details"
              description="Analyze project budgets, manage ledger expenses, and track financial allocations comprehensively."
              icon={FaCalculator}
              illustration="/assets/illustrations/cost-details.jpg"
            />

            {/* Cost Of Project Details (New Section) */}
            <div className="col-12 fade-in-up stagger-7 mb-4">
              <CostOfProjectDetails />
            </div>

            {/* Old Cost Details sections removed */}

            <SectionHero
              id="section-means-finance-heading"
              title="Means Of Finance"
              description="Explore funding sources, investment nodes, and smart financing options to secure capital."
              icon={FaHandHoldingDollar}
              illustration="/assets/illustrations/means-finance.jpg"
            />

            <div className="col-12 fade-in-up stagger-7">
              <MeansOfFinance />
            </div>

            {/* IRR Calculator Section */}
            <SectionHero
              id="section-irr-calculator-heading"
              title="Project IRR"
              description="Calculate the Internal Rate of Return (IRR) to measure profitability and benchmark investment performance."
              icon={FaCalculator}
              illustration="/assets/illustrations/irr-calculator.jpg"
            />

            <div id="section-irr-calculator" className="col-12 fade-in-up stagger-7 mb-4">
              <FeasibilityIrrSection />
            </div>

            {/* Section 11: Generate Feasibility Report */}
            <SectionHero
              id="section-generate-report"
              title="Generate Feasibility Report"
              description="Compile all land parameters, zoning intelligence, product mix, revenue projections, cost outflow, and IRR calculations into a comprehensive PDF report."
              icon={FaFilePdf}
              illustration="/assets/illustrations/generate-report.jpg"
            />

            <div className="col-12 fade-in-up stagger-7 mb-5">
              <div className="card shadow-sm border-0 rounded-4 overflow-hidden" style={{ background: "#ffffff" }}>
                <div className="card-body p-4 p-lg-5 text-center">
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: "64px", height: "64px", background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", color: "#0284c7" }}
                  >
                    <FaFilePdf size={28} />
                  </div>
                  <h4 className="fw-bold text-dark mb-2">Project Feasibility Report</h4>
                  <p className="text-muted mx-auto mb-4" style={{ maxWidth: "560px", fontSize: "14px" }}>
                    Export a comprehensive, executive-ready feasibility study covering zoning compliance, market research, revenue projections, cost distributions, and multi-scenario investment metrics.
                  </p>

                  {reportError && (
                    <div className="alert alert-warning py-2 px-3 mx-auto mb-4 d-flex align-items-center justify-content-center gap-2" style={{ fontSize: "13px", borderRadius: "10px", maxWidth: "500px" }}>
                      <FaCircleInfo />
                      <span>{reportError}</span>
                    </div>
                  )}

                  <div className="d-flex justify-content-center">
                    <button
                      className="btn btn-lg rounded-pill px-5 py-3 fw-bold text-white shadow d-flex align-items-center gap-3"
                      style={{
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "none",
                        fontSize: "16px",
                        transition: "all 0.3s ease",
                      }}
                      onClick={handleDownloadReport}
                      disabled={reportDownloading}
                    >
                      {reportDownloading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" />
                          <span>Generating Feasibility Report...</span>
                        </>
                      ) : (
                        <>
                          <FaDownload size={18} />
                          <span>Download Feasibility Report (PDF)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Usage & Cost Panel — rendered outside main scroll area */}
      {activeSection === "usage-cost" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1200,
          background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)",
          display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
        }} onClick={(e) => { if (e.target === e.currentTarget) setActiveSection("land-identification"); }}>
          <div style={{
            width: "min(900px, 95vw)", height: "100vh", overflowY: "auto",
            background: "#f8fafc", boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "16px 20px", background: "#fff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              position: "sticky", top: 0, zIndex: 1,
            }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaDatabase size={14} color="#4f46e5" /> Usage &amp; Cost
              </span>
              <button
                onClick={() => setActiveSection("land-identification")}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "20px", color: "#64748b", lineHeight: 1 }}
                title="Close"
              >✕</button>
            </div>
            <UsageCostTab />
          </div>
        </div>
      )}

      {/* Dashboard Modal */}
      <Dashboard
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
      />
    </div>
    </TokenLedgerProvider>
  );
};

export default Index;
