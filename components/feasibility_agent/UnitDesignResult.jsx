import React, { useState, useEffect } from 'react';

const UnitDesignResult = () => {
    const [unitDesign, setUnitDesign] = useState(null);

    const formatNumber = (num) => {
        if (num === null || num === undefined || num === '') return '0';
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0,
        }).format(Number(num));
    };

    const formatNumber2 = (num) => {
        if (num === null || num === undefined || num === '') return '0.00';
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(num));
    };

    useEffect(() => {
        const saved = localStorage.getItem("unitDesignStructure");
        if (saved) {
            setUnitDesign(JSON.parse(saved));
        }

        const handleUpdate = () => {
            const updated = localStorage.getItem("unitDesignStructure");
            if (updated) {
                setUnitDesign(JSON.parse(updated));
            }
        };

        window.addEventListener('unitDesignUpdated', handleUpdate);
        return () => window.removeEventListener('unitDesignUpdated', handleUpdate);
    }, []);

    const getTotalsFromSplits = (data) => {
        const totalCarpet = parseFloat(data?.totalCarpet) || 0;
        const totalAllotted = (data?.variations || []).reduce((sum, v) => {
            const pct = parseFloat(v?.splitPct) || 0;
            return sum + (totalCarpet * (pct / 100));
        }, 0);
        const remaining = totalCarpet - totalAllotted;
        return { totalCarpet, totalAllotted, remaining };
    };

    const renderVariations = (data, isResidential = false) => {
        const variations = data?.variations;
        if (!variations || variations.length === 0) {
            return <p className="text-muted">No variations added</p>;
        }

        const totals = getTotalsFromSplits(data);

        const derived = variations.map((variation) => {
            const area = parseFloat(variation?.area) || 0;
            const splitPct = parseFloat(variation?.splitPct) || 0;
            const allotted = totals.totalCarpet * (splitPct / 100);
            const units = area > 0 ? allotted / area : 0;

            const roundedUnits = units > 0 ? Math.round(units) : 0;
            const adjustedUnitArea = roundedUnits > 0 ? allotted / roundedUnits : 0;
            const adjustedUnits = adjustedUnitArea > 0 ? allotted / adjustedUnitArea : 0;

            return {
                variation,
                area,
                splitPct,
                allotted,
                units,
                roundedUnits,
                adjustedUnitArea,
                adjustedUnits,
            };
        });

        const rows = [
            ...(isResidential
                ? [
                    {
                        label: 'BHK Type',
                        getCell: (d) => d.variation?.bhkType || 'N/A',
                        align: 'text-start',
                    },
                ]
                : []),
            {
                label: 'Area (sqft)',
                getCell: (d) => formatNumber(d.area),
                align: 'text-end',
            },
            {
                label: '% split',
                getCell: (d) => formatNumber2(d.splitPct),
                align: 'text-end',
            },
            {
                label: 'Area allotted (sqft)',
                getCell: (d) => formatNumber2(d.allotted),
                align: 'text-end',
            },
            {
                label: 'No of Units',
                getCell: (d) => formatNumber2(d.units),
                align: 'text-end',
            },
            {
                label: 'Adjust per unit area',
                getCell: (d) => formatNumber2(d.adjustedUnitArea),
                align: 'text-end',
            },
            {
                label: 'Adjust per no of units',
                getCell: (d) => formatNumber(d.adjustedUnits),
                align: 'text-end',
            },
        ];

        return (
            <div className="table-responsive">
                <table className="table table-sm table-bordered">
                    <thead className="table-light">
                        <tr>
                            <th className="small fw-semibold">Metric</th>
                            {derived.map((d, idx) => (
                                <th key={idx} className="small fw-semibold text-center">
                                    {isResidential
                                        ? `${d.variation?.bhkType || 'N/A'} (${idx + 1})`
                                        : `Variation ${idx + 1}`}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.label}>
                                <td className="small fw-medium">{row.label}</td>
                                {derived.map((d, idx) => (
                                    <td key={idx} className={`small ${row.align} text-center`}>
                                        {row.getCell(d)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (!unitDesign) {
        return (
            <div className="card h-100 border-0 shadow-sm rounded-4 mt-4">
                <div className="card-body p-4 text-center">
                    <p className="text-muted">No unit design data available. Please configure unit design first.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card border-0 shadow-sm rounded-4 mt-4 h-100 w-100">
            <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
                <h2 className="mb-3" style={{ color: '#000000' }}>
                    <div className="d-flex align-items-center">
                        <div className="bg-info bg-opacity-10 text-info rounded-circle me-3 d-flex align-items-center justify-content-center"
                             style={{ width: '40px', height: '40px' }}>
                            <i className="fas fa-chart-bar" style={{ color: '#0dcaf0' }}></i>
                        </div>
                        Unit Design Results
                    </div>
                </h2>
            </div>
            <div className="card-body p-4">
                {unitDesign.residentialData && unitDesign.residentialData.variations && unitDesign.residentialData.variations.length > 0 && (
                    <div className="mb-4">
                        <h5 className="mb-3">Residential Units</h5>
                        <p className="small text-muted mb-2">
                            Total Carpet Area: {formatNumber(unitDesign.residentialData.totalCarpet || 0)} sqft
                        </p>
                        {renderVariations(unitDesign.residentialData, true)}
                        <div className="mt-2">
                            <small className="text-muted">
                                Remaining Area: {formatNumber2(getTotalsFromSplits(unitDesign.residentialData).remaining)} sqft
                            </small>
                        </div>
                    </div>
                )}

                {unitDesign.commercialData && unitDesign.commercialData.variations && unitDesign.commercialData.variations.length > 0 && (
                    <div className="mt-4">
                        <h5 className="mb-3">Commercial Units</h5>
                        <p className="small text-muted mb-2">
                            Total Carpet Area: {formatNumber(unitDesign.commercialData.totalCarpet || 0)} sqft
                        </p>
                        {renderVariations(unitDesign.commercialData)}
                        <div className="mt-2">
                            <small className="text-muted">
                                Remaining Area: {formatNumber2(getTotalsFromSplits(unitDesign.commercialData).remaining)} sqft
                            </small>
                        </div>
                    </div>
                )}

                {(!unitDesign.residentialData?.variations?.length && !unitDesign.commercialData?.variations?.length) && (
                    <div className="text-center py-4">
                        <p className="text-muted">No unit variations have been added yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnitDesignResult;
