import React from 'react';
import { FaCircleInfo } from 'react-icons/fa6';

const RegulatoryIntelligence = () => {
  return (
    <div className="card shadow-sm border-0 rounded-3 mb-4">
      <div className="card-header bg-white border-bottom py-3">
        <h5 className="card-title mb-0 d-flex align-items-center">
          <FaCircleInfo className="me-2" style={{ color: '#448C74' }} />
          Regulatory Intelligence
        </h5>
      </div>
      <div className="card-body">
        <div className="alert alert-info d-flex align-items-center mb-0" role="alert">
          <div>
            <strong>Under progress:</strong> This section is currently under development.
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegulatoryIntelligence;
