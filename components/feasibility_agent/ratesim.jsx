
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaChartBar, FaChartLine, FaTimes } from "react-icons/fa";
// import LocationWiseDashboardVertical from '../MMAv4/LocationAnalysis/LocationWiseDashboardhorizontal';
// import ReraList from '../MMAv4/LocationAnalysis/ReraList';

// Helper: read city from Market Analysis Payload in localStorage
const getCityFromPayload = () => {
    if (typeof window === 'undefined') return '';
    try {
        const raw = localStorage.getItem('Market Analysis Payload');
        if (!raw) return '';
        return JSON.parse(raw)?.city || '';
    } catch {
        return '';
    }
};

// Build a coordinationData body from landDetailsForm lat/lng ΓÇö same shape
// that SelectCoordination passes to onCoordinationSelect
const getCoordFromLandForm = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('landDetailsForm');
        if (!raw) return null;
        const form = JSON.parse(raw);
        const lat = parseFloat(form?.latitude);
        const lng = parseFloat(form?.longitude);
        if (!lat || !lng) return null;
        const city = getCityFromPayload() || form?.location || '';
        return {
            City: city,
            distance: 3,
            basedOn: 'igr',
            loc_lbl: `${lat}, ${lng}`,
            lat,
            lng,
        };
    } catch {
        return null;
    }
};

// Read village name from landDetailsForm localStorage
const getVillageFromLandForm = () => {
    if (typeof window === 'undefined') return '';
    try {
        const raw = localStorage.getItem('landDetailsForm');
        if (!raw) return '';
        return JSON.parse(raw)?.village || '';
    } catch {
        return '';
    }
};

const RateSim = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [city, setCity] = useState(getCityFromPayload);

    // Hold live coordinates/village in state, not just initial
    const [liveCoords, setLiveCoords] = useState(null);
    const [liveVillage, setLiveVillage] = useState("");

    const theme = "light";


    // Keep city in sync whenever Marketanalysis updates its payload
    useEffect(() => {
        const handleUpdate = (e) => {
            const updatedCity = e?.detail?.city || getCityFromPayload();
            if (updatedCity) setCity(updatedCity);
        };
        window.addEventListener('marketAnalysisUpdated', handleUpdate);
        return () => window.removeEventListener('marketAnalysisUpdated', handleUpdate);
    }, []);

    const handleOpen = () => {
        // Read fresh coordinates/village right before opening
        const freshCoords = getCoordFromLandForm();
        const freshVillage = getVillageFromLandForm();
        setLiveCoords(freshCoords);
        setLiveVillage(freshVillage);
        setIsOpen(true);
    };

    return (
        <>
            {/* Card with Open button */}
            <div className="card border-0 shadow-sm rounded-4 mt-4 h-100 w-100">
                <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
                    <h2 className="mb-3" style={{ color: theme=="dark"? "#fff" : '#000000' }}>
                        <div className="d-flex align-items-center">
                            <div
                                className="bg-success bg-opacity-10 rounded-circle me-3 d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}
                            >
                                <FaChartBar style={{ color: '#198754' }} />
                            </div>
                            Predictive Rate Simulator
                        </div>
                    </h2>
                </div>
                <div className="card-body p-4 d-flex align-items-center justify-content-center">
                    <button
                        className="btn btn-success rounded-pill px-4 py-2 fw-semibold shadow-sm"
                        onClick={handleOpen}
                    >
                        <FaChartLine className="me-2" />
                        Open Rate Simulator
                    </button>
                </div>
            </div>

            {/* Portal Modal ΓÇö mounts on document.body so fixed = true viewport */}
            {isOpen && ReactDOM.createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
                >
                    <div
                        style={{
                            position: 'relative',
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            width: '100%',
                            height: '90vh',
                            maxWidth: '1800px',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 24px',
                                borderBottom: '1px solid #e9ecef',
                                backgroundColor: '#fff',
                                flexShrink: 0,
                                zIndex: 1,
                            }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: '38px', height: '38px' }}
                                >
                                    <FaChartBar style={{ color: '#198754' }} />
                                </div>
                                <h5 className="mb-0 fw-bold" style={{ color: '#000' }}>
                                    Rate Simulator
                                    {city && (
                                        <span className="ms-2 badge bg-success bg-opacity-10 text-success fw-normal fs-6">
                                            {city}
                                        </span>
                                    )}
                                </h5>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: '#f1f3f5',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    color: '#495057',
                                    flexShrink: 0,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#dee2e6'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f1f3f5'}
                                title="Close"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Modal Body ΓÇö full height, scrollable */}
                        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                            {console.log("Rendering ReraList with props:", { city, liveCoords, liveVillage })}
                            {/* <ReraList
                                // initialTab="Rate-Simulater"
                                // initialCity={city}
                                initialCoordinationData={liveCoords}
                                initialVillage={liveVillage}
                                // hideSidebar={true}
                            /> */}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default RateSim;
