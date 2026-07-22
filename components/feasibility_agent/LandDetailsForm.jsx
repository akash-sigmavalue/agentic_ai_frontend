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
import { FaInfo,FaExternalLinkAlt ,FaMapMarkedAlt, FaSave,
  FaSyncAlt } from "react-icons/fa";
import { FaWandSparkles } from "react-icons/fa6";
import { apiUrl } from "@/lib/api-client";
import Select from "react-select"
import OsmInline from "./OsmInline";

const ALLOWED_CITIES = [
  "Pune", "Thane", "Abu Dhabi", "Dubai", 
  "Hyderabad", "Medchal-Malkajgiri", "Mumbai", 
  "Rangareddy", "Sangareddy", "Yadadri Bhuvanagiri"
];

const LandDetailsForm = ({ onCalculate, updateingUI, setUpdateUI }) => {
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

  const [activeView, setActiveView] = useState("V1");
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

  const [v2FormData, setV2FormData] = useState({
    baseFSI: "",
    premiumFSI: "",
    tdrPotential: "",
    fungibleFSI: "",
    incentiveFSI: "",
    buildableArea: "",
    saleableAreaEstimation: "",
  });

  useEffect(() => {
    const savedV2 = localStorage.getItem("Land and FSI v2");
    if (savedV2) {
      try {
        setV2FormData(JSON.parse(savedV2));
      } catch (e) {
        console.error("Error parsing Land and FSI v2", e);
      }
    }
  }, []);

  const handleV2InputChange = (field, value) => {
    setV2FormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleV2Save = () => {
    localStorage.setItem("Land and FSI v2", JSON.stringify(v2FormData));
    alert("Land and FSI v2 data saved successfully!");
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
      `}</style>

      <div className="land-details-header">
        <div>
          <div className="land-details-eyebrow">Selected Section</div>
          <h1 className="land-details-title">Land</h1>
        </div>
        <div className="land-details-toggle">
          <button
            type="button"
            className={`btn ${activeView === "V1" ? "btn-active" : "btn-inactive"}`}
            onClick={() => setActiveView("V1")}
          >
            V1
          </button>
          <button
            type="button"
            className={`btn ${activeView === "V2" ? "btn-active" : "btn-inactive"}`}
            onClick={() => setActiveView("V2")}
          >
            V2 Canvas
          </button>
        </div>
      </div>

      <div className="land-details-body">
        {activeView === "V1" ? (
          <>
        <div className="coordinate-intel">
          <div>
            <div className="coordinate-intel-title">Coordinate intelligence</div>
            <p className="coordinate-intel-copy">
              Fetch planning parameters from coordinates and update road widening automatically.
            </p>
          </div>
          <button
            type="button"
            className="coordinate-intel-btn"
            disabled={!(formData.latitude && formData.longitude) || planningAdvisoryLoading}
            onClick={handleFetchParameters}
            title={
              formData.latitude && formData.longitude
                ? "Load map for this point"
                : "Enter coordinates first"
            }
          >
            <FaWandSparkles className="me-2" style={{ color: "#ffffff" }} />
            {planningAdvisoryLoading ? "Fetching..." : "Run GIS Agent"}
          </button>
        </div>

        {(() => {
          const portalTarget =
            typeof document !== "undefined"
              ? document.getElementById("land-fsi-osm-portal-slot")
              : null;
          const osmPanel = (
            <div className="land-osm-panel">
              <OsmInline
              coordString={`${formData.latitude}, ${formData.longitude}`}
              defaultRadius={200}
              height={520}
              layout="results"
              autoLoadTrigger={autoLoadMapTrigger}
              onLoadStatusChange={(isLoading) => {
                osmLoadActiveRef.current = isLoading;
                if (!isLoading) {
                  setPlanningAdvisoryLoading(false);
                }
              }}
              onHighestRoadWidthCategory={(value) =>
                handleInputChange("roadWidening", value)
              }
              onPlanningParameters={(params) => {
                setFormData((prev) => ({
                  ...prev,
                  ...(params.roadWidening
                    ? { roadWidening: params.roadWidening }
                    : {}),
                  fetched_location:
                    params.fetched_location || params.location || prev.fetched_location || "",
                  roadCategory: params.roadCategory || prev.roadCategory || "",
                  builtupDensity:
                    params.builtupDensity !== undefined &&
                    params.builtupDensity !== null
                      ? String(params.builtupDensity)
                      : prev.builtupDensity || "",
                }));
              }}
              onLoadMap={(coords) =>
                Promise.all([
                  fetchPlanningAdvisory(coords),
                  fetchCoordinateLocation(coords),
                ])
              }
            />
            </div>
          );

          return portalTarget
            ? ReactDOM.createPortal(osmPanel, portalTarget)
            : osmPanel;
        })()}

        <div className="land-details-grid row g-3">
          <div className="col-md-6">
            <label htmlFor="location" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
              City *
            </label>
            <select
              className="form-select"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
            >
              <option value="">Select location</option>
              {ALLOWED_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
              <option value="Other Location">Other Location</option>
            </select>
          </div>

          {formData.location === "Other Location" && (
            <div className="col-md-6">
              <label htmlFor="otherLocationName" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                Name of Location *
              </label>
              <input
                type="text"
                className="form-control"
                id="otherLocationName"
                value={formData.otherLocationName}
                onChange={(e) => handleInputChange("otherLocationName", e.target.value)}
                placeholder="Enter location name"
                maxLength={100}
              />
            </div>
          )}

          {ALLOWED_CITIES.includes(formData.location) && (
            <>
              {villagesError && (
                <div className="alert alert-danger border-0 shadow-sm rounded-3" role="alert">
                  {villagesError}
                </div>
              )}
              <div className="col-md-6">
                <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Village</label>
                <Select
                  options={options}
                  value={
                    formData.village
                      ? options.find((o) => o.value === formData.village)
                      : null
                  }
                  onChange={(opt) => {
                    if (opt) {
                      handleInputChange("village", opt.value);
                      setSelectedVillageCoords({ lat: opt.lat, lng: opt.lng });
                    } else {
                      handleInputChange("village", "");
                      setSelectedVillageCoords(null);
                    }
                  }}
                  isLoading={villagesLoading}
                  isDisabled={villagesLoading}
                  placeholder="Choose village"
                  isClearable
                />
              </div>
            </>
          )}



          <div className="col-md-6">
            <label htmlFor="coordinates" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
              Coordinates
            </label>
            <input
              type="text"
              className="form-control"
              id="coordinates"
              value={formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : ''}
              onChange={(e) => {
                const value = e.target.value.trim();
                loadedPlanningCoordsRef.current = "";
                planningAdvisoryRequestRef.current += 1;
                coordinateLocationRequestRef.current += 1;
                if (value === '') {
                  // Clear both latitude and longitude
                  setFormData({
                    ...formData,
                    latitude: '',
                    longitude: '',
                    fetched_location: '',
                    planningAdvisory: '',
                  });
                } else {
                  // Parse comma-separated coordinates
                  const parts = value.split(',').map(p => p.trim());
                  if (parts.length === 2) {
                    const lat = parts[0];
                    const lng = parts[1];
                    setFormData({
                    ...formData,
                    latitude: lat,
                    longitude: lng,
                    fetched_location: '',
                    planningAdvisory: '',
                  });
                  } else if (parts.length === 1) {
                    // Allow partial input while typing
                    setFormData({
                    ...formData,
                    latitude: parts[0],
                    longitude: '',
                    fetched_location: '',
                    planningAdvisory: '',
                  });
                  }
                }
              }}
              placeholder="e.g., 18.623724, 73.724565"
            />
            <small className="text-muted">Enter coordinates in Google Maps format: latitude, longitude</small>
          </div>

          {(showFetchedLocation || formData.fetched_location) && (
            <div className="col-md-6">
              <label htmlFor="fetched_location" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                Location
              </label>
              <input
                type="text"
                className="form-control"
                id="fetched_location"
                value={formData.fetched_location || ""}
                onChange={(e) => handleInputChange("fetched_location", e.target.value)}
                placeholder={
                  planningAdvisoryLoading
                    ? "Fetching location..."
                    : "Enter location"
                }
                maxLength={180}
              />
            </div>
          )}

          <div className="col-md-6">
            <label
              htmlFor="netPlotArea"
              className="form-label d-flex align-items-center gap-2 fw-bold text-dark small text-uppercase"
              style={{ letterSpacing: '0.5px' }}
            >
              Net Plot Area Sq Ft *
              <div className="position-relative d-inline-block">
                <FaInfo
                  className="text-muted"
                  style={{ width: "16px", height: "16px", cursor: "help" }}
                  onMouseEnter={(e) => {
                    const tooltip = e.target.nextElementSibling;
                    if (tooltip) tooltip.style.display = "block";
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.target.nextElementSibling;
                    if (tooltip) tooltip.style.display = "none";
                  }}
                />
                <div
                  className="position-absolute bg-dark text-white p-2 rounded shadow-sm"
                  style={{
                    display: "none",
                    zIndex: 1000,
                    width: "280px",
                    fontSize: "12px",
                    lineHeight: "1.4",
                    top: "-5px",
                    left: "25px",
                    whiteSpace: "normal",
                  }}
                >
                  Net Plot Area = [Gross_Plot_Area] - [Deductions as per norms]
                </div>
              </div>
            </label>
            <input
              type="number"
              className="form-control"
              id="netPlotArea"
              value={formData.netPlotArea}
              onChange={(e) => handleInputChange("netPlotArea", e.target.value)}
              placeholder="Enter area in sq ft"
            />
          </div>

          <div className="col-12">
            <label htmlFor="zoningType" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
              Developement Category *
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-1"
                onClick={openMmadashboard}
                style={{ textDecoration: "none" }}
              >
                 <FaExternalLinkAlt style={{ width: "16px", height: "16px" }} />
              </button>
            </label>
            <select
              className="form-select"
              value={formData.zoningType}
              onChange={(e) => handleInputChange("zoningType", e.target.value)}
            >
              <option value="">Select Developement Category</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="mixed">Mixed Use</option>
            </select>
          </div>

          <div className="col-12">
            <label htmlFor="areaType" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
              Area Type*
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-1"
                onClick={openMmadashboard}
                style={{ textDecoration: "none" }}
              >
                 <FaExternalLinkAlt style={{ width: "16px", height: "16px" }} />
              </button>
            </label>
            <select
              className="form-select"
              value={formData.areaType}
              onChange={(e) => handleInputChange("areaType", e.target.value)}
            >
              <option value="">Select Area Type</option>
              <option value="Congested">Congested</option>
              <option value="Non-Congested">Non-Congested</option>
              <option value="Other">Others</option>
            </select>
          </div>

          {formData.zoningType === "mixed" && (
            <div className="col-12">
              <div className="row g-3 p-3 bg-light rounded-3">
                <div className="col-md-6">
                  <label htmlFor="commercialSplit" className="form-label fw-bold text-dark small">
                    Commercial Split %
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="commercialSplit"
                    min="0"
                    max="100"
                    value={formData.commercialSplit}
                    onChange={(e) =>
                      handleInputChange("commercialSplit", e.target.value)
                    }
                    placeholder="Enter percentage"
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="residentialSplit" className="form-label fw-bold text-dark small">
                    Residential Split %
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="residentialSplit"
                    min="0"
                    max="100"
                    value={formData.residentialSplit}
                    onChange={(e) =>
                      handleInputChange("residentialSplit", e.target.value)
                    }
                    placeholder="Enter percentage"
                  />
                </div>
              </div>
            </div>
          )}

          {/* shifted this code into the developer owenership page  */}

          {/* <div className="col-12">
            <label className="form-label">Who owns the land? *</label>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="ownership"
                id="developer"
                value="developer"
                checked={formData.ownership === "developer"}
                onChange={(e) => handleInputChange("ownership", e.target.value)}
              />
              <label className="form-check-label" htmlFor="developer">
                Developer-owned
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="ownership"
                id="jda"
                value="jda"
                checked={formData.ownership === "jda"}
                onChange={(e) => handleInputChange("ownership", e.target.value)}
              />
              <label className="form-check-label" htmlFor="jda">
                Landowner (Joint Development Agreement)
              </label>
            </div>
          </div>

          {formData.ownership === "jda" && (
            <div className="col-12">
              <div className="row g-3 p-3 bg-light rounded">
                <div className="col-md-4">
                  <label htmlFor="premiumAmount" className="form-label">
                    Premium Amount (Optional)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="premiumAmount"
                    value={formData.premiumAmount}
                    onChange={(e) =>
                      handleInputChange("premiumAmount", e.target.value)
                    }
                    placeholder="Enter amount"
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="revenueShare" className="form-label">
                    Revenue Share % (Optional)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="revenueShare"
                    min="0"
                    max="100"
                    value={formData.revenueShare}
                    onChange={(e) =>
                      handleInputChange("revenueShare", e.target.value)
                    }
                    placeholder="Enter percentage"
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="areaPercentage" className="form-label">
                    Area Percentage (Optional)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="areaPercentage"
                    min="0"
                    max="100"
                    value={formData.areaPercentage}
                    onChange={(e) =>
                      handleInputChange("areaPercentage", e.target.value)
                    }
                    placeholder="Enter percentage"
                  />
                </div>
              </div>
            </div>
          )} */}

          {/* shifted this code into the developer owenership page  */}

          {(formData.location === "Pune" || formData.location === "Thane") && (
            <div className="col-md-6">
              <label htmlFor="roadWidening" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                Road Width *
              </label>
              <select
                className="form-select"
                id="roadWidening"
                name="roadWidening"
                value={formData.roadWidening}
                onChange={(e) => handleInputChange("roadWidening", e.target.value)}
              >
                <option value="">Select road widening</option>
                <option value="below9">Below 9 m.</option>
                <option value="9-12">9 m. and above but below 12 m.</option>
                <option value="12-15">12 m. and above but below 15 m.</option>
                <option value="15-24">15 m. and above but below 24 m.</option>
                <option value="24-30">24 and above but below 30 m.</option>
                <option value="30+">30 and above</option>
              </select>
            </div>
          )}

          <div className="col-md-6">
            <label htmlFor="roadCategory" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
              Road Category
            </label>
            <input
              type="text"
              className="form-control"
              id="roadCategory"
              value={formData.roadCategory || ""}
              onChange={(e) => handleInputChange("roadCategory", e.target.value)}
              placeholder="Enter road category"
              maxLength={100}
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="planningAdvisory" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
              Planning Authority
            </label>
            <input
              type="text"
              className="form-control"
              id="planningAdvisory"
              value={formData.planningAdvisory || ""}
              onChange={(e) => handleInputChange("planningAdvisory", e.target.value)}
              placeholder={
                planningAdvisoryLoading
                  ? "Fetching planning authority..."
                  : "Enter planning authority"
              }
              maxLength={150}
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="builtupDensity" className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
              Builtup Density
            </label>
            <div className="builtup-density-input">
              <input
                type="number"
                className="form-control"
                id="builtupDensity"
                value={formData.builtupDensity || ""}
                onChange={(e) => handleInputChange("builtupDensity", e.target.value)}
                placeholder="Enter builtup density"
              />
              <span className="builtup-density-symbol">%</span>
            </div>
          </div>

          <div className="col-12 land-actions">
            <div className="row g-3">
              <div className="col-6">
                <button onClick={handleSave} className="btn btn-primary rounded-pill w-100 shadow-sm card-hover-lift">
                   <FaSave className="me-2" />Save
                </button>
              </div>
              <div className="col-6">
                <button
                  onClick={handleUpdate}
                  className="btn btn-secondary rounded-pill w-100 shadow-sm card-hover-lift"
                >
                  <FaSyncAlt className="me-2" />Update
                </button>
              </div>
            </div>
          </div>
        </div>
          </>
        ) : (
          <div className="v2-land-section-card text-start m-4">
            <h4 className="mb-4" style={{ color: '#1a1c23', fontWeight: '800' }}>Land Details (V2)</h4>
            <div className="v2-field-wrapper-card">
              <div className="row g-4">
                {[
                  { label: "Base FSI", key: "baseFSI" },
                  { label: "Premium FSI", key: "premiumFSI" },
                  { label: "TDR Potential", key: "tdrPotential" },
                  { label: "Fungible FSI", key: "fungibleFSI" },
                  { label: "Incentive FSI", key: "incentiveFSI" },
                  { label: "Buildable Area", key: "buildableArea" },
                  { label: "Saleable Area Estimation", key: "saleableAreaEstimation" }
                ].map((field) => (
                  <div key={field.key} className="col-md-6">
                    <label className="v2-field-label-text d-block">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      className="v2-pill-input"
                      value={v2FormData[field.key]}
                      onChange={(e) => handleV2InputChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.label}`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <button 
                className="v2-btn-dark-pill d-inline-flex align-items-center" 
                onClick={handleV2Save}
              >
                <FaSave className="me-2" />Save V2 Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandDetailsForm;
