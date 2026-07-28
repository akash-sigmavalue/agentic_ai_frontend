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
import { FaTools, FaCalendarAlt, FaParking, FaRoad } from "react-icons/fa";
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

const sidebarButtons = [
  { id: "land-fsi", label: "Land And FSI Details", icon: FaMountainCity },
  { id: "market-analysis", label: "Market Research", icon: FaChartLine },
  { id: "predictive-rate-sim", label: "Predictive Rate Simulator", icon: FaChartBar },
  { id: "building", label: "Product Mix Design", icon: FaCompassDrafting },
  { id: "ticket-size", label: "Ticket Size Calculation", icon: FaCompassDrafting },
  { id: "revenue", label: "Product Mix- Ticket size Simulation", icon: FaHandHoldingDollar },
  { id: "revenue-details", label: "Revenue", icon: FaHandHoldingDollar },
  { id: "cost-details", label: "Cost Details", icon: FaCalculator },
  { id: "means-finance", label: "Means Of Finance", icon: FaHandHoldingDollar },
  { id: "cashflows", label: "Cashflows and IRR", icon: FaChartLine },
  { id: "Dashboard", label: "Dashboard", icon: FaChartLine },
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
  const [activeSection, setActiveSection] = useState("land-fsi");
  const [calculationMode, setCalculationMode] = useState("carpet"); // Lifted state: 'carpet' or 'saleable'
  const [excelLogicSelected, setExcelLogicSelected] = useState(true);
  const [bayesianOptimizationSelected, setBayesianOptimizationSelected] =
    useState(true);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
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
            backgroundColor: theme === "dark" ? "#2c2e31" : "#1a1c1e",
          }}
        >
          <div className="sidebar-header mb-4">
            <h4 className="fw-bold mb-0" style={{ color: "#fff" }}>
              Simulator 361
            </h4>
            <small className="opacity-75">"Extra Degree of Insight"</small>
          </div>

          <ul className="sidebar-nav">
            {/* {sidebarButtons.map((btn) => (
              <li key={btn.id}>
                <button
                  className={`nav-btn ${activeSection === btn.id ? "active" : ""}`}
                  onClick={() => {
                    if (btn.id === "Dashboard") {
                      setShowDashboard(true);
                    } else if (btn.id === "predictive-rate-sim") {
                      setActiveSection(btn.id);
                      // Scroll directly to the RateSim component's container
                      document.getElementById(`predictive-rate-sim`)?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      setActiveSection(btn.id);
                      document
                        .getElementById(`section-${btn.id}`)
                        ?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  <i className={`fas ${btn.icon}`}></i>
                  {btn.label}
                </button>
              </li>
            ))} */}
            {sidebarButtons.map((btn) => {
              const Icon = btn.icon;

              return (
                <li key={btn.id}>
                  <button
                    className={`nav-btn ${activeSection === btn.id ? "active" : ""}`}
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
                    <Icon className="nav-btn-icon" />
                    {btn.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto pt-4">
            <div className="bg-white bg-opacity-10 rounded-4 p-3 border border-white border-opacity-10">
              <p className="small mb-0 opacity-75">
                <FaCircleInfo className="me-2" />
                Sidebar navigation provides quick access to simulation stages.
              </p>
            </div>
          </div>
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
            width: 300px;
            color: #fff;
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            box-shadow: 4px 0 15px rgba(0,0,0,0.1);
            z-index: 100;
          }

          .sidebar-nav {
            list-style: none;
            padding: 0;
            margin: 20px 0;
          }

          .sidebar-nav li {
            margin-bottom: 12px;
          }

          .nav-btn {
            width: 100%;
            background: transparent;
            border: none;
            text-align: left;
            font-size: 15px;
            color: rgba(255, 255, 255, 0.7);
            padding: 14px 20px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
          }

          .nav-btn:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            transform: translateX(5px);
          }

          .nav-btn.active {
            background: #448C74; /* Brand Green Accents */
            color: #fff;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(68, 140, 116, 0.3);
          }

          .nav-btn.active .nav-btn-icon {
            color: #fff;
          }

          .nav-btn .nav-btn-icon {
            font-size: 18px;
            width: 24px;
            min-width: 24px;
            text-align: center;
            color: rgba(255, 255, 255, 0.5);
            transition: color 0.2s;
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
                <div className="col-lg-8">
                  <LandDetailsForm
                    onCalculate={handleLandCalculation}
                    updateingUI={updateingUI}
                    setUpdateUI={setUpdateUI}
                  />
                </div>
                <div className="col-lg-4">
                  <LandDetailsOutput
                    results={landResults}
                    updateingUI={updateingUI}
                  />
                </div>
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
              <div className="row g-4">
                <div className="col-lg-6">
                  <PricerateAnalysis />
                </div>
                <div className="col-lg-6">
                  <SaleAnalysis />
                </div>
                <div className="col-lg-6">
                  <SupplyDemandAnalysis option="demand" />
                </div>
                <div className="col-lg-6">
                  <SupplyDemandAnalysis option="supply" />
                </div>
              </div>
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
                <div className="col-12 fade-in-up stagger-5" style={{ marginTop: '2rem' }}>
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
