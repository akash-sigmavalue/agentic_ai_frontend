import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaMountainCity } from 'react-icons/fa6';
import { FaSave, FaExpandAlt, FaList, FaDrawPolygon, FaEdit, FaTrash } from 'react-icons/fa';
import { useJsApiLoader, Autocomplete, GoogleMap, DrawingManagerF, PolygonF } from '@react-google-maps/api';

const libraries = ['places', 'drawing'];
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 18.52461645, lng: 73.7805654 }; // Pune

const LandIdentification = () => {
  const [formData, setFormData] = useState({
    surveyNumber: '',
    ctsNumber: '',
    boundaryVerification: '',
    plotDimensions: '',
    ownershipSummary: '',
    zoning: ''
  });

  const [saveStatus, setSaveStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(12);
  const [autocomplete, setAutocomplete] = useState(null);
  
  // Drawing states
  const [drawingMode, setDrawingMode] = useState(null);
  const [polygonPath, setPolygonPath] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const polygonRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
    version: '3.64'
  });

  const onLoadAutocomplete = (autoC) => setAutocomplete(autoC);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        setMapCenter({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
        setMapZoom(16);
        setSearchInput(place.formatted_address || place.name);
      }
    }
  };

  const handleMapSearch = () => {
    // Only fires manually if user presses enter without selecting a place.
  };

  // --- Polygon Drawing Logic ---
  const onPolygonComplete = (polygon) => {
    const path = polygon.getPath().getArray().map(latLng => ({
      lat: latLng.lat(),
      lng: latLng.lng()
    }));
    
    setPolygonPath(path);
    setDrawingMode(null);
    polygon.setMap(null); // Remove default drawn polygon to render controlled <Polygon>
  };

  const onPolygonLoad = useCallback((polygon) => {
    polygonRef.current = polygon;
  }, []);

  const onPolygonUnmount = useCallback(() => {
    polygonRef.current = null;
  }, []);

  const onPolygonEdit = useCallback(() => {
    if (polygonRef.current) {
      const nextPath = polygonRef.current.getPath().getArray().map(latLng => ({
        lat: latLng.lat(),
        lng: latLng.lng()
      }));
      setPolygonPath(nextPath);
    }
  }, []);

  const startDrawing = () => {
    if (!polygonPath) {
      // "polygon" mode is expected by google.maps.drawing.OverlayType.POLYGON
      setDrawingMode(window.google?.maps?.drawing?.OverlayType?.POLYGON || 'polygon');
      setIsEditing(false);
    }
  };

  const toggleEdit = () => {
    if (polygonPath) {
      setIsEditing(!isEditing);
      setDrawingMode(null);
    }
  };

  const deletePolygon = () => {
    setPolygonPath(null);
    setIsEditing(false);
    setDrawingMode(null);
  };

  const savePolygon = () => {
    if (polygonPath && polygonPath.length > 2) {
      const coordinates = polygonPath.map(p => [p.lat, p.lng]);
      
      // GeoJSON Polygons must be closed loops (first point == last point)
      if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || 
          coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
        coordinates.push([...coordinates[0]]);
      }

      const geoJson = {
        type: "Feature",
        properties: { name: "Land Identification Polygon" },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates]
        }
      };

      localStorage.setItem('subject project', JSON.stringify(geoJson));
      setSaveStatus('Polygon saved as GeoJSON!');
      setTimeout(() => setSaveStatus(''), 3000);
    } else {
      setSaveStatus('Please draw a polygon first.');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // --- Form Logic ---
  useEffect(() => {
    const savedData = localStorage.getItem('Land Identification');
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (error) {
        console.error("Error parsing saved Land Identification data:", error);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveForm = () => {
    localStorage.setItem('Land Identification', JSON.stringify(formData));
    setSaveStatus('Data saved successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  return (
    <>
      <style>{`
        .land-section-card {
          background-color: #fff;
          border-radius: 16px;
          border: 1px solid #f1f3f5;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          padding: 32px;
          margin-bottom: 24px;
        }
        .land-header-subtitle {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #868e96;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .land-header-title {
          font-size: 28px;
          font-weight: 800;
          color: #1a1c23;
          margin: 0;
        }
        .header-btn {
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
        .header-btn:hover {
          background: #f8f9fa;
          border-color: #dee2e6;
        }
        .field-wrapper-card {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          padding: 20px;
          height: 100%;
        }
        .field-label-text {
          font-size: 14px;
          font-weight: 700;
          color: #1a1c23;
          margin-bottom: 12px;
        }
        .pill-input {
          border-radius: 24px;
          border: 1px solid #dee2e6;
          padding: 10px 16px;
          font-size: 14px;
          background-color: #fff;
          width: 100%;
          transition: border-color 0.2s;
        }
        .pill-input:focus {
          outline: none;
          border-color: #adb5bd;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.03);
        }
        .btn-dark-pill {
          background-color: #1a1c23;
          color: #fff;
          border-radius: 24px !important;
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          transition: background-color 0.2s;
        }
        .btn-dark-pill:hover {
          background-color: #2c2e31;
          color: #fff;
        }
        .btn-light-pill {
          background-color: #fff;
          color: #212529;
          border-radius: 24px !important;
          padding: 10px 24px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #dee2e6;
          transition: all 0.2s;
        }
        .btn-light-pill:hover {
          background-color: #f8f9fa;
        }
        .map-tools-sidebar {
          position: absolute;
          top: 60px;
          left: 10px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(255,255,255,0.95);
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          width: 140px;
        }
        .map-tool-btn {
          border-radius: 20px !important;
          padding: 6px 12px !important;
          font-size: 11px !important;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px !important;
          width: 100%;
          justify-content: flex-start;
        }
      `}</style>
      <div className="land-section-card">
        {/* Header Section */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-2">
          <div>
            <div className="land-header-subtitle">Selected Section</div>
            <h2 className="land-header-title">Land Identification</h2>
          </div>
          <div className="d-flex gap-2">
            <button className="header-btn">
              <FaList size={12} /> Fields
            </button>
            <button className="header-btn">
              <FaExpandAlt size={12} /> Expand
            </button>
          </div>
        </div>

        {/* Map Section */}
        <div className="mb-4 pb-2">
          <div className="field-wrapper-card position-relative">
            
            <div className="d-flex flex-column mb-3">
              <div className="d-flex justify-content-between mb-3">
                <div>
                  <div className="field-label-text mb-1" style={{ fontSize: '15px' }}>Location Map</div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Search and view location details.</div>
                </div>
              </div>
              
              <div className="d-flex justify-content-center w-100">
                <div className="d-flex gap-2" style={{ width: '100%', maxWidth: '600px' }}>
                  {isLoaded ? (
                    <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged} className="flex-grow-1">
                      <input 
                        type="text" 
                        className="pill-input py-2 px-4" 
                        style={{ fontSize: '14px', width: '100%' }}
                        placeholder="Search for a location..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleMapSearch()}
                      />
                    </Autocomplete>
                  ) : (
                    <input 
                      type="text" 
                      className="pill-input py-2 px-4 flex-grow-1" 
                      style={{ fontSize: '14px' }}
                      placeholder="Loading search..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  )}
                  <button className="btn-dark-pill py-2 px-4" style={{ fontSize: '14px', minWidth: '100px' }} onClick={handleMapSearch}>
                    Search
                  </button>
                </div>
              </div>
            </div>
            
            <div className="map-container rounded-4 overflow-hidden mt-3 position-relative" style={{ height: '480px', border: '1px solid #dee2e6' }}>
              
              {/* Custom Toolbar */}
              <div className="map-tools-sidebar">
                <button className="btn-dark-pill map-tool-btn" onClick={startDrawing} disabled={!!polygonPath || drawingMode !== null}>
                  <FaDrawPolygon size={12} /> Draw Polygon
                </button>
                <button className="btn-light-pill map-tool-btn" onClick={toggleEdit} disabled={!polygonPath}>
                  <FaEdit size={12} /> {isEditing ? 'Stop Editing' : 'Edit Polygon'}
                </button>
                <button className="btn-light-pill map-tool-btn text-danger" style={{ borderColor: '#dc3545' }} onClick={deletePolygon} disabled={!polygonPath}>
                  <FaTrash size={12} /> Delete Polygon
                </button>
                <hr className="my-1" />
                <button className="btn-dark-pill map-tool-btn" onClick={savePolygon} disabled={!polygonPath}>
                  <FaSave size={12} /> Save Polygon
                </button>
              </div>

              {isLoaded && (
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={mapCenter}
                  zoom={mapZoom}
                  options={{
                    disableDefaultUI: false,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: true,
                  }}
                >
                  <DrawingManagerF
                    drawingMode={drawingMode}
                    options={{
                      drawingControl: false, // Hide default controls
                      polygonOptions: {
                        fillColor: '#448C74',
                        fillOpacity: 0.4,
                        strokeWeight: 2,
                        strokeColor: '#448C74',
                        editable: true,
                        zIndex: 1,
                      },
                    }}
                    onPolygonComplete={onPolygonComplete}
                  />

                  {polygonPath && (
                    <PolygonF
                      onLoad={onPolygonLoad}
                      onUnmount={onPolygonUnmount}
                      path={polygonPath}
                      options={{
                        fillColor: '#448C74',
                        fillOpacity: 0.4,
                        strokeWeight: 2,
                        strokeColor: '#448C74',
                        editable: isEditing,
                        draggable: isEditing,
                        zIndex: 1,
                      }}
                      onMouseUp={onPolygonEdit}
                      onDragEnd={onPolygonEdit}
                    />
                  )}
                </GoogleMap>
              )}
            </div>
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="row g-4 mb-4">
          
          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">Survey Number</div>
              <input 
                type="text" 
                className="pill-input" 
                name="surveyNumber"
                value={formData.surveyNumber}
                onChange={handleInputChange}
                placeholder="Example: 18/A" 
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">CTS Number</div>
              <input 
                type="text" 
                className="pill-input" 
                name="ctsNumber"
                value={formData.ctsNumber}
                onChange={handleInputChange}
                placeholder="Example: 1543" 
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">Boundary Verification</div>
              <input 
                type="text" 
                className="pill-input" 
                name="boundaryVerification"
                value={formData.boundaryVerification}
                onChange={handleInputChange}
                placeholder="Enter Boundary Details" 
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">Plot Dimensions</div>
              <input 
                type="text" 
                className="pill-input" 
                name="plotDimensions"
                value={formData.plotDimensions}
                onChange={handleInputChange}
                placeholder="Enter Plot Dimensions" 
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">Ownership Summary</div>
              <input 
                type="text" 
                className="pill-input" 
                name="ownershipSummary"
                value={formData.ownershipSummary}
                onChange={handleInputChange}
                placeholder="Enter Ownership Summary" 
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">Zoning</div>
              <input 
                type="text" 
                className="pill-input" 
                name="zoning"
                value={formData.zoning}
                onChange={handleInputChange}
                placeholder="Enter Zoning Type" 
              />
            </div>
          </div>

        </div>

        {/* Info Box */}
        <div className="mb-4 p-3 rounded-3 mt-2" style={{ border: '1px dashed #dee2e6', backgroundColor: '#f8f9fa' }}>
          <div className="d-flex align-items-center" style={{ fontSize: '13px', color: '#495057' }}>
            <FaList className="me-2 text-muted" />
            <span>Local records should be verified with official planning/GIS records before feasibility calculation.</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="d-flex justify-content-end align-items-center pt-2">
          {saveStatus && <span className="text-success me-3 fw-bold" style={{ fontSize: '14px' }}>{saveStatus}</span>}
          <button className="btn-dark-pill d-flex align-items-center gap-2" onClick={handleSaveForm}>
            <FaSave /> Save Identification Details
          </button>
        </div>

      </div>
    </>
  );
};

export default LandIdentification;
