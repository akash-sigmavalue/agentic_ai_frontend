// import { useState, useEffect } from "react";

// const FSIProposalForm = ({ landResults, zoningType, location, onSave }) => {
//   const [formData, setFormData] = useState({
//     Proposed_Basic_FSI: "",
//     Proposed_Premium_FSI: "",
//     Proposed_TDR_FSI: "",
//     Proposed_Max_Building_Potential: "",
//     Proposed_Commercial_Ancillary_Area_Constant: "",
//     Proposed_Residential_Ancillary_Area_Constant: "",
//     Permissible_Basic_FSI: "",
//     Permissible_Premium_FSI: "",
//     Permissible_TDR_FSI: "",
//     Permissible_Commercial_Ancillary_Area_Constant: "",
//     Permissible_Residential_Ancillary_Area_Constant: "",
//   });
//   const [savedZoningType, setSavedZoningType] = useState("");

//   useEffect(() => {
//     const savedData = localStorage.getItem('fsiProposalData');
//     if (savedData) {
//       setFormData(JSON.parse(savedData));
//     }

//     const savedZoning = localStorage.getItem('zoningType');
//     if (savedZoning) {
//       setSavedZoningType(savedZoning);
//     }
//   }, []);

//   // Auto-fill and calculate FSI values
//   useEffect(() => {
//     if (landResults) {
//       const isPuneThane = location === "Pune" || location === "Thane";

//       setFormData(prev => {
//         const newData = { ...prev };

//         // Always sync Permissible values if they are empty (initial load)
//         if (!newData.Permissible_Basic_FSI) newData.Permissible_Basic_FSI = landResults.basicFSI.toString();
//         if (!newData.Permissible_Premium_FSI) newData.Permissible_Premium_FSI = landResults.premium.toString();
//         if (!newData.Permissible_TDR_FSI) newData.Permissible_TDR_FSI = landResults.tdr.toString();

//         const currentZoning = (zoningType || savedZoningType)?.toLowerCase();
//         if ((currentZoning === 'residential' || currentZoning === 'mixed') && !newData.Permissible_Residential_Ancillary_Area_Constant) {
//           newData.Permissible_Residential_Ancillary_Area_Constant = "0.6";
//         }
//         if ((currentZoning === 'commercial' || currentZoning === 'mixed') && !newData.Permissible_Commercial_Ancillary_Area_Constant) {
//           newData.Permissible_Commercial_Ancillary_Area_Constant = "0.8";
//         }

//         // Auto-calculate Proposed Basic FSI for Pune/Thane
//         if (isPuneThane) {
//           newData.Proposed_Basic_FSI = landResults.basicFSI.toString();
//         }

//         // Calculate Proposed Max Building Potential
//         const pBasic = parseFloat(newData.Proposed_Basic_FSI) || 0;
//         const pPremium = parseFloat(newData.Proposed_Premium_FSI) || 0;
//         const pTdr = parseFloat(newData.Proposed_TDR_FSI) || 0;
//         newData.Proposed_Max_Building_Potential = (pBasic + pPremium + pTdr).toFixed(2);

//         // Calculate Permissible Max Building Potential
//         const permBasic = parseFloat(newData.Permissible_Basic_FSI) || 0;
//         const permPremium = parseFloat(newData.Permissible_Premium_FSI) || 0;
//         const permTdr = parseFloat(newData.Permissible_TDR_FSI) || 0;
//         newData.Permissible_Max_Building_Potential = (permBasic + permPremium + permTdr).toFixed(2);

//         return newData;
//       });
//     }
//   }, [
//     landResults,
//     location,
//     zoningType,
//     savedZoningType,
//     formData.Proposed_Premium_FSI,
//     formData.Proposed_TDR_FSI,
//     formData.Proposed_Basic_FSI,
//     formData.Permissible_Basic_FSI,
//     formData.Permissible_Premium_FSI,
//     formData.Permissible_TDR_FSI
//   ]);

//   const handleInputChange = (field, value) => {
//     setFormData(prev => ({ ...prev, [field]: value }));
//   };

//   const validateInput = (field, value, maxValue) => {
//     const numValue = parseFloat(value);
//     if (isNaN(numValue) || numValue < 0 || numValue > maxValue) {
//       alert(`Value must be between 0 and ${maxValue.toFixed(2)}`);
//       return false;
//     }
//     return true;
//   };

//   const handleSave = () => {
//     if (!landResults) {
//       alert("Please complete Section 1 first.");
//       return;
//     }

//     // Validate inputs
//     const isPuneThane = location === "Pune" || location === "Thane";

//     if (isPuneThane) {
//       if (formData.Proposed_Premium_FSI && !validateInput('Proposed_Premium_FSI', formData.Proposed_Premium_FSI, landResults.premium)) return;
//       if (formData.Proposed_TDR_FSI && !validateInput('Proposed_TDR_FSI', formData.Proposed_TDR_FSI, landResults.tdr)) return;
//     }

//     const currentZoning = (zoningType || savedZoningType)?.toLowerCase();

//     if (isPuneThane) {
//       if (currentZoning === 'commercial' && formData.Proposed_Commercial_Ancillary_Area_Constant) {
//         if (!validateInput('Proposed_Commercial_Ancillary_Area_Constant', formData.Proposed_Commercial_Ancillary_Area_Constant, 0.8)) return;
//       }

//       if (currentZoning === 'residential' && formData.Proposed_Residential_Ancillary_Area_Constant) {
//         if (!validateInput('Proposed_Residential_Ancillary_Area_Constant', formData.Proposed_Residential_Ancillary_Area_Constant, 0.6)) return;
//       }

//       if (currentZoning === 'mixed') {
//         if (formData.Proposed_Commercial_Ancillary_Area_Constant && !validateInput('Proposed_Commercial_Ancillary_Area_Constant', formData.Proposed_Commercial_Ancillary_Area_Constant, 0.8)) return;
//         if (formData.Proposed_Residential_Ancillary_Area_Constant && !validateInput('Proposed_Residential_Ancillary_Area_Constant', formData.Proposed_Residential_Ancillary_Area_Constant, 0.6)) return;
//       }
//     }

//     localStorage.setItem('fsiProposalData', JSON.stringify(formData));
//     onSave(formData);

//     // Dispatch custom events to trigger recalculation across all interconnected components
//     window.dispatchEvent(new CustomEvent('fsiProposalUpdated'));

//     // Also dispatch events for other components that depend on FSI data
//     window.dispatchEvent(new CustomEvent('revenueFormUpdated'));
//     window.dispatchEvent(new CustomEvent('costFormUpdated'));

//     alert("Permissible FSI and Proposed FSI data saved successfully!");
//   };

//   if (!landResults) {
//     return (
//       <div className="card">
//         <div className="card-body">
//           <h5 className="card-title">Permissible FSI and Proposed FSI (All Areas are in Sq Ft)</h5>
//           <p className="text-muted">Please complete Section 1 to access Permissible FSI and Proposed FSI form.</p>
//         </div>
//       </div>
//     );
//   }

//   const currentZoning = (zoningType || savedZoningType)?.toLowerCase();
//   const isPuneThane = location === "Pune" || location === "Thane";

//   return (
//     <div className="card">
//       <div className="card-body">
//         <h1 className="card-title" style={{ color: '#000000' }}>Permissible FSI Vs Proposed FSI</h1>
//         <div className="table-responsive">
//           <table className="table table-bordered">
//             <thead className="table-light">
//               <tr>
//                 <th className="text-start">Particulars</th>
//                 <th className="text-start">Permissible FSI</th>
//                 <th className="text-start">Proposed FSI</th>
//               </tr>
//             </thead>
//             <tbody>
//               <tr>
//                 <td className="fw-medium">Basic FSI</td>
//                 <td>
//                   {!isPuneThane ? (
//                     <input
//                       type="number"
//                       className="form-control form-control-sm"
//                       value={formData.Permissible_Basic_FSI}
//                       onChange={(e) => handleInputChange('Permissible_Basic_FSI', e.target.value)}
//                       placeholder="0.00"
//                       step="0.01"
//                     />
//                   ) : landResults.basicFSI.toFixed(2)}
//                 </td>
//                 <td>
//                   {!isPuneThane ? (
//                     <input
//                       type="number"
//                       className="form-control form-control-sm"
//                       value={formData.Proposed_Basic_FSI}
//                       onChange={(e) => handleInputChange('Proposed_Basic_FSI', e.target.value)}
//                       placeholder="0.00"
//                       step="0.01"
//                     />
//                   ) : landResults.basicFSI.toFixed(2)}
//                 </td>
//               </tr>
//               <tr>
//                 <td className="fw-medium">Premium FSI</td>
//                 <td>
//                   {!isPuneThane ? (
//                     <input
//                       type="number"
//                       className="form-control form-control-sm"
//                       value={formData.Permissible_Premium_FSI}
//                       onChange={(e) => handleInputChange('Permissible_Premium_FSI', e.target.value)}
//                       placeholder="0.00"
//                       step="0.01"
//                     />
//                   ) : landResults.premium.toFixed(2)}
//                 </td>
//                 <td>
//                   <input
//                     type="number"
//                     className="form-control form-control-sm"
//                     value={formData.Proposed_Premium_FSI}
//                     onChange={(e) => handleInputChange('Proposed_Premium_FSI', e.target.value)}
//                     placeholder="0.00"
//                     max={isPuneThane ? landResults.premium : undefined}
//                     step="0.01"
//                   />
//                 </td>
//               </tr>
//               <tr>
//                 <td className="fw-medium">TDR FSI</td>
//                 <td>
//                   {!isPuneThane ? (
//                     <input
//                       type="number"
//                       className="form-control form-control-sm"
//                       value={formData.Permissible_TDR_FSI}
//                       onChange={(e) => handleInputChange('Permissible_TDR_FSI', e.target.value)}
//                       placeholder="0.00"
//                       step="0.01"
//                     />
//                   ) : landResults.tdr.toFixed(2)}
//                 </td>
//                 <td>
//                   <input
//                     type="number"
//                     className="form-control form-control-sm"
//                     value={formData.Proposed_TDR_FSI}
//                     onChange={(e) => handleInputChange('Proposed_TDR_FSI', e.target.value)}
//                     placeholder="0.00"
//                     max={isPuneThane ? landResults.tdr : undefined}
//                     step="0.01"
//                   />
//                 </td>
//               </tr>
//               <tr>
//                 <td className="fw-medium">Max Building Potential</td>
//                 <td>{formData.Permissible_Max_Building_Potential || landResults.maxBuildingPotential.toFixed(2)}</td>
//                 <td>{formData.Proposed_Max_Building_Potential}</td>
//               </tr>

//               {currentZoning === 'residential' && (
//                 <tr>
//                   <td className="fw-medium">Ancillary Area for Residential</td>
//                   <td>
//                     {!isPuneThane ? (
//                       <input
//                         type="number"
//                         className="form-control form-control-sm"
//                         value={formData.Permissible_Residential_Ancillary_Area_Constant}
//                         onChange={(e) => handleInputChange('Permissible_Residential_Ancillary_Area_Constant', e.target.value)}
//                         placeholder="Percentage"
//                         step="0.01"
//                       />
//                     ) : "0.6"}
//                   </td>
//                   <td>
//                     <input
//                       type="number"
//                       className="form-control form-control-sm"
//                       value={formData.Proposed_Residential_Ancillary_Area_Constant}
//                       onChange={(e) => handleInputChange('Proposed_Residential_Ancillary_Area_Constant', e.target.value)}
//                       placeholder="Percentage"
//                       max={isPuneThane ? 0.6 : undefined}
//                       min={0}
//                       step="0.01"
//                     />
//                   </td>
//                 </tr>
//               )}

//               {currentZoning === 'commercial' && (
//                 <tr>
//                   <td className="fw-medium">Ancillary Area for Commercial</td>
//                   <td>
//                     {!isPuneThane ? (
//                       <input
//                         type="number"
//                         className="form-control form-control-sm"
//                         value={formData.Permissible_Commercial_Ancillary_Area_Constant}
//                         onChange={(e) => handleInputChange('Permissible_Commercial_Ancillary_Area_Constant', e.target.value)}
//                         placeholder="Percentage"
//                         step="0.01"
//                       />
//                     ) : "0.8"}
//                   </td>
//                   <td>
//                     <input
//                       type="number"
//                       className="form-control form-control-sm"
//                       value={formData.Proposed_Commercial_Ancillary_Area_Constant}
//                       onChange={(e) => handleInputChange('Proposed_Commercial_Ancillary_Area_Constant', e.target.value)}
//                       placeholder="Percentage"
//                       max={isPuneThane ? 0.8 : undefined}
//                       min={0}
//                       step="0.01"
//                     />
//                   </td>
//                 </tr>
//               )}

//               {currentZoning === 'mixed' && (
//                 <>
//                   <tr>
//                     <td className="fw-medium">Ancillary Area for Commercial</td>
//                     <td>
//                       {!isPuneThane ? (
//                         <input
//                           type="number"
//                           className="form-control form-control-sm"
//                           value={formData.Permissible_Commercial_Ancillary_Area_Constant}
//                           onChange={(e) => handleInputChange('Permissible_Commercial_Ancillary_Area_Constant', e.target.value)}
//                           placeholder="Percentage"
//                           step="0.01"
//                         />
//                       ) : "0.8"}
//                     </td>
//                     <td>
//                       <input
//                         type="number"
//                         className="form-control form-control-sm"
//                         value={formData.Proposed_Commercial_Ancillary_Area_Constant}
//                         onChange={(e) => handleInputChange('Proposed_Commercial_Ancillary_Area_Constant', e.target.value)}
//                         placeholder="Percentage"
//                         max={isPuneThane ? 0.8 : undefined}
//                         min={0}
//                         step="0.01"
//                       />
//                     </td>
//                   </tr>
//                   <tr>
//                     <td className="fw-medium">Ancillary Area for Residential</td>
//                     <td>
//                       {!isPuneThane ? (
//                         <input
//                           type="number"
//                           className="form-control form-control-sm"
//                           value={formData.Permissible_Residential_Ancillary_Area_Constant}
//                           onChange={(e) => handleInputChange('Permissible_Residential_Ancillary_Area_Constant', e.target.value)}
//                           placeholder="Percentage"
//                           step="0.01"
//                         />
//                       ) : "0.6"}
//                     </td>
//                     <td>
//                       <input
//                         type="number"
//                         className="form-control form-control-sm"
//                         value={formData.Proposed_Residential_Ancillary_Area_Constant}
//                         onChange={(e) => handleInputChange('Proposed_Residential_Ancillary_Area_Constant', e.target.value)}
//                         placeholder="Percentage"
//                         max={isPuneThane ? 0.6 : undefined}
//                         min={0}
//                         step="0.01"
//                       />
//                     </td>
//                   </tr>
//                 </>
//               )}
//             </tbody>
//           </table>
//         </div>

//         <div className="mt-3">
//           <div className="row g-3">
//             <div className="col-6">
//               <button onClick={handleSave} className="btn btn-primary w-100">
//                 Save
//               </button>
//             </div>
//             <div className="col-6">
//               <button onClick={handleSave} className="btn btn-secondary w-100">
//                 Update
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default FSIProposalForm; 

import { apiUrl } from "@/lib/api-client";
import { useState, useEffect, useRef } from "react";

import { FaGlobe, FaFilePdf, FaMinus, FaExpandAlt, FaCompressAlt, FaTimes } from "react-icons/fa";

// Helper: read areaType from landDetailsForm in localStorage
const getAreaType = () => {
  try {
    if (typeof window === 'undefined') return '';
    const raw = localStorage.getItem('landDetailsForm');
    return raw ? (JSON.parse(raw)?.areaType || '') : '';
  } catch { return ''; }
};

const getStoredMaxPermissibleArea = () => {
  try {
    if (typeof window === 'undefined') return '';
    const raw = localStorage.getItem("landDetailsResults");
    const value = raw ? parseFloat(JSON.parse(raw)?.maxPermissibleArea) : 0;
    return Number.isFinite(value) && value > 0 ? value.toFixed(2) : "";
  } catch {
    return "";
  }
};

const getLandDetailsField = (fieldName) => {
  try {
    if (typeof window === 'undefined') return '';
    const raw = localStorage.getItem('landDetailsForm');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.[fieldName] || '';
  } catch {
    return '';
  }
};

const FSIProposalForm = ({ landResults, zoningType, location, onSave }) => {
  const [formData, setFormData] = useState({
    Proposed_Basic_FSI: "",
    Proposed_Premium_FSI: "",
    Proposed_TDR_FSI: "",
    Proposed_Max_Building_Potential: "",
    Proposed_Commercial_Ancillary_Area_Constant: "",
    Proposed_Residential_Ancillary_Area_Constant: "",
    Permissible_Basic_FSI: "",
    Permissible_Premium_FSI: "",
    Permissible_TDR_FSI: "",
    Permissible_Commercial_Ancillary_Area_Constant: "",
    Permissible_Residential_Ancillary_Area_Constant: "",
    Permissible_Other_FSI: "",
    Proposed_Other_FSI: "",
  });
  const [savedZoningType, setSavedZoningType] = useState("");
  const [activeView, setActiveView] = useState("default");
  const [secondPaneData, setSecondPaneData] = useState({
    permissibleFsi: "",
    grossFloorArea: "",
  });

  const [showAgentPopup, setShowAgentPopup] = useState(false);
  const [agentPopupMinimized, setAgentPopupMinimized] = useState(false);
  const [agentPopupMaximized, setAgentPopupMaximized] = useState(false);
  const [agentStatusLog, setAgentStatusLog] = useState([]);
  const [agentCurrentStatus, setAgentCurrentStatus] = useState("");
  const [agentAnswer, setAgentAnswer] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState(null);
  const [agentQuery, setAgentQuery] = useState("");

  const [showDocPopup, setShowDocPopup] = useState(false);
  const [docPopupMinimized, setDocPopupMinimized] = useState(false);
  const [docPopupMaximized, setDocPopupMaximized] = useState(false);
  const [docFiles, setDocFiles] = useState([]);
  const [lastUploadedFiles, setLastUploadedFiles] = useState([]);
  const [docQuestion, setDocQuestion] = useState("");
  const [docAnswer, setDocAnswer] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docStatus, setDocStatus] = useState("");
  const [docError, setDocError] = useState(null);
  const [docStatusLog, setDocStatusLog] = useState([]);

  const [agentPos, setAgentPos] = useState({ x: 0, y: 0 });
  const [agentSize, setAgentSize] = useState({ width: 420, height: 500 });
  const [docPos, setDocPos] = useState({ x: 0, y: 0 });
  const [docSize, setDocSize] = useState({ width: 420, height: 500 });

  const eventSourceRef = useRef(null);

  const handleCloseDocPopup = () => {
    setShowDocPopup(false);
    setDocLoading(false);
  };

  const handleDocAgentSubmit = async (e) => {
    if (e) e.preventDefault();
    if (docFiles.length === 0) {
      setDocError("Please select at least one PDF file first.");
      return;
    }
    if (!docQuestion.trim()) {
      setDocError("Please enter a question first.");
      return;
    }

    // Helper to check if two file lists are identical (checking length, name, size, lastModified)
    const filesMatch = (filesA, filesB) => {
      if (filesA.length !== filesB.length) return false;
      const serialize = (files) =>
        [...files]
          .map(f => `${f.name}-${f.size}-${f.lastModified}`)
          .sort()
          .join("|");
      return serialize(filesA) === serialize(filesB);
    };

    const skipUpload = filesMatch(docFiles, lastUploadedFiles);

    setDocLoading(true);
    setDocError(null);
    setDocAnswer("");

    if (skipUpload) {
      setDocStatus("Reusing previously processed documents. Querying answer...");
      setDocStatusLog([
        "Selected files are unchanged.",
        "Skipping document upload/processing...",
        "Sending query to Ask API..."
      ]);
    } else {
      setDocStatus("Uploading PDF documents...");
      setDocStatusLog([
        "Selected files: " + docFiles.map((f) => f.name).join(", "),
        "Initiating document upload..."
      ]);
    }

    try {
      if (!skipUpload) {
        const formDataObj = new FormData();
        docFiles.forEach((file) => {
          formDataObj.append("files", file);
          formDataObj.append("file", file);
        });

        const uploadResponse = await fetch(apiUrl("/user-input/documents"), {
          method: "POST",
          body: formDataObj,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed with status: ${uploadResponse.status}`);
        }

        setLastUploadedFiles(docFiles);
        setDocStatus("Documents uploaded successfully. Querying answer...");
        setDocStatusLog((prev) => [...prev, "Upload successful.", "Sending query to Ask API..."]);
      }

      const askResponse = await fetch(apiUrl("/user-input/ask"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: docQuestion,
          session_id: "test-session",
        }),
      });

      if (!askResponse.ok) {
        throw new Error(`Ask query failed with status: ${askResponse.status}`);
      }

      const result = await askResponse.json();

      setDocLoading(false);
      setDocStatus("Completed successfully.");
      setDocStatusLog((prev) => [...prev, "Response received.", "Completed."]);

      const answerContent = result.answer || result.response || result.output || result.content || result.result || (typeof result === 'string' ? result : JSON.stringify(result));
      setDocAnswer(answerContent);

    } catch (err) {
      console.error("Document agent sequential error:", err);
      setDocLoading(false);
      setDocStatus("Failed.");
      setDocStatusLog((prev) => [...prev, `Error: ${err.message}`]);
      setDocError(`An error occurred: ${err.message}`);
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (showDocPopup) {
      if (!docQuestion || docQuestion.startsWith("For given land parcel coordinat")) {
        const lat = getLandDetailsField('latitude');
        const lng = getLandDetailsField('longitude');
        const coordinates = (lat && lng) ? `${lat}, ${lng}` : '';
        const zoningVal = zoningType || getLandDetailsField('zoningType') || '';
        const developmentCategory = zoningVal ? zoningVal.charAt(0).toUpperCase() + zoningVal.slice(1).toLowerCase() : '';
        const roadWidth = getLandDetailsField('roadWidening') || '';
        const planningAuthority = getLandDetailsField('planningAdvisory') || '';

        setDocQuestion(`For given land parcel coordinates ${coordinates}, development catgeory is ${developmentCategory}, Road Width is ${roadWidth}, planning authority is ${planningAuthority}, Provide the maximum permissible FSI aslo provide table for it`);
      }
    }
  }, [showDocPopup, zoningType]);

  const handlePopupDragStart = (e, setPos, pos) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = pos.x;
    const initY = pos.y;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setPos({ x: initX + dx, y: initY + dy });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleCloseAgentPopup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setShowAgentPopup(false);
    setAgentLoading(false);
  };

  const handleWebDataAgentClick = (e) => {
    if (e) {
      e.stopPropagation();
    }

    const city = getLandDetailsField('location') === 'Other Location'
      ? getLandDetailsField('otherLocationName')
      : getLandDetailsField('location');
    const planningAuthority = getLandDetailsField('planningAdvisory');
    const lat = getLandDetailsField('latitude');
    const lng = getLandDetailsField('longitude');
    const coordinates = (lat && lng) ? `${lat}, ${lng}` : '';

    let authorityPart = planningAuthority ? `${planningAuthority}` : '';
    let coordinatesPart = coordinates ? `and location coordinates are: ${coordinates}` : '';
    let locationAndAuthority = [city, authorityPart].filter(Boolean).join(', ');
    let queryParts = [locationAndAuthority, coordinatesPart].filter(Boolean);
    const queryText = `Give me government land development documentation for ${queryParts.join(' ')}`;
    const encodedQuery = encodeURIComponent(queryText);

    setAgentQuery(queryText);
    setShowAgentPopup(true);
    setAgentPopupMinimized(false);
    setAgentStatusLog(["Initializing connection..."]);
    setAgentCurrentStatus("Initializing connection...");
    setAgentAnswer("");
    setAgentLoading(true);
    setAgentError(null);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = apiUrl(`/api/chat_stream?query=${encodedQuery}&no_cache=true`);

    try {
      const source = new EventSource(url);
      eventSourceRef.current = source;

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "status") {
            setAgentCurrentStatus(data.content);
            setAgentStatusLog((prev) => [...prev, data.content]);
          } else if (data.type === "chunk") {
            setAgentAnswer((prev) => prev + data.content);
          } else if (data.type === "done") {
            source.close();
            setAgentLoading(false);
            setAgentCurrentStatus("Completed successfully.");
          }
        } catch (err) {
          console.error("Error parsing SSE data:", err);
        }
      };

      source.onerror = (err) => {
        console.error("SSE connection error:", err);
        source.close();
        setAgentLoading(false);
        setAgentError("Connection lost or failed to load. Please try again.");
      };

    } catch (err) {
      console.error("Failed to establish EventSource:", err);
      setAgentLoading(false);
      setAgentError("Could not initiate agent stream.");
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;

    const parseInlineStyles = (lineText) => {
      if (!lineText) return "";
      let elements = [];
      let key = 0;
      let parts = lineText.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
      parts.forEach((part) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          elements.push(
            <strong key={key++} style={{ color: theme === "dark" ? "#ffffff" : "#111827", fontWeight: '700' }}>
              {part.slice(2, -2)}
            </strong>
          );
        } else if (part.startsWith('[') && part.includes('](')) {
          const match = part.match(/\[(.*?)\]\((.*?)\)/);
          if (match) {
            elements.push(
              <a
                key={key++}
                href={match[2]}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: theme === 'dark' ? '#4db896' : '#22c55e',
                  textDecoration: 'underline',
                  fontWeight: '600'
                }}
              >
                {match[1]}
              </a>
            );
          } else {
            elements.push(part);
          }
        } else {
          elements.push(part);
        }
      });
      return elements;
    };

    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) {
        i++;
        continue;
      }

      if (line.startsWith('# ')) {
        elements.push(
          <h2
            key={`h1-${i}`}
            style={{
              fontSize: '17px',
              fontWeight: '800',
              margin: '16px 0 10px',
              color: theme === "dark" ? "#f8fafc" : "#111827",
              borderBottom: `1px solid ${theme === "dark" ? "#2a303b" : "#e6ebf2"}`,
              paddingBottom: '6px'
            }}
          >
            {line.replace('# ', '')}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3
            key={`h2-${i}`}
            style={{
              fontSize: '15px',
              fontWeight: '800',
              margin: '14px 0 8px',
              color: theme === "dark" ? "#f8fafc" : "#111827",
              borderBottom: `1px solid ${theme === "dark" ? "#2a303b" : "#e6ebf2"}`,
              paddingBottom: '4px'
            }}
          >
            {line.replace('## ', '')}
          </h3>
        );
        i++;
        continue;
      }

      // Unordered Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const listItems = [];
        while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
          const itemText = lines[i].slice(2);
          listItems.push(
            <li key={`li-${i}`} style={{ marginBottom: '6px', fontSize: '13px', lineHeight: '1.5', color: theme === "dark" ? "#d1d5db" : "#374151" }}>
              {parseInlineStyles(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} style={{ paddingLeft: '20px', margin: '0 0 12px' }}>
            {listItems}
          </ul>
        );
        continue;
      }

      // Ordered Lists
      if (/^\d+\.\s/.test(line)) {
        const listItems = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          const match = lines[i].match(/^\d+\.\s(.*)/);
          const itemText = match ? match[1] : lines[i];
          listItems.push(
            <li key={`ol-li-${i}`} style={{ marginBottom: '6px', fontSize: '13px', lineHeight: '1.5', color: theme === "dark" ? "#d1d5db" : "#374151" }}>
              {parseInlineStyles(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ol key={`ol-${i}`} style={{ paddingLeft: '20px', margin: '0 0 12px' }}>
            {listItems}
          </ol>
        );
        continue;
      }

      // Tables
      if (line.startsWith('|')) {
        const tableRows = [];
        let isHeader = true;

        while (i < lines.length && lines[i].startsWith('|')) {
          const rowText = lines[i];
          if (rowText.includes(':---') || rowText.includes('---:')) {
            i++;
            continue;
          }

          const cells = rowText.split('|').map(c => c.trim());
          if (cells[0] === '') cells.shift();
          if (cells[cells.length - 1] === '') cells.pop();

          if (isHeader) {
            tableRows.push(
              <tr key={`tr-${i}`} style={{ borderBottom: `2px solid ${theme === 'dark' ? '#303744' : '#cbd5e1'}` }}>
                {cells.map((cell, idx) => (
                  <th
                    key={`th-${idx}`}
                    style={{
                      padding: '8px 12px',
                      fontWeight: '800',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      textAlign: 'left',
                      backgroundColor: theme === 'dark' ? '#232936' : '#f1f5f9',
                      color: theme === 'dark' ? '#f8fafc' : '#1e293b'
                    }}
                  >
                    {parseInlineStyles(cell)}
                  </th>
                ))}
              </tr>
            );
            isHeader = false;
          } else {
            tableRows.push(
              <tr key={`tr-${i}`} style={{ borderBottom: `1px solid ${theme === 'dark' ? '#2d3340' : '#e2e8f0'}` }}>
                {cells.map((cell, idx) => (
                  <td
                    key={`td-${idx}`}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: theme === 'dark' ? '#cbd5e1' : '#334155'
                    }}
                  >
                    {parseInlineStyles(cell)}
                  </td>
                ))}
              </tr>
            );
          }
          i++;
        }

        elements.push(
          <div key={`table-wrapper-${i}`} style={{ overflowX: 'auto', margin: '14px 0', border: `1px solid ${theme === 'dark' ? '#303744' : '#e2e8f0'}`, borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: theme === 'dark' ? '#1c222c' : '#ffffff' }}>
              <tbody>
                {tableRows}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Normal Paragraph
      elements.push(
        <p
          key={`p-${i}`}
          style={{
            margin: '0 0 10px',
            lineHeight: '1.6',
            fontSize: '13px',
            color: theme === "dark" ? "#cbd5e1" : "#334155"
          }}
        >
          {parseInlineStyles(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  const theme = "light";
  const agenticPermissibleFsiValue = (() => {
    const value = parseFloat(landResults?.maxPermissibleArea);
    return Number.isFinite(value) && value > 0
      ? value.toFixed(2)
      : getStoredMaxPermissibleArea();
  })();

  const secondPaneTheme = {
    cardBorder: theme === "dark" ? "#2f3642" : "#d9e2ed",
    cardBg: theme === "dark" ? "#1b2028" : "#ffffff",
    cardTitle: theme === "dark" ? "#f8fafc" : "#111827",
    cardCopy: theme === "dark" ? "#b8c0cc" : "#6b7280",
    inputBorder: theme === "dark" ? "#495063" : "#d8e0ea",
    inputBg: theme === "dark" ? "#222834" : "#ffffff",
    inputColor: theme === "dark" ? "#f8fafc" : "#111827",
    noteBorder: theme === "dark" ? "#3b4453" : "#d6dee8",
    noteBg: theme === "dark" ? "#191e26" : "#fbfdff",
    noteColor: theme === "dark" ? "#b8c0cc" : "#687384",
    noteIconBorder: theme === "dark" ? "#526071" : "#b7c4d3",
    noteIconColor: theme === "dark" ? "#d8e1ec" : "#6b7280",
    iconColor: theme === "dark" ? "#f8fafc" : "#1f2937",
    labelColor: theme === "dark" ? "#f8fafc" : "#111827",
  };

  const secondPaneStyles = {
    pane: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      width: "100%",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "14px",
      width: "100%",
    },
    card: {
      border: `1px solid ${secondPaneTheme.cardBorder}`,
      borderRadius: "16px",
      background: secondPaneTheme.cardBg,
      padding: "16px 18px",
      minHeight: "92px",
      boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      color: "inherit",
      width: "100%",
      display: "block",
      textAlign: "left",
    },
    cardIcon: {
      width: "18px",
      height: "18px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: secondPaneTheme.iconColor,
      marginBottom: "8px",
      fontSize: "16px",
    },
    cardTitle: {
      fontSize: "15px",
      fontWeight: 800,
      color: secondPaneTheme.cardTitle,
      marginBottom: "4px",
    },
    cardCopy: {
      fontSize: "13px",
      lineHeight: 1.4,
      color: secondPaneTheme.cardCopy,
      fontWeight: 600,
    },
    inputs: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "14px",
      width: "100%",
    },
    field: {
      border: `1px solid ${secondPaneTheme.cardBorder}`,
      borderRadius: "16px",
      background: secondPaneTheme.cardBg,
      padding: "14px 16px 16px",
      width: "100%",
    },
    label: {
      fontSize: "15px",
      fontWeight: 800,
      color: secondPaneTheme.labelColor,
      marginBottom: "10px",
    },
    input: {
      minHeight: "42px",
      borderRadius: "12px",
      border: `1px solid ${secondPaneTheme.inputBorder}`,
      background: secondPaneTheme.inputBg,
      color: secondPaneTheme.inputColor,
    },
    note: {
      border: `1px dashed ${secondPaneTheme.noteBorder}`,
      borderRadius: "16px",
      padding: "14px 16px",
      color: secondPaneTheme.noteColor,
      fontSize: "13px",
      fontWeight: 600,
      lineHeight: 1.4,
      background: secondPaneTheme.noteBg,
      width: "100%",
    },
    noteIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      border: `1px solid ${secondPaneTheme.noteIconBorder}`,
      marginRight: "8px",
      fontSize: "11px",
      fontWeight: 800,
      color: secondPaneTheme.noteIconColor,
      flexShrink: 0,
    },
    noteCopy: {
      display: "inline",
    },
  };

  useEffect(() => {
    const savedData = localStorage.getItem('fsiProposalData');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }

    const savedZoning = localStorage.getItem('zoningType');
    if (savedZoning) {
      setSavedZoningType(savedZoning);
    }
  }, []);

  // Auto-fill and calculate FSI values
  useEffect(() => {
    if (landResults) {
      const isPuneThane = location === "Pune" || location === "Thane";

      setFormData(prev => {
        const newData = { ...prev };

        // Always sync Permissible values if they are empty (initial load)
        if (!newData.Permissible_Basic_FSI) newData.Permissible_Basic_FSI = landResults.basicFSI.toString();
        if (!newData.Permissible_Premium_FSI) newData.Permissible_Premium_FSI = landResults.premium.toString();
        if (!newData.Permissible_TDR_FSI) newData.Permissible_TDR_FSI = landResults.tdr.toString();

        const currentZoning = (zoningType || savedZoningType)?.toLowerCase();
        if ((currentZoning === 'residential' || currentZoning === 'mixed') && !newData.Permissible_Residential_Ancillary_Area_Constant) {
          newData.Permissible_Residential_Ancillary_Area_Constant = "0.6";
        }
        if ((currentZoning === 'commercial' || currentZoning === 'mixed') && !newData.Permissible_Commercial_Ancillary_Area_Constant) {
          newData.Permissible_Commercial_Ancillary_Area_Constant = "0.8";
        }

        // Auto-calculate Proposed Basic FSI for Pune/Thane
        if (isPuneThane) {
          newData.Proposed_Basic_FSI = landResults.basicFSI.toString();
        }

        // Calculate Proposed Max Building Potential
        const pBasic = parseFloat(newData.Proposed_Basic_FSI) || 0;
        const pPremium = parseFloat(newData.Proposed_Premium_FSI) || 0;
        const pTdr = parseFloat(newData.Proposed_TDR_FSI) || 0;
        const pOther = parseFloat(newData.Proposed_Other_FSI) || 0;
        newData.Proposed_Max_Building_Potential = (pBasic + pPremium + pTdr + pOther).toFixed(2);

        // Calculate Permissible Max Building Potential
        const permBasic = parseFloat(newData.Permissible_Basic_FSI) || 0;
        const permPremium = parseFloat(newData.Permissible_Premium_FSI) || 0;
        const permTdr = parseFloat(newData.Permissible_TDR_FSI) || 0;
        const permOther = parseFloat(newData.Permissible_Other_FSI) || 0;
        newData.Permissible_Max_Building_Potential = (permBasic + permPremium + permTdr + permOther).toFixed(2);

        return newData;
      });
    }
  }, [
    landResults,
    location,
    zoningType,
    savedZoningType,
    formData.Proposed_Premium_FSI,
    formData.Proposed_TDR_FSI,
    formData.Proposed_Basic_FSI,
    formData.Permissible_Basic_FSI,
    formData.Permissible_Premium_FSI,
    formData.Permissible_TDR_FSI,
    formData.Proposed_Other_FSI,
    formData.Permissible_Other_FSI
  ]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateInput = (field, value, maxValue) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > maxValue) {
      alert(`Value must be between 0 and ${maxValue.toFixed(2)}`);
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!landResults) {
      alert("Please complete Section 1 first.");
      return;
    }

    // Validate inputs
    const isPuneThane = location === "Pune" || location === "Thane";

    if (isPuneThane) {
      if (formData.Proposed_Premium_FSI && !validateInput('Proposed_Premium_FSI', formData.Proposed_Premium_FSI, landResults.premium)) return;
      if (formData.Proposed_TDR_FSI && !validateInput('Proposed_TDR_FSI', formData.Proposed_TDR_FSI, landResults.tdr)) return;
    }

    const currentZoning = (zoningType || savedZoningType)?.toLowerCase();

    if (isPuneThane) {
      if (currentZoning === 'commercial' && formData.Proposed_Commercial_Ancillary_Area_Constant) {
        if (!validateInput('Proposed_Commercial_Ancillary_Area_Constant', formData.Proposed_Commercial_Ancillary_Area_Constant, 0.8)) return;
      }

      if (currentZoning === 'residential' && formData.Proposed_Residential_Ancillary_Area_Constant) {
        if (!validateInput('Proposed_Residential_Ancillary_Area_Constant', formData.Proposed_Residential_Ancillary_Area_Constant, 0.6)) return;
      }

      if (currentZoning === 'mixed') {
        if (formData.Proposed_Commercial_Ancillary_Area_Constant && !validateInput('Proposed_Commercial_Ancillary_Area_Constant', formData.Proposed_Commercial_Ancillary_Area_Constant, 0.8)) return;
        if (formData.Proposed_Residential_Ancillary_Area_Constant && !validateInput('Proposed_Residential_Ancillary_Area_Constant', formData.Proposed_Residential_Ancillary_Area_Constant, 0.6)) return;
      }
    }

    localStorage.setItem('fsiProposalData', JSON.stringify(formData));
    onSave(formData);

    // Dispatch custom events to trigger recalculation across all interconnected components
    window.dispatchEvent(new CustomEvent('fsiProposalUpdated'));

    // Also dispatch events for other components that depend on FSI data
    window.dispatchEvent(new CustomEvent('revenueFormUpdated'));
    window.dispatchEvent(new CustomEvent('costFormUpdated'));

    alert("Permissible FSI and Proposed FSI data saved successfully!");
  };

  if (!landResults) {
    return (
      <div className="fsi-proposal-shell">
        <style>{`
          .fsi-proposal-shell {
            background: ${theme === "dark" ? "#171b22" : "#f5f7fb"};
            border: 1px solid ${theme === "dark" ? "#2a303b" : "#e6ebf2"};
            border-radius: 18px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
            overflow: hidden;
          }

          .fsi-proposal-header {
            padding: 22px 26px 14px;
            border-bottom: 1px solid ${theme === "dark" ? "#2a303b" : "#e6ebf2"};
            background: ${theme === "dark" ? "#171b22" : "#f7f9fc"};
          }

          .fsi-proposal-eyebrow {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: ${theme === "dark" ? "#a9b2c0" : "#768396"};
            margin-bottom: 4px;
          }

          .fsi-proposal-title {
            margin: 0;
            font-size: 28px;
            line-height: 1.1;
            font-weight: 800;
            color: ${theme === "dark" ? "#f8fafc" : "#111827"};
          }

          .fsi-proposal-copy {
            margin: 8px 0 0;
            color: ${theme === "dark" ? "#b8c0cc" : "#6b7280"};
            font-size: 13px;
            font-weight: 600;
          }

          .fsi-proposal-body {
            padding: 22px 26px 28px;
            background: ${theme === "dark" ? "#171b22" : "#ffffff"};
            min-height: 120px;
          }

          .fsi-proposal-toggle {
            display: inline-flex;
            gap: 8px;
            padding: 6px;
            border-radius: 999px;
            background: ${theme === "dark" ? "#222834" : "#eef3f8"};
            border: 1px solid ${theme === "dark" ? "#2f3642" : "#dbe3ee"};
            margin-bottom: 18px;
          }

          .fsi-proposal-toggle .btn {
            border: 0;
            min-height: 38px;
            min-width: 104px;
            border-radius: 999px;
            font-weight: 800;
            font-size: 13px;
            padding: 0 14px;
            box-shadow: none !important;
          }

          .fsi-proposal-toggle .btn-active {
            background: ${theme === "dark" ? "#f8fafc" : "#ffffff"};
            color: ${theme === "dark" ? "#111827" : "#0f172a"};
          }

          .fsi-proposal-toggle .btn-inactive {
            background: transparent;
            color: ${theme === "dark" ? "#b8c0cc" : "#687384"};
          }

          .fsi-proposal-empty {
            color: ${theme === "dark" ? "#b8c0cc" : "#768396"};
            font-size: 15px;
            font-weight: 600;
          }

          .fsi-proposal-toggle-empty {
            min-height: 280px;
            background: transparent;
          }

          .fsi-second-pane {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .fsi-second-pane-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .fsi-second-pane-card {
            border: 1px solid ${theme === "dark" ? "#2f3642" : "#d9e2ed"};
            border-radius: 16px;
            background: ${theme === "dark" ? "#1b2028" : "#ffffff"};
            padding: 16px 18px;
            min-height: 92px;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
            color: inherit;
          }

          .fsi-second-pane-card-icon {
            width: 18px;
            height: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: ${theme === "dark" ? "#f8fafc" : "#1f2937"};
            margin-bottom: 8px;
            font-size: 16px;
          }

          .fsi-second-pane-card-title {
            font-size: 15px;
            font-weight: 800;
            color: ${theme === "dark" ? "#f8fafc" : "#111827"};
            margin-bottom: 4px;
          }

          .fsi-second-pane-card-copy {
            font-size: 13px;
            line-height: 1.4;
            color: ${theme === "dark" ? "#b8c0cc" : "#6b7280"};
            font-weight: 600;
          }

          .fsi-second-pane-inputs {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .fsi-second-pane-field {
            border: 1px solid ${theme === "dark" ? "#2f3642" : "#d9e2ed"};
            border-radius: 16px;
            background: ${theme === "dark" ? "#1b2028" : "#ffffff"};
            padding: 14px 16px 16px;
          }

          .fsi-second-pane-label {
            font-size: 15px;
            font-weight: 800;
            color: ${theme === "dark" ? "#f8fafc" : "#111827"};
            margin-bottom: 10px;
          }

          .fsi-second-pane-field .form-control {
            min-height: 42px;
            border-radius: 12px;
            border: 1px solid ${theme === "dark" ? "#495063" : "#d8e0ea"};
            background: ${theme === "dark" ? "#222834" : "#ffffff"};
            color: ${theme === "dark" ? "#f8fafc" : "#111827"};
          }

          .fsi-second-pane-note {
            border: 1px dashed ${theme === "dark" ? "#3b4453" : "#d6dee8"};
            border-radius: 16px;
            padding: 14px 16px;
            color: ${theme === "dark" ? "#b8c0cc" : "#687384"};
            font-size: 13px;
            font-weight: 600;
            line-height: 1.4;
            background: ${theme === "dark" ? "#191e26" : "#fbfdff"};
          }

          .fsi-second-pane-note-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1px solid ${theme === "dark" ? "#526071" : "#b7c4d3"};
            margin-right: 8px;
            font-size: 11px;
            font-weight: 800;
            color: ${theme === "dark" ? "#d8e1ec" : "#6b7280"};
          }

          .fsi-second-pane-note-copy {
            display: inline;
          }

          @media (max-width: 768px) {
            .fsi-proposal-header,
            .fsi-proposal-body {
              padding-left: 16px;
              padding-right: 16px;
            }

            .fsi-proposal-title {
              font-size: 24px;
            }

            .fsi-proposal-toggle {
              width: 100%;
            }

            .fsi-proposal-toggle .btn {
              flex: 1;
              min-width: 0;
            }

            .fsi-second-pane-grid,
            .fsi-second-pane-inputs {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <div className="fsi-proposal-header">
          <div className="fsi-proposal-eyebrow">Selected Section</div>
          <h1 className="fsi-proposal-title">Permissible FSI Vs Proposed FSI</h1>
          <p className="fsi-proposal-copy">All Areas are in Sq Ft</p>
        </div>

        <div className="fsi-proposal-body">
          <div className="fsi-proposal-toggle" role="tablist" aria-label="FSI proposal view toggle">
            <button
              type="button"
              className={`btn ${activeView === "default" ? "btn-active" : "btn-inactive"}`}
              onClick={() => setActiveView("default")}
            >
              Default
            </button>
            <button
              type="button"
              className={`btn ${activeView === "blank" ? "btn-active" : "btn-inactive"}`}
              onClick={() => setActiveView("blank")}
            >
              Agentic Mode
            </button>
          </div>

          {activeView === "default" ? (
            <div className="fsi-proposal-empty">
              Please complete Section 1 to access Permissible FSI and Proposed FSI form.
            </div>
          ) : (
            <div className="fsi-second-pane" style={secondPaneStyles.pane}>
              <div className="fsi-second-pane-grid" style={secondPaneStyles.grid}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    className="fsi-second-pane-card text-start"
                    style={{ ...secondPaneStyles.card, width: '100%', marginBottom: 0 }}
                    onClick={() => window.open(`${window.location.origin}/web_search`, "_blank", "noopener,noreferrer")}
                  >
                    <div className="fsi-second-pane-card-icon" style={secondPaneStyles.cardIcon}>
                      <FaGlobe />
                    </div>
                    <div className="fsi-second-pane-card-title" style={secondPaneStyles.cardTitle}>Web data agent</div>
                    <div className="fsi-second-pane-card-copy" style={secondPaneStyles.cardCopy}>
                      Search rules, authority data and market references
                    </div>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-start"
                      style={{
                        padding: '0 4px',
                        fontSize: '12px',
                        fontWeight: '800',
                        color: theme === 'dark' ? '#4db896' : '#2d6a54',
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        boxShadow: 'none'
                      }}
                      onClick={handleWebDataAgentClick}
                    >
                      Click here
                    </button>
                    {showAgentPopup && agentPopupMinimized && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          backgroundColor: theme === 'dark' ? '#222834' : '#eef3f8',
                          border: `1px solid ${theme === 'dark' ? '#303744' : '#dbe3ee'}`,
                          borderRadius: '20px',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: theme === 'dark' ? '#f8fafc' : '#111827',
                          cursor: 'pointer'
                        }}
                        onClick={() => setAgentPopupMinimized(false)}
                        title="Click to restore Web Search Agent"
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: agentLoading ? '#10b981' : '#6b7280',
                            animation: agentLoading ? 'pulse 1.5s infinite' : 'none'
                          }}
                        />
                        <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Agent: {agentCurrentStatus || 'Searching...'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', fontSize: '10px' }}
                            onClick={() => setAgentPopupMinimized(false)}
                            title="Restore"
                          >
                            <FaExpandAlt size={10} />
                          </button>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', fontSize: '10px' }}
                            onClick={handleCloseAgentPopup}
                            title="Close"
                          >
                            <FaTimes size={10} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    className="fsi-second-pane-card text-start"
                    style={{ ...secondPaneStyles.card, width: '100%', marginBottom: 0 }}
                    onClick={() => window.open(`${window.location.origin}/user_input`, "_blank", "noopener,noreferrer")}
                  >
                    <div className="fsi-second-pane-card-icon" style={secondPaneStyles.cardIcon}>
                      <FaFilePdf />
                    </div>
                    <div className="fsi-second-pane-card-title" style={secondPaneStyles.cardTitle}>Document agent</div>
                    <div className="fsi-second-pane-card-copy" style={secondPaneStyles.cardCopy}>
                      Read DCR, zoning notes and uploaded documents
                    </div>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-start"
                      style={{
                        padding: '0 4px',
                        fontSize: '12px',
                        fontWeight: '800',
                        color: theme === 'dark' ? '#4db896' : '#2d6a54',
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        boxShadow: 'none'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDocPopup(true);
                        setDocPopupMinimized(false);
                      }}
                    >
                      Click here
                    </button>
                    {showDocPopup && docPopupMinimized && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          backgroundColor: theme === 'dark' ? '#222834' : '#eef3f8',
                          border: `1px solid ${theme === 'dark' ? '#303744' : '#dbe3ee'}`,
                          borderRadius: '20px',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: theme === 'dark' ? '#f8fafc' : '#111827',
                          cursor: 'pointer'
                        }}
                        onClick={() => setDocPopupMinimized(false)}
                        title="Click to restore Document Agent"
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: docLoading ? '#10b981' : '#6b7280',
                            animation: docLoading ? 'pulse 1.5s infinite' : 'none'
                          }}
                        />
                        <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Agent: {docStatus || 'Waiting...'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', fontSize: '10px' }}
                            onClick={() => setDocPopupMinimized(false)}
                            title="Restore"
                          >
                            <FaExpandAlt size={10} />
                          </button>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', fontSize: '10px' }}
                            onClick={handleCloseDocPopup}
                            title="Close"
                          >
                            <FaTimes size={10} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="fsi-second-pane-inputs" style={secondPaneStyles.inputs}>
                <div className="fsi-second-pane-field" style={secondPaneStyles.field}>
                  <div className="fsi-second-pane-label" style={secondPaneStyles.label}>Permissible FSI / FAR (Sq ft)</div>
                  <input
                    type="text"
                    className="form-control"
                    style={secondPaneStyles.input}
                    value={agenticPermissibleFsiValue}
                    readOnly
                    placeholder="Max Permissible Area from FSI Utilization Breakdown"
                  />
                </div>

                <div className="fsi-second-pane-field" style={secondPaneStyles.field}>
                  <div className="fsi-second-pane-label" style={secondPaneStyles.label}>Gross Floor area (Sq ft)</div>
                  <input
                    type="text"
                    className="form-control"
                    style={secondPaneStyles.input}
                    value={secondPaneData.grossFloorArea}
                    onChange={(e) =>
                      setSecondPaneData((prev) => ({
                        ...prev,
                        grossFloorArea: e.target.value,
                      }))
                    }
                    placeholder="Enter Gross Floor area (Sq ft)"
                  />
                </div>
              </div>

              <div className="fsi-second-pane-note" style={secondPaneStyles.note}>
                <span className="fsi-second-pane-note-icon" style={secondPaneStyles.noteIcon}>i</span>
                <span className="fsi-second-pane-note-copy" style={secondPaneStyles.noteCopy}>
                  FSI/FAR values should be verified with applicable development control rules,
                  zoning documents and planning authority records.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentZoning = (zoningType || savedZoningType)?.toLowerCase();
  const isPuneThane = location === "Pune" || location === "Thane";
  // When areaType is "Other" all fields must be freely editable
  const isOtherAreaType = getAreaType() === 'Other';
  // Effective flag: locked Pune/Thane behaviour only if NOT "Other"
  const puneThaneStrict = isPuneThane && !isOtherAreaType;

  return (
    <div className="fsi-proposal-shell">
      <style>{`
        .fsi-proposal-shell {
          background: ${theme === "dark" ? "#171b22" : "#f5f7fb"};
          border: 1px solid ${theme === "dark" ? "#2a303b" : "#e6ebf2"};
          border-radius: 18px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .fsi-proposal-header {
          padding: 22px 26px 14px;
          border-bottom: 1px solid ${theme === "dark" ? "#2a303b" : "#e6ebf2"};
          background: ${theme === "dark" ? "#171b22" : "#f7f9fc"};
        }

        .fsi-proposal-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: ${theme === "dark" ? "#a9b2c0" : "#768396"};
          margin-bottom: 4px;
        }

        .fsi-proposal-title {
          margin: 0;
          font-size: 28px;
          line-height: 1.1;
          font-weight: 800;
          color: ${theme === "dark" ? "#f8fafc" : "#111827"};
        }

        .fsi-proposal-copy {
          margin: 8px 0 0;
          color: ${theme === "dark" ? "#b8c0cc" : "#6b7280"};
          font-size: 13px;
          font-weight: 600;
        }

        .fsi-proposal-body {
          padding: 20px 22px 22px;
          background: ${theme === "dark" ? "#171b22" : "#ffffff"};
        }

        .fsi-proposal-toggle {
          display: inline-flex;
          gap: 8px;
          padding: 6px;
          border-radius: 999px;
          background: ${theme === "dark" ? "#222834" : "#eef3f8"};
          border: 1px solid ${theme === "dark" ? "#2f3642" : "#dbe3ee"};
          margin-bottom: 18px;
        }

        .fsi-proposal-toggle .btn {
          border: 0;
          min-height: 38px;
          min-width: 104px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 13px;
          padding: 0 14px;
          box-shadow: none !important;
        }

        .fsi-proposal-toggle .btn-active {
          background: ${theme === "dark" ? "#f8fafc" : "#ffffff"};
          color: ${theme === "dark" ? "#111827" : "#0f172a"};
        }

        .fsi-proposal-toggle .btn-inactive {
          background: transparent;
          color: ${theme === "dark" ? "#b8c0cc" : "#687384"};
        }

        .fsi-proposal-table-wrap {
          border: 1px solid ${theme === "dark" ? "#303744" : "#e2e8f0"};
          border-radius: 14px;
          overflow: hidden;
          background: ${theme === "dark" ? "#1b2028" : "#ffffff"};
        }

        .fsi-proposal-table {
          margin-bottom: 0;
        }

        .fsi-proposal-table thead th {
          background: ${theme === "dark" ? "#232936" : "#f4f7fb"} !important;
          color: ${theme === "dark" ? "#e7edf6" : "#334155"};
          border-bottom: 1px solid ${theme === "dark" ? "#303744" : "#e2e8f0"} !important;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 800;
        }

        .fsi-proposal-table tbody td {
          vertical-align: middle;
          border-color: ${theme === "dark" ? "#303744" : "#e2e8f0"} !important;
          color: ${theme === "dark" ? "#eef2f7" : "#1f2937"};
          background: ${theme === "dark" ? "#1b2028" : "#ffffff"};
        }

        .fsi-proposal-table tbody tr.table-light td {
          background: ${theme === "dark" ? "#232936" : "#f8fafc"} !important;
        }

        .fsi-proposal-table tbody tr.table-primary td {
          background: ${theme === "dark" ? "#243a47" : "#eaf5f1"} !important;
          color: ${theme === "dark" ? "#f8fafc" : "#0f172a"};
        }

        .fsi-proposal-table .form-control,
        .fsi-proposal-table .form-select {
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid ${theme === "dark" ? "#495063" : "#d8e0ea"};
          background: ${theme === "dark" ? "#222834" : "#ffffff"};
          color: ${theme === "dark" ? "#f8fafc" : "#111827"};
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
        }

        .fsi-proposal-table .form-control:focus,
        .fsi-proposal-table .form-select:focus {
          border-color: #448c74;
          box-shadow: 0 0 0 0.15rem rgba(68, 140, 116, 0.12);
        }

        .fsi-proposal-actions {
          margin-top: 18px;
          display: flex;
          gap: 12px;
        }

        .fsi-proposal-actions .btn {
          min-height: 46px;
          border-radius: 999px;
          font-weight: 800;
        }

        .fsi-proposal-toggle-empty {
          min-height: 280px;
          border: 1px dashed ${theme === "dark" ? "#394150" : "#d9e2ed"};
          border-radius: 14px;
          background: ${theme === "dark" ? "#1b2028" : "#f9fbfd"};
        }

        .fsi-proposal-toggle-empty .empty-surface {
          min-height: 280px;
          display: grid;
          place-items: center;
          color: ${theme === "dark" ? "#b8c0cc" : "#7b8796"};
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .fsi-proposal-header,
          .fsi-proposal-body {
            padding-left: 16px;
            padding-right: 16px;
          }

          .fsi-proposal-title {
            font-size: 24px;
          }

          .fsi-proposal-toggle {
            width: 100%;
          }

          .fsi-proposal-toggle .btn {
            flex: 1;
            min-width: 0;
          }
        }
      `}</style>

      <div className="fsi-proposal-header">
        <div className="fsi-proposal-eyebrow">Selected Section</div>
        <h1 className="fsi-proposal-title">Permissible FSI Vs Proposed FSI</h1>
        <p className="fsi-proposal-copy">All Areas are in Sq Ft</p>
      </div>

      <div className="fsi-proposal-body">
        <div className="fsi-proposal-toggle" role="tablist" aria-label="FSI proposal view toggle">
          <button
            type="button"
            className={`btn ${activeView === "default" ? "btn-active" : "btn-inactive"}`}
            onClick={() => setActiveView("default")}
          >
            Default
          </button>
          <button
            type="button"
            className={`btn ${activeView === "blank" ? "btn-active" : "btn-inactive"}`}
            onClick={() => setActiveView("blank")}
          >
            Agentic Mode
          </button>
        </div>

        {activeView !== "default" ? (
          <div className="fsi-second-pane" style={secondPaneStyles.pane}>
            <div className="fsi-second-pane-grid" style={secondPaneStyles.grid}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  className="fsi-second-pane-card text-start"
                  style={{ ...secondPaneStyles.card, width: '100%', marginBottom: 0 }}
                  onClick={() => window.open(`${window.location.origin}/web_search`, "_blank", "noopener,noreferrer")}
                >
                  <div className="fsi-second-pane-card-icon" style={secondPaneStyles.cardIcon}>
                    <FaGlobe />
                  </div>
                  <div className="fsi-second-pane-card-title" style={secondPaneStyles.cardTitle}>Web data agent</div>
                  <div className="fsi-second-pane-card-copy" style={secondPaneStyles.cardCopy}>
                    Search rules, authority data and market references
                  </div>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-start"
                    style={{
                      padding: '0 4px',
                      fontSize: '12px',
                      fontWeight: '800',
                      color: theme === 'dark' ? '#4db896' : '#2d6a54',
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      boxShadow: 'none'
                    }}
                    onClick={handleWebDataAgentClick}
                  >
                    Click here
                  </button>
                  {showAgentPopup && agentPopupMinimized && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        backgroundColor: theme === 'dark' ? '#222834' : '#eef3f8',
                        border: `1px solid ${theme === 'dark' ? '#303744' : '#dbe3ee'}`,
                        borderRadius: '20px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: theme === 'dark' ? '#f8fafc' : '#111827',
                        cursor: 'pointer'
                      }}
                      onClick={() => setAgentPopupMinimized(false)}
                      title="Click to restore Web Search Agent"
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: agentLoading ? '#10b981' : '#6b7280',
                          animation: agentLoading ? 'pulse 1.5s infinite' : 'none'
                        }}
                      />
                      <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Agent: {agentCurrentStatus || 'Searching...'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', fontSize: '10px' }}
                          onClick={() => setAgentPopupMinimized(false)}
                          title="Restore"
                        >
                          <FaExpandAlt size={10} />
                        </button>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', fontSize: '10px' }}
                          onClick={handleCloseAgentPopup}
                          title="Close"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  className="fsi-second-pane-card text-start"
                  style={{ ...secondPaneStyles.card, width: '100%', marginBottom: 0 }}
                  onClick={() => window.open(`${window.location.origin}/user_input`, "_blank", "noopener,noreferrer")}
                >
                  <div className="fsi-second-pane-card-icon" style={secondPaneStyles.cardIcon}>
                    <FaFilePdf />
                  </div>
                  <div className="fsi-second-pane-card-title" style={secondPaneStyles.cardTitle}>Document agent</div>
                  <div className="fsi-second-pane-card-copy" style={secondPaneStyles.cardCopy}>
                    Read DCR, zoning notes and uploaded documents
                  </div>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-start"
                    style={{
                      padding: '0 4px',
                      fontSize: '12px',
                      fontWeight: '800',
                      color: theme === 'dark' ? '#4db896' : '#2d6a54',
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      boxShadow: 'none'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDocPopup(true);
                      setDocPopupMinimized(false);
                    }}
                  >
                    Click here
                  </button>
                  {showDocPopup && docPopupMinimized && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        backgroundColor: theme === 'dark' ? '#222834' : '#eef3f8',
                        border: `1px solid ${theme === 'dark' ? '#303744' : '#dbe3ee'}`,
                        borderRadius: '20px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: theme === 'dark' ? '#f8fafc' : '#111827',
                        cursor: 'pointer'
                      }}
                      onClick={() => setDocPopupMinimized(false)}
                      title="Click to restore Document Agent"
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: docLoading ? '#10b981' : '#6b7280',
                          animation: docLoading ? 'pulse 1.5s infinite' : 'none'
                        }}
                      />
                      <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Agent: {docStatus || 'Waiting...'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', fontSize: '10px' }}
                          onClick={() => setDocPopupMinimized(false)}
                          title="Restore"
                        >
                          <FaExpandAlt size={10} />
                        </button>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', fontSize: '10px' }}
                          onClick={handleCloseDocPopup}
                          title="Close"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="fsi-second-pane-inputs" style={secondPaneStyles.inputs}>
              <div className="fsi-second-pane-field" style={secondPaneStyles.field}>
                <div className="fsi-second-pane-label" style={secondPaneStyles.label}>Permissible FSI / FAR (Sq ft)</div>
                <input
                  type="text"
                  className="form-control"
                  style={secondPaneStyles.input}
                  value={agenticPermissibleFsiValue}
                  readOnly
                  placeholder="Max Permissible Area from FSI Utilization Breakdown"
                />
              </div>

              <div className="fsi-second-pane-field" style={secondPaneStyles.field}>
                <div className="fsi-second-pane-label" style={secondPaneStyles.label}>Gross Floor area (Sq ft)</div>
                <input
                  type="text"
                  className="form-control"
                  style={secondPaneStyles.input}
                  value={secondPaneData.grossFloorArea}
                  onChange={(e) =>
                    setSecondPaneData((prev) => ({
                      ...prev,
                      grossFloorArea: e.target.value,
                    }))
                  }
                  placeholder="Enter Gross Floor area (Sq ft)"
                />
              </div>
            </div>

            <div className="fsi-second-pane-note" style={secondPaneStyles.note}>
              <span className="fsi-second-pane-note-icon" style={secondPaneStyles.noteIcon}>i</span>
              <span className="fsi-second-pane-note-copy" style={secondPaneStyles.noteCopy}>
                FSI/FAR values should be verified with applicable development control rules,
                zoning documents and planning authority records.
              </span>
            </div>
          </div>
        ) : (
          <div className="fsi-proposal-table-wrap table-responsive">
            <table className="table table-bordered fsi-proposal-table">
              <thead className="table-light">
                <tr>
                  <th className="text-start">Particulars</th>
                  <th className="text-start">Permissible FSI</th>
                  <th className="text-start">Proposed FSI</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="fw-medium">Basic FSI</td>
                  <td>
                    {!puneThaneStrict ? (
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={formData.Permissible_Basic_FSI}
                        onChange={(e) => handleInputChange('Permissible_Basic_FSI', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    ) : landResults.basicFSI.toFixed(2)}
                  </td>
                  <td>
                    {!puneThaneStrict ? (
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={formData.Proposed_Basic_FSI}
                        onChange={(e) => handleInputChange('Proposed_Basic_FSI', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    ) : landResults.basicFSI.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="fw-medium">Premium FSI</td>
                  <td>
                    {!puneThaneStrict ? (
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={formData.Permissible_Premium_FSI}
                        onChange={(e) => handleInputChange('Permissible_Premium_FSI', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    ) : landResults.premium.toFixed(2)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={formData.Proposed_Premium_FSI}
                      onChange={(e) => handleInputChange('Proposed_Premium_FSI', e.target.value)}
                      placeholder="0.00"
                      max={puneThaneStrict ? landResults.premium : undefined}
                      step="0.01"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="fw-medium">TDR FSI</td>
                  <td>
                    {!puneThaneStrict ? (
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={formData.Permissible_TDR_FSI}
                        onChange={(e) => handleInputChange('Permissible_TDR_FSI', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    ) : landResults.tdr.toFixed(2)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={formData.Proposed_TDR_FSI}
                      onChange={(e) => handleInputChange('Proposed_TDR_FSI', e.target.value)}
                      placeholder="0.00"
                      max={puneThaneStrict ? landResults.tdr : undefined}
                      step="0.01"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="fw-medium">Max Building Potential</td>
                  <td>{formData.Permissible_Max_Building_Potential || landResults.maxBuildingPotential.toFixed(2)}</td>
                  <td>{formData.Proposed_Max_Building_Potential}</td>
                </tr>


                {/* Add Other FSI row here - will show for all zoning types */}
                <tr>
                  <td className="fw-medium">Other FSI</td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={formData.Permissible_Other_FSI || ''}
                      onChange={(e) => handleInputChange('Permissible_Other_FSI', e.target.value)}
                      placeholder="Enter value"
                      step="0.01"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={formData.Proposed_Other_FSI || ''}
                      onChange={(e) => handleInputChange('Proposed_Other_FSI', e.target.value)}
                      placeholder="Enter value"
                      step="0.01"
                    />
                  </td>
                </tr>

                {currentZoning === 'residential' && (
                  <tr>
                    <td className="fw-medium">Ancillary Area coefficient for Residential</td>
                    <td>
                      {!isPuneThane ? (
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={formData.Permissible_Residential_Ancillary_Area_Constant}
                          onChange={(e) => handleInputChange('Permissible_Residential_Ancillary_Area_Constant', e.target.value)}
                          placeholder="Percentage"
                          step="0.01"
                        />
                      ) : "0.6"}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={formData.Proposed_Residential_Ancillary_Area_Constant}
                        onChange={(e) => handleInputChange('Proposed_Residential_Ancillary_Area_Constant', e.target.value)}
                        placeholder="Percentage"
                        max={isPuneThane ? 0.6 : undefined}
                        min={0}
                        step="0.01"
                      />
                    </td>
                  </tr>
                )}

                {currentZoning === 'commercial' && (
                  <tr>
                    <td className="fw-medium">Ancillary Area coefficient for Commercial</td>
                    <td>
                      {!isPuneThane ? (
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={formData.Permissible_Commercial_Ancillary_Area_Constant}
                          onChange={(e) => handleInputChange('Permissible_Commercial_Ancillary_Area_Constant', e.target.value)}
                          placeholder="Percentage"
                          step="0.01"
                        />
                      ) : "0.8"}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={formData.Proposed_Commercial_Ancillary_Area_Constant}
                        onChange={(e) => handleInputChange('Proposed_Commercial_Ancillary_Area_Constant', e.target.value)}
                        placeholder="Percentage"
                        max={isPuneThane ? 0.8 : undefined}
                        min={0}
                        step="0.01"
                      />
                    </td>
                  </tr>
                )}

                {currentZoning === 'mixed' && (
                  <>
                    <tr>
                      <td className="fw-medium">Ancillary Area coefficient for Commercial</td>
                      <td>
                        {!puneThaneStrict ? (
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={formData.Permissible_Commercial_Ancillary_Area_Constant}
                            onChange={(e) => handleInputChange('Permissible_Commercial_Ancillary_Area_Constant', e.target.value)}
                            placeholder="Percentage"
                            step="0.01"
                          />
                        ) : "0.8"}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={formData.Proposed_Commercial_Ancillary_Area_Constant}
                          onChange={(e) => handleInputChange('Proposed_Commercial_Ancillary_Area_Constant', e.target.value)}
                          placeholder="Percentage"
                          max={puneThaneStrict ? 0.8 : undefined}
                          min={0}
                          step="0.01"
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="fw-medium">Ancillary Area coefficient for Residential</td>
                      <td>
                        {!puneThaneStrict ? (
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={formData.Permissible_Residential_Ancillary_Area_Constant}
                            onChange={(e) => handleInputChange('Permissible_Residential_Ancillary_Area_Constant', e.target.value)}
                            placeholder="Percentage"
                            step="0.01"
                          />
                        ) : "0.6"}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={formData.Proposed_Residential_Ancillary_Area_Constant}
                          onChange={(e) => handleInputChange('Proposed_Residential_Ancillary_Area_Constant', e.target.value)}
                          placeholder="Percentage"
                          max={puneThaneStrict ? 0.6 : undefined}
                          min={0}
                          step="0.01"
                        />
                      </td>
                    </tr>

                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeView === "default" && (
          <div className="fsi-proposal-actions">
            <div className="flex-fill">
              <button onClick={handleSave} className="btn btn-primary w-100">
                Save
              </button>
            </div>
            <div className="flex-fill">
              <button onClick={handleSave} className="btn btn-secondary w-100">
                Update
              </button>
            </div>
          </div>
        )}
      </div>

      {showAgentPopup && !agentPopupMinimized && (
        <div
          className={`agent-popup-container ${agentPopupMinimized ? 'minimized' : ''} ${agentPopupMaximized ? 'maximized' : ''}`}
          style={{
            position: 'fixed',
            bottom: agentPopupMaximized ? '40px' : '24px',
            right: agentPopupMaximized ? '24px' : '24px',
            left: agentPopupMaximized ? '40px' : 'auto',
            top: agentPopupMaximized ? '40px' : 'auto',
            width: agentPopupMaximized ? 'auto' : (agentPopupMinimized ? '280px' : `${agentSize.width}px`),
            height: agentPopupMaximized ? 'auto' : (agentPopupMinimized ? '48px' : `${agentSize.height}px`),
            backgroundColor: theme === 'dark' ? '#1b2028' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#2f3642' : '#d9e2ed'}`,
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
            zIndex: 1050,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: (agentPopupMaximized || agentPopupMinimized) ? 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'width 0.1s ease, height 0.1s ease, background-color 0.3s ease',
            transform: agentPopupMaximized ? 'none' : `translate(${agentPos.x}px, ${agentPos.y}px)`,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          {/* Top-Left Resize Indicator */}
          {!agentPopupMinimized && !agentPopupMaximized && (
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                width: '8px',
                height: '8px',
                borderTop: `2px solid ${theme === 'dark' ? '#cbd5e1' : '#475569'}`,
                borderLeft: `2px solid ${theme === 'dark' ? '#cbd5e1' : '#475569'}`,
                borderTopLeftRadius: '2px',
                pointerEvents: 'none',
                opacity: 0.6,
                zIndex: 1100
              }}
            />
          )}

          {/* Top-Left Resize Drag Handle */}
          {!agentPopupMinimized && !agentPopupMaximized && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '16px',
                height: '16px',
                cursor: 'nwse-resize',
                zIndex: 1100
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();

                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = agentSize.width;
                const startHeight = agentSize.height;

                const handleMouseMove = (moveEvent) => {
                  const dx = moveEvent.clientX - startX;
                  const dy = moveEvent.clientY - startY;

                  const newWidth = Math.max(300, startWidth - dx);
                  const newHeight = Math.max(300, startHeight - dy);

                  setAgentSize({ width: newWidth, height: newHeight });
                };

                const handleMouseUp = () => {
                  document.removeEventListener("mousemove", handleMouseMove);
                  document.removeEventListener("mouseup", handleMouseUp);
                };

                document.addEventListener("mousemove", handleMouseMove);
                document.addEventListener("mouseup", handleMouseUp);
              }}
            />
          )}

          {/* Header */}
          <div
            className="agent-popup-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: theme === 'dark' ? '#232936' : '#f4f7fb',
              borderBottom: `1px solid ${theme === 'dark' ? '#303744' : '#e2e8f0'}`,
              cursor: agentPopupMaximized ? 'default' : 'grab'
            }}
            onClick={() => {
              if (agentPopupMinimized) {
                setAgentPopupMinimized(false);
              }
            }}
            onMouseDown={(e) => {
              if (agentPopupMaximized) return;
              if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
              handlePopupDragStart(e, setAgentPos, agentPos);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: agentLoading ? '#10b981' : '#6b7280',
                  animation: agentLoading ? 'pulse 1.5s infinite' : 'none'
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: '800', color: theme === 'dark' ? '#f8fafc' : '#111827' }}>
                Web Search Agent {agentPopupMinimized && `(${agentCurrentStatus || 'Idle'})`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex' }}
                onClick={() => setAgentPopupMinimized(!agentPopupMinimized)}
                title={agentPopupMinimized ? "Restore" : "Minimize"}
              >
                <FaMinus size={12} />
              </button>
              {!agentPopupMinimized && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex' }}
                  onClick={() => setAgentPopupMaximized(!agentPopupMaximized)}
                  title={agentPopupMaximized ? "Restore size" : "Maximize"}
                >
                  {agentPopupMaximized ? <FaCompressAlt size={12} /> : <FaExpandAlt size={12} />}
                </button>
              )}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex' }}
                onClick={handleCloseAgentPopup}
                title="Close"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!agentPopupMinimized && (
            <div
              className="agent-popup-body"
              style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                color: theme === 'dark' ? '#eef2f7' : '#1f2937'
              }}
            >
              {/* Query Section */}
              {agentQuery && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: theme === 'dark' ? '#222834' : '#f8fafc',
                    border: `1px solid ${theme === 'dark' ? '#303744' : '#e2e8f0'}`,
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  <div style={{ color: theme === 'dark' ? '#b8c0cc' : '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Search Query
                  </div>
                  <div style={{ color: theme === 'dark' ? '#f8fafc' : '#111827', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-word' }}>
                    "{agentQuery}"
                  </div>
                </div>
              )}

              {/* Status Section */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: theme === 'dark' ? '#222834' : '#f8fafc',
                  border: `1px solid ${theme === 'dark' ? '#303744' : '#e2e8f0'}`,
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <div style={{ color: theme === 'dark' ? '#b8c0cc' : '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Current Status
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {agentLoading && (
                    <div className="spinner-border spinner-border-sm text-success" role="status" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }} />
                  )}
                  <span style={{ color: theme === 'dark' ? '#f8fafc' : '#111827' }}>
                    {agentCurrentStatus || 'Waiting for stream...'}
                  </span>
                </div>
              </div>

              {/* Error Section */}
              {agentError && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    fontSize: '13px'
                  }}
                >
                  {agentError}
                </div>
              )}

              {/* Progress Log */}
              {agentStatusLog.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: theme === 'dark' ? '#a9b2c0' : '#768396', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Activity Log
                  </div>
                  <div
                    style={{
                      maxHeight: '80px',
                      overflowY: 'auto',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: theme === 'dark' ? '#181c24' : '#f1f5f9',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      color: theme === 'dark' ? '#a9b2c0' : '#475569'
                    }}
                  >
                    {agentStatusLog.map((log, index) => (
                      <div key={index} style={{ borderLeft: '2px solid #10b981', paddingLeft: '6px' }}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Streaming Output Panel */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: theme === 'dark' ? '#a9b2c0' : '#768396', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Agent Answer
                </div>
                <div
                  className="agent-answer-content"
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: theme === 'dark' ? '#181c24' : '#f8fafc',
                    border: `1px solid ${theme === 'dark' ? '#303744' : '#e2e8f0'}`,
                    overflowY: 'auto',
                    minHeight: '120px'
                  }}
                >
                  {agentAnswer ? (
                    renderMarkdown(agentAnswer)
                  ) : (
                    <div style={{ color: theme === 'dark' ? '#b8c0cc' : '#6b7280', fontSize: '13px', fontStyle: 'italic' }}>
                      {agentLoading ? 'Waiting for response from agent...' : 'No data received.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Style rule for pulsing light */}
          <style>{`
            @keyframes pulse {
              0% { transform: scale(0.95); opacity: 0.5; }
              50% { transform: scale(1.05); opacity: 1; }
              100% { transform: scale(0.95); opacity: 0.5; }
            }
          `}</style>
        </div>
      )}

      {showDocPopup && !docPopupMinimized && (
        <div
          className={`agent-popup-container ${docPopupMinimized ? 'minimized' : ''} ${docPopupMaximized ? 'maximized' : ''}`}
          style={{
            position: 'fixed',
            bottom: docPopupMaximized ? '40px' : '24px',
            right: docPopupMaximized ? '24px' : '24px',
            left: docPopupMaximized ? '40px' : 'auto',
            top: docPopupMaximized ? '40px' : 'auto',
            width: docPopupMaximized ? 'auto' : (docPopupMinimized ? '280px' : `${docSize.width}px`),
            height: docPopupMaximized ? 'auto' : (docPopupMinimized ? '48px' : `${docSize.height}px`),
            backgroundColor: theme === 'dark' ? '#1b2028' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#2f3642' : '#d9e2ed'}`,
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
            zIndex: 1051,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: (docPopupMaximized || docPopupMinimized) ? 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'width 0.1s ease, height 0.1s ease, background-color 0.3s ease',
            transform: docPopupMaximized ? 'none' : `translate(${docPos.x}px, ${docPos.y}px)`,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          {/* Top-Left Resize Indicator */}
          {!docPopupMinimized && !docPopupMaximized && (
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                width: '8px',
                height: '8px',
                borderTop: `2px solid ${theme === 'dark' ? '#cbd5e1' : '#475569'}`,
                borderLeft: `2px solid ${theme === 'dark' ? '#cbd5e1' : '#475569'}`,
                borderTopLeftRadius: '2px',
                pointerEvents: 'none',
                opacity: 0.6,
                zIndex: 1100
              }}
            />
          )}

          {/* Top-Left Resize Drag Handle */}
          {!docPopupMinimized && !docPopupMaximized && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '16px',
                height: '16px',
                cursor: 'nwse-resize',
                zIndex: 1100
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();

                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = docSize.width;
                const startHeight = docSize.height;

                const handleMouseMove = (moveEvent) => {
                  const dx = moveEvent.clientX - startX;
                  const dy = moveEvent.clientY - startY;

                  const newWidth = Math.max(300, startWidth - dx);
                  const newHeight = Math.max(300, startHeight - dy);

                  setDocSize({ width: newWidth, height: newHeight });
                };

                const handleMouseUp = () => {
                  document.removeEventListener("mousemove", handleMouseMove);
                  document.removeEventListener("mouseup", handleMouseUp);
                };

                document.addEventListener("mousemove", handleMouseMove);
                document.addEventListener("mouseup", handleMouseUp);
              }}
            />
          )}

          {/* Header */}
          <div
            className="agent-popup-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: theme === 'dark' ? '#232936' : '#f4f7fb',
              borderBottom: `1px solid ${theme === 'dark' ? '#303744' : '#e2e8f0'}`,
              cursor: docPopupMaximized ? 'default' : 'grab'
            }}
            onClick={() => {
              if (docPopupMinimized) {
                setDocPopupMinimized(false);
              }
            }}
            onMouseDown={(e) => {
              if (docPopupMaximized) return;
              if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
              handlePopupDragStart(e, setDocPos, docPos);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: docLoading ? '#10b981' : '#6b7280',
                  animation: docLoading ? 'pulse 1.5s infinite' : 'none'
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: '800', color: theme === 'dark' ? '#f8fafc' : '#111827' }}>
                Document Search Agent
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex' }}
                onClick={() => setDocPopupMinimized(!docPopupMinimized)}
                title={docPopupMinimized ? "Restore" : "Minimize"}
              >
                <FaMinus size={12} />
              </button>
              {!docPopupMinimized && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex' }}
                  onClick={() => setDocPopupMaximized(!docPopupMaximized)}
                  title={docPopupMaximized ? "Restore size" : "Maximize"}
                >
                  {docPopupMaximized ? <FaCompressAlt size={12} /> : <FaExpandAlt size={12} />}
                </button>
              )}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex' }}
                onClick={handleCloseDocPopup}
                title="Close"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div
            className="agent-popup-body"
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              color: theme === 'dark' ? '#eef2f7' : '#1f2937'
            }}
          >
            {/* Unified Input Panel */}
            <div
              style={{
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: theme === 'dark' ? '#222834' : '#f8fafc',
                border: `1px solid ${theme === 'dark' ? '#303744' : '#e2e8f0'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  Upload Documents (PDF only)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={(e) => setDocFiles(Array.from(e.target.files || []))}
                  style={{
                    width: '100%',
                    fontSize: '12px',
                    color: theme === 'dark' ? '#cbd5e1' : '#475569'
                  }}
                />
                {docFiles.length > 0 && (
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '11px',
                      color: theme === 'dark' ? '#a9b2c0' : '#475569',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      padding: '6px 8px',
                      backgroundColor: theme === 'dark' ? '#181c24' : '#f1f5f9',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Selected Files ({docFiles.length}):</div>
                    {docFiles.map((file, idx) => (
                      <div key={idx} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        ≡ƒôä {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: theme === 'dark' ? '#b8c0cc' : '#6b7280', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  Your Question
                </label>
                <textarea
                  rows={2}
                  value={docQuestion}
                  onChange={(e) => setDocQuestion(e.target.value)}
                  placeholder="Enter your question here..."
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '12px',
                    backgroundColor: theme === 'dark' ? '#1b2028' : '#ffffff',
                    border: `1px solid ${theme === 'dark' ? '#303744' : '#cbd5e1'}`,
                    color: theme === 'dark' ? '#f8fafc' : '#111827',
                    resize: 'none'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleDocAgentSubmit}
                disabled={docLoading || docFiles.length === 0 || !docQuestion.trim()}
                className="btn btn-success btn-sm w-100"
                style={{
                  height: '36px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#10b981',
                  borderColor: '#10b981',
                  color: '#ffffff'
                }}
              >
                {docLoading ? 'Processing...' : 'Submit Query'}
              </button>
            </div>

            {/* Status Section */}
            {docStatus && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: theme === 'dark' ? '#222834' : '#f8fafc',
                  border: `1px solid ${theme === 'dark' ? '#303744' : '#e2e8f0'}`,
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <div style={{ color: theme === 'dark' ? '#b8c0cc' : '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Current Status
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {docLoading && (
                    <div className="spinner-border spinner-border-sm text-success" role="status" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }} />
                  )}
                  <span style={{ color: theme === 'dark' ? '#f8fafc' : '#111827' }}>
                    {docStatus}
                  </span>
                </div>
              </div>
            )}

            {/* Error Section */}
            {docError && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  fontSize: '13px'
                }}
              >
                {docError}
              </div>
            )}

            {/* Progress Log */}
            {docStatusLog.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: theme === 'dark' ? '#a9b2c0' : '#768396', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Activity Log
                </div>
                <div
                  style={{
                    maxHeight: '80px',
                    overflowY: 'auto',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: theme === 'dark' ? '#181c24' : '#f1f5f9',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    color: theme === 'dark' ? '#a9b2c0' : '#475569'
                  }}
                >
                  {docStatusLog.map((log, index) => (
                    <div key={index} style={{ borderLeft: '2px solid #10b981', paddingLeft: '6px' }}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Answer Display */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: theme === 'dark' ? '#a9b2c0' : '#768396', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Agent Answer
              </div>
              <div
                className="agent-answer-content"
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: theme === 'dark' ? '#181c24' : '#f8fafc',
                  border: `1px solid ${theme === 'dark' ? '#303744' : '#e2e8f0'}`,
                  overflowY: 'auto',
                  minHeight: '120px'
                }}
              >
                {docAnswer ? (
                  renderMarkdown(docAnswer)
                ) : (
                  <div style={{ color: theme === 'dark' ? '#b8c0cc' : '#6b7280', fontSize: '13px', fontStyle: 'italic' }}>
                    {docLoading ? 'Waiting for response from agent...' : 'No data received.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FSIProposalForm; 
