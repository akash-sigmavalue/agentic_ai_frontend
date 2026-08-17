import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { apiUrl } from '@/lib/api-client';
import { useLedger } from './hooks/useLedger';
import {
    FaSearch,
    FaTable,
    FaDownload,
    FaTimes,
    FaCheck,
    FaArrowRight,
    FaArrowLeft,
    FaFilter,
    FaDatabase,
    FaMapMarkerAlt,
    FaSpinner,
    FaInbox,
    FaSlidersH,
    FaCheckCircle,
    FaLayerGroup
} from 'react-icons/fa';

/* ─── Pretty column labels ─────────────────────────────────────────────── */
const COLUMN_LABELS = {
    id: 'ID',
    transaction_date: 'Transaction Date',
    city_name: 'City',
    country_name: 'Country',
    location_name: 'Location',
    project_name: 'Project Name',
    project_id: 'Project ID',
    property_type: 'Property Type',
    property_type_raw: 'Property Type (Raw)',
    raw_property_type: 'Property Type (Raw)',
    unit_configuration: 'Unit Configuration',
    normalized_unit_configuration: 'Unit Config (Normalized)',
    agreement_price: 'Agreement Price',
    net_carpet_area_sq_m: 'Carpet Area (sqm)',
    net_carpet_area_sq_ft: 'Carpet Area (sqft)',
    rate_per_sqm: 'Rate / sqm',
    rate_per_sqft: 'Rate / sqft',
    transaction_category: 'Transaction Category',
    buyer_name: 'Buyer Name',
    seller_name: 'Seller Name',
    floor_number: 'Floor Number',
    building_name: 'Building Name',
    tower_name: 'Tower Name',
    sub_location: 'Sub-Location',
    sub_locality: 'Sub-Locality',
    village: 'Village',
    taluka: 'Taluka',
    district: 'District',
    buyer_district: 'Buyer District',
    registration_date: 'Registration Date',
    document_type: 'Document Type',
    stamp_duty: 'Stamp Duty',
    stamp_duty_paid: 'Stamp Duty Paid',
    project_latitude: 'Latitude',
    project_longitude: 'Longitude',
    source: 'Source',
    data_source: 'Data Source',
    raw_unit_configuration: 'Unit Config (Raw)',
};

const label = (col) => col;

/* ─── Format cell values for display ──────────────────────────────────── */
const formatCell = (col, val) => {
    if (val === null || val === undefined) return <span className="text-muted">—</span>;
    if (col === 'agreement_price' || col.includes('stamp_duty')) {
        return typeof val === 'number'
            ? val.toLocaleString('en-IN', { maximumFractionDigits: 0 })
            : val;
    }
    if (col.includes('rate_per') || col.includes('area')) {
        return typeof val === 'number' ? val.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : val;
    }
    if (col.includes('date')) {
        if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
        return val;
    }
    return String(val);
};

/* ─── Main Component ───────────────────────────────────────────────────── */
const TransactionDrilldownModal = ({
    analysisType,         // "area" | "rate" | "ticket"
    propertyType,
    unitType,
    rangeMin,
    rangeMax,
    cityName,
    locationName,
    mode,
    latitude,
    longitude,
    radiusKm,
    projectId,
    projectName,
    startDate,
    endDate,
    analysisView,
    conversionFactor = 1.0,
    onClose,
}) => {
    const { recordDbCall } = useLedger();
    /* ── states ──────────────────────────────────────────────────────────── */
    const [step, setStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');                        // 1=col select, 2=results
    const [allColumns, setAllColumns] = useState([]);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [defaultColumns, setDefaultColumns] = useState([]);

    const [transactions, setTransactions] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loadingPage, setLoadingPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    /* ── lock body scroll on mount so popup is strictly centered ───────── */
    useEffect(() => {
        const origStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = origStyle;
        };
    }, []);

    /* ── fetch column list on mount ─────────────────────────────────────── */
    useEffect(() => {
        const fetchColumns = async () => {
            try {
                const res = await fetch(apiUrl('/new_rate_simulator/simulator/transactions/columns/'));
                const json = await res.json();
                if (json && json.success) {
                    setAllColumns(json.columns || []);
                    setDefaultColumns(json.default_columns || []);
                    setSelectedColumns(json.default_columns || []);
                }
            } catch (e) {
                console.error('Failed to fetch transaction columns', e);
            }
        };
        fetchColumns();
    }, []);

    /* ── fetch transaction data ─────────────────────────────────────────── */
    const fetchTransactions = useCallback(async (pg = 1, cols = selectedColumns) => {
        setLoading(true);
        setLoadingPage(pg);
        setError(null);
        try {
            const payload = {
                analysis_type: analysisType,
                property_type: propertyType || '',
                unit_type: unitType || '',
                range_min: Number(rangeMin) || 0,
                range_max: Number(rangeMax) || 0,
                city_name: cityName || '',
                location_name: locationName || '',
                mode: mode || 'location',
                latitude: latitude || null,
                longitude: longitude || null,
                radius_km: radiusKm || 1.0,
                project_id: projectId || null,
                project_name_filter: projectName || null,
                analysis_view: analysisView || 'overall',
                start_date: startDate || null,
                end_date: endDate || null,
                conversion_factor: conversionFactor || 1.0,
                selected_columns: cols,
                page: pg,
                page_size: 10,
            };

            const res = await fetch(apiUrl('/new_rate_simulator/simulator/transactions/drilldown/'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (json && json.success) {
                setTransactions(json.data || []);
                setTotal(json.total || 0);
                setTotalPages(json.total_pages || 1);
                setPage(json.page || 1);
                setStep(2);
                recordDbCall("Transaction DB", "Market Research", 1);
            } else {
                setError(json.error || 'Failed to fetch transactions');
            }
        } catch (e) {
            setError('Network error: ' + e.message);
        } finally {
            setLoading(false);
        }
    }, [analysisType, propertyType, unitType, rangeMin, rangeMax, cityName, locationName,
        mode, latitude, longitude, radiusKm, projectId, projectName, startDate, endDate,
        conversionFactor, selectedColumns, analysisView]);

    /* ── column toggle ──────────────────────────────────────────────────── */
    const toggleColumn = (col) => {
        setSelectedColumns(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    };

    const selectAll = () => setSelectedColumns([...allColumns]);
    const selectDefault = () => setSelectedColumns([...defaultColumns]);
    const clearAll = () => setSelectedColumns([]);

    /* ── pagination ─────────────────────────────────────────────────────── */
    const goToPage = (pg) => {
        if (pg < 1 || pg > totalPages) return;
        fetchTransactions(pg, selectedColumns);
    };

    /* ── Excel download (Fetches ALL records across all pages) ──────────── */
    const downloadExcel = async () => {
        if (!total || exporting) return;
        setExporting(true);
        try {
            const payload = {
                analysis_type: analysisType,
                property_type: propertyType || '',
                unit_type: unitType || '',
                range_min: Number(rangeMin) || 0,
                range_max: Number(rangeMax) || 0,
                city_name: cityName || '',
                location_name: locationName || '',
                mode: mode || 'location',
                latitude: latitude || null,
                longitude: longitude || null,
                radius_km: radiusKm || 1.0,
                project_id: projectId || null,
                project_name_filter: projectName || null,
                analysis_view: analysisView || 'overall',
                start_date: startDate || null,
                end_date: endDate || null,
                conversion_factor: conversionFactor || 1.0,
                selected_columns: selectedColumns,
                page: 1,
                page_size: Math.min(total, 50000),
            };

            const res = await fetch(apiUrl('/new_rate_simulator/simulator/transactions/drilldown/'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            recordDbCall("Transaction DB", "Market Research", 1);
            const exportData = (json && json.success && json.data) ? json.data : transactions;

            const headers = selectedColumns.map(label);
            const rows = exportData.map(row =>
                selectedColumns.reduce((acc, col) => {
                    acc[label(col)] = row[col] ?? '';
                    return acc;
                }, {})
            );
            const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
            const typeLbl = analysisType === 'area' ? 'Area' : analysisType === 'rate' ? 'Rate' : 'Ticket';
            XLSX.writeFile(wb, `${typeLbl}_Transactions_${propertyType}_${unitType}.xlsx`);
        } catch (e) {
            console.error('Export failed', e);
            alert('Export failed: ' + e.message);
        } finally {
            setExporting(false);
        }
    };

    /* ── range label ────────────────────────────────────────────────────── */
    const typeLabel = analysisType === 'area' ? 'Area' : analysisType === 'rate' ? 'Rate' : 'Ticket Size';
    const minValStr = (typeof rangeMin === 'number' && !isNaN(rangeMin)) ? rangeMin.toLocaleString() : '0';
    const maxValStr = (typeof rangeMax === 'number' && !isNaN(rangeMax)) ? rangeMax.toLocaleString() : '0';
    const rangeLabel =
        analysisType === 'area'
            ? `${minValStr} – ${maxValStr} sqft`
            : analysisType === 'rate'
            ? `${minValStr} – ${maxValStr} per sqft`
            : `${minValStr} – ${maxValStr}`;

    /* ── extra filters not in range columns ─────────────────────────────── */
    const additionalColumns = allColumns.filter(c => !defaultColumns.includes(c));

    /* ══════════════════════════════════════════════════════════════════════
       RENDER PORTAL DIRECTLY TO BODY
    ══════════════════════════════════════════════════════════════════════ */
    return createPortal(
        /* Fixed Backdrop Overlay */
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999999,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '1120px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.35)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                animation: 'fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* ── Header ────────────────────────────────────────────── */}
                <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    borderBottom: '1px solid #334155',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'rgba(68, 140, 116, 0.15)', color: '#448C74',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(68, 140, 116, 0.3)',
                        }}>
                            <FaTable size={16} />
                        </div>
                        <div>
                            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>View Transactions</span>
                                <span style={{ color: '#94a3b8', fontWeight: 400 }}>— {typeLabel} Analysis</span>
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {propertyType && (
                                    <span className="badge" style={{ background: '#448C74', color: '#fff', fontSize: '10px', borderRadius: '99px', padding: '2.5px 9px', fontWeight: 600 }}>
                                        {propertyType}
                                    </span>
                                )}
                                {unitType && (
                                    <span className="badge" style={{ background: '#059669', color: '#fff', fontSize: '10px', borderRadius: '99px', padding: '2.5px 9px', fontWeight: 600 }}>
                                        {unitType}
                                    </span>
                                )}
                                <span style={{ color: '#cbd5e1', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FaFilter size={9} style={{ color: '#94a3b8' }} /> Range: <strong>{rangeLabel}</strong>
                                </span>
                                {(locationName || cityName) && (
                                    <span style={{ color: '#94a3b8', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <FaMapMarkerAlt size={9} style={{ color: '#f87171' }} /> {locationName ? `${locationName}, ${cityName}` : cityName}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#cbd5e1',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#cbd5e1'; }}
                        title="Close Modal"
                    >
                        <FaTimes size={13} />
                    </button>
                </div>

                {/* ── Wizard Progress Steps Bar ────────────────────────── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    padding: '0 24px',
                    flexShrink: 0,
                }}>
                    <button
                        onClick={() => setStep(1)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 18px',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '13px',
                            fontWeight: step === 1 ? 700 : 500,
                            color: step === 1 ? '#448C74' : '#64748b',
                            borderBottom: step === 1 ? '2.5px solid #448C74' : '2.5px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <FaCheckCircle size={13} style={{ color: step === 1 ? '#448C74' : '#94a3b8' }} />
                        <span>1. Select Columns</span>
                    </button>

                    <div style={{ color: '#cbd5e1', margin: '0 4px', fontSize: '12px' }}>/</div>

                    <button
                        onClick={() => { if (selectedColumns.length > 0 && transactions.length > 0) setStep(2); }}
                        disabled={selectedColumns.length === 0 || !transactions.length}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 18px',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '13px',
                            fontWeight: step === 2 ? 700 : 500,
                            color: step === 2 ? '#448C74' : (selectedColumns.length > 0 ? '#64748b' : '#cbd5e1'),
                            borderBottom: step === 2 ? '2.5px solid #448C74' : '2.5px solid transparent',
                            cursor: selectedColumns.length > 0 && transactions.length > 0 ? 'pointer' : 'not-allowed',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <FaDatabase size={13} style={{ color: step === 2 ? '#448C74' : '#94a3b8' }} />
                        <span>2. View Results</span>
                    </button>
                </div>

                {/* ── Modal Body ────────────────────────────────────────── */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto',
                    flex: 1,
                }}>
                    {error && (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fecaca',
                            borderRadius: '10px', padding: '12px 16px', color: '#dc2626',
                            fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <FaTimes size={14} /> {error}
                        </div>
                    )}

                    {/* ── STEP 1: Column Selection ──────────────────────── */}
                    {step === 1 && (
                        <div>
                            {/* Top Control Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FaSlidersH size={14} style={{ color: '#448C74' }} />
                                        <span>Database Column Selector</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                        Select the exact database fields to include in your data table & Excel exports.
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        onClick={selectDefault}
                                        style={{
                                            background: '#ffffff', border: '1px solid #cbd5e1',
                                            borderRadius: '8px', padding: '6px 14px', fontSize: '11.5px',
                                            fontWeight: 600, color: '#334155', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                        }}
                                    >
                                        <FaFilter size={10} style={{ color: '#64748b' }} /> Select Default
                                    </button>
                                    <button
                                        onClick={selectAll}
                                        style={{
                                            background: '#eef7f4', border: '1px solid rgba(68, 140, 116, 0.4)',
                                            borderRadius: '8px', padding: '6px 14px', fontSize: '11.5px',
                                            fontWeight: 600, color: '#448C74', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                        }}
                                    >
                                        <FaCheck size={10} /> Select All ({allColumns.length})
                                    </button>
                                    <button
                                        onClick={clearAll}
                                        style={{
                                            background: '#fef2f2', border: '1px solid #fecaca',
                                            borderRadius: '8px', padding: '6px 14px', fontSize: '11.5px',
                                            fontWeight: 600, color: '#dc2626', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                        }}
                                    >
                                        <FaTimes size={10} /> Clear All
                                    </button>
                                </div>
                            </div>

                            {/* Search & Selection Progress Bar Card */}
                            <div style={{
                                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                                padding: '14px 18px', marginBottom: '20px', display: 'flex',
                                alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
                            }}>
                                <div style={{ flex: '1 1 260px', position: 'relative' }}>
                                    <FaSearch size={12} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        placeholder="Search database columns... (e.g., price, area, date)"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%', padding: '7px 12px 7px 34px', borderRadius: '8px',
                                            border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none',
                                            background: '#ffffff', color: '#0f172a',
                                        }}
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            style={{
                                                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                                border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                                            }}
                                        >
                                            <FaTimes size={11} />
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                                        Selected: <span style={{ color: '#448C74', fontWeight: 700 }}>{selectedColumns.length}</span> / {allColumns.length}
                                    </div>
                                    <div style={{ width: '120px', height: '7px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${allColumns.length ? (selectedColumns.length / allColumns.length) * 100 : 0}%`,
                                            height: '100%', background: '#448C74', transition: 'width 0.2s ease',
                                        }} />
                                    </div>
                                </div>
                            </div>

                            {/* Default Core Columns */}
                            <div style={{ marginBottom: '22px' }}>
                                <div style={{
                                    fontSize: '11px', fontWeight: 700, color: '#448C74',
                                    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                }}>
                                    <FaLayerGroup size={11} style={{ color: '#448C74' }} /> Default Core Columns
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {defaultColumns
                                        .filter(col => !searchTerm || col.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(col => {
                                            const isSel = selectedColumns.includes(col);
                                            return (
                                                <button
                                                    key={col}
                                                    onClick={() => toggleColumn(col)}
                                                    style={{
                                                        background: isSel ? '#448C74' : '#ffffff',
                                                        color: isSel ? '#ffffff' : '#334155',
                                                        border: isSel ? '1px solid #35725e' : '1px solid #cbd5e1',
                                                        borderRadius: '7px',
                                                        padding: '6px 12px',
                                                        fontSize: '12px',
                                                        fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                                                        fontWeight: isSel ? 600 : 500,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        boxShadow: isSel ? '0 2px 6px rgba(68, 140, 116, 0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >
                                                    {isSel ? <FaCheck size={10} /> : <span style={{ width: '10px', height: '10px', border: '1px solid #cbd5e1', borderRadius: '2px', display: 'inline-block' }} />}
                                                    <span>{col}</span>
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Additional Database Attributes */}
                            {additionalColumns.length > 0 && (
                                <div>
                                    <div style={{
                                        fontSize: '11px', fontWeight: 700, color: '#64748b',
                                        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                    }}>
                                        <FaSlidersH size={11} style={{ color: '#64748b' }} /> Additional Database Attributes
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {additionalColumns
                                            .filter(col => !searchTerm || col.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map(col => {
                                                const isSel = selectedColumns.includes(col);
                                                return (
                                                    <button
                                                        key={col}
                                                        onClick={() => toggleColumn(col)}
                                                        style={{
                                                            background: isSel ? '#448C74' : '#ffffff',
                                                            color: isSel ? '#ffffff' : '#475569',
                                                            border: isSel ? '1px solid #35725e' : '1px solid #e2e8f0',
                                                            borderRadius: '7px',
                                                            padding: '5.5px 11px',
                                                            fontSize: '11.5px',
                                                            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                                                            fontWeight: isSel ? 600 : 400,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            boxShadow: isSel ? '0 2px 6px rgba(68, 140, 116, 0.25)' : 'none',
                                                            transition: 'all 0.15s ease',
                                                        }}
                                                    >
                                                        {isSel ? <FaCheck size={9} /> : <span style={{ width: '9px', height: '9px', border: '1px solid #cbd5e1', borderRadius: '2px', display: 'inline-block' }} />}
                                                        <span>{col}</span>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2: Results Table ──────────────────────────── */}
                    {step === 2 && (
                        <div>
                            {/* Summary bar */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FaDatabase size={13} style={{ color: '#448C74' }} />
                                    <span>
                                        Found <strong style={{ color: '#0f172a' }}>{total.toLocaleString()}</strong> transaction{total !== 1 ? 's' : ''}
                                    </span>
                                    <span style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span>
                                    <span>Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setStep(1)}
                                        style={{
                                            border: '1px solid #cbd5e1', background: '#ffffff',
                                            borderRadius: '8px', padding: '6px 14px',
                                            fontSize: '12px', color: '#334155', cursor: 'pointer', fontWeight: 600,
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                        }}
                                    >
                                        <FaArrowLeft size={11} /> Edit Columns
                                    </button>
                                    <button
                                        onClick={downloadExcel}
                                        disabled={!transactions.length || exporting}
                                        style={{
                                            background: (transactions.length && !exporting) ? 'linear-gradient(135deg, #059669, #047857)' : '#e2e8f0',
                                            color: (transactions.length && !exporting) ? '#ffffff' : '#94a3b8',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '6px 16px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: (transactions.length && !exporting) ? 'pointer' : 'not-allowed',
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                        }}
                                    >
                                        {exporting ? (
                                            <><FaSpinner style={{ animation: "spinDrilldown 0.8s linear infinite" }} size={12} /> Exporting All Pages...</>
                                        ) : (
                                            <><FaDownload size={12} /> Download Excel</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            {transactions.length === 0 ? (
                                <div style={{
                                    textAlign: 'center', padding: '48px 0', color: '#94a3b8',
                                    border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc',
                                }}>
                                    <FaInbox size={36} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
                                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>No matching transactions found</div>
                                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#64748b' }}>Try expanding your range parameters or selection criteria.</div>
                                </div>
                            ) : (
                                <div style={{ position: 'relative', marginBottom: '16px', minHeight: '260px' }}>
                                    <style>{`@keyframes spinDrilldown { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                    {loading && (
                                        <div style={{
                                            position: 'absolute', inset: 0, zIndex: 20,
                                            background: 'rgba(255, 255, 255, 0.85)',
                                            backdropFilter: 'blur(4px)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            gap: '10px', color: '#448C74', fontWeight: 600, fontSize: '13px',
                                            borderRadius: '12px',
                                        }}>
                                            <FaSpinner style={{ animation: 'spinDrilldown 0.8s linear infinite', color: '#448C74' }} size={28} />
                                            <span>Fetching Page {loadingPage}...</span>
                                        </div>
                                    )}
                                    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...thStyle, width: '45px' }}>#</th>
                                                {selectedColumns.map(col => (
                                                    <th key={col} style={thStyle}>{label(col)}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((row, idx) => (
                                                <tr
                                                    key={idx}
                                                    style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}
                                                >
                                                    <td style={{ ...tdStyle, color: '#94a3b8', fontWeight: 500 }}>
                                                        {(page - 1) * 10 + idx + 1}
                                                    </td>
                                                    {selectedColumns.map(col => (
                                                        <td key={col} style={{
                                                            ...tdStyle,
                                                            fontWeight: col === 'agreement_price' ? 600 : 400,
                                                            color: col === 'agreement_price' ? '#448C74' : '#334155',
                                                        }}>
                                                            {formatCell(col, row[col])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
                                    <button
                                        onClick={() => goToPage(1)}
                                        disabled={page === 1 || loading}
                                        style={paginBtn(page === 1)}
                                        title="First Page"
                                    >«</button>
                                    <button
                                        onClick={() => goToPage(page - 1)}
                                        disabled={page === 1 || loading}
                                        style={paginBtn(page === 1)}
                                    >‹ Prev</button>

                                    {generatePageRange(page, totalPages).map((p, i) =>
                                        p === '...' ? (
                                            <span key={i} style={{ padding: '4px 8px', color: '#94a3b8', fontSize: '12px' }}>…</span>
                                        ) : (
                                            <button
                                                key={i}
                                                onClick={() => goToPage(p)} disabled={loading}
                                                style={{
                                                    ...paginBtn(false),
                                                    background: p === page ? '#448C74' : '#ffffff',
                                                    color: p === page ? '#ffffff' : '#334155',
                                                    fontWeight: p === page ? 700 : 500,
                                                    borderColor: p === page ? '#448C74' : '#cbd5e1',
                                                }}
                                            >
                                                {p}
                                            </button>
                                        )
                                    )}

                                    <button
                                        onClick={() => goToPage(page + 1)}
                                        disabled={page === totalPages || loading}
                                        style={paginBtn(page === totalPages)}
                                    >Next ›</button>
                                    <button
                                        onClick={() => goToPage(totalPages)}
                                        disabled={page === totalPages || loading}
                                        style={paginBtn(page === totalPages)}
                                        title="Last Page"
                                    >»</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ────────────────────────────────────────────── */}
                <div style={{
                    padding: '14px 24px',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    flexShrink: 0,
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            border: '1px solid #cbd5e1', background: '#ffffff',
                            color: '#334155', borderRadius: '8px', padding: '7px 18px',
                            fontSize: '13px', cursor: 'pointer', fontWeight: 600,
                        }}
                    >
                        Close
                    </button>

                    {step === 1 && (
                        <button
                            disabled={selectedColumns.length === 0 || loading}
                            onClick={() => fetchTransactions(1, selectedColumns)}
                            style={{
                                background: selectedColumns.length === 0
                                    ? '#e2e8f0'
                                    : 'linear-gradient(135deg, #448C74 0%, #35725e 100%)',
                                color: selectedColumns.length === 0 ? '#94a3b8' : '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 24px',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: selectedColumns.length === 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: selectedColumns.length > 0 ? '0 4px 12px rgba(68, 140, 116, 0.25)' : 'none',
                            }}
                        >
                            {loading ? (
                                <><FaSpinner style={{ animation: "spinDrilldown 0.8s linear infinite" }} size={14} /> Fetching Transactions...</>
                            ) : (
                                <>Proceed <FaArrowRight size={12} /></>
                            )}
                        </button>
                    )}

                    {step === 2 && (
                        <button
                            onClick={downloadExcel}
                            disabled={!transactions.length || exporting}
                            style={{
                                background: (transactions.length && !exporting)
                                    ? 'linear-gradient(135deg, #059669, #047857)'
                                    : '#e2e8f0',
                                color: (transactions.length && !exporting) ? '#ffffff' : '#94a3b8',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 24px',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: (transactions.length && !exporting) ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: (transactions.length && !exporting) ? '0 4px 12px rgba(5, 150, 105, 0.25)' : 'none',
                            }}
                        >
                            {exporting ? (
                                <><FaSpinner style={{ animation: "spinDrilldown 0.8s linear infinite" }} size={14} /> Exporting All Pages...</>
                            ) : (
                                <><FaDownload size={13} /> Download Excel</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

/* ─── Styles ───────────────────────────────────────────────────────────── */
const thStyle = {
    padding: '10px 14px',
    background: '#f1f5f9',
    color: '#475569',
    fontWeight: 700,
    fontSize: '11px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
};

const tdStyle = {
    padding: '9px 14px',
    fontSize: '12px',
    borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap',
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const paginBtn = (disabled) => ({
    padding: '6px 12px',
    border: '1px solid #cbd5e1',
    background: disabled ? '#f8fafc' : '#ffffff',
    borderRadius: '7px',
    color: disabled ? '#cbd5e1' : '#334155',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '1.4',
    transition: 'all 0.15s ease',
});

const generatePageRange = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
        pages.push(p);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
};

export default TransactionDrilldownModal;
