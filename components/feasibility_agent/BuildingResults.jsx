import React from 'react';
import { FaChartPie } from 'react-icons/fa';
const BuildingResults = () => {
    return (
        <div className="card border-0 shadow-sm rounded-4 mt-4 w-100">
            <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
                <h2 className="mb-3" style={{ color: '#000000' }}>
                    <div className="d-flex align-items-center">
                        <div className="bg-success bg-opacity-10 text-success rounded-circle me-3 d-flex align-items-center justify-content-center"
                            style={{ width: '40px', height: '40px' }}>
                            <FaChartPie style={{ color: '#198754' }} />
                        </div>
                        Building Results
                    </div>
                </h2>
            </div>
            <div className="card-body p-4">
                <div className="text-center py-4">
                    <p className="text-muted mb-0">Building results will appear here.</p>
                </div>
            </div>
        </div>
    );
};

export default BuildingResults;
