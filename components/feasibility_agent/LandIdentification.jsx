import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaMountainCity } from 'react-icons/fa6';
import { FaSave, FaExpandAlt, FaList, FaDrawPolygon, FaEdit, FaTrash } from 'react-icons/fa';
import { useJsApiLoader, Autocomplete, GoogleMap, DrawingManagerF, PolygonF, MarkerF } from '@react-google-maps/api';
import Select from "react-select";
import { apiUrl } from "@/lib/api-client";

const libraries = ['places', 'drawing', 'geometry'];
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 18.52461645, lng: 73.7805654 }; // Pune

const LandIdentification = () => {
  const [formData, setFormData] = useState({
    country: '',
    location: '',
    village: '',
    planningAuthority: '',
    surveyNumber: '',
    ctsNumber: '',
    boundaryVerification: '',
    plotDimensions: '',
    ownershipSummary: '',
    zoning: '',
    developmentCategory: '',
    roadCategory: '',
    roadWidening: ''
  });

  const [saveStatus, setSaveStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(12);
  const [autocomplete, setAutocomplete] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const boundsFittedRef = useRef(false);
  
  // Drawing states
  const [drawingMode, setDrawingMode] = useState(null);
  const [polygonPath, setPolygonPath] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const polygonRef = useRef(null);
  const [currentArea, setCurrentArea] = useState(null);

  // Dynamic fetch states
  const [villages, setVillages] = useState([]);
  const [villagesLoading, setVillagesLoading] = useState(false);
  const [villagesError, setVillagesError] = useState("");
  const [selectedVillageCoords, setSelectedVillageCoords] = useState(null);
  const [planningAdvisoryLoading, setPlanningAdvisoryLoading] = useState(false);
  const [roadWidthLoading, setRoadWidthLoading] = useState(false);
  // Pan map when coordinates are entered manually or loaded
  useEffect(() => {
    const lat = parseFloat(formData.polygonCenterLat);
    const lng = parseFloat(formData.polygonCenterLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenter({ lat, lng });
      setMapZoom(16);
    }
  }, [formData.polygonCenterLat, formData.polygonCenterLng]);

  // --- Dynamic Backend Data Logic ---
  useEffect(() => {
    const ALLOWED_CITIES = [
      "Pune", "Thane", "Abu Dhabi", "Dubai", 
      "Hyderabad", "Medchal-Malkajgiri", "Mumbai", 
      "Rangareddy", "Sangareddy", "Yadadri Bhuvanagiri"
    ];
    const allowed = new Set(ALLOWED_CITIES);
    const city = (formData.location ?? "").trim();
    if (!allowed.has(city)) {
      setVillages([]);
      return;
    }

    let isMounted = true;
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
    return () => { isMounted = false; };
  }, [formData.location]);

  const villageOptions = villages.map((v) => ({
    value: v.village,
    label: v.village,
    lat: v.lat,
    lng: v.lng,
  }));

  const fetchPlanningAuthority = async () => {
    if (!formData.polygonCenterLat || !formData.polygonCenterLng) {
      alert("Please Save Polygon first or enter coordinates manually.");
      return;
    }
    if (!formData.location || !formData.village) {
      alert("Please select both City and Village.");
      return;
    }

    setPlanningAdvisoryLoading(true);
    setFormData(prev => ({ ...prev, planningAuthority: "" }));

    try {
      const res = await fetch(apiUrl("/new_rate_simulator/simulator/planning-advisory"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: formData.polygonCenterLat,
          longitude: formData.polygonCenterLng,
          location: formData.location,
          village: formData.village,
        }),
      });
      const data = await res.json();

      if (data?.success && data?.planningAdvisory) {
        setFormData(prev => ({
          ...prev,
          planningAuthority: data.planningAdvisory,
        }));
      } else {
        alert("Could not fetch planning authority. Please try again.");
      }
    } catch (err) {
      console.error("planning authority lookup error:", err);
      alert("Error fetching planning authority.");
    } finally {
      setPlanningAdvisoryLoading(false);
    }
  };

  const fetchRoadWidthFromOSM = async () => {
    const lat = parseFloat(formData.polygonCenterLat);
    const lng = parseFloat(formData.polygonCenterLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Please Save Polygon first or enter coordinates manually.");
      return;
    }

    setRoadWidthLoading(true);
    setSaveStatus("Fetching road width from OSM...");

    try {
      const radius = 200;
      const radiusDeg = radius / 111320;
      const bbox = `${lat - radiusDeg},${lng - radiusDeg},${lat + radiusDeg},${lng + radiusDeg}`;
      
      const query = `[out:json][timeout:30];(way["highway"](${bbox}););out body;>;out skel qt;`;
      
      const endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.openstreetmap.ru/api/interpreter"
      ];

      let data = null;
      let error = null;

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: "POST",
            body: query,
            headers: { "Content-Type": "text/plain" },
          });
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch (err) {
          error = err;
        }
      }

      if (!data || !data.elements) {
        throw new Error(error?.message || "Failed to fetch from Overpass API endpoints.");
      }

      const elements = data.elements;
      const nodes = {};
      elements.forEach(el => {
        if (el.type === "node") nodes[el.id] = { lat: el.lat, lng: el.lon };
      });

      const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const phi1 = lat1 * Math.PI/180;
        const phi2 = lat2 * Math.PI/180;
        const deltaPhi = (lat2-lat1) * Math.PI/180;
        const deltaLambda = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const getBearing = (lat1, lon1, lat2, lon2) => {
        const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
        const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
                  Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
        const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        return brng > 180 ? brng - 360 : brng; // Turf-style bearing
      };

      const directionTotals = { N: 0, E: 0, S: 0, W: 0 };
      const CATEGORY_TO_ROAD_WIDENING = {
        "Below 9 m": "below9",
        "9 m to 12 m": "9-12",
        "12 m to 15 m": "12-15",
        "15 m to 24 m": "15-24",
        "24 m to 30 m": "24-30",
        "30 m and above": "30+"
      };

      const extractWidthFromTags = (tags) => {
        if (tags.width) {
          const match = tags.width.match(/(\d+\.?\d*)/);
          if (match) return parseFloat(match[1]);
        }
        if (tags["width:lanes"]) {
          const match = tags["width:lanes"].match(/(\d+\.?\d*)/);
          if (match) return parseFloat(match[1]);
        }
        if (tags.est_width) {
          const match = tags.est_width.match(/(\d+\.?\d*)/);
          if (match) return parseFloat(match[1]);
        }
        return null;
      };

      const estimateWidthFromLanes = (lanes, highwayType) => {
        let laneCount = null;
        if (typeof lanes === "string") {
          const match = lanes.match(/(\d+\.?\d*)/);
          if (match) laneCount = parseFloat(match[1]);
        } else if (typeof lanes === "number") {
          laneCount = lanes;
        }
        if (laneCount === null) return null;
        let laneWidth = 3.5;
        if (highwayType) {
          if (["motorway", "trunk"].includes(highwayType)) laneWidth = 3.75;
          else if (["residential", "service"].includes(highwayType)) laneWidth = 3.0;
        }
        return laneCount * laneWidth;
      };

      const getHighwayDefaultWidth = (highwayType, serviceType) => {
        const defaults = {
          motorway: 11.5, motorway_link: 8.0, trunk: 10.0, trunk_link: 7.0,
          primary: 8.5, primary_link: 6.5, secondary: 7.5, secondary_link: 6.0,
          tertiary: 6.5, tertiary_link: 5.5, unclassified: 5.5, residential: 5.5,
          living_street: 5.0, service: 4.5, track: 3.5, path: 2.0, footway: 2.0,
          cycleway: 2.0, bridleway: 2.5, steps: 1.5, pedestrian: 5.0
        };
        if (highwayType === "service" && serviceType) {
          const serviceDefaults = {
            parking_aisle: 3.5, driveway: 3.0, alley: 3.5,
            emergency_access: 4.0, "drive-through": 3.5
          };
          if (serviceDefaults[serviceType]) return serviceDefaults[serviceType];
        }
        return defaults[highwayType] || 5.0;
      };

      elements.forEach(el => {
        if (el.type === "way" && el.nodes && el.tags && el.tags.highway) {
          let minDistance = Infinity;
          let closestNodeCoords = null;
          el.nodes.forEach(nodeId => {
            const node = nodes[nodeId];
            if (node) {
              const d = getDistance(lat, lng, node.lat, node.lng);
              if (d < minDistance) {
                minDistance = d;
                closestNodeCoords = node;
              }
            }
          });

          // Match OsmInline adjacentRoads check (distance <= 50)
          if (minDistance <= 50 && closestNodeCoords) {
            const tb = getBearing(lat, lng, closestNodeCoords.lat, closestNodeCoords.lng);
            
            // Replicate OsmInline's specific direction binning logic based on Turf tb bearing
            let dir;
            if (tb >= -45 && tb < 45) dir = "N";
            else if (tb >= 45 && tb < 135) dir = "E";
            else if (tb >= 135 && tb < 225) dir = "S";
            else dir = "W";
            
            let width = extractWidthFromTags(el.tags);
            if (width === null && el.tags.lanes) {
              width = estimateWidthFromLanes(el.tags.lanes, el.tags.highway);
            }
            if (width === null) {
              width = getHighwayDefaultWidth(el.tags.highway, el.tags.service);
            }
            directionTotals[dir] += width;
          }
        }
      });

      let maxTotal = 0;
      let highestCategory = "Below 9 m";

      const categorizeWidth = (w) => {
        if (w === null || Number.isNaN(w) || w === 0) return "Below 9 m";
        if (w < 9) return "Below 9 m";
        if (w < 12) return "9 m to 12 m";
        if (w < 15) return "12 m to 15 m";
        if (w < 24) return "15 m to 24 m";
        if (w < 30) return "24 m to 30 m";
        return "30 m and above";
      };

      ["N", "E", "S", "W"].forEach(dir => {
        const total = directionTotals[dir];
        if (total > maxTotal) {
          maxTotal = total;
          highestCategory = categorizeWidth(total);
        }
      });

      const matchedWidening = CATEGORY_TO_ROAD_WIDENING[highestCategory] || "below9";
      
      setFormData(prev => ({ ...prev, roadWidening: matchedWidening }));
      setSaveStatus(`Fetched OSM width successfully: ${highestCategory}`);
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error("OSM road width fetch failed:", err);
      alert(`Error fetching road width from OSM: ${err.message}`);
      setSaveStatus('');
    } finally {
      setRoadWidthLoading(false);
    }
  };

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
        const latVal = place.geometry.location.lat();
        const lngVal = place.geometry.location.lng();
        setMapCenter({
          lat: latVal,
          lng: lngVal
        });
        setMapZoom(16);
        setSearchInput(place.formatted_address || place.name);
        setFormData(prev => ({
          ...prev,
          polygonCenterLat: String(latVal),
          polygonCenterLng: String(lngVal)
        }));
      }
    }
  };

  const handleMapSearch = () => {
    // Only fires manually if user presses enter without selecting a place.
  };

  // --- Polygon Drawing Logic ---
  useEffect(() => {
    const savedGeoJson = localStorage.getItem('subject project');
    if (savedGeoJson) {
      try {
        const parsed = JSON.parse(savedGeoJson);
        if (parsed?.geometry?.coordinates?.[0]) {
          const coords = parsed.geometry.coordinates[0];
          // Saved as [lat, lng]
          const newPath = coords.map(c => ({ lat: c[0], lng: c[1] }));
          setPolygonPath(newPath);
        }
      } catch (e) {
        console.error("Error parsing saved polygon:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (mapInstance && polygonPath && polygonPath.length > 0 && !boundsFittedRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      polygonPath.forEach(p => bounds.extend(p));
      mapInstance.fitBounds(bounds);
      boundsFittedRef.current = true;
    }
  }, [mapInstance, polygonPath]);

  useEffect(() => {
    if (isLoaded && polygonPath && polygonPath.length > 2 && window.google?.maps?.geometry) {
      const latLngs = polygonPath.map(p => new window.google.maps.LatLng(p.lat, p.lng));
      const areaSqMeters = window.google.maps.geometry.spherical.computeArea(latLngs);
      const areaSqFt = (areaSqMeters * 10.7639).toFixed(2);
      setCurrentArea(areaSqFt);
    } else {
      setCurrentArea(null);
    }
  }, [polygonPath, isLoaded]);

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

  const syncLandIdentificationData = (path) => {
    let dataToSave = { ...formData };
    if (path && path.length > 2 && window.google?.maps?.geometry) {
      const latLngs = path.map(p => new window.google.maps.LatLng(p.lat, p.lng));
      const areaSqMeters = window.google.maps.geometry.spherical.computeArea(latLngs);
      const areaSqFt = (areaSqMeters * 10.7639).toFixed(2);
      
      const bounds = new window.google.maps.LatLngBounds();
      latLngs.forEach(ll => bounds.extend(ll));
      const center = bounds.getCenter();
      
      dataToSave.polygonAreaSqft = areaSqFt;
      dataToSave.polygonCenterLat = center.lat();
      dataToSave.polygonCenterLng = center.lng();
    } else {
      dataToSave.polygonAreaSqft = '';
      dataToSave.polygonCenterLat = dataToSave.polygonCenterLat || '';
      dataToSave.polygonCenterLng = dataToSave.polygonCenterLng || '';
    }
    // Update local React state so inputs reflect values immediately on-screen
    setFormData(prev => ({
      ...prev,
      polygonAreaSqft: dataToSave.polygonAreaSqft,
      polygonCenterLat: String(dataToSave.polygonCenterLat),
      polygonCenterLng: String(dataToSave.polygonCenterLng)
    }));
    localStorage.setItem('Land Identification', JSON.stringify(dataToSave));
    window.dispatchEvent(new CustomEvent('landIdentificationSaved'));
  };

  const deletePolygon = () => {
    setPolygonPath(null);
    setIsEditing(false);
    setDrawingMode(null);
    localStorage.removeItem('subject project');
    syncLandIdentificationData(null); // Clear area data
    setSaveStatus('Polygon deleted!');
    setTimeout(() => setSaveStatus(''), 3000);
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
      syncLandIdentificationData(polygonPath); // Sync area data immediately
      setSaveStatus('Polygon saved as GeoJSON!');
      setTimeout(() => setSaveStatus(''), 3000);
    } else {
      setSaveStatus('Please draw a polygon first.');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const isLoadedRef = useRef(false);

  // --- Form Logic ---
  useEffect(() => {
    const savedData = localStorage.getItem('Land Identification');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Error parsing saved Land Identification data:", error);
      }
    }
    isLoadedRef.current = true;
  }, []);

  // Auto-sync formData to localStorage and notify sibling components in real-time
  useEffect(() => {
    if (isLoadedRef.current) {
      localStorage.setItem('Land Identification', JSON.stringify(formData));
      window.dispatchEvent(new CustomEvent('landIdentificationSaved'));
    }
  }, [formData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveForm = () => {
    syncLandIdentificationData(polygonPath);
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
              
              {/* Live Area Overlay */}
              {currentArea && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: 'rgba(255,255,255,0.95)', padding: '6px 12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '13px', fontWeight: 'bold', color: '#1a1c23', border: '1px solid #dee2e6' }}>
                  Area: {Number(currentArea).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} sqft
                </div>
              )}

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
                  onLoad={setMapInstance}
                  onUnmount={() => setMapInstance(null)}
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

                  {!polygonPath && formData.polygonCenterLat && formData.polygonCenterLng && !isNaN(parseFloat(formData.polygonCenterLat)) && !isNaN(parseFloat(formData.polygonCenterLng)) && (
                    <MarkerF
                      position={{
                        lat: parseFloat(formData.polygonCenterLat),
                        lng: parseFloat(formData.polygonCenterLng)
                      }}
                    />
                  )}
                </GoogleMap>
              )}
            </div>
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="row g-4">

          {/* New Fields */}
          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">Country</div>
              <input 
                type="text" 
                className="pill-input" 
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="Enter Country" 
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">City Name</div>
              <select
                className="pill-input form-select"
                style={{ border: 'none', background: '#f8f9fa' }}
                name="location"
                value={formData.location}
                onChange={handleInputChange}
              >
                <option value="">Select location</option>
                <option value="Pune">Pune</option>
                <option value="Thane">Thane</option>
                <option value="Abu Dhabi">Abu Dhabi</option>
                <option value="Dubai">Dubai</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Medchal-Malkajgiri">Medchal-Malkajgiri</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Rangareddy">Rangareddy</option>
                <option value="Sangareddy">Sangareddy</option>
                <option value="Yadadri Bhuvanagiri">Yadadri Bhuvanagiri</option>
                <option value="Other Location">Other Location</option>
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">Village Name</div>
              <Select
                options={villageOptions}
                value={
                  formData.village
                    ? villageOptions.find((o) => o.value === formData.village)
                    : null
                }
                onChange={(opt) => {
                  if (opt) {
                    handleInputChange({ target: { name: "village", value: opt.value } });
                    setSelectedVillageCoords({ lat: opt.lat, lng: opt.lng });
                  } else {
                    handleInputChange({ target: { name: "village", value: "" } });
                    setSelectedVillageCoords(null);
                  }
                }}
                isLoading={villagesLoading}
                isDisabled={villagesLoading || !formData.location}
                placeholder={formData.location ? "Choose village" : "Select City First"}
                isClearable
                styles={{
                  control: (base) => ({
                    ...base,
                    border: 'none',
                    background: '#f8f9fa',
                    boxShadow: 'none',
                    minHeight: '40px'
                  })
                }}
              />
              {villagesError && <small className="text-danger mt-1 d-block">{villagesError}</small>}
            </div>
          </div>

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">Coordinates (Lat, Lng)</div>
              <input
                type="text"
                className="pill-input"
                name="coordinates"
                value={formData.polygonCenterLat && formData.polygonCenterLng ? `${formData.polygonCenterLat}, ${formData.polygonCenterLng}` : formData.polygonCenterLat ? formData.polygonCenterLat : ''}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  if (value === '') {
                    setFormData({ ...formData, polygonCenterLat: '', polygonCenterLng: '' });
                  } else {
                    const parts = value.split(',').map(p => p.trim());
                    if (parts.length === 2) {
                      setFormData({ ...formData, polygonCenterLat: parts[0], polygonCenterLng: parts[1] });
                    } else if (parts.length === 1) {
                      setFormData({ ...formData, polygonCenterLat: parts[0], polygonCenterLng: '' });
                    }
                  }
                }}
                placeholder="e.g., 18.623724, 73.724565"
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text d-flex justify-content-between align-items-center w-100">
                <span>
                  Planning Authority 
                  {planningAdvisoryLoading && <span className="spinner-border spinner-border-sm text-primary ms-2" role="status"></span>}
                </span>
                <button 
                  className="btn btn-sm btn-outline-primary py-0 px-2" 
                  style={{ fontSize: '11px', borderRadius: '12px' }}
                  onClick={fetchPlanningAuthority}
                  disabled={planningAdvisoryLoading}
                >
                  Fetch
                </button>
              </div>
              <input 
                type="text" 
                className="pill-input" 
                name="planningAuthority"
                value={formData.planningAuthority || ""}
                onChange={handleInputChange}
                placeholder="Planning Authority"
                disabled={planningAdvisoryLoading} 
              />
            </div>
          </div>

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

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">Developement Category</div>
              <select
                className="pill-input form-select"
                style={{ border: 'none', background: '#f8f9fa' }}
                name="developmentCategory"
                value={formData.developmentCategory || ""}
                onChange={handleInputChange}
              >
                <option value="">Select Developement Category</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="mixed">Mixed Use</option>
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <div className="field-wrapper-card">
              <div className="field-label-text">Road Category</div>
              <input 
                type="text" 
                className="pill-input" 
                name="roadCategory"
                value={formData.roadCategory || ""}
                onChange={handleInputChange}
                placeholder="Enter road category"
              />
            </div>
          </div>

          {(formData.location === "Pune" || formData.location === "Thane") && (
            <div className="col-md-6">
              <div className="field-wrapper-card">
                <div className="field-label-text d-flex justify-content-between align-items-center w-100">
                  <span>
                    Road Width *
                    {roadWidthLoading && <span className="spinner-border spinner-border-sm text-primary ms-2" role="status"></span>}
                  </span>
                  <button 
                    className="btn btn-sm btn-outline-primary py-0 px-2" 
                    style={{ fontSize: '11px', borderRadius: '12px' }}
                    onClick={fetchRoadWidthFromOSM}
                    disabled={roadWidthLoading}
                  >
                    Fetch
                  </button>
                </div>
                <select
                  className="pill-input form-select"
                  style={{ border: 'none', background: '#f8f9fa' }}
                  name="roadWidening"
                  value={formData.roadWidening || ""}
                  onChange={handleInputChange}
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
            </div>
          )}

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
