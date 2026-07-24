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
} from "react-icons/fa6";
import { FaTools, FaCalendarAlt, FaParking, FaRoad, FaLayerGroup, FaChevronRight, FaMapMarkerAlt, FaCrosshairs, FaRulerCombined, FaCheck, FaSlidersH, FaFilter, FaBuilding, FaPlus } from "react-icons/fa";
import { useState, useEffect } from "react";
import Header from "./Header";
import LandDetailsForm from "./LandDetailsForm";
import LandDetailsOutput from "./LandDetailsOutput";
import FSIProposalForm from "./FSIProposalForm";
import FSIProposalOutput from "./FSIProposalOutput";
import RevenueForm from "./LocationForm";
import RevenueOutput from "./LocationOutput";
import CostForm from "./CostForm";
import CostOutput from "./CostOutput";
import MeansOfFinance from "./MeansOfFinance";
import Dashboard from "./Dashboard";
import { useLegacyNavigate as useNavigate, useLegacyLocation as useLocation } from "@/components/feasibility_agent/useLegacyNavigate"; import Link from "next/link";
import AreaCalculationForm from "./AreaCalculationForm";
import AreaCalculationResult from "./AreaCalculationResult";
import UnitDesignStructure from "./UnitDesignStructure";
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
import { apiUrl } from "@/lib/api-client";

const sidebarButtons = [
  { id: "land-identification", label: "Land Identification", subtitle: "Coordinate based auto-fill", icon: FaMountainCity },
  { id: "regulatory-intelligence", label: "Regulatory Intelligence", subtitle: "Zoning & rules", icon: FaCircleInfo },
  { id: "land-fsi", label: "Land And FSI Details", subtitle: "Web + document assisted", icon: FaMountainCity },
  { id: "market-analysis", label: "Market Research", subtitle: "Market trends", icon: FaChartLine },
  { id: "predictive-rate-sim", label: "Predictive Rate Simulator", subtitle: "Rate simulation", icon: FaChartBar },
  { id: "building", label: "Product Mix Design", subtitle: "Mix design", icon: FaCompassDrafting },
  { id: "ticket-size", label: "Ticket Size Calculation", subtitle: "Mix and ticket sizing", icon: FaCompassDrafting },
  { id: "revenue", label: "Product Mix- Ticket size Simulation", subtitle: "Ticket size impact simulation", icon: FaHandHoldingDollar },
  { id: "revenue-details", label: "Revenue", subtitle: "Detailed projection", icon: FaHandHoldingDollar },
  { id: "cost-details", label: "Cost Details", subtitle: "Project costs", icon: FaCalculator },
  { id: "means-finance", label: "Means Of Finance", subtitle: "Funding sources", icon: FaHandHoldingDollar },
  { id: "cashflows", label: "Cashflows and IRR", subtitle: "Monte Carlo + Bayesian", icon: FaChartLine },
  { id: "Dashboard", label: "Dashboard", subtitle: "Overview", icon: FaChartLine },
];

const Index = () => {
  const theme = "light";
  const navigate = useNavigate();
  const [landResults, setLandResults] = useState(null);
  const [fsiProposalData, setFSIProposalData] = useState(null);
  const [areaCalculationData, setAreaCalculationData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [costData, setCostData] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [zoningType, setZoningType] = useState("");
  const [location, setLocation] = useState("");
  const [updateingUI, setUpdateUI] = useState(false);
  const [activeSection, setActiveSection] = useState("land-identification");
  const [calculationMode, setCalculationMode] = useState("carpet"); // Lifted state: 'carpet' or 'saleable'
  const [marketViewMode, setMarketViewMode] = useState(() => {
    if (typeof window === "undefined") return "location";
    try {
      const saved = localStorage.getItem("market research");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.viewMode) return parsed.viewMode;
      }
    } catch (e) {
      console.error("Error reading market research payload:", e);
    }
    return "location";
  });

  const [appliedRadius, setAppliedRadius] = useState(() => {
    if (typeof window === "undefined") return 1000;
    try {
      const saved = localStorage.getItem("market research");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.radius) return Number(parsed.radius) || 1000;
      }
    } catch (e) {
      console.error("Error reading catchment radius payload:", e);
    }
    return 1000;
  });

  const [inputRadius, setInputRadius] = useState(() => appliedRadius);
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
  const routerLocation = useLocation();

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedLandResults = localStorage.getItem("landDetailsResults");
    const savedZoning = localStorage.getItem("zoningType");
    const savedLandForm = localStorage.getItem("landDetailsForm");
    const savedFSI = localStorage.getItem("fsiProposalData");
    const savedArea = localStorage.getItem("areaCalculationForm");
    const savedRevenue = localStorage.getItem("revenueForm");
    const savedCost = localStorage.getItem("costForm");

    if (savedLandResults) setLandResults(JSON.parse(savedLandResults));
    if (savedZoning) setZoningType(savedZoning);
    if (savedLandForm) {
      const landForm = JSON.parse(savedLandForm);
      setLocation(landForm.location || "");
    }
    if (savedFSI) setFSIProposalData(JSON.parse(savedFSI));
    if (savedArea) setAreaCalculationData(JSON.parse(savedArea));
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

  const handleFSIProposalSave = (data) => {
    setFSIProposalData(data);
  };

  const handleAreaCalculationSave = (data) => {
    setAreaCalculationData(data);
  };

  const handleRevenueSave = (data) => {
    setRevenueData(data);
  };

  const handleCostSave = (data) => {
    setCostData(data);
  };

  const handleUnitDesignSave = () => { };

  return (
    <div
      className={`min-vh-100 theme-${theme}`}
      style={{
        backgroundColor: theme === "dark" ? "#1e1e2f" : "#f3f5f9",
      }}
    >
      <Header />

      <div className="dashboard-container">
        {/* Sidebar Nav Component */}
        <aside
          className="sidebar"
          style={{
            backgroundColor: theme === "dark" ? "#2c2e31" : "#ffffff",
          }}
        >
          <div className="sidebar-header mb-4 d-flex align-items-center">
            <div className="sidebar-logo-icon me-3">
              <FaLayerGroup size={20} color="#fff" />
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-dark" style={{fontSize: "18px"}}>
                Feasibility Agent
              </h5>
              <small className="text-muted" style={{fontSize: "13px"}}>Section workflow</small>
            </div>
          </div>

          <div className="sidebar-openai-pill mb-4">
            <span className="fw-bold text-dark" style={{fontSize: "14px"}}>OpenAI API</span>
            <span className="badge rounded-pill config-badge">Configured</span>
          </div>

          <ul className="sidebar-nav">
            {sidebarButtons.map((btn, index) => {
              const isActive = activeSection === btn.id;

              return (
                <li key={btn.id}>
                  <button
                    className={`nav-btn-modern ${isActive ? "active" : ""}`}
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
                    <div className="nav-btn-modern-left">
                      <div className="nav-btn-modern-circle">
                        {index + 1}
                      </div>
                      <div className="nav-btn-modern-text text-start">
                        <div className="nav-btn-modern-title">{btn.label}</div>
                        <div className="nav-btn-modern-subtitle">{btn.subtitle}</div>
                      </div>
                    </div>
                    <FaChevronRight className="nav-btn-modern-chevron" />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main Content Component */}
        <main className="content-area">
          <div className="d-flex justify-content-end mb-4">
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
          <div
            id="section-land-identification"
            className="text-center mb-5 fade-in-up"
            style={{ scrollMarginTop: "120px" }}
          >
            <h1 className="display-5 fw-bold text-dark mb-2">
              <FaMountainCity
                className="me-3"
                style={{ color: "#448C74" }}
              />
              Land Identification
            </h1>
          </div>

          <div className="row g-4 mb-5">
            <div className="col-12 fade-in-up stagger-1">
              <LandIdentification />
            </div>
          </div>

          {/* Section 0.2: Regulatory Intelligence */}
          <div
            id="section-regulatory-intelligence"
            className="text-center mb-5 fade-in-up"
            style={{ scrollMarginTop: "120px" }}
          >
            <h1 className="display-5 fw-bold text-dark mb-2">
              <FaCircleInfo
                className="me-3"
                style={{ color: "#448C74" }}
              />
              Regulatory Intelligence
            </h1>
          </div>

          <div className="row g-4 mb-5">
            <div className="col-12 fade-in-up stagger-1">
              <RegulatoryIntelligence />
            </div>
          </div>

          {/* Section 1: Land Details */}
          <div
            id="section-land-fsi"
            className="text-center mb-5 fade-in-up"
            style={{ scrollMarginTop: "120px" }}
          >
            <h1 className="display-5 fw-bold text-dark mb-2">
              <FaMountainCity
                className="me-3"
                style={{ color: "#448C74" }}
              />
              Land And FSI Details
            </h1>
          </div>

          <style>{`
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
            height: calc(100vh - 72px); /* Adjust based on header height */
            width: 100%;
            overflow: hidden;
          }

          /* Sidebar Styling */
          .sidebar {
            width: 320px;
            color: #333;
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            border-right: 1px solid #f0f0f0;
            border-radius: 0 24px 24px 0;
            z-index: 100;
          }

          .sidebar-header {
            margin-bottom: 24px;
          }

          .sidebar-logo-icon {
            background-color: #1a1c23;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px !important;
          }

          .sidebar-openai-pill {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border: 1px solid #e9ecef;
            border-radius: 24px !important;
            padding: 12px 16px;
            background-color: #fff;
          }

          .config-badge {
            background-color: #d1fae5;
            color: #065f46;
            font-weight: 600;
            padding: 6px 12px;
          }

          .sidebar-nav {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .sidebar-nav li {
            margin-bottom: 12px;
          }

          .nav-btn-modern {
            width: 100%;
            background: #fff;
            border: 1px solid #f1f3f5;
            border-radius: 24px !important;
            padding: 12px 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .nav-btn-modern:hover {
            border-color: #dee2e6;
            background: #f8f9fa;
          }

          .nav-btn-modern.active {
            border: 2px solid #0f172a;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }

          .nav-btn-modern-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .nav-btn-modern-circle {
            width: 34px;
            height: 34px;
            min-width: 34px;
            border-radius: 50%;
            background-color: #f1f3f5;
            color: #495057;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            transition: all 0.2s ease;
          }

          .nav-btn-modern.active .nav-btn-modern-circle {
            background-color: #1a1c23;
            color: #fff;
          }

          .nav-btn-modern-text {
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .nav-btn-modern-title {
            font-weight: 700;
            font-size: 14px;
            color: #212529;
            margin-bottom: 2px;
            line-height: 1.2;
          }

          .nav-btn-modern-subtitle {
            font-size: 12px;
            color: #6c757d;
            line-height: 1.2;
          }

          .nav-btn-modern-chevron {
            color: #adb5bd;
            font-size: 12px;
          }

          /* Content Area Styling */
          .content-area {
            flex: 1;
            overflow-y: auto;
            background-color: #f3f5f9;
            padding: 40px;
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
                <div className={isLandV2Active ? "col-lg-12" : "col-lg-8"}>
                  <LandDetailsForm
                    onCalculate={handleLandCalculation}
                    updateingUI={updateingUI}
                    setUpdateUI={setUpdateUI}
                    onViewChange={(view) => setIsLandV2Active(view !== "V1")}
                  />
                </div>
                {!isLandV2Active && (
                  <div className="col-lg-4">
                    <LandDetailsOutput
                      results={landResults}
                      updateingUI={updateingUI}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 1.2: Permissible FSI and Proposed FSI */}
            <div className="col-12 fade-in-up stagger-2">
              <div className="row g-4">
                <div className="col-lg-8">
                  <FSIProposalForm
                    landResults={landResults}
                    zoningType={zoningType}
                    location={location}
                    onSave={handleFSIProposalSave}
                  />
                </div>
                <div className="col-lg-4">
                  <FSIProposalOutput
                    data={fsiProposalData}
                    landResults={landResults}
                    zoningType={zoningType}
                    location={location}
                  />
                </div>
              </div>
            </div>

            {/* New Section 1.3: Area Calculation */}
            <div className="col-12 fade-in-up stagger-3">
              <div className="row g-4">
                <div className="col-lg-8">
                  <AreaCalculationForm
                    onSave={handleAreaCalculationSave}
                    landResults={landResults}
                    fsiProposalData={fsiProposalData}
                    zoningType={zoningType}
                    location={location}
                  />
                </div>
                <div className="col-lg-4">
                  <AreaCalculationResult
                    data={areaCalculationData}
                    landResults={landResults}
                    fsiProposalData={fsiProposalData}
                    zoningType={zoningType}
                    location={location}
                  />
                </div>
              </div>
            </div>

            {/* Market Analysis Charts Section */}
            <div
              id="section-market-analysis"
              className="col-12 fade-in-up stagger-4 mt-5"
              style={{ scrollMarginTop: "120px" }}
            >
              <div className="text-center mb-4">
                <h3 className="fw-bold text-dark mb-1">
                  <FaChartLine className="me-3" style={{ color: "#448C74" }} />
                  Market Research
                </h3>
              </div>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <a
                    href="https://os.sigmavalue.ai/valuation"
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
                <div className="col-md-6">
                  <a
                    href="https://os.sigmavalue.ai/data_retrieval"
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
                      <div className="fw-bold text-dark">Data Retrival Agent</div>
                      <div className="small text-secondary">Open the data retrieval workspace</div>
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
                <div className="card-body p-3.5 d-flex align-items-center justify-content-between flex-wrap gap-3">
                  {/* Scope Info Label */}
                  <div className="d-flex align-items-center gap-3">
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

                  {/* Filter Controls Container */}
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    {/* View Mode Toggle Pill Container */}
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

                        <select
                          value={selectedProject}
                          onChange={(e) => setSelectedProject(e.target.value)}
                          className="form-select form-select-sm px-3 py-1 fw-bold rounded-2 border"
                          style={{
                            fontSize: "13px",
                            color: "#1e293b",
                            backgroundColor: "#ffffff",
                            borderColor: "#cbd5e1",
                            cursor: "pointer",
                            minWidth: "220px"
                          }}
                        >
                          {nearbyProjects.map((p, idx) => (
                            <option key={p.project_id || idx} value={p.project_id ? `id:${p.project_id}:${p.project_name}` : p.project_name}>
                              🏢 #{idx + 1} {p.project_name} ({p.distance_formatted} away • {p.total_transactions} sales)
                            </option>
                          ))}
                        </select>

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
                    <div className="text-center mb-4">
                      <h1 className="display-5 fw-bold text-dark mb-1">
                        <FaChartBar className="me-3" style={{ color: "#448C74" }} />
                        Predictive Rate Simulator
                      </h1>
                    </div>
                    <div className="row g-4 align-items-stretch mt-2">
                      <div className="col-12 d-flex">
                        <RateSim />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Building Design Header */}
                  <div
                    id="section-building"
                    className="text-center mb-4 mt-5 fade-in-up"
                    style={{ scrollMarginTop: "120px" }}
                  >
                    <h1 className="display-5 fw-bold text-dark mb-1">
                      <FaCompassDrafting className="me-3" style={{ color: "#448C74" }} />
                      Product Mix Design
                    </h1>
                  </div>

                  <div className="row g-4 align-items-stretch mt-4">
                    <div className="col-12 d-flex">
                      <UnitDesignStructure
                        onSave={handleUnitDesignSave}
                        calculationMode={calculationMode}
                        setCalculationMode={setCalculationMode}
                      />
                    </div>
                  </div>
                </div>

                {/* Revenue Projection (same as /revenuep2) - between Unit Design Structure and Required Parking */}
                <div className="col-12 fade-in-up stagger-5">
                  <RevenueProjection2 embedded />
                </div>
                {/* Section 2: Revenue Calculation Header */}
                <div
                  id="section-revenue"
                  className="text-center mb-4 mt-5 fade-in-up"
                  style={{ scrollMarginTop: "120px" }}
                >
                  <h1 className="display-5 fw-bold text-dark mb-1">
                    <FaHandHoldingDollar className="me-3" style={{ color: "#448C74" }} />
                    Product Mix- Ticket size Simulation
                  </h1>
                </div>
                {/* Excel Logic and Bayesian Optimization Buttons */}
                <div
                  className="col-12 fade-in-up stagger-5"
                  style={{ marginTop: "1.5rem" }}
                >
                  <div className="d-flex justify-content-center gap-4">
                    <button
                      className={`btn px-5 py-3 fw-semibold rounded-pill shadow-sm card-hover-lift transition-all ${excelLogicSelected
                        ? "btn-primary"
                        : "btn-outline-primary"
                        }`}
                      style={{
                        backgroundColor: excelLogicSelected
                          ? "#0d6efd"
                          : "transparent",
                        borderColor: "#0d6efd",
                        color: excelLogicSelected ? "#fff" : "#0d6efd",
                        opacity: excelLogicSelected ? 1 : 0.6,
                      }}
                      onClick={() => setExcelLogicSelected(!excelLogicSelected)}
                    >
                      <FaCalculator className="me-2" />
                      Base Logic
                    </button>
                    <button
                      className={`btn px-5 py-3 fw-semibold rounded-pill shadow-sm card-hover-lift transition-all ${bayesianOptimizationSelected
                        ? "btn-success"
                        : "btn-outline-success"
                        }`}
                      style={{
                        backgroundColor: bayesianOptimizationSelected
                          ? "#198754"
                          : "transparent",
                        borderColor: "#198754",
                        color: bayesianOptimizationSelected
                          ? "#fff"
                          : "#198754",
                        opacity: bayesianOptimizationSelected ? 1 : 0.6,
                      }}
                      onClick={() =>
                        setBayesianOptimizationSelected(
                          !bayesianOptimizationSelected,
                        )
                      }
                    >
                      <FaChartLine className="me-2" />
                      Bayesian Optimization
                    </button>
                  </div>
                </div>

                {/* Ticket Size Simulation & Bayesian Optimizer – Aligned Section by Section */}
                <div className="col-12">
                  <AlignedSimulationView
                    showTicketSizeSimulation={excelLogicSelected}
                    showBayesianOptimization={bayesianOptimizationSelected}
                  />
                </div>

                {/* Ticket Size Summary + Expected Revenue Comparison Section */}
                <div id="section-ticket-size" className="col-12 fade-in-up stagger-5" style={{ marginTop: '2rem', scrollMarginTop: '120px' }}>
                  <TicketSizeSummary />
                  <ExpectedRevenueComparison />
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

            <div
              id="section-revenue-heading"
              className="text-center mb-4 mt-5 fade-in-up"
              style={{ scrollMarginTop: "120px" }}
            >
              <h1 className="display-5 fw-bold text-dark mb-1">
                <FaHandHoldingDollar className="me-3" style={{ color: "#448C74" }} />
                Revenue
              </h1>
            </div>

            {/* Section 2: Revenue Details */}
            <div id="section-revenue-details" className="col-12 fade-in-up stagger-7">
              <div className="row g-4">
                <div className="col-lg-8">
                  <RevenueForm onSave={handleRevenueSave} />
                </div>
                <div className="col-lg-4">
                  <RevenueOutput data={revenueData} />
                </div>
              </div>
            </div>

            <div
              id="section-cost-heading"
              className="text-center mb-4 mt-5 fade-in-up"
              style={{ scrollMarginTop: "120px" }}
            >
              <h1 className="display-5 fw-bold text-dark mb-1">
                <FaCalculator className="me-3" style={{ color: "#448C74" }} />
                Cost Details
              </h1>
            </div>

            {/* Section 3: Cost Details */}
            <div id="section-cost-details" className="col-12 fade-in-up stagger-7">
              <div className="row g-4">
                <div className="col-lg-8">
                  <CostForm onSave={handleCostSave} />
                </div>
                <div className="col-lg-4">
                  <CostOutput data={costData} />
                </div>
              </div>
            </div>

            <div
              id="section-means-finance-heading"
              className="text-center mb-4 mt-5 fade-in-up"
              style={{ scrollMarginTop: "120px" }}
            >
              <h1 className="display-5 fw-bold text-dark mb-1">
                <FaHandHoldingDollar className="me-3" style={{ color: "#448C74" }} />
                Means Of Finance
              </h1>
            </div>

            <div className="col-12 fade-in-up stagger-7">
              <MeansOfFinance />
            </div>

            {/* Dashboard Buttons */}
            <div
              id="section-cashflows"
              className="col-12 text-center pt-4 fade-in-up"
              style={{ animationDelay: "0.9s" }}
            >
              <div className="d-flex justify-content-center align-items-center gap-4">
                <button
                  className="btn btn-primary btn-lg rounded-pill px-5 py-3 fw-semibold shadow-sm card-hover-lift"
                  onClick={() => setShowDashboard(true)}
                >
                  <FaChartLine className="me-2" />
                  View Dashboard
                </button>
                <button
                  className="btn btn-success btn-lg rounded-pill px-5 py-3 fw-semibold shadow-sm card-hover-lift"
                  onClick={() => navigate("/ownership-check")}
                >
                  <FaUsers className="me-2" />
                  Developer Share
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Dashboard Modal */}
      <Dashboard
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
      />
    </div>
  );
};

export default Index;
