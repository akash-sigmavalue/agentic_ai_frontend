// import { useState, useEffect, useRef } from "react";
// // import { ExternalLink, Info } from "lucide-react";
// import { FaMapMarkedAlt } from 'react-icons/fa'; 

// import { FaInfo,FaExternalLinkAlt  } from "react-icons/fa";

// const LandDetailsForm = ({ onCalculate, updateingUI, setUpdateUI }) => {
//   const [formData, setFormData] = useState({
//     clientName: "",
//     phoneNumber: "",
//     location: "",
//     village: "",
//     latitude: "",
//     longitude: "",
//     netPlotArea: "",
//     zoningType: "",
//     commercialSplit: "",
//     residentialSplit: "",
//     ownership: "",
//     premiumAmount: "",
//     revenueShare: "",
//     areaPercentage: "",
//     roadWidening: "",
//     otherLocationName: "",
//   });

//   const [villages, setVillages] = useState([]);
//   const [villagesLoading, setVillagesLoading] = useState(true);
//   const [villagesError, setVillagesError] = useState("");
//   const [selectedVillageCoords, setSelectedVillageCoords] = useState(null);

//   useEffect(() => {
//     const allowed = new Set(["Pune", "Thane"]);
//     const city = (formData.location ?? "").trim();
//     if (!allowed.has(city)) return;

//     // remember what we've fetched so we don't re-fetch for the same city
//     if (!window.__lastVillagesCity) window.__lastVillagesCity = null;
//     if (window.__lastVillagesCity === city) return;
//     window.__lastVillagesCity = city;

//     let isMounted = true; // avoid state updates after unmount
//     setVillagesLoading(true);
//     setVillagesError("");

//     (async () => {
//       try {
//         const json = await get_data("/mma/get_villages_by_coordinates/", {
//           ...refreshToken(),
//           body: JSON.stringify({ City: city }),
//         });
//         console.log("Boidy :", json)
//         if (!json?.villages) throw new Error("No villages returned");
//         if (isMounted) setVillages(json.villages);
//       } catch (err) {
//         console.error("get_villages error:", err);
//         if (isMounted) {
//           setVillages([]);
//           setVillagesError("Unable to load villages. Please try again later.");
//         }
//       } finally {
//         if (isMounted) setVillagesLoading(false);
//       }
//     })();

//     return () => {
//       isMounted = false;
//     };
//   }, [formData.location]);


//   const options = villages.map((v) => ({
//     value: v.village,
//     label: v.village,
//     lat: v.lat,
//     lng: v.lng,
//   }));

//   useEffect(() => {
//     if (!selectedVillageCoords) return;

//     const nextLat = selectedVillageCoords.lat ?? "";
//     const nextLng = selectedVillageCoords.lng ?? "";

//     setFormData((prev) => {
//       if (prev.latitude === nextLat && prev.longitude === nextLng) return prev;
//       return { ...prev, latitude: nextLat, longitude: nextLng };
//     });
//   }, [selectedVillageCoords]);

//   // console.log(selectedVillageCoords)

//   useEffect(() => {
//     const saved = localStorage.getItem("landDetailsForm");
//     if (saved) {
//       setFormData(JSON.parse(saved));
//     }
//   }, []);

//   const handleInputChange = (field, value) => {
//     const newFormData = { ...formData, [field]: value };

//     if (field === "commercialSplit" || field === "residentialSplit") {
//       const commercial =
//         field === "commercialSplit"
//           ? parseFloat(value) || 0
//           : parseFloat(newFormData.commercialSplit) || 0;
//       const residential =
//         field === "residentialSplit"
//           ? parseFloat(value) || 0
//           : parseFloat(newFormData.residentialSplit) || 0;

//       if (commercial + residential > 100) {
//         // Show error toast
//         alert("Commercial and Residential splits cannot exceed 100% combined.");
//         return;
//       }
//     }

//     setFormData(newFormData);
//   };

//   const calculateResults = () => {
//     const netPlotArea = parseFloat(formData.netPlotArea) || 0;
//     const basicFSI = netPlotArea * 1.1;

//     const isPuneThane = formData.location === "Pune" || formData.location === "Thane";

//     // Premium calculation
//     const premium = (isPuneThane && formData.roadWidening !== "below9" && formData.roadWidening !== "") ? 0.5 * netPlotArea : 0;

//     // TDR calculation
//     let tdr = 0;
//     if (isPuneThane) {
//       switch (formData.roadWidening) {
//         case "below9":
//           tdr = 0;
//           break;
//         case "9-12":
//           tdr = 0.4 * netPlotArea;
//           break;
//         case "12-15":
//           tdr = 0.65 * netPlotArea;
//           break;
//         case "15-24":
//           tdr = 0.9 * netPlotArea;
//           break;
//         case "24-30":
//           tdr = 1.15 * netPlotArea;
//           break;
//         case "30+":
//           tdr = 1.4 * netPlotArea;
//           break;
//         default:
//           tdr = 0;
//       }
//     }

//     const maxBuildingPotential = basicFSI + premium + tdr;

//     let ancillary = 0;
//     let maxPermissibleArea = 0;
//     let commercialMax, residentialMax;

//     if (formData.zoningType === "residential") {
//       ancillary = maxBuildingPotential * 0.6;
//       maxPermissibleArea = maxBuildingPotential + ancillary;
//     } else if (formData.zoningType === "commercial") {
//       ancillary = maxBuildingPotential * 0.8;
//       maxPermissibleArea = maxBuildingPotential + ancillary;
//     } else if (formData.zoningType === "mixed") {
//       const commercialSplit = (parseFloat(formData.commercialSplit) || 0) / 100;
//       const residentialSplit =
//         (parseFloat(formData.residentialSplit) || 0) / 100;

//       // Calculate ancillary areas first
//       const ancillaryCommercial = maxBuildingPotential * commercialSplit * 0.8;
//       const ancillaryResidential =
//         maxBuildingPotential * residentialSplit * 0.6;

//       // Updated Commercial Max calculation: Area of Commercial Ancillary + (Max Building Potential * commercialSplit/100)
//       commercialMax =
//         ancillaryCommercial + maxBuildingPotential * commercialSplit;

//       // Updated Residential Max calculation: Area of Residential Ancillary + (Max Building Potential * residentialSplit/100)
//       residentialMax =
//         ancillaryResidential + maxBuildingPotential * residentialSplit;

//       maxPermissibleArea =
//         basicFSI + premium + tdr + ancillaryCommercial + ancillaryResidential;
//     }

//     return {
//       netPlotArea,
//       basicFSI,
//       premium,
//       tdr,
//       maxBuildingPotential,
//       ancillary,
//       maxPermissibleArea,
//       commercialMax,
//       residentialMax,
//     };
//   };

//   const handleSave = () => {
//     const isPuneThane = formData.location === "Pune" || formData.location === "Thane";
//     const isOtherLocation = formData.location === "Other Location";

//     if (
//       !formData.clientName ||
//       !formData.phoneNumber ||
//       !formData.location ||
//       !formData.netPlotArea ||
//       !formData.zoningType ||
//       !formData.ownership ||
//       (isPuneThane && !formData.roadWidening) ||
//       (isOtherLocation && !formData.otherLocationName)
//     ) {
//       alert("Please fill in all required fields.");
//       return;
//     }

//     // Validate phone number is exactly 10 digits
//     if (!/^\d{10}$/.test(formData.phoneNumber)) {
//       alert("Phone number must be exactly 10 digits.");
//       return;
//     }

//     if (formData.zoningType === "mixed") {
//       const commercial = parseFloat(formData.commercialSplit) || 0;
//       const residential = parseFloat(formData.residentialSplit) || 0;
//       if (commercial + residential !== 100) {
//         alert("Commercial and Residential splits must equal 100%.");
//         return;
//       }
//     }

//     const results = calculateResults();
//     localStorage.setItem("landDetailsForm", JSON.stringify(formData));
//     localStorage.setItem("landDetailsResults", JSON.stringify(results));
//     localStorage.setItem("zoningType", formData.zoningType);
//     onCalculate(results, formData.zoningType, formData.location);
//     setUpdateUI((prev) => !prev);
//     // Dispatch custom event for same-tab updates
//     window.dispatchEvent(new CustomEvent("landDetailsUpdated"));

//     // Also dispatch events for other components that depend on land data
//     window.dispatchEvent(new CustomEvent("costFormUpdated"));

//     alert("Land details have been saved successfully.");
//   };

//   const handleUpdate = () => {
//     const results = calculateResults();
//     localStorage.setItem("landDetailsForm", JSON.stringify(formData));
//     localStorage.setItem("landDetailsResults", JSON.stringify(results));
//     localStorage.setItem("zoningType", formData.zoningType);
//     onCalculate(results, formData.zoningType, formData.location);
//     setUpdateUI((prev) => !prev);
//     // Dispatch custom event for same-tab updates
//     window.dispatchEvent(new CustomEvent("landDetailsUpdated"));

//     // Also dispatch events for other components that depend on land data
//     window.dispatchEvent(new CustomEvent("costFormUpdated"));

//     alert("Land details have been updated successfully.");
//   };

//   const openMmadashboard = () => {
//     if (!formData.location || !formData.village) {
//       window.open(
//         "http://sigmavalue-research.ap-south-1.elasticbeanstalk.com/locationwisedashboardvertical/?City=Pune&Village=Borhadewadi",
//         "_blank"
//       );
//     }
//   };

//   return (
//     <div className="card border-0 shadow-sm rounded-4 card-hover-lift h-100">
//       <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
//         <h1 className="fw-bold mb-3" style={{ color: '#000000' }}>
//           <div className="d-flex align-items-center">
//             <div className="bg-primary bg-opacity-10 text-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
//               {/* <i className="fas fa-map-marked-alt" style={{ color: '#448C74' }}></i> */}
//                <FaMapMarkedAlt 
//       className="me-3"
//       style={{ color: '#448C74' }}
//     />
//             </div>
//             Land Details
//           </div>
//         </h1>
//       </div>
//       <div className="card-body p-4">
//         <div className="row g-3">
//           <div className="col-md-6">
//             <label htmlFor="clientName" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
//               Client Name *
//             </label>
//             <input
//               type="text"
//               className="form-control"
//               id="clientName"
//               value={formData.clientName}
//               onChange={(e) => handleInputChange("clientName", e.target.value)}
//               placeholder="Enter client name"
//               maxLength={100}
//             />
//           </div>

//           <div className="col-md-6">
//             <label htmlFor="phoneNumber" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
//               Phone Number *
//             </label>
//             <input
//               type="tel"
//               className="form-control"
//               id="phoneNumber"
//               value={formData.phoneNumber}
//               onChange={(e) => {
//                 // Only allow digits and limit to 10 characters
//                 const value = e.target.value.replace(/\D/g, "").slice(0, 10);
//                 handleInputChange("phoneNumber", value);
//               }}
//               placeholder="Enter 10-digit phone number"
//               maxLength={10}
//             />
//           </div>

//           <div className="col-md-6">
//             <label htmlFor="location" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
//               Location *
//             </label>
//             <select
//               className="form-select"
//               value={formData.location}
//               onChange={(e) => handleInputChange("location", e.target.value)}
//             >
//               <option value="">Select location</option>
//               <option value="Pune">Pune</option>
//               <option value="Nagpur">Nagpur</option>
//               <option value="Aurangabad">Aurangabad</option>
//               <option value="Nashik">Nashik</option>
//               <option value="Thane">Thane</option>
//               <option value="Mumbai">Mumbai</option>
//               <option value="Bangalore">Bangalore</option>
//               <option value="Delhi-ncr">Delhi NCR</option>
//               <option value="Chennai">Chennai</option>
//               <option value="Hyderabad">Hyderabad</option>
//               <option value="Ahmedabad">Ahmedabad</option>
//               <option value="Surat">Surat</option>
//               <option value="Other Location">Other Location</option>
//             </select>
//           </div>

//           {formData.location === "Other Location" && (
//             <div className="col-md-6">
//               <label htmlFor="otherLocationName" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
//                 Name of Location *
//               </label>
//               <input
//                 type="text"
//                 className="form-control"
//                 id="otherLocationName"
//                 value={formData.otherLocationName}
//                 onChange={(e) => handleInputChange("otherLocationName", e.target.value)}
//                 placeholder="Enter location name"
//                 maxLength={100}
//               />
//             </div>
//           )}

//           {(formData.location === "Pune" || formData.location === "Thane") && (
//             <>
//               {villagesError && (
//                 <div className="alert alert-danger border-0 shadow-sm rounded-3" role="alert">
//                   {villagesError}
//                 </div>
//               )}
//               <div className="col-md-6">
//                 <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Village</label>
//                 <Select
//                   options={options}
//                   value={
//                     formData.village
//                       ? options.find((o) => o.value === formData.village)
//                       : null
//                   }
//                   onChange={(opt) => {
//                     if (opt) {
//                       handleInputChange("village", opt.value);
//                       setSelectedVillageCoords({ lat: opt.lat, lng: opt.lng });
//                     } else {
//                       handleInputChange("village", "");
//                       setSelectedVillageCoords(null);
//                     }
//                   }}
//                   isLoading={villagesLoading}
//                   isDisabled={villagesLoading}
//                   placeholder="Choose village"
//                   isClearable
//                 />
//               </div>
//             </>
//           )}



//           <div className="col-md-6">
//             <label htmlFor="coordinates" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
//               Coordinates
//             </label>
//             <input
//               type="text"
//               className="form-control"
//               id="coordinates"
//               value={formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : ''}
//               onChange={(e) => {
//                 const value = e.target.value.trim();
//                 if (value === '') {
//                   // Clear both latitude and longitude
//                   setFormData({ ...formData, latitude: '', longitude: '' });
//                 } else {
//                   // Parse comma-separated coordinates
//                   const parts = value.split(',').map(p => p.trim());
//                   if (parts.length === 2) {
//                     const lat = parts[0];
//                     const lng = parts[1];
//                     setFormData({ ...formData, latitude: lat, longitude: lng });
//                   } else if (parts.length === 1) {
//                     // Allow partial input while typing
//                     setFormData({ ...formData, latitude: parts[0], longitude: '' });
//                   }
//                 }
//               }}
//               placeholder="e.g., 18.623724, 73.724565"
//             />
//             <small className="text-muted">Enter coordinates in Google Maps format: latitude, longitude</small>
//           </div>

//           <div className="col-md-6">
//             <label
//               htmlFor="netPlotArea"
//               className="form-label d-flex align-items-center gap-2 fw-bold text-dark small text-uppercase"
//               style={{ letterSpacing: '0.5px' }}
//             >
//               Net Plot Area Sq Ft *
//               <div className="position-relative d-inline-block">
//                 <FaInfo
//                   className="text-muted"
//                   style={{ width: "16px", height: "16px", cursor: "help" }}
//                   onMouseEnter={(e) => {
//                     const tooltip = e.target.nextElementSibling;
//                     if (tooltip) tooltip.style.display = "block";
//                   }}
//                   onMouseLeave={(e) => {
//                     const tooltip = e.target.nextElementSibling;
//                     if (tooltip) tooltip.style.display = "none";
//                   }}
//                 />
//                 <div
//                   className="position-absolute bg-dark text-white p-2 rounded shadow-sm"
//                   style={{
//                     display: "none",
//                     zIndex: 1000,
//                     width: "280px",
//                     fontSize: "12px",
//                     lineHeight: "1.4",
//                     top: "-5px",
//                     left: "25px",
//                     whiteSpace: "normal",
//                   }}
//                 >
//                   Net Plot Area = [Gross_Plot_Area] - [Deductions as per norms]
//                 </div>
//               </div>
//             </label>
//             <input
//               type="number"
//               className="form-control"
//               id="netPlotArea"
//               value={formData.netPlotArea}
//               onChange={(e) => handleInputChange("netPlotArea", e.target.value)}
//               placeholder="Enter area in sq ft"
//             />
//           </div>

//           <div className="col-12">
//             <label htmlFor="zoningType" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
//               Developement Category *
//               <button
//                 type="button"
//                 className="btn btn-link btn-sm p-0 ms-1"
//                 onClick={openMmadashboard}
//                 style={{ textDecoration: "none" }}
//               >
//                 <FaExternalLinkAlt style={{ width: "16px", height: "16px" }} />
//               </button>
//             </label>
//             <select
//               className="form-select"
//               value={formData.zoningType}
//               onChange={(e) => handleInputChange("zoningType", e.target.value)}
//             >
//               <option value="">Select Developement Category</option>
//               <option value="residential">Residential</option>
//               <option value="commercial">Commercial</option>
//               <option value="mixed">Mixed Use</option>
//             </select>
//           </div>

//           {formData.zoningType === "mixed" && (
//             <div className="col-12">
//               <div className="row g-3 p-3 bg-light rounded-3">
//                 <div className="col-md-6">
//                   <label htmlFor="commercialSplit" className="form-label fw-bold text-dark small">
//                     Commercial Split %
//                   </label>
//                   <input
//                     type="number"
//                     className="form-control"
//                     id="commercialSplit"
//                     min="0"
//                     max="100"
//                     value={formData.commercialSplit}
//                     onChange={(e) =>
//                       handleInputChange("commercialSplit", e.target.value)
//                     }
//                     placeholder="Enter percentage"
//                   />
//                 </div>

//                 <div className="col-md-6">
//                   <label htmlFor="residentialSplit" className="form-label fw-bold text-dark small">
//                     Residential Split %
//                   </label>
//                   <input
//                     type="number"
//                     className="form-control"
//                     id="residentialSplit"
//                     min="0"
//                     max="100"
//                     value={formData.residentialSplit}
//                     onChange={(e) =>
//                       handleInputChange("residentialSplit", e.target.value)
//                     }
//                     placeholder="Enter percentage"
//                   />
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* shifted this code into the developer owenership page  */}

//           {/* <div className="col-12">
//             <label className="form-label">Who owns the land? *</label>
//             <div className="form-check">
//               <input
//                 className="form-check-input"
//                 type="radio"
//                 name="ownership"
//                 id="developer"
//                 value="developer"
//                 checked={formData.ownership === "developer"}
//                 onChange={(e) => handleInputChange("ownership", e.target.value)}
//               />
//               <label className="form-check-label" htmlFor="developer">
//                 Developer-owned
//               </label>
//             </div>
//             <div className="form-check">
//               <input
//                 className="form-check-input"
//                 type="radio"
//                 name="ownership"
//                 id="jda"
//                 value="jda"
//                 checked={formData.ownership === "jda"}
//                 onChange={(e) => handleInputChange("ownership", e.target.value)}
//               />
//               <label className="form-check-label" htmlFor="jda">
//                 Landowner (Joint Development Agreement)
//               </label>
//             </div>
//           </div>

//           {formData.ownership === "jda" && (
//             <div className="col-12">
//               <div className="row g-3 p-3 bg-light rounded">
//                 <div className="col-md-4">
//                   <label htmlFor="premiumAmount" className="form-label">
//                     Premium Amount (Optional)
//                   </label>
//                   <input
//                     type="number"
//                     className="form-control"
//                     id="premiumAmount"
//                     value={formData.premiumAmount}
//                     onChange={(e) =>
//                       handleInputChange("premiumAmount", e.target.value)
//                     }
//                     placeholder="Enter amount"
//                   />
//                 </div>

//                 <div className="col-md-4">
//                   <label htmlFor="revenueShare" className="form-label">
//                     Revenue Share % (Optional)
//                   </label>
//                   <input
//                     type="number"
//                     className="form-control"
//                     id="revenueShare"
//                     min="0"
//                     max="100"
//                     value={formData.revenueShare}
//                     onChange={(e) =>
//                       handleInputChange("revenueShare", e.target.value)
//                     }
//                     placeholder="Enter percentage"
//                   />
//                 </div>

//                 <div className="col-md-4">
//                   <label htmlFor="areaPercentage" className="form-label">
//                     Area Percentage (Optional)
//                   </label>
//                   <input
//                     type="number"
//                     className="form-control"
//                     id="areaPercentage"
//                     min="0"
//                     max="100"
//                     value={formData.areaPercentage}
//                     onChange={(e) =>
//                       handleInputChange("areaPercentage", e.target.value)
//                     }
//                     placeholder="Enter percentage"
//                   />
//                 </div>
//               </div>
//             </div>
//           )} */}

//           {/* shifted this code into the developer owenership page  */}

//           {(formData.location === "Pune" || formData.location === "Thane") && (
//             <div className="col-12">
//               <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Road Widening *</label>
//               <div className="form-check">
//                 <input
//                   className="form-check-input"
//                   type="radio"
//                   name="roadWidening"
//                   id="below9"
//                   value="below9"
//                   checked={formData.roadWidening === "below9"}
//                   onChange={(e) =>
//                     handleInputChange("roadWidening", e.target.value)
//                   }
//                 />
//                 <label className="form-check-label text-dark" htmlFor="below9">
//                   Below 9 m.
//                 </label>
//               </div>
//               <div className="form-check">
//                 <input
//                   className="form-check-input"
//                   type="radio"
//                   name="roadWidening"
//                   id="9-12"
//                   value="9-12"
//                   checked={formData.roadWidening === "9-12"}
//                   onChange={(e) =>
//                     handleInputChange("roadWidening", e.target.value)
//                   }
//                 />
//                 <label className="form-check-label text-dark" htmlFor="9-12">
//                   9 m. and above but below 12 m.
//                 </label>
//               </div>
//               <div className="form-check">
//                 <input
//                   className="form-check-input"
//                   type="radio"
//                   name="roadWidening"
//                   id="12-15"
//                   value="12-15"
//                   checked={formData.roadWidening === "12-15"}
//                   onChange={(e) =>
//                     handleInputChange("roadWidening", e.target.value)
//                   }
//                 />
//                 <label className="form-check-label text-dark" htmlFor="12-15">
//                   12 m. and above but below 15 m.
//                 </label>
//               </div>
//               <div className="form-check">
//                 <input
//                   className="form-check-input"
//                   type="radio"
//                   name="roadWidening"
//                   id="15-24"
//                   value="15-24"
//                   checked={formData.roadWidening === "15-24"}
//                   onChange={(e) =>
//                     handleInputChange("roadWidening", e.target.value)
//                   }
//                 />
//                 <label className="form-check-label text-dark" htmlFor="15-24">
//                   15 m. and above but below 24 m.
//                 </label>
//               </div>
//               <div className="form-check">
//                 <input
//                   className="form-check-input"
//                   type="radio"
//                   name="roadWidening"
//                   id="24-30"
//                   value="24-30"
//                   checked={formData.roadWidening === "24-30"}
//                   onChange={(e) =>
//                     handleInputChange("roadWidening", e.target.value)
//                   }
//                 />
//                 <label className="form-check-label text-dark" htmlFor="24-30">
//                   24 and above but below 30 m.
//                 </label>
//               </div>
//               <div className="form-check">
//                 <input
//                   className="form-check-input"
//                   type="radio"
//                   name="roadWidening"
//                   id="30+"
//                   value="30+"
//                   checked={formData.roadWidening === "30+"}
//                   onChange={(e) =>
//                     handleInputChange("roadWidening", e.target.value)
//                   }
//                 />
//                 <label className="form-check-label text-dark" htmlFor="30+">
//                   30 and above
//                 </label>
//               </div>
//             </div>
//           )}

//           <div className="col-12 pt-3">
//             <div className="row g-3">
//               <div className="col-6">
//                 <button onClick={handleSave} className="btn btn-primary rounded-pill w-100 shadow-sm card-hover-lift">
//                   <i className="fas fa-save me-2"></i>Save
//                 </button>
//               </div>
//               <div className="col-6">
//                 <button
//                   onClick={handleUpdate}
//                   className="btn btn-secondary rounded-pill w-100 shadow-sm card-hover-lift"
//                 >
//                   <i className="fas fa-sync-alt me-2"></i>Update
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LandDetailsForm;


import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
// import { ExternalLink, Info } from "lucide-react";
import {
  FaInfo, FaExternalLinkAlt, FaMapMarkedAlt, FaSave,
  FaSyncAlt, FaList, FaExpandAlt, FaCompress, FaGlobe, FaSpinner, FaChevronDown, FaChevronUp, FaInfoCircle
} from "react-icons/fa";
import { FaWandSparkles, FaEarthAmericas } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiUrl } from "@/lib/api-client";
import Select from "react-select"
import OsmInline from "./OsmInline";

const ALLOWED_CITIES = [
  "Pune", "Thane", "Abu Dhabi", "Dubai",
  "Hyderabad", "Medchal-Malkajgiri", "Mumbai",
  "Rangareddy", "Sangareddy", "Yadadri Bhuvanagiri"
];

const LandDetailsForm = ({ onCalculate, updateingUI, setUpdateUI, onViewChange }) => {
  const [formData, setFormData] = useState({
    clientName: "",
    phoneNumber: "",
    location: "",
    village: "",
    latitude: "",
    longitude: "",
    netPlotArea: "",
    zoningType: "",
    areaType: "",
    commercialSplit: "",
    residentialSplit: "",
    ownership: "",
    premiumAmount: "",
    revenueShare: "",
    areaPercentage: "",
    roadWidening: "",
    fetched_location: "",
    roadCategory: "",
    planningAdvisory: "",
    builtupDensity: "",
    otherLocationName: "",
  });


  const [villages, setVillages] = useState([]);
  const [villagesLoading, setVillagesLoading] = useState(true);
  const [villagesError, setVillagesError] = useState("");
  const [selectedVillageCoords, setSelectedVillageCoords] = useState(null);
  const [showRoadWidth, setShowRoadWidth] = useState(true);
  const [showFetchedLocation, setShowFetchedLocation] = useState(false);
  const [autoLoadMapTrigger, setAutoLoadMapTrigger] = useState(0);
  const [planningAdvisoryLoading, setPlanningAdvisoryLoading] = useState(false);
  const planningAdvisoryRequestRef = useRef(0);
  const coordinateLocationRequestRef = useRef(0);
  const loadedPlanningCoordsRef = useRef("");
  const osmLoadActiveRef = useRef(false);


  useEffect(() => {
    const allowed = new Set(ALLOWED_CITIES);
    const city = (formData.location ?? "").trim();
    if (!allowed.has(city)) return;

    // remember what we've fetched so we don't re-fetch for the same city
    if (!window.__lastVillagesCity) window.__lastVillagesCity = null;
    if (window.__lastVillagesCity === city) return;
    window.__lastVillagesCity = city;

    let isMounted = true; // avoid state updates after unmount
    setVillagesLoading(true);
    setVillagesError("");

    (async () => {
      try {
        const res = await fetch(apiUrl("/geospatial/villages_by_coordinates"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ City: city }),
        });
        const json = await res.json();
        if (!json?.villages) throw new Error("No villages returned");
        if (isMounted) setVillages(json.villages);
      } catch (err) {
        console.error("get_villages error:", err);
        if (isMounted) {
          setVillages([]);
          setVillagesError("Unable to load villages. Please try again later.");
        }
      } finally {
        if (isMounted) setVillagesLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [formData.location]);


  const options = villages.map((v) => ({
    value: v.village,
    label: v.village,
    lat: v.lat,
    lng: v.lng,
  }));

  useEffect(() => {
    if (selectedVillageCoords) {
      planningAdvisoryRequestRef.current += 1;
      coordinateLocationRequestRef.current += 1;
      setFormData(prev => ({
        ...prev,
        latitude: selectedVillageCoords.lat,
        longitude: selectedVillageCoords.lng,
        fetched_location: "",
        planningAdvisory: "",
      }));
      loadedPlanningCoordsRef.current = "";
    }
  }, [selectedVillageCoords]);

  // console.log("RAVILEHS IS HERE",selectedVillageCoords)

  useEffect(() => {
    const saved = localStorage.getItem("landDetailsForm");
    if (saved) {
      const parsed = JSON.parse(saved);
      setFormData(parsed);
      if (parsed?.fetched_location) {
        setShowFetchedLocation(true);
      }
    }
  }, []);


  const [v3FormData, setV3FormData] = useState({
    permissibleFSI_FAR: "",
    grossFloorArea: "",
  });

  useEffect(() => {
    const savedV3 = localStorage.getItem("Land_and_fsi_details");
    if (savedV3) {
      try {
        setV3FormData(JSON.parse(savedV3));
      } catch (e) {
        console.error("Error parsing Land_and_fsi_details", e);
      }
    }
  }, []);

  const handleV3InputChange = (field, value) => {
    setV3FormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Helper to persist complete V3 payload
  const saveV3Payload = (overrideV3Data, overrideQuery, overrideStatus, overrideResponse) => {
    const dataToSave = overrideV3Data || v3FormData;
    const queryToSave = overrideQuery !== undefined ? overrideQuery : webAgentQuery;
    const statusToSave = overrideStatus !== undefined ? overrideStatus : webAgentStatus;
    const responseToSave = overrideResponse !== undefined ? overrideResponse : webAgentResponse;

    const payload = {
      permissibleFSI_FAR: dataToSave.permissibleFSI_FAR || "",
      grossFloorArea: dataToSave.grossFloorArea || "",
      webAgentQuery: queryToSave || "",
      webAgentStatus: statusToSave || "idle",
      webAgentResponse: responseToSave || "",
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem("Land_and_fsi_details", JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("landAndFsiDetailsSaved", { detail: payload }));
    return payload;
  };

  const handleV3Save = () => {
    saveV3Payload();
    alert("Land and FSI details (V3) payload saved successfully!");
  };

  const [webAgentStatus, setWebAgentStatus] = useState("idle");
  const [webAgentResponse, setWebAgentResponse] = useState("");
  const [webAgentError, setWebAgentError] = useState("");
  const [isWebAgentExpanded, setIsWebAgentExpanded] = useState(true);
  const [isWebAgentMaximized, setIsWebAgentMaximized] = useState(false);
  const [webAgentQuery, setWebAgentQuery] = useState("");
  const [webAgentCurrentStatus, setWebAgentCurrentStatus] = useState("");
  const [webAgentStatusLog, setWebAgentStatusLog] = useState([]);
  const userEditedQueryRef = useRef(false);

  // Load saved Land_and_fsi_details V3 payload on mount
  useEffect(() => {
    const savedV3 = localStorage.getItem("Land_and_fsi_details");
    if (savedV3) {
      try {
        const parsed = JSON.parse(savedV3);
        setV3FormData({
          permissibleFSI_FAR: parsed.permissibleFSI_FAR || "",
          grossFloorArea: parsed.grossFloorArea || "",
        });
        if (parsed.webAgentStatus) setWebAgentStatus(parsed.webAgentStatus);
        if (parsed.webAgentResponse) setWebAgentResponse(parsed.webAgentResponse);
        if (parsed.webAgentQuery) {
          setWebAgentQuery(parsed.webAgentQuery);
          userEditedQueryRef.current = true; // Mark as saved/edited if loaded from V3 storage
        }
      } catch (e) {
        console.error("Error parsing Land_and_fsi_details payload:", e);
      }
    }
  }, []);

  const constructQueryFromLandData = (landData) => {
    let location = "pune";
    let lat = "18.6448506424618";
    let lng = "73.7781109002116";
    let planningAuthority = "Pune Metropolitan Region Development Authority";

    const savedData = landData || localStorage.getItem("Land Identification") || localStorage.getItem("landDetailsForm");
    if (savedData) {
      try {
        const parsed = typeof savedData === "string" ? JSON.parse(savedData) : savedData;
        location = (parsed.location === "Other Location" && parsed.otherLocationName)
          ? parsed.otherLocationName
          : parsed.location || parsed.city || location;
        lat = parsed.polygonCenterLat || parsed.latitude || lat;
        lng = parsed.polygonCenterLng || parsed.longitude || lng;
        planningAuthority = parsed.planningAuthority || parsed.planning_authority || parsed.planningAdvisory || planningAuthority;
      } catch (err) {
        console.error("Error parsing Land Identification data for Web Agent:", err);
      }
    }

    return `give me building code/bulding regulation rules & relevant document in ${location} ,for ${lat}, ${lng}, under ${planningAuthority}`;
  };

  useEffect(() => {
    const updateQueryFromEvent = (e) => {
      const newQuery = constructQueryFromLandData(e?.detail);
      setWebAgentQuery(newQuery);
      userEditedQueryRef.current = false;
    };

    // Initial sync on mount if not custom-edited
    const initialQuery = constructQueryFromLandData();
    if (!userEditedQueryRef.current) {
      setWebAgentQuery(initialQuery);
    }

    window.addEventListener("landIdentificationSaved", updateQueryFromEvent);
    window.addEventListener("landDetailsUpdated", updateQueryFromEvent);
    window.addEventListener("landDetailsFormSaved", updateQueryFromEvent);
    return () => {
      window.removeEventListener("landIdentificationSaved", updateQueryFromEvent);
      window.removeEventListener("landDetailsUpdated", updateQueryFromEvent);
      window.removeEventListener("landDetailsFormSaved", updateQueryFromEvent);
    };
  }, []);

  const webEventSourceRef = useRef(null);

  const runWebDataAgent = () => {
    setWebAgentStatus("loading");
    setWebAgentError("");
    setWebAgentResponse("");
    setWebAgentCurrentStatus("Initializing web search...");
    setWebAgentStatusLog(["Initializing web search connection..."]);
    setIsWebAgentExpanded(true);

    const queryToSend = webAgentQuery || `give me building code/bulding regulation rules & relevant document in pune ,for 18.6448506424618, 73.7781109002116, under Pune Metropolitan Region Development Authority`;
    const encodedQuery = encodeURIComponent(queryToSend);

    if (webEventSourceRef.current) {
      webEventSourceRef.current.close();
    }

    let accumulatedResponse = "";

    try {
      const streamUrl = apiUrl(`/api/chat_stream?query=${encodedQuery}&no_cache=true`);
      const source = new EventSource(streamUrl);
      webEventSourceRef.current = source;

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "status") {
            const statusMsg = data.content || "Processing...";
            setWebAgentCurrentStatus(statusMsg);
            setWebAgentStatusLog((prev) => [...prev, statusMsg]);
          } else if (data.type === "chunk") {
            accumulatedResponse += data.content || "";
            setWebAgentResponse((prev) => prev + data.content);
          } else if (data.type === "done") {
            source.close();
            setWebAgentStatus("completed");
            saveV3Payload(undefined, queryToSend, "completed", accumulatedResponse);
          }
        } catch (e) {
          console.error("Error parsing chat_stream event data:", e);
        }
      };

      source.onerror = (err) => {
        console.error("chat_stream EventSource error:", err);
        source.close();
        setWebAgentStatus("error");
        setWebAgentError("Connection to Web Search Agent stream failed. Please try again.");
      };
    } catch (err) {
      console.error("Error establishing EventSource:", err);
      setWebAgentStatus("error");
      setWebAgentError(err.message || "Failed to establish stream connection.");
    }
  };

  const handleInputChange = (field, value) => {
    if (field === "latitude" || field === "longitude") {
      loadedPlanningCoordsRef.current = "";
      planningAdvisoryRequestRef.current += 1;
      coordinateLocationRequestRef.current += 1;
    }

    if (field === "commercialSplit" || field === "residentialSplit") {
      const commercial =
        field === "commercialSplit"
          ? parseFloat(value) || 0
          : parseFloat(formData.commercialSplit) || 0;
      const residential =
        field === "residentialSplit"
          ? parseFloat(value) || 0
          : parseFloat(formData.residentialSplit) || 0;

      if (commercial + residential > 100) {
        // Show error toast
        alert("Commercial and Residential splits cannot exceed 100% combined.");
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...((field === "latitude" || field === "longitude")
        ? { fetched_location: "", planningAdvisory: "" }
        : {}),
      ...(field === "location"
        ? { fetched_location: "" }
        : {}),
    }));
  };

  const fetchPlanningAdvisory = async (coords = {}) => {
    const latitude = coords.latitude ?? formData.latitude;
    const longitude = coords.longitude ?? formData.longitude;

    if (!(latitude && longitude)) return;

    const requestKey = `${latitude},${longitude}`;
    const requestId = planningAdvisoryRequestRef.current + 1;
    planningAdvisoryRequestRef.current = requestId;
    loadedPlanningCoordsRef.current = requestKey;

    setPlanningAdvisoryLoading(true);
    setFormData((prev) => ({
      ...prev,
      planningAdvisory: "",
    }));
    try {
      const res = await fetch(apiUrl("/new_rate_simulator/simulator/planning-advisory"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          location: formData.location,
          village: formData.village,
        }),
      });
      const data = await res.json();

      if (data?.success && data?.planningAdvisory) {
        if (planningAdvisoryRequestRef.current !== requestId) return;
        setFormData((prev) => ({
          ...prev,
          planningAdvisory: data.planningAdvisory,
        }));
      } else if (data?.error) {
        console.warn("Planning authority lookup skipped:", data.error);
      }
    } catch (err) {
      console.error("planning authority lookup error:", err);
    } finally {
      if (planningAdvisoryRequestRef.current === requestId && !osmLoadActiveRef.current) {
        setPlanningAdvisoryLoading(false);
      }
    }
  };

  const fetchCoordinateLocation = async (coords = {}) => {
    const latitude = coords.latitude ?? formData.latitude;
    const longitude = coords.longitude ?? formData.longitude;

    if (!(latitude && longitude)) return;

    const requestId = coordinateLocationRequestRef.current + 1;
    coordinateLocationRequestRef.current = requestId;

    setShowFetchedLocation(true);
    setFormData((prev) => ({
      ...prev,
      fetched_location: "",
    }));

    try {
      const res = await fetch(apiUrl("/new_rate_simulator/simulator/coordinate-location"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          location: formData.location,
          village: formData.village,
        }),
      });
      const data = await res.json();

      if (data?.success && data?.fetched_location) {
        if (coordinateLocationRequestRef.current !== requestId) return;
        setFormData((prev) => ({
          ...prev,
          fetched_location: data.fetched_location,
        }));
      } else if (data?.error) {
        console.warn("Coordinate location lookup skipped:", data.error);
      }
    } catch (err) {
      console.error("coordinate location lookup error:", err);
    }
  };

  const handleFetchParameters = () => {
    setShowRoadWidth(true);
    setShowFetchedLocation(true);
    if (formData.latitude && formData.longitude) {
      setAutoLoadMapTrigger((prev) => prev + 1);
    }
    setPlanningAdvisoryLoading(true);
  };

  const calculateResults = () => {
    const netPlotArea = parseFloat(formData.netPlotArea) || 0;
    const basicFSI = netPlotArea * 1.1;

    const isPuneThane = formData.location === "Pune" || formData.location === "Thane";

    // Premium calculation
    const premium = (isPuneThane && formData.roadWidening !== "below9" && formData.roadWidening !== "") ? 0.5 * netPlotArea : 0;

    // TDR calculation
    let tdr = 0;
    if (isPuneThane) {
      switch (formData.roadWidening) {
        case "below9":
          tdr = 0;
          break;
        case "9-12":
          tdr = 0.4 * netPlotArea;
          break;
        case "12-15":
          tdr = 0.65 * netPlotArea;
          break;
        case "15-24":
          tdr = 0.9 * netPlotArea;
          break;
        case "24-30":
          tdr = 1.15 * netPlotArea;
          break;
        case "30+":
          tdr = 1.4 * netPlotArea;
          break;
        default:
          tdr = 0;
      }
    }

    const maxBuildingPotential = basicFSI + premium + tdr;

    let ancillary = 0;
    let maxPermissibleArea = 0;
    let commercialMax, residentialMax;

    if (formData.zoningType === "residential") {
      ancillary = maxBuildingPotential * 0.6;
      maxPermissibleArea = maxBuildingPotential + ancillary;
    } else if (formData.zoningType === "commercial") {
      ancillary = maxBuildingPotential * 0.8;
      maxPermissibleArea = maxBuildingPotential + ancillary;
    } else if (formData.zoningType === "mixed") {
      const commercialSplit = (parseFloat(formData.commercialSplit) || 0) / 100;
      const residentialSplit =
        (parseFloat(formData.residentialSplit) || 0) / 100;

      // Calculate ancillary areas first
      const ancillaryCommercial = maxBuildingPotential * commercialSplit * 0.8;
      const ancillaryResidential =
        maxBuildingPotential * residentialSplit * 0.6;

      // Updated Commercial Max calculation: Area of Commercial Ancillary + (Max Building Potential * commercialSplit/100)
      commercialMax =
        ancillaryCommercial + maxBuildingPotential * commercialSplit;

      // Updated Residential Max calculation: Area of Residential Ancillary + (Max Building Potential * residentialSplit/100)
      residentialMax =
        ancillaryResidential + maxBuildingPotential * residentialSplit;

      maxPermissibleArea =
        basicFSI + premium + tdr + ancillaryCommercial + ancillaryResidential;
    }

    return {
      netPlotArea,
      basicFSI,
      premium,
      tdr,
      maxBuildingPotential,
      ancillary,
      maxPermissibleArea,
      commercialMax,
      residentialMax,
    };
  };

  const syncMarketAnalysisCity = (city, villageName) => {
    try {
      const existingRaw = localStorage.getItem('Market Analysis Payload');
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const updated = { ...existing, city, villageName };
      localStorage.setItem('Market Analysis Payload', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('marketAnalysisUpdated', { detail: updated }));
    } catch (e) {
      console.error("Failed to sync city to Market Analysis Payload", e);
    }
  };

  const handleSave = () => {
    const isPuneThane = formData.location === "Pune" || formData.location === "Thane";
    const isOtherLocation = formData.location === "Other Location";

    if (
      !formData.location ||
      !formData.netPlotArea ||
      !formData.zoningType ||
      (isPuneThane && !formData.roadWidening) ||
      (isOtherLocation && !formData.otherLocationName)
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    if (formData.zoningType === "mixed") {
      const commercial = parseFloat(formData.commercialSplit) || 0;
      const residential = parseFloat(formData.residentialSplit) || 0;
      if (commercial + residential !== 100) {
        alert("Commercial and Residential splits must equal 100%.");
        return;
      }
    }

    const results = calculateResults();
    localStorage.setItem("landDetailsForm", JSON.stringify(formData));
    localStorage.setItem("landDetailsResults", JSON.stringify(results));
    localStorage.setItem("zoningType", formData.zoningType);

    // Sync city and village to Market Analysis Payload
    syncMarketAnalysisCity(formData.location, formData.village);

    onCalculate(results, formData.zoningType, formData.location);
    setUpdateUI((prev) => !prev);
    if (formData.latitude && formData.longitude) {
      setShowRoadWidth(true);
      setAutoLoadMapTrigger((prev) => prev + 1);
    }
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent("landDetailsUpdated"));

    // Also dispatch events for other components that depend on land data
    window.dispatchEvent(new CustomEvent("costFormUpdated"));

    alert("Land details have been saved successfully.");
  };

  const handleUpdate = () => {
    const results = calculateResults();
    localStorage.setItem("landDetailsForm", JSON.stringify(formData));
    localStorage.setItem("landDetailsResults", JSON.stringify(results));
    localStorage.setItem("zoningType", formData.zoningType);

    // Sync city and village to Market Analysis Payload
    syncMarketAnalysisCity(formData.location, formData.village);

    onCalculate(results, formData.zoningType, formData.location);
    setUpdateUI((prev) => !prev);
    if (formData.latitude && formData.longitude) {
      setShowRoadWidth(true);
      setAutoLoadMapTrigger((prev) => prev + 1);
    }
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent("landDetailsUpdated"));

    // Also dispatch events for other components that depend on land data
    window.dispatchEvent(new CustomEvent("costFormUpdated"));

    alert("Land details have been updated successfully.");
  };

  const openMmadashboard = () => {
    if (!formData.location || !formData.village) {
      window.open(
        "http://sigmavalue-research.ap-south-1.elasticbeanstalk.com/locationwisedashboardvertical/?City=Pune&Village=Borhadewadi",
        "_blank"
      );
    }
  };

  return (
    <div className="land-details-panel h-100">
      <style>{`
        .land-details-panel {
          background: #ffffff;
          border: 1px solid #e7ebf1;
          border-radius: 24px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .land-details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          padding: 24px 26px 14px;
          background: #ffffff;
        }

        .land-details-toggle {
          display: inline-flex;
          gap: 8px;
          padding: 6px;
          border-radius: 999px;
          background: #eef3f8;
          border: 1px solid #dbe3ee;
        }

        .land-details-toggle .btn {
          border: 0;
          min-height: 38px;
          min-width: 104px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 13px;
          padding: 0 14px;
          box-shadow: none !important;
        }

        .land-details-toggle .btn-active {
          background: #ffffff;
          color: #111827;
        }

        .land-details-toggle .btn-inactive {
          background: transparent;
          color: #687384;
        }

        .v2-canvas {
          padding: 40px;
          text-align: center;
          color: #64748b;
          font-size: 16px;
          border: 2px dashed #e2e8f0;
          border-radius: 16px;
          margin-top: 20px;
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }

        .land-details-eyebrow {
          color: #8b95a5;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .land-details-title {
          color: #111827;
          font-size: 32px;
          line-height: 1;
          font-weight: 800;
          margin: 0;
        }

        .land-details-body {
          padding: 14px 26px 26px;
        }

        .coordinate-intel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border: 1px solid #e4e9f1;
          background: #f9fbff;
          border-radius: 18px;
          padding: 16px 18px;
          margin-bottom: 18px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.45);
        }

        .coordinate-intel-title {
          color: #263140;
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .coordinate-intel-copy {
          color: #7a8494;
          font-size: 13px;
          font-weight: 600;
          margin: 0;
        }

        .coordinate-intel-btn {
          border: 0;
          border-radius: 14px;
          background: #111827;
          color: #ffffff;
          font-weight: 800;
          padding: 11px 16px;
          min-width: 190px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
        }

        .coordinate-intel-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .land-details-grid > .col-md-6,
        .land-details-grid > .col-12:not(.land-actions):not(.land-osm-panel) {
          border: 1px solid #e5eaf2;
          background: #fbfcff;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
        }

        .land-details-grid .form-label {
          color: #3f4a5a !important;
          font-size: 13px;
          font-weight: 800 !important;
          text-transform: none !important;
          letter-spacing: 0 !important;
          margin-bottom: 8px;
        }

        .land-label-with-info {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .road-category-info {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border: 1px solid #cfd7e4;
          border-radius: 50%;
          color: #526071;
          background: #ffffff;
          font-size: 10px;
          cursor: help;
        }

        .road-category-tooltip {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 10px);
          transform: translateX(-50%);
          width: min(360px, calc(100vw - 48px));
          padding: 14px;
          border: 1px solid #dfe5ee;
          border-radius: 14px;
          background: #ffffff;
          color: #273242;
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.18);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          z-index: 20;
          text-transform: none;
          letter-spacing: 0;
          line-height: 1.35;
        }

        .road-category-info:hover .road-category-tooltip,
        .road-category-info:focus .road-category-tooltip,
        .road-category-info:focus-within .road-category-tooltip {
          opacity: 1;
          visibility: visible;
        }

        .road-category-tooltip-title {
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .road-category-tooltip-copy {
          font-size: 12px;
          font-weight: 600;
          color: #657184;
          margin-bottom: 10px;
        }

        .road-category-tooltip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .road-category-tooltip-list li {
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 700;
          background: #f8fafc;
        }

        .land-details-grid .form-control,
        .land-details-grid .form-select {
          min-height: 41px;
          border-radius: 12px;
          border: 1px solid #dfe5ee;
          background: #ffffff;
          color: #111827;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
        }

        .builtup-density-input {
          position: relative;
        }

        .builtup-density-input .form-control {
          padding-right: 42px;
        }

        .builtup-density-symbol {
          position: absolute;
          top: 50%;
          right: 14px;
          transform: translateY(-50%);
          color: #647084;
          font-size: 13px;
          font-weight: 800;
          pointer-events: none;
        }

        .land-details-grid .text-muted {
          color: #8b95a5 !important;
          font-weight: 600;
        }

        .land-details-grid .form-check {
          margin-bottom: 8px;
        }

        .land-details-grid .form-check-label {
          color: #3f4a5a !important;
          font-weight: 600;
        }

        .land-details-grid .bg-light {
          background: transparent !important;
          padding: 0 !important;
        }

        .land-actions {
          padding-top: 6px;
        }

        .land-actions .btn {
          min-height: 46px;
          font-weight: 800;
          border-radius: 999px;
        }

        .land-osm-panel {
          padding: 0;
          margin-bottom: 18px;
        }

        @media (max-width: 768px) {
          .land-details-header,
          .coordinate-intel {
            flex-direction: column;
            align-items: stretch;
          }

          .land-details-title {
            font-size: 28px;
          }

          .coordinate-intel-btn {
            width: 100%;
          }
        }
        .v2-land-section-card {
          background-color: #fff;
          border-radius: 16px;
          border: 1px solid #f1f3f5;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          padding: 32px;
        }
        .v2-land-header-subtitle {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #868e96;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .v2-land-header-title {
          font-size: 28px;
          font-weight: 800;
          color: #1a1c23;
          margin: 0;
        }
        .v2-header-btn {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 20px;
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #212529;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .v2-header-btn:hover {
          background: #f8f9fa;
          border-color: #dee2e6;
        }
        .v2-field-wrapper-card {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          padding: 20px;
          height: 100%;
        }
        .v2-field-label-text {
          font-size: 14px;
          font-weight: 700;
          color: #1a1c23;
          margin-bottom: 12px;
        }
        .v2-pill-input {
          border-radius: 24px;
          border: 1px solid #dee2e6;
          padding: 10px 16px;
          font-size: 14px;
          background-color: #fff;
          width: 100%;
          transition: border-color 0.2s;
        }
        .v2-pill-input:focus {
          outline: none;
          border-color: #adb5bd;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.03);
        }
        .v2-btn-dark-pill {
          background-color: #1a1c23;
          color: #fff;
          border-radius: 24px !important;
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          transition: background-color 0.2s;
        }
        .v2-btn-dark-pill:hover {
          background-color: #2c2e31;
          color: #fff;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        .web-response-h1, .web-response-h2 {
          color: #1e293b;
          font-weight: 700;
          font-size: 15px;
          margin-top: 18px;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 2px solid #e2e8f0;
        }
        .web-response-h3 {
          color: #334155;
          font-weight: 600;
          font-size: 14px;
          margin-top: 14px;
          margin-bottom: 8px;
        }
        .web-response-link {
          display: inline-flex;
          align-items: center;
          background-color: #f0fdf4;
          color: #15803d !important;
          border: 1px solid #bbf7d0;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          text-decoration: none !important;
          word-break: break-all;
          margin: 2px 0;
          transition: all 0.2s ease;
        }
        .web-response-link:hover {
          background-color: #dcfce7;
          color: #166534 !important;
          border-color: #86efac;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .web-response-blockquote {
          background: #f8fafc;
          border-left: 4px solid #448C74;
          padding: 12px 16px;
          margin: 12px 0;
          border-radius: 0 8px 8px 0;
          font-style: italic;
          color: #475569;
          font-size: 13px;
        }
        .web-response-table {
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          font-size: 13px;
        }
        .web-response-table th {
          background-color: #f1f5f9 !important;
          color: #1e293b;
          font-weight: 600;
          padding: 8px 12px;
        }
        .web-response-table td {
          padding: 8px 12px;
          color: #334155;
        }
      `}</style>

      <div className="land-details-header">
        <div>
          <div className="land-details-eyebrow">Selected Section</div>
          <h1 className="land-details-title">Land and FSI Details</h1>
      </div>
      </div>

      <div className="land-details-body">
        <div className="land-details-grid row g-3 mt-3">
            {/* Web Data Agent Accordion Section Card */}
            <div className="col-12 mb-3">
              <div
                style={{
                  borderRadius: "10px",
                  border: "1px solid #e8ecf0",
                  borderLeft: "4px solid #448C74",
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  boxShadow: isWebAgentExpanded ? "0 4px 16px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
                  background: "#ffffff"
                }}
              >
                {/* Accordion Header Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    cursor: "pointer",
                    background: "#ffffff",
                    userSelect: "none"
                  }}
                  onClick={() => setIsWebAgentExpanded(!isWebAgentExpanded)}
                >
                  <div className="d-flex align-items-center gap-3 flex-grow-1">
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, #448C74 0%, #2d6b55 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: "16px",
                        flexShrink: 0
                      }}
                    >
                      <FaEarthAmericas />
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2" style={{ fontWeight: 600, fontSize: "14px", color: "#222" }}>
                        <span style={{ color: "#448C74", fontWeight: 700, fontSize: "12px" }}></span>
                        Web Data Agent (Building Regulations & Rules)
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1 shadow-sm me-2"
                      style={{ fontSize: "11px", borderColor: "#448C74", color: "#2d6b55", backgroundColor: "#ffffff" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`${window.location.origin}/web_search`, "_blank", "noopener,noreferrer");
                      }}
                    >
                      Open Web Search Agent <FaExternalLinkAlt size={10} />
                    </button>

                    {/* Status Badge */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: webAgentStatus === "completed" ? "#e8f5e9" : webAgentStatus === "loading" ? "#fff3e0" : webAgentStatus === "error" ? "#fce4ec" : "#f0f0f0",
                        color: webAgentStatus === "completed" ? "#2e7d32" : webAgentStatus === "loading" ? "#e65100" : webAgentStatus === "error" ? "#c62828" : "#888",
                      }}
                    >
                      {webAgentStatus === "completed" ? "Completed" : webAgentStatus === "loading" ? "Processing..." : webAgentStatus === "error" ? "Error" : "Pending"}
                    </span>

                    <button
                      type="button"
                      className="btn btn-sm text-secondary p-0 ms-1 border-0 bg-transparent"
                    >
                      {isWebAgentExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </button>
                  </div>
                </div>

                {/* Accordion Body View */}
                {isWebAgentExpanded && (
                  <div
                    style={{
                      padding: "16px 20px 20px",
                      background: "#fafbfc",
                      borderTop: "1px solid #eef1f5"
                    }}
                  >
                    {/* Editable Search Query Section */}
                    <div className="mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <strong style={{ color: "#448C74", fontSize: "13px" }}>Q:</strong>
                          <span style={{ fontSize: "12px", fontStyle: "italic", color: "#666" }}>
                            Edit the query below before running analysis
                          </span>
                        </div>
                      </div>
                      <textarea
                        className="form-control"
                        value={webAgentQuery}
                        onChange={(e) => {
                          setWebAgentQuery(e.target.value);
                          userEditedQueryRef.current = true;
                        }}
                        disabled={webAgentStatus === "loading"}
                        rows={3}
                        style={{
                          fontSize: "13px",
                          borderRadius: "8px",
                          borderColor: "#cbd5e1",
                          borderLeft: "4px solid #448C74",
                          background: webAgentStatus === "loading" ? "#f8fafc" : "#ffffff",
                          lineHeight: "1.6",
                          fontFamily: "inherit"
                        }}
                        placeholder="Enter query for Web data agent..."
                      />
                      <div className="d-flex justify-content-end mt-2">
                        <button
                          type="button"
                          className="btn btn-sm text-white rounded-pill px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2"
                          onClick={runWebDataAgent}
                          disabled={webAgentStatus === "loading"}
                          style={{
                            background: webAgentStatus === "loading" ? "#ccc" : "linear-gradient(135deg, #448C74, #55d19d)",
                            border: "none"
                          }}
                        >
                          {webAgentStatus === "loading" ? (
                            <>
                              <FaSpinner className="spinner-border spinner-border-sm me-1" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <FaWandSparkles size={12} />
                              Run Web Agent
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Web Agent Output Response Loading State */}
                    {webAgentStatus === "loading" && (
                      <div className="mt-3 p-3 rounded-3 bg-white border shadow-sm">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center gap-2" style={{ fontSize: "13px", fontWeight: 600, color: "#2d6b55" }}>
                            <FaSpinner className="spinner-border spinner-border-sm text-success me-1" style={{ width: "0.9rem", height: "0.9rem" }} />
                            <span>{webAgentCurrentStatus || "Querying building regulation rules & authority documents..."}</span>
                          </div>
                          <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: "10px", fontWeight: 600 }}>
                            Live Web Search Stream
                          </span>
                        </div>

                        {/* Live Animated Progress Bar */}
                        <div className="progress mb-2" style={{ height: "6px", borderRadius: "3px", backgroundColor: "#e9ecef" }}>
                          <div
                            className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                            role="progressbar"
                            style={{
                              width: webAgentResponse ? "90%" : webAgentStatusLog.length > 2 ? "65%" : "35%",
                              transition: "width 0.4s ease"
                            }}
                          />
                        </div>

                        {/* Real-time Status Log Trail */}
                        {webAgentStatusLog.length > 0 && (
                          <div className="pt-2 mt-2 border-top" style={{ fontSize: "11px", color: "#666", maxHeight: "90px", overflowY: "auto" }}>
                            {webAgentStatusLog.map((logMsg, i) => (
                              <div key={i} className="d-flex align-items-center gap-2 mb-1">
                                <span className="text-success fw-bold" style={{ fontSize: "10px" }}>✓</span>
                                <span>{logMsg}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {webAgentStatus === "completed" && webAgentResponse && (
                      <div className="mt-3 rounded-3 border bg-white shadow-sm overflow-hidden">
                        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-light">
                          <div className="d-flex align-items-center gap-2" style={{ fontSize: "12px", fontWeight: 700, color: "#2d6b55" }}>
                            <span>Analysis Result</span>
                            <span className="badge bg-success bg-opacity-10 text-success fw-normal" style={{ fontSize: "10px" }}>Web Agent</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-pill px-3 py-1"
                            style={{ fontSize: "11px", fontWeight: 600 }}
                            onClick={() => setIsWebAgentMaximized(!isWebAgentMaximized)}
                          >
                            {isWebAgentMaximized ? (
                              <>
                                <FaCompress size={11} /> Minimize View
                              </>
                            ) : (
                              <>
                                <FaExpandAlt size={11} /> Maximize View
                              </>
                            )}
                          </button>
                        </div>
                        <div
                          className="p-3 regulatory-answer-md custom-scrollbar"
                          style={{
                            maxHeight: isWebAgentMaximized ? "750px" : "350px",
                            overflowY: "scroll",
                            fontSize: "13px",
                            background: "#ffffff"
                          }}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ node, ...props }) => <h4 className="web-response-h1" {...props} />,
                              h2: ({ node, ...props }) => <h5 className="web-response-h2" {...props} />,
                              h3: ({ node, ...props }) => <h6 className="web-response-h3" {...props} />,
                              a: ({ node, href, children, ...props }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="web-response-link"
                                  {...props}
                                >
                                  {children} <FaExternalLinkAlt size={9} className="ms-1 inline-icon" />
                                </a>
                              ),
                              blockquote: ({ node, ...props }) => (
                                <blockquote className="web-response-blockquote" {...props} />
                              ),
                              table: ({ node, ...props }) => (
                                <div className="table-responsive my-3">
                                  <table className="table table-sm table-hover table-bordered border-light-subtle web-response-table" {...props} />
                                </div>
                              )
                            }}
                          >
                            {webAgentResponse}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {webAgentStatus === "error" && (
                      <div className="mt-3 p-3 rounded-3 bg-danger bg-opacity-10 border border-danger text-danger small">
                        {webAgentError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Input 1: Permissible FSI / FAR (Sq ft) */}
            <div className="col-md-6">
              <div className="v2-field-wrapper-card">
                <label className="v2-field-label-text d-block">
                  Permissible FSI / FAR (Sq ft)
                </label>
                <input
                  type="text"
                  className="v2-pill-input"
                  value={v3FormData.permissibleFSI_FAR || ""}
                  onChange={(e) => handleV3InputChange("permissibleFSI_FAR", e.target.value)}
                  placeholder="Enter Permissible FSI / FAR (Sq ft)"
                />
              </div>
            </div>

            {/* Input 2: Gross Floor area (Sq ft) */}
            <div className="col-md-6">
              <div className="v2-field-wrapper-card">
                <label className="v2-field-label-text d-block">
                  Gross Floor area (Sq ft) (Area to Build)
                </label>
                <input
                  type="text"
                  className="v2-pill-input"
                  value={v3FormData.grossFloorArea || ""}
                  onChange={(e) => handleV3InputChange("grossFloorArea", e.target.value)}
                  placeholder="Enter Gross Floor area (Sq ft)"
                />
              </div>
            </div>

            {/* Disclaimer Info Banner */}
            <div className="col-12 mt-2">
              <div className="p-3 rounded-4 border d-flex align-items-center gap-3 bg-white text-secondary" style={{ fontSize: "13px", borderColor: "#e2e8f0" }}>
                <FaInfoCircle className="text-primary flex-shrink-0" size={16} />
                <span>FSI/FAR values should be verified with applicable development control rules, zoning documents and planning authority records.</span>
              </div>
            </div>

            {/* Action Save Button */}
            <div className="col-12 mt-3 d-flex justify-content-end">
              <button
                className="v2-btn-dark-pill d-inline-flex align-items-center"
                onClick={handleV3Save}
              >
                <FaSave className="me-2" />Save FSI Details
              </button>
            </div>
      </div>
    </div>
  </div>
);
};

export default LandDetailsForm;
