import React, { useEffect, useMemo, useState } from 'react';
import { FaParking } from 'react-icons/fa';

const roundRuleGtPoint5 = (x) => {
    const frac = x - Math.floor(x);
    return Math.floor(x) + (frac >= 0.5 ? 1 : 0);
};

const computeParking = (N150, N80_150, N40_80, N30_40, Nlt30, factor_car = 1.0, visitor_pct = 5.0) => {
    const car_base = 2 * N150 + 1 * N80_150 + 0.5 * N40_80 + 0.5 * N30_40 + 0 * Nlt30;
    const tw_base = 1 * N150 + 1 * N80_150 + 1 * N40_80 + 0.5 * N30_40 + 1 * Nlt30;

    const car_req = roundRuleGtPoint5(car_base * factor_car);
    const tw_req = roundRuleGtPoint5(tw_base);

    const car_total = Math.ceil(car_req + (car_req * visitor_pct / 100));
    const tw_total = Math.ceil(tw_req + (tw_req * visitor_pct / 100));

    return {
        car_base,
        tw_base,
        car_req,
        tw_req,
        car_total,
        tw_total,
    };
};

const computeParkingData = (data) => {
    const totalCarpet = parseFloat(data?.totalCarpet) || 0;
    const variations = data?.variations || [];

    const derived = variations.map((variation) => {
        const area = parseFloat(variation?.area) || 0;
        const splitPct = parseFloat(variation?.splitPct) || 0;
        const allotted = totalCarpet * (splitPct / 100);
        const units = area > 0 ? allotted / area : 0;

        const roundedUnits = units > 0 ? Math.round(units) : 0;
        const adjustedUnitArea = roundedUnits > 0 ? allotted / roundedUnits : 0;
        const adjustedUnits = adjustedUnitArea > 0 ? allotted / adjustedUnitArea : 0;

        return {
            adjustedUnitArea,
            adjustedUnits,
        };
    });

    let N150 = 0, N80_150 = 0, N40_80 = 0, N30_40 = 0, Nlt30 = 0;
    derived.forEach((d) => {
        const area = parseFloat(d?.adjustedUnitArea) || 0;
        const count = Math.round(parseFloat(d?.adjustedUnits) || 0);
        if (count <= 0 || area <= 0) return;

        if (area >= 1615) N150 += count;
        else if (area >= 861) N80_150 += count;
        else if (area >= 431) N40_80 += count;
        else if (area >= 323) N30_40 += count;
        else Nlt30 += count;
    });

    const totalBucketUnits = N150 + N80_150 + N40_80 + N30_40 + Nlt30;

    const factorCar = parseFloat(data?.factorCar) || 1.0;
    const visitorPct = parseFloat(data?.visitorPct) || 5.0;
    const parkingResults = computeParking(N150, N80_150, N40_80, N30_40, Nlt30, factorCar, visitorPct);

    const SQM_TO_SQFT = 10.764;
    const carAreaSqft = (parkingResults?.car_total || 0) * 12.5 * SQM_TO_SQFT;
    const scooterAreaSqft = (parkingResults?.tw_total || 0) * 2 * SQM_TO_SQFT;
    const totalParkingAreaSqft = carAreaSqft + scooterAreaSqft;

    return {
        buckets: { N150, N80_150, N40_80, N30_40, Nlt30, totalBucketUnits },
        factorCar,
        visitorPct,
        parkingResults,
        parkingAreas: { carAreaSqft, scooterAreaSqft, totalParkingAreaSqft },
    };
};

const RequiredParking = () => {
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
        const saved = localStorage.getItem('unitDesignStructure');
        if (saved) {
            setUnitDesign(JSON.parse(saved));
        }

        const handleUpdate = () => {
            const updated = localStorage.getItem('unitDesignStructure');
            if (updated) {
                setUnitDesign(JSON.parse(updated));
            }
        };

        window.addEventListener('unitDesignUpdated', handleUpdate);
        return () => window.removeEventListener('unitDesignUpdated', handleUpdate);
    }, []);

    const residential = useMemo(() => {
        if (!unitDesign?.residentialData?.variations?.length) return null;
        return computeParkingData(unitDesign.residentialData);
    }, [unitDesign]);

    const commercial = useMemo(() => {
        if (!unitDesign?.commercialData?.variations?.length) return null;
        return computeParkingData(unitDesign.commercialData);
    }, [unitDesign]);

    const renderSection = (title, data) => {
        if (!data) return null;

        const totalParkings = (data?.parkingResults?.car_total || 0) + (data?.parkingResults?.tw_total || 0);

        return (
            <div className="h-100 p-3 p-md-4 bg-white border rounded-4">
                <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 mb-3">
                    <h5 className="mb-0">{title}</h5>
                    <div className="d-flex flex-wrap gap-2">
                        <span className="badge text-bg-light border">Total Units: {formatNumber(data?.buckets?.totalBucketUnits || 0)}</span>
                        <span className="badge text-bg-light border">Total Parkings: {formatNumber(totalParkings)}</span>
                        <span className="badge text-bg-light border">Total Parking Area: {formatNumber2(data?.parkingAreas?.totalParkingAreaSqft || 0)} sqft</span>
                    </div>
                </div>

                <div className="mb-3">
                    <h6 className="fw-bold text-dark mb-2">2) Derived unit counts by UDCPR buckets</h6>
                    <div className="d-flex flex-wrap gap-3">
                        <div style={{ minWidth: 140, flex: '1 1 140px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">≥1,615 sqft</p>
                                    <h5 className="text-info fw-bold mb-0">{formatNumber(data.buckets.N150)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 140, flex: '1 1 140px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">861–{'<'}1,615 sqft</p>
                                    <h5 className="text-primary fw-bold mb-0">{formatNumber(data.buckets.N80_150)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 140, flex: '1 1 140px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">431–{'<'}861 sqft</p>
                                    <h5 className="text-success fw-bold mb-0">{formatNumber(data.buckets.N40_80)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 140, flex: '1 1 140px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">323–{'<'}431 sqft</p>
                                    <h5 className="text-warning fw-bold mb-0">{formatNumber(data.buckets.N30_40)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 140, flex: '1 1 140px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">{'<'}323 sqft</p>
                                    <h5 className="text-danger fw-bold mb-0">{formatNumber(data.buckets.Nlt30)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 140, flex: '1 1 140px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Total Units</p>
                                    <h5 className="text-dark fw-bold mb-0">{formatNumber(data.buckets.totalBucketUnits)}</h5>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-2">
                        <h6 className="fw-bold text-dark mb-1 mb-md-0">3) Results</h6>
                        <div className="small text-muted">
                            Factor (cars): {formatNumber2(data.factorCar)} | Visitor parking: {formatNumber2(data.visitorPct)}%
                        </div>
                    </div>
                    <div className="d-flex flex-wrap gap-3">
                        <div style={{ minWidth: 180, flex: '1 1 180px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Cars (base)</p>
                                    <h5 className="text-primary fw-bold mb-0">{formatNumber2(data.parkingResults.car_base)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 180, flex: '1 1 180px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Two-wheelers (base)</p>
                                    <h5 className="text-warning fw-bold mb-0">{formatNumber2(data.parkingResults.tw_base)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 220, flex: '1 1 220px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Cars (after rounding, before visitors)</p>
                                    <h5 className="text-success fw-bold mb-0">{formatNumber(data.parkingResults.car_req)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 240, flex: '1 1 240px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Two-wheelers (after rounding, before visitors)</p>
                                    <h5 className="text-danger fw-bold mb-0">{formatNumber(data.parkingResults.tw_req)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 200, flex: '1 1 200px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Cars – Final (incl. visitors)</p>
                                    <h5 className="text-primary fw-bold mb-0">{formatNumber(data.parkingResults.car_total)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 240, flex: '1 1 240px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Two-wheelers – Final (incl. visitors)</p>
                                    <h5 className="text-warning fw-bold mb-0">{formatNumber(data.parkingResults.tw_total)}</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 180, flex: '1 1 180px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Total Parkings</p>
                                    <h5 className="text-dark fw-bold mb-0">{formatNumber(data.parkingResults.car_total + data.parkingResults.tw_total)}</h5>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <h6 className="fw-bold text-dark mb-2">5) Total area required for parking</h6>
                    <div className="d-flex flex-wrap gap-3">
                        <div style={{ minWidth: 220, flex: '1 1 220px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Total area for car parking</p>
                                    <h5 className="text-primary fw-bold mb-0">{formatNumber2(data.parkingAreas.carAreaSqft)} sqft</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 240, flex: '1 1 240px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Total area for scooter parking</p>
                                    <h5 className="text-warning fw-bold mb-0">{formatNumber2(data.parkingAreas.scooterAreaSqft)} sqft</h5>
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: 220, flex: '1 1 220px' }}>
                            <div className="card border-0 shadow-sm rounded-3 h-100">
                                <div className="card-body text-center py-3">
                                    <p className="text-muted small mb-1 text-nowrap">Total area (car + scooter)</p>
                                    <h5 className="text-success fw-bold mb-0">{formatNumber2(data.parkingAreas.totalParkingAreaSqft)} sqft</h5>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const shouldShow = !!residential || !!commercial;

    if (!shouldShow) return null;

    return (
        <div className="card border-0 shadow-sm rounded-4 mt-4">
            <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
                <h2 className="mb-3" style={{ color: '#000000' }}>
                    <div className="d-flex align-items-center">
                        <div className="bg-warning bg-opacity-10 text-warning rounded-circle me-3 d-flex align-items-center justify-content-center"
                            style={{ width: '40px', height: '40px' }}>
                            <FaParking style={{ color: '#ffc107' }} />
                        </div>
                        Required Parking
                    </div>
                </h2>
            </div>
            <div className="card-body p-4">
                <div className="row g-4">
                    {residential && (
                        <div className={commercial ? 'col-12 col-lg-6' : 'col-12'}>
                            {renderSection('Residential', residential)}
                        </div>
                    )}
                    {commercial && (
                        <div className={residential ? 'col-12 col-lg-6' : 'col-12'}>
                            {renderSection('Commercial', commercial)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequiredParking;
