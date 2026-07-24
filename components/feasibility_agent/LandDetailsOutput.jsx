// import { useState, useEffect } from "react";
// import {
//   GoogleMap,
//   useLoadScript,
//   Marker,
//   InfoWindow,
//   Circle,
// } from "@react-google-maps/api";

// const libraries = ["places"];
// const mapContainerStyle = {
//   height: "400px",
//   // margin: "10px auto 0",
//   borderRadius: "0.5rem",
// };
// const options = {
//   // disableDefaultUI: true,
//   zoomControl: true,
//   mapTypeId: "hybrid",
// };

// const getCustomMarkerIcon = () => ({
//   path: window.google.maps.SymbolPath.CIRCLE,
//   fillColor: "red",
//   fillOpacity: 0.9,
//   scale: 10,
//   strokeColor: "black",
//   strokeWeight: 1,
// });

// const LandDetailsOutput = ({ results, updateingUI }) => {
//   const [savedResults, setSavedResults] = useState(null);
//   const [landFormData, setLandFormData] = useState(null);
//   const [center, setCenter] = useState({
//     lat: 18.5653103,
//     lng: 73.83751099999999,
//   });
//   const { isLoaded, loadError } = useLoadScript({
//     // googleMapsApiKey: process.env.REACT_APP_GMAP_KEY,
//     googleMapsApiKey: import.meta.env.VITE_GMAP_KEY,
//     libraries,
//   });

//   useEffect(() => {
//     const saved = localStorage.getItem("landDetailsResults");
//     if (saved) {
//       setSavedResults(JSON.parse(saved));
//     }
//   }, []);

//   useEffect(() => {
//     const data = localStorage.getItem("landDetailsForm");
//     if (data) {
//       const parsedData = JSON.parse(data);
//       setLandFormData(parsedData);
//       // Update center if valid coordinates exist
//       if (parsedData?.latitude && parsedData?.longitude) {
//         setCenter({
//           lat: parseFloat(parsedData.latitude),
//           lng: parseFloat(parsedData.longitude),
//         });
//       }
//     }
//   }, [updateingUI]);

//   useEffect(() => {
//     const handleStorageChange = () => {
//       const data = localStorage.getItem("landDetailsForm");
//       if (data) {
//         const parsedData = JSON.parse(data);
//         setLandFormData(parsedData);
//         if (parsedData?.latitude && parsedData?.longitude) {
//           setCenter({
//             lat: parseFloat(parsedData.latitude),
//             lng: parseFloat(parsedData.longitude),
//           });
//         }
//       }
//     };

//     window.addEventListener("storage", handleStorageChange);
//     return () => window.removeEventListener("storage", handleStorageChange);
//   }, [updateingUI]);

//   console.log(landFormData, updateingUI);

//   useEffect(() => {
//     if (results) {
//       setSavedResults(results);
//     }
//   }, [results]);

//   const formatNumber = (num) => {
//     return new Intl.NumberFormat("en-IN").format(Math.round(num));
//   };

//   if (!savedResults) {
//     return (
//       <div className="card h-100">
//         <div className="card-header">
//           <h6 className="card-title text-primary mb-0">Land Details Results</h6>
//         </div>
//         <div className="card-body">
//           <p className="text-muted text-center py-4">
//             No land details data available
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // google map -------

//   if (loadError) return "Error";
//   if (!isLoaded) return "Loading...";

//   const markerPosition =
//     landFormData?.latitude && landFormData?.longitude
//       ? {
//         lat: parseFloat(landFormData.latitude),
//         lng: parseFloat(landFormData.longitude),
//       }
//       : null;

//   const isPuneThane = landFormData?.location === "Pune" || landFormData?.location === "Thane";

//   return (
//     <div className="card h-100 border border-2">
//       {isPuneThane && (
//         <div className="card-header">
//           <h2 className="card-title mb-0" style={{ color: '#448C74' }}>FSI Utilization Breakdown</h2>
//         </div>
//       )}
//       <div className="card-body">
//         <div className="d-flex flex-column gap-2">
//           {isPuneThane && (
//             <>
//               <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
//                 <span className="small fw-medium">Net Plot Area:</span>
//                 <span className="small">
//                   {formatNumber(savedResults.netPlotArea)} sq ft
//                 </span>
//               </div>

//               <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
//                 <span className="small fw-medium">Basic FSI:</span>
//                 <span className="small">
//                   {formatNumber(savedResults.basicFSI)} sq ft
//                 </span>
//               </div>

//               <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
//                 <span className="small fw-medium">Premium FSI:</span>
//                 <span className="small">
//                   {formatNumber(savedResults.premium)} sq ft
//                 </span>
//               </div>

//               <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
//                 <span className="small fw-medium">TDR FSI:</span>
//                 <span className="small">
//                   {formatNumber(savedResults.tdr)} sq ft
//                 </span>
//               </div>

//               <div className="d-flex justify-content-between align-items-center py-2 border-bottom bg-light px-2 rounded">
//                 <span className="small fw-semibold">Max Building Potential:</span>
//                 <span className="small fw-semibold">
//                   {formatNumber(savedResults.maxBuildingPotential)} sq ft
//                 </span>
//               </div>

//               {savedResults.commercialMax && savedResults.residentialMax ? (
//                 <>
//                   {/* Calculate ancillary areas */}
//                   {(() => {
//                     const landFormData = JSON.parse(
//                       localStorage.getItem("landDetailsForm") || "{}"
//                     );
//                     const commercialSplit =
//                       (parseFloat(landFormData.commercialSplit) || 0) / 100;
//                     const residentialSplit =
//                       (parseFloat(landFormData.residentialSplit) || 0) / 100;

//                     const ancillaryCommercial =
//                       savedResults.maxBuildingPotential * commercialSplit * 0.8;
//                     const ancillaryResidential =
//                       savedResults.maxBuildingPotential * residentialSplit * 0.6;

//                     return (
//                       <>
//                         <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
//                           <span className="small fw-medium">
//                             Area of Commercial Ancillary:
//                           </span>
//                           <span className="small">
//                             {formatNumber(ancillaryCommercial)} sq ft
//                           </span>
//                         </div>

//                         <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
//                           <span className="small fw-medium">
//                             Area of Residential Ancillary:
//                           </span>
//                           <span className="small">
//                             {formatNumber(ancillaryResidential)} sq ft
//                           </span>
//                         </div>
//                       </>
//                     );
//                   })()}

//                   <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
//                     <span className="small fw-medium">Commercial Max Area:</span>
//                     <span className="small">
//                       {formatNumber(savedResults.commercialMax)} sq ft
//                     </span>
//                   </div>

//                   <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
//                     <span className="small fw-medium">Residential Max Area:</span>
//                     <span className="small">
//                       {formatNumber(savedResults.residentialMax)} sq ft
//                     </span>
//                   </div>
//                 </>
//               ) : (
//                 <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
//                   <span className="small fw-medium">Ancillary:</span>
//                   <span className="small">
//                     {formatNumber(savedResults.ancillary)} sq ft
//                   </span>
//                 </div>
//               )}

//               <div className="d-flex justify-content-between align-items-center py-3 bg-primary px-2 rounded">
//                 <span className="small fw-bold text-white">
//                   Max Permissible Area:
//                 </span>
//                 <span className="small fw-bold text-white">
//                   {formatNumber(savedResults.maxPermissibleArea)} sq ft
//                 </span>
//               </div>
//             </>
//           )}

//           <div className="text-center">
//             <a
//               href="https://sigmavalue.in/analysis/location?City=Pune"
//               target="_blank"
//             >
//               Click here
//             </a>{" "}
//             for indepth <b>Real Estate Market Analysis</b>
//           </div>

//           {/* google map ---------- */}

//           <GoogleMap
//             id="map"
//             mapContainerStyle={mapContainerStyle}
//             mapTypeId="satellite"
//             zoom={15}
//             center={center}
//             options={options}
//           >
//             {markerPosition &&
//               !isNaN(markerPosition.lat) &&
//               !isNaN(markerPosition.lng) ? (
//               <Marker
//                 position={markerPosition}
//                 // icon={getCustomMarkerIcon()} // Comment out custom icon for now
//                 onClick={() => {
//                   console.log("Marker clicked, centering on:", markerPosition);
//                   setCenter(markerPosition);
//                 }}
//               />
//             ) : (
//               console.log("Marker not rendered due to invalid position")
//             )}
//           </GoogleMap>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LandDetailsOutput;


import { useState, useEffect } from "react";
const libraries = ["places"];
const mapContainerStyle = {
  height: "400px",
  // margin: "10px auto 0",
  borderRadius: "0.5rem",
};
const options = {
  // disableDefaultUI: true,
  zoomControl: true,
  mapTypeId: "hybrid",
};

const getCustomMarkerIcon = () => ({
  path: window.google.maps.SymbolPath.CIRCLE,
  fillColor: "red",
  fillOpacity: 0.9,
  scale: 10,
  strokeColor: "black",
  strokeWeight: 1,
});

const LandDetailsOutput = ({ results, updateingUI }) => {
  const [savedResults, setSavedResults] = useState(null);
  const [landFormData, setLandFormData] = useState(null);
  const [center, setCenter] = useState({
    lat: 18.5653103,
    lng: 73.83751099999999,
  });
  // const { isLoaded, loadError } = useLoadScript({
  //   googleMapsApiKey: process.env.REACT_APP_GMAP_KEY,
  //   libraries,
  // });
  useEffect(() => {
    const saved = localStorage.getItem("landDetailsResults");
    if (saved) {
      setSavedResults(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const data = localStorage.getItem("landDetailsForm");
    if (data) {
      const parsedData = JSON.parse(data);
      setLandFormData(parsedData);
      // Update center if valid coordinates exist
      if (parsedData?.latitude && parsedData?.longitude) {
        setCenter({
          lat: parseFloat(parsedData.latitude),
          lng: parseFloat(parsedData.longitude),
        });
      }
    }
  }, [updateingUI]);

  useEffect(() => {
    const handleStorageChange = () => {
      const data = localStorage.getItem("landDetailsForm");
      if (data) {
        const parsedData = JSON.parse(data);
        setLandFormData(parsedData);
        if (parsedData?.latitude && parsedData?.longitude) {
          setCenter({
            lat: parseFloat(parsedData.latitude),
            lng: parseFloat(parsedData.longitude),
          });
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [updateingUI]);

  console.log(landFormData, updateingUI);

  useEffect(() => {
    if (results) {
      setSavedResults(results);
    }
  }, [results]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-IN").format(Math.round(num));
  };

  const markerPosition =
    landFormData?.latitude && landFormData?.longitude
      ? {
        lat: parseFloat(landFormData.latitude),
        lng: parseFloat(landFormData.longitude),
      }
      : null;

  const isPuneThane = landFormData?.location === "Pune" || landFormData?.location === "Thane";

  return (
    <div className="land-results-panel h-100">
      <style>{`
        .land-results-panel {
          background: #ffffff;
          border: 1px solid #e7ebf1;
          border-radius: 24px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .land-results-header {
          padding: 24px 26px 14px;
          background: #ffffff;
        }

        .land-results-eyebrow {
          color: #8b95a5;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .land-results-title {
          color: #111827;
          font-size: 30px;
          line-height: 1.05;
          font-weight: 800;
          margin: 0;
        }

        .land-results-body {
          padding: 14px 26px 26px;
        }

        .fsi-breakdown-list {
          display: grid;
          gap: 10px;
        }

        .fsi-breakdown-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 1px solid #e5eaf2;
          background: #fbfcff;
          border-radius: 14px;
          padding: 13px 15px;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.03);
        }

        .fsi-breakdown-label {
          color: #3f4a5a;
          font-size: 13px;
          font-weight: 800;
        }

        .fsi-breakdown-value {
          color: #111827;
          font-size: 13px;
          font-weight: 700;
          text-align: right;
          white-space: nowrap;
        }

        .fsi-breakdown-row.is-highlight {
          background: #f4f7fb;
          border-color: #dfe5ee;
        }

        .fsi-breakdown-row.is-total {
          background: #3f967b;
          border-color: #3f967b;
          box-shadow: 0 12px 24px rgba(63, 150, 123, 0.18);
        }

        .fsi-breakdown-row.is-total .fsi-breakdown-label,
        .fsi-breakdown-row.is-total .fsi-breakdown-value {
          color: #ffffff;
          font-weight: 900;
        }

        .land-results-osm-slot {
          padding: 0 26px 14px;
        }

        .land-results-osm-slot:empty {
          display: none;
        }

        .land-results-map-shell {
          margin-top: 16px;
          border: 1px solid #e5eaf2;
          background: #fbfcff;
          border-radius: 18px;
          padding: 12px;
          overflow: hidden;
        }

        .land-results-map-shell > div {
          border-radius: 14px !important;
          overflow: hidden;
        }

        .land-results-empty-state {
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed #d9e1ea;
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%);
          padding: 20px;
        }

        .land-results-empty-copy {
          color: #8b95a5;
          font-size: 15px;
          font-weight: 700;
          text-align: center;
        }

        @media (max-width: 576px) {
          .land-results-header {
            padding: 22px 20px 12px;
          }

          .land-results-body {
            padding: 12px 20px 22px;
          }

          .land-results-osm-slot {
            padding: 0 20px 12px;
          }

          .land-results-title {
            font-size: 26px;
          }

          .fsi-breakdown-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }

          .fsi-breakdown-value {
            text-align: left;
            white-space: normal;
          }
        }
      `}</style>
      <div className="land-results-header">
        <div className="land-results-eyebrow">Selected Section</div>
        <h2 className="land-results-title">
          {savedResults && isPuneThane
            ? "FSI Utilization Breakdown"
            : "Land Details Results"}
        </h2>
      </div>
      <div id="land-fsi-osm-portal-slot" className="land-results-osm-slot" />
      <div className="land-results-body">
        <div className="fsi-breakdown-list">
          {isPuneThane && savedResults ? (
            <>
              <div className="fsi-breakdown-row">
                <span className="fsi-breakdown-label">Net Plot Area:</span>
                <span className="fsi-breakdown-value">
                  {formatNumber(savedResults.netPlotArea)} sq ft
                </span>
              </div>

              <div className="fsi-breakdown-row">
                <span className="fsi-breakdown-label">Basic FSI:</span>
                <span className="fsi-breakdown-value">
                  {formatNumber(savedResults.basicFSI)} sq ft
                </span>
              </div>

              <div className="fsi-breakdown-row">
                <span className="fsi-breakdown-label">Premium FSI:</span>
                <span className="fsi-breakdown-value">
                  {formatNumber(savedResults.premium)} sq ft
                </span>
              </div>

              <div className="fsi-breakdown-row">
                <span className="fsi-breakdown-label">TDR FSI:</span>
                <span className="fsi-breakdown-value">
                  {formatNumber(savedResults.tdr)} sq ft
                </span>
              </div>

              <div className="fsi-breakdown-row is-highlight">
                <span className="fsi-breakdown-label">Max Building Potential:</span>
                <span className="fsi-breakdown-value">
                  {formatNumber(savedResults.maxBuildingPotential)} sq ft
                </span>
              </div>
              {savedResults.commercialMax && savedResults.residentialMax ? (
                <>
                  {/* Calculate ancillary areas */}
                  {(() => {
                    const formDataToUse = landFormData || {};
                    const commercialSplit =
                      (parseFloat(formDataToUse.commercialSplit) || 0) / 100;
                    const residentialSplit =
                      (parseFloat(formDataToUse.residentialSplit) || 0) / 100;

                    const ancillaryCommercial =
                      savedResults.maxBuildingPotential * commercialSplit * 0.8;
                    const ancillaryResidential =
                      savedResults.maxBuildingPotential * residentialSplit * 0.6;

                    return (
                      <>
                        <div className="fsi-breakdown-row">
                          <span className="fsi-breakdown-label">
                            Area of Commercial Ancillary:
                          </span>
                          <span className="fsi-breakdown-value">
                            {formatNumber(ancillaryCommercial)} sq ft
                          </span>
                        </div>

                        <div className="fsi-breakdown-row">
                          <span className="fsi-breakdown-label">
                            Area of Residential Ancillary:
                          </span>
                          <span className="fsi-breakdown-value">
                            {formatNumber(ancillaryResidential)} sq ft
                          </span>
                        </div>
                      </>
                    );
                  })()}

                  <div className="fsi-breakdown-row">
                    <span className="fsi-breakdown-label">Commercial Max Area:</span>
                    <span className="fsi-breakdown-value">
                      {formatNumber(savedResults.commercialMax)} sq ft
                    </span>
                  </div>

                  <div className="fsi-breakdown-row">
                    <span className="fsi-breakdown-label">Residential Max Area:</span>
                    <span className="fsi-breakdown-value">
                      {formatNumber(savedResults.residentialMax)} sq ft
                    </span>
                  </div>
                </>
              ) : (
                <div className="fsi-breakdown-row">
                  <span className="fsi-breakdown-label">Ancillary:</span>
                  <span className="fsi-breakdown-value">
                    {formatNumber(savedResults.ancillary)} sq ft
                  </span>
                </div>
              )}

              <div className="fsi-breakdown-row is-total">
                <span className="fsi-breakdown-label">
                  Max Permissible Area:
                </span>
                <span className="fsi-breakdown-value">
                  {formatNumber(savedResults.maxPermissibleArea)} sq ft
                </span>
              </div>
            </>
          ) : (
            <div className="land-results-empty-state">
              <div className="land-results-empty-copy">
                {savedResults
                  ? "No FSI breakdown available for the current selection."
                  : "No land details data available"}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LandDetailsOutput;
