// import React from 'react';
// import { Line, Bar } from 'react-chartjs-2';
// import {
//     Chart as ChartJS,
//     CategoryScale,
//     LinearScale,
//     PointElement,
//     LineElement,
//     BarElement,
//     Title,
//     Tooltip,
//     Legend
// } from 'chart.js';

// // Register ChartJS components
// ChartJS.register(
//     CategoryScale,
//     LinearScale,
//     PointElement,
//     LineElement,
//     BarElement,
//     Title,
//     Tooltip,
//     Legend
// );

// const Marketanalysis = ({ calculationMode, setCalculationMode }) => {
//     // State for local controls
//     const [analysisView, setAnalysisView] = React.useState('Overview Analysis');
//     const [year, setYear] = React.useState('All');
//     const [viewType, setViewType] = React.useState('Year on Year');

//     // State for chart data (Rate)
//     const [chartData, setChartData] = React.useState(null); // stores the full data object
//     const [chartLoading, setChartLoading] = React.useState(false);
//     const [chartError, setChartError] = React.useState(null);

//     // State for chart data (Agreement Price)
//     const [agreementChartData, setAgreementChartData] = React.useState(null);
//     const [agreementChartLoading, setAgreementChartLoading] = React.useState(false);
//     const [agreementChartError, setAgreementChartError] = React.useState(null);

//     // State for Supply-Demand chart data
//     const [supplyDemandData, setSupplyDemandData] = React.useState(null);
//     const [supplyDemandLoading, setSupplyDemandLoading] = React.useState(false);
//     const [supplyDemandError, setSupplyDemandError] = React.useState(null);

//     // Determine chart type
//     const isBarChart = year !== 'All' && viewType === 'Year on Year';

//     // Helper function to map frontend analysis view names to API expected names
//     const mapAnalysisViewToApi = (frontendView) => {
//         switch (frontendView) {
//             case 'Overview Analysis':
//                 return 'Overview';
//             case 'Bhk Analysis':
//                 return 'Bhk Analysis';
//             case 'Commercial Analysis':
//                 return 'Commercial';
//             default:
//                 return frontendView;
//         }
//     };

//     // Load saved data on mount
//     React.useEffect(() => {
//         const savedData = localStorage.getItem('Market Analysis Payload');
//         if (savedData) {
//             try {
//                 const parsed = JSON.parse(savedData);
//                 if (parsed.analysisView) setAnalysisView(parsed.analysisView);
//                 if (parsed.year) setYear(parsed.year);
//                 if (parsed.viewType) setViewType(parsed.viewType);
//                 // Note: calculationMode is controlled by parent, but if we wanted to enforce saved value:
//                 // if (parsed.calculationMode && parsed.calculationMode !== calculationMode) setCalculationMode(parsed.calculationMode);
//             } catch (e) {
//                 console.error("Failed to parse Market Analysis Payload", e);
//             }
//         }
//     }, [setCalculationMode]);

//     // Auto-save when any dependency changes
//     React.useEffect(() => {
//         const existingRaw = localStorage.getItem('Market Analysis Payload');
//         let existing = {};
//         try {
//             existing = existingRaw ? JSON.parse(existingRaw) : {};
//         } catch (e) {
//             console.error("Failed to parse existing Market Analysis Payload", e);
//         }

//         const payload = {
//             ...existing, // Preserve existing fields (like villageName, villageId)
//             analysisView,
//             calculationMode,
//             year,
//             viewType
//         };
//         localStorage.setItem('Market Analysis Payload', JSON.stringify(payload));
//         // console.log("Market Analysis Payload Saved:", payload);
//     }, [analysisView, calculationMode, year, viewType]);

//     // Fetch Rate Chart data
//     React.useEffect(() => {
//         const fetchChartData = async () => {
//             const savedPayload = localStorage.getItem('Market Analysis Payload');
//             if (!savedPayload) {
//                 setChartError('No payload found');
//                 return;
//             }

//             let payload;
//             try {
//                 payload = JSON.parse(savedPayload);
//             } catch (e) {
//                 setChartError('Invalid payload');
//                 return;
//             }

//             // Check if we have required data
//             if (!payload.villageId) {
//                 setChartError('Village not selected');
//                 setChartData(null);
//                 return;
//             }

//             setChartLoading(true);
//             setChartError(null);

//             try {
//                 const response = await fetch('http://localhost:8000/new_rate_simulator/simulator/chart-rate/', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'Accept': 'application/json',
//                     },
//                     body: JSON.stringify(payload),
//                 });

//                 if (!response.ok) {
//                     throw new Error(`HTTP error! status: ${response.status}`);
//                 }

//                 const data = await response.json();

//                 if (data && data.success && data.data) {
//                     setChartData(data.data);
//                 } else {
//                     setChartError('Invalid response format: missing success or data field');
//                     setChartData(null);
//                 }
//             } catch (error) {
//                 console.error('Failed to fetch chart data:', error);
//                 setChartError(error.message || 'Failed to load chart data');
//                 setChartData(null);
//             } finally {
//                 setChartLoading(false);
//             }
//         };

//         fetchChartData();
//     }, [analysisView, year, viewType, calculationMode]);

//     // Fetch Agreement Price Chart data
//     React.useEffect(() => {
//         const fetchAgreementData = async () => {
//             const savedPayload = localStorage.getItem('Market Analysis Payload');
//             if (!savedPayload) {
//                 setAgreementChartError('No payload found');
//                 return;
//             }

//             let payload;
//             try {
//                 payload = JSON.parse(savedPayload);
//             } catch (e) {
//                 setAgreementChartError('Invalid payload');
//                 return;
//             }

//             if (!payload.villageId) {
//                 setAgreementChartError('Village not selected');
//                 setAgreementChartData(null);
//                 return;
//             }

//             setAgreementChartLoading(true);
//             setAgreementChartError(null);

//             try {
//                 const response = await fetch('http://localhost:8000/new_rate_simulator/simulator/chart/agreement-price/', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'Accept': 'application/json',
//                     },
//                     body: JSON.stringify(payload),
//                 });

//                 if (!response.ok) {
//                     throw new Error(`HTTP error! status: ${response.status}`);
//                 }

//                 const data = await response.json();

//                 if (data && data.success && data.data) {
//                     setAgreementChartData(data.data);
//                 } else {
//                     setAgreementChartError('Invalid response format: missing success or data field');
//                     setAgreementChartData(null);
//                 }
//             } catch (error) {
//                 console.error('Failed to fetch agreement chart data:', error);
//                 setAgreementChartError(error.message || 'Failed to load chart data');
//                 setAgreementChartData(null);
//             } finally {
//                 setAgreementChartLoading(false);
//             }
//         };

//         fetchAgreementData();
//     }, [analysisView, year, viewType, calculationMode]);

//     // Fetch Supply-Demand Chart data
//     React.useEffect(() => {
//         const fetchSupplyDemandData = async () => {
//             const savedPayload = localStorage.getItem('Market Analysis Payload');
//             if (!savedPayload) {
//                 setSupplyDemandError('No payload found');
//                 return;
//             }

//             let payload;
//             try {
//                 payload = JSON.parse(savedPayload);
//             } catch (e) {
//                 setSupplyDemandError('Invalid payload');
//                 return;
//             }

//             if (!payload.villageId) {
//                 setSupplyDemandError('Village not selected');
//                 setSupplyDemandData(null);
//                 return;
//             }

//             setSupplyDemandLoading(true);
//             setSupplyDemandError(null);

//             try {
//                 // Map frontend analysisView names to what API expects
//                 const apiPayload = {
//                     ...payload,
//                     analysisView: mapAnalysisViewToApi(payload.analysisView)
//                 };

//                 console.log('DEBUG - Sending payload to supply-demand API:', JSON.stringify(apiPayload, null, 2));

//                 const response = await fetch('http://localhost:8000/new_rate_simulator/simulator/supply-demand/', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'Accept': 'application/json',
//                     },
//                     body: JSON.stringify(apiPayload),
//                 });

//                 console.log('DEBUG - Response status:', response.status, response.statusText);

//                 if (!response.ok) {
//                     let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
//                     try {
//                         const errorData = await response.json();
//                         console.log('DEBUG - Error response:', errorData);
//                         errorMessage = errorData.error || errorData.message || errorMessage;
//                     } catch (e) {
//                         console.log('DEBUG - Could not parse error response');
//                     }
//                     throw new Error(errorMessage);
//                 }

//                 const data = await response.json();
//                 console.log('DEBUG - API response data:', data);

//                 if (data && data.success) {
//                     setSupplyDemandData(data);
//                 } else {
//                     setSupplyDemandError(data.error || 'Invalid response format');
//                     setSupplyDemandData(null);
//                 }
//             } catch (error) {
//                 console.error('Failed to fetch supply-demand data:', error);
//                 setSupplyDemandError(`Error: ${error.message}. Check console for details.`);
//                 setSupplyDemandData(null);
//             } finally {
//                 setSupplyDemandLoading(false);
//             }
//         };

//         fetchSupplyDemandData();
//     }, [analysisView, year, viewType, calculationMode]);

//     // Prepare chart configuration for Chart.js (Rate Chart)
//     const getChartConfig = () => {
//         if (!chartData) {
//             return {
//                 data: { labels: [], datasets: [] },
//                 options: {}
//             };
//         }

//         // Helper to extract categories from the first available dataset
//         const getCategories = (dataArray) => {
//             if (!Array.isArray(dataArray) || dataArray.length === 0) return [];
//             return dataArray.map(item => item.period || item.year || item.quarter || item.month);
//         };

//         let labels = [];
//         let datasets = [];

//         if (analysisView === 'Overview Analysis') {
//             // Plot 3 lines: Residential, Office, Shop
//             const residentialData = chartData.residential || [];
//             const officeData = chartData.office || [];
//             const shopData = chartData.shop || [];

//             // Use the residential data for x-axis labels (assuming sync) or simple merge
//             // If residential is empty, try office, then shop
//             labels = getCategories(residentialData);
//             if (labels.length === 0) labels = getCategories(officeData);
//             if (labels.length === 0) labels = getCategories(shopData);

//             datasets = [
//                 {
//                     label: 'Residential',
//                     data: residentialData.map(d => Math.round(parseFloat(d.average_rate || 0))),
//                     borderColor: '#448C74',
//                     backgroundColor: '#448C74',
//                     tension: 0.3
//                 },
//                 {
//                     label: 'Office',
//                     data: officeData.map(d => Math.round(parseFloat(d.average_rate || 0))),
//                     borderColor: '#FF6B6B',
//                     backgroundColor: '#FF6B6B',
//                     tension: 0.3
//                 },
//                 {
//                     label: 'Shop',
//                     data: shopData.map(d => Math.round(parseFloat(d.average_rate || 0))),
//                     borderColor: '#4ECDC4',
//                     backgroundColor: '#4ECDC4',
//                     tension: 0.3
//                 }
//             ];
//         } else if (analysisView === 'Commercial Analysis') {
//             // Plot 2 lines: Office, Shop
//             const officeData = chartData.office || [];
//             const shopData = chartData.shop || [];

//             labels = getCategories(officeData);
//             if (labels.length === 0) labels = getCategories(shopData);

//             datasets = [
//                 {
//                     label: 'Office',
//                     data: officeData.map(d => Math.round(parseFloat(d.average_rate || 0))),
//                     borderColor: '#FF6B6B',
//                     backgroundColor: '#FF6B6B',
//                     tension: 0.3
//                 },
//                 {
//                     label: 'Shop',
//                     data: shopData.map(d => Math.round(parseFloat(d.average_rate || 0))),
//                     borderColor: '#4ECDC4',
//                     backgroundColor: '#4ECDC4',
//                     tension: 0.3
//                 }
//             ];
//         } else if (analysisView === 'Bhk Analysis') {
//             // Plot 4 lines: 1BHK, 2BHK, 3BHK, >3BHK
//             const bhk1Data = chartData['1Bhk'] || [];
//             const bhk2Data = chartData['2Bhk'] || [];
//             const bhk3Data = chartData['3Bhk'] || [];
//             const bhk3PlusData = chartData['>3Bhk'] || [];

//             // Use the first available dataset for x-axis labels
//             labels = getCategories(bhk1Data);
//             if (labels.length === 0) labels = getCategories(bhk2Data);
//             if (labels.length === 0) labels = getCategories(bhk3Data);
//             if (labels.length === 0) labels = getCategories(bhk3PlusData);

//             datasets = [
//                 {
//                     label: '1 BHK',
//                     data: bhk1Data.map(d => Math.round(parseFloat(d.average_rate || 0))),
//                     borderColor: '#448C74',
//                     backgroundColor: '#448C74',
//                     tension: 0.3
//                 },
//                 {
//                     label: '2 BHK',
//                     data: bhk2Data.map(d => Math.round(parseFloat(d.average_rate || 0))),
//                     borderColor: '#FF6B6B',
//                     backgroundColor: '#FF6B6B',
//                     tension: 0.3
//                 },
//                 {
//                     label: '3 BHK',
//                     data: bhk3Data.map(d => Math.round(parseFloat(d.average_rate || 0))),
//                     borderColor: '#4ECDC4',
//                     backgroundColor: '#4ECDC4',
//                     tension: 0.3
//                 },
//                 {
//                     label: '>3 BHK',
//                     data: bhk3PlusData.map(d => Math.round(parseFloat(d.average_rate || 0))),
//                     borderColor: '#FFE66D',
//                     backgroundColor: '#FFE66D',
//                     tension: 0.3
//                 }
//             ];
//         }

//         const data = {
//             labels,
//             datasets
//         };

//         const options = {
//             responsive: true,
//             plugins: {
//                 legend: {
//                     position: 'top',
//                 },
//                 title: {
//                     display: true,
//                     text: `Average Rate Trend - ${viewType} `,
//                 },
//                 tooltip: {
//                     callbacks: {
//                         label: function (context) {
//                             let label = context.dataset.label || '';
//                             if (label) {
//                                 label += ': ';
//                             }
//                             if (context.parsed.y !== null) {
//                                 label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(context.parsed.y);
//                             }
//                             return label;
//                         }
//                     }
//                 }
//             },
//             scales: {
//                 y: {
//                     title: {
//                         display: true,
//                         text: 'Average Rate (₹/sqft)'
//                     }
//                 },
//                 x: {
//                     title: {
//                         display: true,
//                         text: viewType === 'Year on Year' ? 'Year' : viewType === 'Quarter on Quarter' ? 'Quarter' : 'Month'
//                     }
//                 }
//             }
//         };

//         return { data, options };
//     };

//     // Config for Supply-Demand Butterfly Bar Chart
//     const getSupplyDemandChartConfig = () => {
//         if (!supplyDemandData || !supplyDemandData.data) {
//             return [];
//         }

//         // For butterfly chart, we need to handle different periods
//         const periods = Object.keys(supplyDemandData.data);

//         if (periods.length === 0) {
//             return [];
//         }

//         // Get categories from the first period's data to ensure we match API response
//         const firstPeriod = periods[0];
//         const firstPeriodData = supplyDemandData.data[firstPeriod] || {};

//         // Use the actual categories from the API response
//         let categories = Object.keys(firstPeriodData);

//         // If no categories found, use default based on analysisView
//         if (categories.length === 0) {
//             if (analysisView === 'Overview Analysis') {
//                 categories = ['residential', 'office', 'shop'];
//             } else if (analysisView === 'Bhk Analysis') {
//                 categories = ['1Bhk', '2Bhk', '3Bhk', '>3Bhk'];
//             } else if (analysisView === 'Commercial Analysis') {
//                 categories = ['office', 'shop'];
//             }
//         }

//         // Create labels for each category (for butterfly chart, we'll show one chart per period)
//         // We'll create a chart for each period
//         const chartConfigs = periods.map(period => {
//             const periodData = supplyDemandData.data[period] || {};

//             // Prepare supply and demand data for butterfly chart
//             const supplyData = [];
//             const demandData = [];
//             const supplyDemandRatios = [];

//             categories.forEach(category => {
//                 const categoryData = periodData[category];
//                 if (categoryData) {
//                     supplyData.push(categoryData.supply || 0);
//                     demandData.push(categoryData.demand || 0);
//                     supplyDemandRatios.push(categoryData.supply_demand_ratio || 0);
//                 } else {
//                     supplyData.push(0);
//                     demandData.push(0);
//                     supplyDemandRatios.push(0);
//                 }
//             });

//             const data = {
//                 labels: categories.map(cat => {
//                     // Format labels nicely
//                     if (cat === '1Bhk') return '1 BHK';
//                     if (cat === '2Bhk') return '2 BHK';
//                     if (cat === '3Bhk') return '3 BHK';
//                     if (cat === '>3Bhk') return '>3 BHK';
//                     if (cat === 'residential') return 'Residential';
//                     if (cat === 'office') return 'Office';
//                     if (cat === 'shop') return 'Shop';
//                     return cat.charAt(0).toUpperCase() + cat.slice(1);
//                 }),
//                 datasets: [
//                     {
//                         label: 'Supply',
//                         data: supplyData,
//                         backgroundColor: '#448C74',
//                         borderColor: '#448C74',
//                         borderWidth: 1,
//                         stack: 'Stack 0'
//                     },
//                     {
//                         label: 'Demand',
//                         data: demandData.map(val => -val), // Negative for left side
//                         backgroundColor: '#FF6B6B',
//                         borderColor: '#FF6B6B',
//                         borderWidth: 1,
//                         stack: 'Stack 0'
//                     }
//                 ]
//             };

//             const options = {
//                 responsive: true,
//                 indexAxis: 'y',
//                 plugins: {
//                     legend: {
//                         position: 'top',
//                     },
//                     title: {
//                         display: true,
//                         text: `Supply vs Demand - ${period}`,
//                     },
//                     tooltip: {
//                         callbacks: {
//                             label: function (context) {
//                                 let label = context.dataset.label || '';
//                                 if (label) {
//                                     label += ': ';
//                                 }
//                                 const value = Math.abs(context.parsed.x);
//                                 label += new Intl.NumberFormat('en-IN').format(value) + ' units';

//                                 // Add ratio info for Supply tooltip
//                                 if (context.dataset.label === 'Supply' && supplyDemandRatios[context.dataIndex] > 0) {
//                                     label += ` (Ratio: ${supplyDemandRatios[context.dataIndex].toFixed(3)})`;
//                                 }
//                                 return label;
//                             }
//                         }
//                     }
//                 },
//                 scales: {
//                     x: {
//                         stacked: true,
//                         ticks: {
//                             callback: function (value) {
//                                 return Math.abs(value);
//                             }
//                         },
//                         title: {
//                             display: true,
//                             text: 'Number of Units'
//                         }
//                     },
//                     y: {
//                         stacked: true,
//                         beginAtZero: true
//                     }
//                 }
//             };

//             return { period, data, options, supplyDemandRatios };
//         });

//         return chartConfigs;
//     };

//     // Config for Agreement Price Chart
//     const getAgreementChartConfig = () => {
//         if (!agreementChartData) {
//             return {
//                 data: { labels: [], datasets: [] },
//                 options: {}
//             };
//         }

//         const getCategories = (dataArray) => {
//             if (!Array.isArray(dataArray) || dataArray.length === 0) return [];
//             return dataArray.map(item => item.period || item.year || item.quarter || item.month);
//         };

//         let labels = [];
//         let datasets = [];

//         if (analysisView === 'Overview Analysis') {
//             const residentialData = agreementChartData.residential || [];
//             const officeData = agreementChartData.office || [];
//             const shopData = agreementChartData.shop || [];

//             labels = getCategories(residentialData);
//             if (labels.length === 0) labels = getCategories(officeData);
//             if (labels.length === 0) labels = getCategories(shopData);

//             datasets = [
//                 {
//                     label: 'Residential',
//                     data: residentialData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
//                     borderColor: '#448C74',
//                     backgroundColor: '#448C74',
//                     tension: 0.3
//                 },
//                 {
//                     label: 'Office',
//                     data: officeData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
//                     borderColor: '#FF6B6B',
//                     backgroundColor: '#FF6B6B',
//                     tension: 0.3
//                 },
//                 {
//                     label: 'Shop',
//                     data: shopData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
//                     borderColor: '#4ECDC4',
//                     backgroundColor: '#4ECDC4',
//                     tension: 0.3
//                 }
//             ];
//         } else if (analysisView === 'Commercial Analysis') {
//             const officeData = agreementChartData.office || [];
//             const shopData = agreementChartData.shop || [];

//             labels = getCategories(officeData);
//             if (labels.length === 0) labels = getCategories(shopData);

//             datasets = [
//                 {
//                     label: 'Office',
//                     data: officeData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
//                     borderColor: '#FF6B6B',
//                     backgroundColor: '#FF6B6B',
//                     tension: 0.3
//                 },
//                 {
//                     label: 'Shop',
//                     data: shopData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
//                     borderColor: '#4ECDC4',
//                     backgroundColor: '#4ECDC4',
//                     tension: 0.3
//                 }
//             ];
//         } else if (analysisView === 'Bhk Analysis') {
//             const bhk1Data = agreementChartData['1Bhk'] || [];
//             const bhk2Data = agreementChartData['2Bhk'] || [];
//             const bhk3Data = agreementChartData['3Bhk'] || [];
//             const bhk3PlusData = agreementChartData['>3Bhk'] || [];

//             labels = getCategories(bhk1Data);
//             if (labels.length === 0) labels = getCategories(bhk2Data);
//             if (labels.length === 0) labels = getCategories(bhk3Data);
//             if (labels.length === 0) labels = getCategories(bhk3PlusData);

//             datasets = [
//                 {
//                     label: '1 BHK',
//                     data: bhk1Data.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
//                     borderColor: '#448C74',
//                     backgroundColor: '#448C74',
//                     tension: 0.3
//                 },
//                 {
//                     label: '2 BHK',
//                     data: bhk2Data.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
//                     borderColor: '#FF6B6B',
//                     backgroundColor: '#FF6B6B',
//                     tension: 0.3
//                 },
//                 {
//                     label: '3 BHK',
//                     data: bhk3Data.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
//                     borderColor: '#4ECDC4',
//                     backgroundColor: '#4ECDC4',
//                     tension: 0.3
//                 },
//                 {
//                     label: '>3 BHK',
//                     data: bhk3PlusData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
//                     borderColor: '#FFE66D',
//                     backgroundColor: '#FFE66D',
//                     tension: 0.3
//                 }
//             ];
//         }

//         const data = { labels, datasets };
//         const options = {
//             responsive: true,
//             plugins: {
//                 legend: { position: 'top' },
//                 title: { display: true, text: `Average Agreement Price Trend - ${viewType}` },
//                 tooltip: {
//                     callbacks: {
//                         label: function (context) {
//                             let label = context.dataset.label || '';
//                             if (label) label += ': ';
//                             if (context.parsed.y !== null) {
//                                 label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(context.parsed.y);
//                             }
//                             return label;
//                         }
//                     }
//                 }
//             },
//             scales: {
//                 y: { title: { display: true, text: 'Average Agreement Price (₹)' } },
//                 x: { title: { display: true, text: viewType === 'Year on Year' ? 'Year' : viewType === 'Quarter on Quarter' ? 'Quarter' : 'Month' } }
//             }
//         };
//         return { data, options };
//     };

//     const { data: chartConfigData, options: chartConfigOptions } = getChartConfig();
//     const { data: agreementChartConfigData, options: agreementChartConfigOptions } = getAgreementChartConfig();

//     return (
//         <div className="col-12 fade-in-up stagger-4 mt-5">
//             <div className="text-center mb-4">
//                 <h3 className="fw-bold text-dark mb-1">
//                     <i className="fas fa-chart-line me-3" style={{ color: '#448C74' }}></i>
//                     Market Analysis 2
//                 </h3>
//             </div>

//             <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
//                 {/* Analysis Type Buttons */}
//                 <div className="mb-4 text-start">
//                     <label className="form-label fw-semibold small text-uppercase">
//                         Analysis View
//                     </label>
//                     <div className="btn-group w-100" role="group">
//                         <input
//                             type="radio"
//                             className="btn-check"
//                             name="analysisType"
//                             id="at_overview"
//                             autoComplete="off"
//                             checked={analysisView === 'Overview Analysis'}
//                             onChange={() => setAnalysisView('Overview Analysis')}
//                         />
//                         <label className={`btn ${analysisView === 'Overview Analysis' ? 'btn-primary' : 'btn-outline-primary'} `} htmlFor="at_overview">Overview Analysis</label>

//                         <input
//                             type="radio"
//                             className="btn-check"
//                             name="analysisType"
//                             id="at_bhk"
//                             autoComplete="off"
//                             checked={analysisView === 'Bhk Analysis'}
//                             onChange={() => setAnalysisView('Bhk Analysis')}
//                         />
//                         <label className={`btn ${analysisView === 'Bhk Analysis' ? 'btn-primary' : 'btn-outline-primary'} `} htmlFor="at_bhk">Bhk Analysis</label>

//                         <input
//                             type="radio"
//                             className="btn-check"
//                             name="analysisType"
//                             id="at_commercial"
//                             autoComplete="off"
//                             checked={analysisView === 'Commercial Analysis'}
//                             onChange={() => setAnalysisView('Commercial Analysis')}
//                         />
//                         <label className={`btn ${analysisView === 'Commercial Analysis' ? 'btn-primary' : 'btn-outline-primary'} `} htmlFor="at_commercial">Commercial Analysis</label>
//                     </div>
//                 </div>

//                 {/* Calculation Mode Toggle */}
//                 <div className="mb-4 text-start">
//                     <label className="form-label fw-semibold small text-uppercase">
//                         Calculation Mode *
//                     </label>
//                     <div className="btn-group w-100" role="group">
//                         <input
//                             type="radio"
//                             className="btn-check"
//                             name="ma_calculationMode"
//                             id="ma_carpetMode"
//                             autoComplete="off"
//                             checked={calculationMode === 'carpet'}
//                             onChange={() => setCalculationMode('carpet')}
//                         />
//                         <label className={`btn ${calculationMode === 'carpet' ? 'btn-success' : 'btn-outline-secondary'} `} htmlFor="ma_carpetMode">
//                             Calculate on Carpet Area
//                         </label>

//                         <input
//                             type="radio"
//                             className="btn-check"
//                             name="ma_calculationMode"
//                             id="ma_saleableMode"
//                             autoComplete="off"
//                             checked={calculationMode === 'saleable'}
//                             onChange={() => setCalculationMode('saleable')}
//                         />
//                         <label className={`btn ${calculationMode === 'saleable' ? 'btn-success' : 'btn-outline-secondary'} `} htmlFor="ma_saleableMode">
//                             Calculate on Saleable Area
//                         </label>
//                     </div>
//                 </div>

//                 {/* Filters: Year and View Type */}
//                 <div className="row g-3 mb-4 text-start">
//                     <div className="col-md-6">
//                         <label htmlFor="ma_year" className="form-label fw-semibold small text-uppercase">Year</label>
//                         <select
//                             className="form-select form-select-sm"
//                             id="ma_year"
//                             value={year}
//                             onChange={(e) => setYear(e.target.value)}
//                         >
//                             <option value="All">All</option>
//                             <option value="2020">2020</option>
//                             <option value="2021">2021</option>
//                             <option value="2022">2022</option>
//                             <option value="2023">2023</option>
//                             <option value="2024">2024</option>
//                         </select>
//                     </div>
//                     <div className="col-md-6">
//                         <label htmlFor="ma_viewType" className="form-label fw-semibold small text-uppercase">View Type</label>
//                         <select
//                             className="form-select form-select-sm"
//                             id="ma_viewType"
//                             value={viewType}
//                             onChange={(e) => setViewType(e.target.value)}
//                         >
//                             <option value="Year on Year">Year on Year</option>
//                             <option value="Quarter on Quarter">Quarter on Quarter</option>
//                         </select>
//                     </div>
//                 </div>

//                 {/* Charts Section: Side by Side */}
//                 <div className="row mt-4">
//                     {/* Rate Chart */}
//                     <div className="col-md-6">
//                         {chartLoading && (
//                             <div className="text-center py-4">
//                                 <div className="spinner-border text-primary" role="status">
//                                     <span className="visually-hidden">Loading...</span>
//                                 </div>
//                                 <p className="text-muted mt-2">Loading chart data...</p>
//                             </div>
//                         )}

//                         {chartError && (
//                             <div className="alert alert-warning" role="alert">
//                                 <i className="fas fa-exclamation-triangle me-2"></i>
//                                 {chartError}
//                             </div>
//                         )}

//                         {!chartLoading && !chartError && (!chartData || (chartConfigData.datasets.length === 0)) && (
//                             <div className="alert alert-info" role="alert">
//                                 <i className="fas fa-info-circle me-2"></i>
//                                 No data available for the selected filters
//                             </div>
//                         )}

//                         {!chartLoading && !chartError && chartData && chartConfigData.datasets.length > 0 && (
//                             <div className="card border-0 shadow-sm mb-5 h-100">
//                                 <div className="card-body">
//                                     {isBarChart ? (
//                                         <Bar options={chartConfigOptions} data={chartConfigData} height={250} />
//                                     ) : (
//                                         <Line options={chartConfigOptions} data={chartConfigData} height={250} />
//                                     )}
//                                 </div>
//                             </div>
//                         )}
//                     </div>

//                     {/* Agreement Price Chart */}
//                     <div className="col-md-6">
//                         {agreementChartLoading && (
//                             <div className="text-center py-4">
//                                 <div className="spinner-border text-primary" role="status">
//                                     <span className="visually-hidden">Loading...</span>
//                                 </div>
//                                 <p className="text-muted mt-2">Loading agreement chart data...</p>
//                             </div>
//                         )}

//                         {agreementChartError && (
//                             <div className="alert alert-warning" role="alert">
//                                 <i className="fas fa-exclamation-triangle me-2"></i>
//                                 {agreementChartError}
//                             </div>
//                         )}

//                         {!agreementChartLoading && !agreementChartError && (!agreementChartData || (agreementChartConfigData.datasets.length === 0)) && (
//                             <div className="alert alert-info" role="alert">
//                                 <i className="fas fa-info-circle me-2"></i>
//                                 No data available for the selected filters
//                             </div>
//                         )}

//                         {!agreementChartLoading && !agreementChartError && agreementChartData && agreementChartConfigData.datasets.length > 0 && (
//                             <div className="card border-0 shadow-sm h-100">
//                                 <div className="card-body">
//                                     <Bar options={agreementChartConfigOptions} data={agreementChartConfigData} height={250} />
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </div>

//                 {/* Supply-Demand Chart Section */}
//                 <div className="row mt-5">
//                     <div className="col-12">
//                         <h5 className="fw-bold mb-3">
//                             <i className="fas fa-balance-scale me-2" style={{ color: '#448C74' }}></i>
//                             Supply vs Demand Analysis
//                         </h5>

//                         {supplyDemandLoading && (
//                             <div className="text-center py-4">
//                                 <div className="spinner-border text-primary" role="status">
//                                     <span className="visually-hidden">Loading...</span>
//                                 </div>
//                                 <p className="text-muted mt-2">Loading supply-demand data...</p>
//                             </div>
//                         )}

//                         {supplyDemandError && (
//                             <div className="alert alert-warning" role="alert">
//                                 <i className="fas fa-exclamation-triangle me-2"></i>
//                                 {supplyDemandError}
//                             </div>
//                         )}

//                         {!supplyDemandLoading && !supplyDemandError && (!supplyDemandData || !supplyDemandData.data) && (
//                             <div className="alert alert-info" role="alert">
//                                 <i className="fas fa-info-circle me-2"></i>
//                                 No supply-demand data available for the selected filters
//                             </div>
//                         )}

//                         {!supplyDemandLoading && !supplyDemandError && supplyDemandData && supplyDemandData.data && (() => {
//                             const chartConfigs = getSupplyDemandChartConfig();

//                             if (chartConfigs.length === 0) {
//                                 return (
//                                     <div className="col-12">
//                                         <div className="alert alert-info" role="alert">
//                                             <i className="fas fa-info-circle me-2"></i>
//                                             No supply-demand data available for {analysisView} with the selected filters
//                                         </div>
//                                     </div>
//                                 );
//                             }

//                             return (
//                                 <div className="row">
//                                     {chartConfigs.map((chartConfig, index) => (
//                                         <div className="col-md-6 mb-4" key={index}>
//                                             <div className="card border-0 shadow-sm h-100">
//                                                 <div className="card-body">
//                                                     <Bar
//                                                         options={chartConfig.options}
//                                                         data={chartConfig.data}
//                                                         height={300}
//                                                     />
//                                                     {chartConfig.supplyDemandRatios.some(ratio => ratio > 0) && (
//                                                         <div className="mt-3 text-center">
//                                                             <small className="text-muted">
//                                                                 Supply-Demand Ratios:
//                                                                 {chartConfig.supplyDemandRatios.map((ratio, idx) => (
//                                                                     ratio > 0 && (
//                                                                         <span key={idx} className="ms-2">
//                                                                             {chartConfig.data.labels[idx]}: {ratio.toFixed(3)}
//                                                                         </span>
//                                                                     )
//                                                                 ))}
//                                                             </small>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     ))}
//                                 </div>
//                             );
//                         })()}

//                         {supplyDemandData && supplyDemandData.summary && supplyDemandData.summary.overall_totals && (
//                             <div className="row mt-3">
//                                 <div className="col-12">
//                                     <div className="alert alert-light border">
//                                         <div className="row text-center">
//                                             <div className="col-md-3">
//                                                 <h6 className="text-muted">Total Supply</h6>
//                                                 <h4 className="fw-bold" style={{ color: '#448C74' }}>
//                                                     {new Intl.NumberFormat('en-IN').format(supplyDemandData.summary.overall_totals.total_supply)}
//                                                 </h4>
//                                             </div>
//                                             <div className="col-md-3">
//                                                 <h6 className="text-muted">Total Demand</h6>
//                                                 <h4 className="fw-bold" style={{ color: '#FF6B6B' }}>
//                                                     {new Intl.NumberFormat('en-IN').format(supplyDemandData.summary.overall_totals.total_demand)}
//                                                 </h4>
//                                             </div>
//                                             <div className="col-md-3">
//                                                 <h6 className="text-muted">Total Projects</h6>
//                                                 <h4 className="fw-bold text-dark">
//                                                     {supplyDemandData.summary.overall_totals.total_projects}
//                                                 </h4>
//                                             </div>
//                                             <div className="col-md-3">
//                                                 <h6 className="text-muted">Overall Ratio</h6>
//                                                 <h4 className="fw-bold" style={{ color: '#4ECDC4' }}>
//                                                     {supplyDemandData.summary.overall_totals.overall_supply_demand_ratio}
//                                                 </h4>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Marketanalysis;


import React from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const Marketanalysis = ({ calculationMode, setCalculationMode }) => {
    // State for local controls
    const [analysisView, setAnalysisView] = React.useState('Overview Analysis');
    const [year, setYear] = React.useState('All');
    const [viewType, setViewType] = React.useState('Year on Year');

    // State for chart data (Rate)
    const [chartData, setChartData] = React.useState(null); // stores the full data object
    const [chartLoading, setChartLoading] = React.useState(false);
    const [chartError, setChartError] = React.useState(null);

    // State for chart data (Agreement Price)
    const [agreementChartData, setAgreementChartData] = React.useState(null);
    const [agreementChartLoading, setAgreementChartLoading] = React.useState(false);
    const [agreementChartError, setAgreementChartError] = React.useState(null);

    // State for Supply-Demand chart data
    const [supplyDemandData, setSupplyDemandData] = React.useState(null);
    const [supplyDemandLoading, setSupplyDemandLoading] = React.useState(false);
    const [supplyDemandError, setSupplyDemandError] = React.useState(null);

    // State for Supply Analysis chart data (from pickle sheets)
    const [supplyAnalysisData, setSupplyAnalysisData] = React.useState(null);
    const [supplyAnalysisLoading, setSupplyAnalysisLoading] = React.useState(false);
    const [supplyAnalysisError, setSupplyAnalysisError] = React.useState(null);

    // City from landDetailsForm
    const [city, setCity] = React.useState(() => {
        if (typeof window === 'undefined') return '';
        try {
            return JSON.parse(localStorage.getItem('landDetailsForm'))?.location || '';
        } catch { return ''; }
    });

    // Determine chart type
    const isBarChart = year !== 'All' && viewType === 'Year on Year';

    const bhkPieData = React.useMemo(() => {
        if (!supplyAnalysisData || !supplyAnalysisData.data || analysisView !== 'Bhk Analysis') {
            return null;
        }

        const validYears = ['2020', '2021', '2022', '2024'];
        let aggregated = {};

        if (year === 'All') {
            validYears.forEach(y => {
                const yearData = supplyAnalysisData.data[y];
                if (yearData) {
                    Object.keys(yearData).forEach(cat => {
                        aggregated[cat] = (aggregated[cat] || 0) + (yearData[cat]?.supply || 0);
                    });
                }
            });
        } else {
            // Single year (must be 2020–2024 to have data, but we still try)
            const yearData = supplyAnalysisData.data[year];
            if (yearData) {
                Object.keys(yearData).forEach(cat => {
                    aggregated[cat] = yearData[cat]?.supply || 0;
                });
            }
        }

        if (Object.keys(aggregated).length === 0) return null;

        const categoryOrder = ['1bhk', '2bhk', '3bhk', '>3bhk'];
        const labels = [];
        const values = [];
        const backgroundColors = ['#448C74', '#FF6B6B', '#4ECDC4', '#FFE66D'];

        categoryOrder.forEach(cat => {
            if (aggregated[cat] !== undefined) {
                let label = cat;
                if (cat === '1bhk') label = '1 BHK';
                else if (cat === '2bhk') label = '2 BHK';
                else if (cat === '3bhk') label = '3 BHK';
                else if (cat === '>3bhk') label = '>3 BHK';
                labels.push(label);
                values.push(aggregated[cat]);
            }
        });

        return {
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors.slice(0, values.length),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: `BHK Supply Share (${year === 'All' ? '2020–2024' : year})`
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} units (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };
    }, [supplyAnalysisData, year, analysisView]);

    // Helper function to map frontend analysis view names to API expected names
    const mapAnalysisViewToApi = (frontendView) => {
        switch (frontendView) {
            case 'Overview Analysis':
                return 'Overview';
            case 'Bhk Analysis':
                return 'Bhk Analysis';
            case 'Commercial Analysis':
                return 'Commercial';
            default:
                return frontendView;
        }
    };

    // Load saved data on mount
    React.useEffect(() => {
        const savedData = localStorage.getItem('Market Analysis Payload');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.analysisView) setAnalysisView(parsed.analysisView);
                if (parsed.year) setYear(parsed.year);
                if (parsed.viewType) setViewType(parsed.viewType);
            } catch (e) {
                console.error("Failed to parse Market Analysis Payload", e);
            }
        }
    }, [setCalculationMode]);

    // Sync city from landDetailsForm when it changes
    React.useEffect(() => {
        const syncCity = () => {
            try {
                const landForm = JSON.parse(localStorage.getItem('landDetailsForm'));
                const loc = landForm?.location || '';
                setCity(loc);
            } catch { /* ignore */ }
        };

        window.addEventListener('landDetailsUpdated', syncCity);
        return () => window.removeEventListener('landDetailsUpdated', syncCity);
    }, []);

    // Auto-save when any dependency changes (including city)
    React.useEffect(() => {
        const existingRaw = localStorage.getItem('Market Analysis Payload');
        let existing = {};
        try {
            existing = existingRaw ? JSON.parse(existingRaw) : {};
        } catch (e) {
            console.error("Failed to parse existing Market Analysis Payload", e);
        }

        const payload = {
            ...existing,
            analysisView,
            calculationMode,
            year,
            viewType,
            city,
            sheetName: 'Location_QOQ',
        };
        localStorage.setItem('Market Analysis Payload', JSON.stringify(payload));

        window.dispatchEvent(new CustomEvent('marketAnalysisUpdated', { detail: payload }));
    }, [analysisView, calculationMode, year, viewType, city]);

    // Fetch Rate Chart data
    React.useEffect(() => {
        const fetchChartData = async () => {
            const savedPayload = localStorage.getItem('Market Analysis Payload');
            if (!savedPayload) {
                setChartError('No payload found');
                return;
            }

            let payload;
            try {
                payload = JSON.parse(savedPayload);
            } catch (e) {
                setChartError('Invalid payload');
                return;
            }

            // Check if we have required data
            if (!payload.villageId) {
                setChartError('Village not selected');
                setChartData(null);
                return;
            }

            setChartLoading(true);
            setChartError(null);

            try {
                const response = await fetch('/new_rate_simulator/simulator/chart-rate/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data && data.success && data.data) {
                    setChartData(data.data);
                } else {
                    setChartError('Invalid response format: missing success or data field');
                    setChartData(null);
                }
            } catch (error) {
                console.error('Failed to fetch chart data:', error);
                setChartError(error.message || 'Failed to load chart data');
                setChartData(null);
            } finally {
                setChartLoading(false);
            }
        };

        fetchChartData();
    }, [analysisView, year, viewType, calculationMode]);

    // Fetch Agreement Price Chart data
    React.useEffect(() => {
        const fetchAgreementData = async () => {
            const savedPayload = localStorage.getItem('Market Analysis Payload');
            if (!savedPayload) {
                setAgreementChartError('No payload found');
                return;
            }

            let payload;
            try {
                payload = JSON.parse(savedPayload);
            } catch (e) {
                setAgreementChartError('Invalid payload');
                return;
            }

            if (!payload.villageId) {
                setAgreementChartError('Village not selected');
                setAgreementChartData(null);
                return;
            }

            setAgreementChartLoading(true);
            setAgreementChartError(null);

            try {
                const response = await fetch('/new_rate_simulator/simulator/chart/agreement-price/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data && data.success && data.data) {
                    setAgreementChartData(data.data);
                } else {
                    setAgreementChartError('Invalid response format: missing success or data field');
                    setAgreementChartData(null);
                }
            } catch (error) {
                console.error('Failed to fetch agreement chart data:', error);
                setAgreementChartError(error.message || 'Failed to load chart data');
                setAgreementChartData(null);
            } finally {
                setAgreementChartLoading(false);
            }
        };

        fetchAgreementData();
    }, [analysisView, year, viewType, calculationMode]);

    // Fetch Supply-Demand Chart data
    React.useEffect(() => {
        const fetchSupplyDemandData = async () => {
            const savedPayload = localStorage.getItem('Market Analysis Payload');
            if (!savedPayload) {
                setSupplyDemandError('No payload found');
                return;
            }

            let payload;
            try {
                payload = JSON.parse(savedPayload);
            } catch (e) {
                setSupplyDemandError('Invalid payload');
                return;
            }

            if (!payload.villageId) {
                setSupplyDemandError('Village not selected');
                setSupplyDemandData(null);
                return;
            }

            setSupplyDemandLoading(true);
            setSupplyDemandError(null);

            try {
                // Map frontend analysisView names to what API expects
                const apiPayload = {
                    ...payload,
                    analysisView: mapAnalysisViewToApi(payload.analysisView)
                };

                console.log('DEBUG - Sending payload to supply-demand API:', JSON.stringify(apiPayload, null, 2));

                const response = await fetch('/new_rate_simulator/simulator/supply-demand/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(apiPayload),
                });

                console.log('DEBUG - Response status:', response.status, response.statusText);

                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    try {
                        const errorData = await response.json();
                        console.log('DEBUG - Error response:', errorData);
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch (e) {
                        console.log('DEBUG - Could not parse error response');
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                console.log('DEBUG - API response data:', data);

                if (data && data.success) {
                    setSupplyDemandData(data);
                } else {
                    setSupplyDemandError(data.error || 'Invalid response format');
                    setSupplyDemandData(null);
                }
            } catch (error) {
                console.error('Failed to fetch supply-demand data:', error);
                setSupplyDemandError(`Error: ${error.message}. Check console for details.`);
                setSupplyDemandData(null);
            } finally {
                setSupplyDemandLoading(false);
            }
        };

        fetchSupplyDemandData();
    }, [analysisView, year, viewType, calculationMode]);

    // Fetch Supply Analysis data (from pickle sheets)
    React.useEffect(() => {
        const fetchSupplyAnalysis = async () => {
            const savedPayload = localStorage.getItem('Market Analysis Payload');
            if (!savedPayload) {
                setSupplyAnalysisError('No payload found');
                return;
            }

            let payload;
            try {
                payload = JSON.parse(savedPayload);
            } catch (e) {
                setSupplyAnalysisError('Invalid payload');
                return;
            }

            const payloadCity = payload.city || city;
            if (!payloadCity) {
                setSupplyAnalysisError('City not selected. Please set Location in Land Details.');
                setSupplyAnalysisData(null);
                return;
            }

            if (!payload.villageName) {
                setSupplyAnalysisError('Village not selected');
                setSupplyAnalysisData(null);
                return;
            }

            setSupplyAnalysisLoading(true);
            setSupplyAnalysisError(null);

            try {
                const apiPayload = {
                    city: payloadCity,
                    sheetName: payload.sheetName || 'Location_QOQ',
                    analysisView: mapAnalysisViewToApi(payload.analysisView),
                    year: payload.year || 'All',
                    viewType: payload.viewType || 'Year on Year',
                    villageName: payload.villageName,
                };

                const response = await fetch('/new_rate_simulator/simulator/supply-analysis/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(apiPayload),
                });

                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) { /* ignore */ }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                if (data && data.success) {
                    setSupplyAnalysisData(data);
                } else {
                    setSupplyAnalysisError(data.error || 'Invalid response format');
                    setSupplyAnalysisData(null);
                }
            } catch (error) {
                console.error('Failed to fetch supply analysis data:', error);
                setSupplyAnalysisError(`Error: ${error.message}`);
                setSupplyAnalysisData(null);
            } finally {
                setSupplyAnalysisLoading(false);
            }
        };

        fetchSupplyAnalysis();
    }, [analysisView, year, viewType, city]);

    // Prepare chart configuration for Chart.js (Rate Chart)
    const getChartConfig = () => {
        if (!chartData) {
            return {
                data: { labels: [], datasets: [] },
                options: {}
            };
        }

        // Helper to extract categories from the first available dataset
        const getCategories = (dataArray) => {
            if (!Array.isArray(dataArray) || dataArray.length === 0) return [];
            return dataArray.map(item => item.period || item.year || item.quarter || item.month);
        };

        let labels = [];
        let datasets = [];

        if (analysisView === 'Overview Analysis') {
            // Plot 3 lines: Residential, Office, Shop
            const residentialData = chartData.residential || [];
            const officeData = chartData.office || [];
            const shopData = chartData.shop || [];

            // Use the residential data for x-axis labels (assuming sync) or simple merge
            // If residential is empty, try office, then shop
            labels = getCategories(residentialData);
            if (labels.length === 0) labels = getCategories(officeData);
            if (labels.length === 0) labels = getCategories(shopData);

            datasets = [
                {
                    label: 'Residential',
                    data: residentialData.map(d => Math.round(parseFloat(d.average_rate || 0))),
                    borderColor: '#448C74',
                    backgroundColor: '#448C74',
                    tension: 0.3
                },
                {
                    label: 'Office',
                    data: officeData.map(d => Math.round(parseFloat(d.average_rate || 0))),
                    borderColor: '#FF6B6B',
                    backgroundColor: '#FF6B6B',
                    tension: 0.3
                },
                {
                    label: 'Shop',
                    data: shopData.map(d => Math.round(parseFloat(d.average_rate || 0))),
                    borderColor: '#4ECDC4',
                    backgroundColor: '#4ECDC4',
                    tension: 0.3
                }
            ];
        } else if (analysisView === 'Commercial Analysis') {
            // Plot 2 lines: Office, Shop
            const officeData = chartData.office || [];
            const shopData = chartData.shop || [];

            labels = getCategories(officeData);
            if (labels.length === 0) labels = getCategories(shopData);

            datasets = [
                {
                    label: 'Office',
                    data: officeData.map(d => Math.round(parseFloat(d.average_rate || 0))),
                    borderColor: '#FF6B6B',
                    backgroundColor: '#FF6B6B',
                    tension: 0.3
                },
                {
                    label: 'Shop',
                    data: shopData.map(d => Math.round(parseFloat(d.average_rate || 0))),
                    borderColor: '#4ECDC4',
                    backgroundColor: '#4ECDC4',
                    tension: 0.3
                }
            ];
        } else if (analysisView === 'Bhk Analysis') {
            // Plot 4 lines: 1BHK, 2BHK, 3BHK, >3BHK
            const bhk1Data = chartData['1Bhk'] || [];
            const bhk2Data = chartData['2Bhk'] || [];
            const bhk3Data = chartData['3Bhk'] || [];
            const bhk3PlusData = chartData['>3Bhk'] || [];

            // Use the first available dataset for x-axis labels
            labels = getCategories(bhk1Data);
            if (labels.length === 0) labels = getCategories(bhk2Data);
            if (labels.length === 0) labels = getCategories(bhk3Data);
            if (labels.length === 0) labels = getCategories(bhk3PlusData);

            datasets = [
                {
                    label: '1 BHK',
                    data: bhk1Data.map(d => Math.round(parseFloat(d.average_rate || 0))),
                    borderColor: '#448C74',
                    backgroundColor: '#448C74',
                    tension: 0.3
                },
                {
                    label: '2 BHK',
                    data: bhk2Data.map(d => Math.round(parseFloat(d.average_rate || 0))),
                    borderColor: '#FF6B6B',
                    backgroundColor: '#FF6B6B',
                    tension: 0.3
                },
                {
                    label: '3 BHK',
                    data: bhk3Data.map(d => Math.round(parseFloat(d.average_rate || 0))),
                    borderColor: '#4ECDC4',
                    backgroundColor: '#4ECDC4',
                    tension: 0.3
                },
                {
                    label: '>3 BHK',
                    data: bhk3PlusData.map(d => Math.round(parseFloat(d.average_rate || 0))),
                    borderColor: '#FFE66D',
                    backgroundColor: '#FFE66D',
                    tension: 0.3
                }
            ];
        }

        const data = {
            labels,
            datasets
        };

        const options = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: `Average Rate Trend - ${viewType} `,
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Average Rate (₹/sqft)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: viewType === 'Year on Year' ? 'Year' : viewType === 'Quarter on Quarter' ? 'Quarter' : 'Month'
                    }
                }
            }
        };

        return { data, options };
    };

    // Config for Supply-Demand Grouped Bar Histogram (one chart per category)
    const getSupplyDemandChartConfig = () => {
        if (!supplyDemandData || !supplyDemandData.data) {
            return [];
        }

        // Periods are the time-axis labels (years or quarters)
        const periods = Object.keys(supplyDemandData.data);
        if (periods.length === 0) {
            return [];
        }

        // Collect all categories across every period
        const categorySet = new Set();
        periods.forEach(period => {
            Object.keys(supplyDemandData.data[period] || {}).forEach(cat => categorySet.add(cat));
        });
        let categories = Array.from(categorySet);

        if (categories.length === 0) {
            if (analysisView === 'Overview Analysis') categories = ['residential', 'office', 'shop'];
            else if (analysisView === 'Bhk Analysis') categories = ['1Bhk', '2Bhk', '3Bhk', '>3Bhk'];
            else if (analysisView === 'Commercial Analysis') categories = ['office', 'shop'];
        }

        // Helper to format category label
        const formatLabel = (cat) => {
            const map = { '1Bhk': '1 BHK', '2Bhk': '2 BHK', '3Bhk': '3 BHK', '>3Bhk': '>3 BHK', 'residential': 'Residential', 'office': 'Office', 'shop': 'Shop' };
            return map[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
        };

        // Sort periods: Year on Year = numeric years; Quarter on Quarter = Q1-2020, Q2-2020, ... Q4-2024
        const sortPeriodsForChart = (periodList, isQuarterly) => {
            if (!isQuarterly) {
                return [...periodList].sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
            }
            const parse = (s) => {
                const str = String(s);
                const m = str.match(/Q(\d)[\s-](\d{4})/i) || str.match(/Q(\d)-(\d{4})/);
                return m ? [parseInt(m[2], 10), parseInt(m[1], 10)] : [0, 0];
            };
            return [...periodList].sort((a, b) => {
                const [yA, qA] = parse(a);
                const [yB, qB] = parse(b);
                if (yA !== yB) return yA - yB;
                return qA - qB;
            });
        };
        const sortedPeriods = sortPeriodsForChart(periods, viewType === 'Quarter on Quarter');
        const labels = viewType === 'Quarter on Quarter'
            ? sortedPeriods.map(p => String(p).replace(/\s+/, '-'))
            : sortedPeriods;

        // One chart per category
        const chartConfigs = categories.map(category => {
            const supplyData = [];
            const demandData = [];
            const ratios = [];

            sortedPeriods.forEach(period => {
                const catData = (supplyDemandData.data[period] || {})[category];
                supplyData.push(catData?.supply || 0);
                demandData.push(catData?.demand || 0);
                ratios.push(catData?.supply_demand_ratio || 0);
            });

            const data = {
                labels,
                datasets: [
                    {
                        label: 'Supply',
                        data: supplyData,
                        backgroundColor: 'rgba(68, 140, 116, 0.8)',
                        borderColor: '#448C74',
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: 'Demand',
                        data: demandData,
                        backgroundColor: 'rgba(255, 107, 107, 0.8)',
                        borderColor: '#FF6B6B',
                        borderWidth: 1,
                        borderRadius: 4,
                    }
                ]
            };

            const options = {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: `Supply vs Demand – ${formatLabel(category)}`,
                        font: { size: 14, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                label += new Intl.NumberFormat('en-IN').format(context.parsed.y) + ' units';
                                if (context.dataset.label === 'Supply' && ratios[context.dataIndex] > 0) {
                                    label += ` (Ratio: ${ratios[context.dataIndex].toFixed(3)})`;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: viewType === 'Quarter on Quarter' ? 'Quarter' : 'Year' },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Units' },
                        ticks: {
                            callback: function (value) {
                                return new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value);
                            }
                        }
                    }
                }
            };

            return { category, data, options, supplyDemandRatios: ratios };
        });

        return chartConfigs;
    };

    // Config for Supply Analysis Bar Charts (supply from pickle sheets + demand from CGDB, same as Supply vs Demand)
    const getSupplyAnalysisChartConfig = () => {
        if (!supplyAnalysisData || !supplyAnalysisData.data) {
            return [];
        }

        const supplyPeriods = Object.keys(supplyAnalysisData.data);
        const demandPeriods = supplyDemandData?.data ? Object.keys(supplyDemandData.data) : [];
        const allPeriods = [...new Set([...supplyPeriods, ...demandPeriods.map(p => String(p).replace(/\s+/, '-'))])];

        const SUPPLY_ANALYSIS_YEAR_MIN = 2020;
        const SUPPLY_ANALYSIS_YEAR_MAX = 2024;

        const isInRange = (p, isQuarterly) => {
            if (isQuarterly) {
                const m = String(p).match(/Q(\d)[\s-](\d{4})/i);
                if (!m) return false;
                const y = parseInt(m[2], 10);
                return y >= SUPPLY_ANALYSIS_YEAR_MIN && y <= SUPPLY_ANALYSIS_YEAR_MAX;
            }
            const y = parseInt(p, 10);
            return !isNaN(y) && y >= SUPPLY_ANALYSIS_YEAR_MIN && y <= SUPPLY_ANALYSIS_YEAR_MAX;
        };

        const isQuarterlyView = viewType === 'Quarter on Quarter';
        const periods = allPeriods.filter(p => isInRange(p, isQuarterlyView));

        if (periods.length === 0) return [];

        const categorySet = new Set();
        supplyPeriods.forEach(period => {
            Object.keys(supplyAnalysisData.data[period] || {}).forEach(cat => categorySet.add(cat));
        });
        let categories = Array.from(categorySet);

        if (categories.length === 0) {
            if (analysisView === 'Overview Analysis') categories = ['residential', 'shop', 'office'];
            else if (analysisView === 'Bhk Analysis') categories = ['1bhk', '2bhk', '3bhk', '>3bhk'];
            else if (analysisView === 'Commercial Analysis') categories = ['shop', 'office'];
        }

        const formatLabel = (cat) => {
            const map = {
                '1bhk': '1 BHK', '2bhk': '2 BHK', '3bhk': '3 BHK', '>3bhk': '>3 BHK',
                'residential': 'Residential', 'office': 'Office', 'shop': 'Shop'
            };
            return map[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
        };

        const sortPeriodsForChart = (periodList, isQuarterly) => {
            if (!isQuarterly) {
                return [...periodList].sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
            }
            const parse = (s) => {
                const str = String(s);
                const m = str.match(/Q(\d)[\s-](\d{4})/i) || str.match(/Q(\d)-(\d{4})/);
                return m ? [parseInt(m[2], 10), parseInt(m[1], 10)] : [0, 0];
            };
            return [...periodList].sort((a, b) => {
                const [yA, qA] = parse(a);
                const [yB, qB] = parse(b);
                if (yA !== yB) return yA - yB;
                return qA - qB;
            });
        };
        const sortedPeriods = sortPeriodsForChart(periods, viewType === 'Quarter on Quarter');

        const normalizePeriod = (p) => {
            const s = String(p).trim();
            const m = s.match(/Q(\d)[\s-](\d{4})/i) || s.match(/Q(\d)-(\d{4})/);
            return m ? `Q${m[1]}-${m[2]}` : s;
        };

        const demandDataByPeriod = (() => {
            if (!supplyDemandData?.data) return {};
            const out = {};
            Object.keys(supplyDemandData.data).forEach((key) => {
                const norm = normalizePeriod(key);
                out[norm] = supplyDemandData.data[key];
            });
            return out;
        })();

        const getDemandCat = (cat) => {
            const m = { '1bhk': '1Bhk', '2bhk': '2Bhk', '3bhk': '3Bhk', '>3bhk': '>3Bhk' };
            return m[cat] || cat;
        };

        const chartConfigs = categories.map(category => {
            const supplyData = [];
            const demandData = [];
            const ratios = [];

            sortedPeriods.forEach(period => {
                const supplyVal = (supplyAnalysisData.data[period]?.[category]?.supply) || 0;
                const periodNorm = normalizePeriod(period);
                const demandRow = demandDataByPeriod[periodNorm] || demandDataByPeriod[period];
                const demandVal = demandRow?.[getDemandCat(category)]?.demand ?? 0;
                supplyData.push(supplyVal);
                demandData.push(demandVal);
                ratios.push(supplyVal > 0 ? demandVal / supplyVal : 0);
            });

            const labels = sortedPeriods.map(p => String(p).replace(/\s+/, '-'));

            const data = {
                labels,
                datasets: [
                    {
                        label: 'Supply',
                        data: supplyData,
                        backgroundColor: 'rgba(68, 140, 116, 0.8)',
                        borderColor: '#448C74',
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: 'Demand',
                        data: demandData,
                        backgroundColor: 'rgba(255, 107, 107, 0.8)',
                        borderColor: '#FF6B6B',
                        borderWidth: 1,
                        borderRadius: 4,
                    }
                ]
            };

            const options = {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: `Demand and Supply Analysis – ${formatLabel(category)}`,
                        font: { size: 14, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                label += new Intl.NumberFormat('en-IN').format(context.parsed.y) + ' units';
                                if (context.dataset.label === 'Supply' && ratios[context.dataIndex] > 0) {
                                    label += ` (Ratio: ${ratios[context.dataIndex].toFixed(3)})`;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: viewType === 'Quarter on Quarter' ? 'Quarter' : 'Year' },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Units' },
                        ticks: {
                            callback: (value) => new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value)
                        }
                    }
                }
            };

            return { category, data, options, supplyDemandRatios: ratios };
        });

        return chartConfigs;
    };

    // Config for Agreement Price Chart
    const getAgreementChartConfig = () => {
        if (!agreementChartData) {
            return {
                data: { labels: [], datasets: [] },
                options: {}
            };
        }

        const getCategories = (dataArray) => {
            if (!Array.isArray(dataArray) || dataArray.length === 0) return [];
            return dataArray.map(item => item.period || item.year || item.quarter || item.month);
        };

        let labels = [];
        let datasets = [];

        if (analysisView === 'Overview Analysis') {
            const residentialData = agreementChartData.residential || [];
            const officeData = agreementChartData.office || [];
            const shopData = agreementChartData.shop || [];

            labels = getCategories(residentialData);
            if (labels.length === 0) labels = getCategories(officeData);
            if (labels.length === 0) labels = getCategories(shopData);

            datasets = [
                {
                    label: 'Residential',
                    data: residentialData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
                    borderColor: '#448C74',
                    backgroundColor: '#448C74',
                    tension: 0.3
                },
                {
                    label: 'Office',
                    data: officeData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
                    borderColor: '#FF6B6B',
                    backgroundColor: '#FF6B6B',
                    tension: 0.3
                },
                {
                    label: 'Shop',
                    data: shopData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
                    borderColor: '#4ECDC4',
                    backgroundColor: '#4ECDC4',
                    tension: 0.3
                }
            ];
        } else if (analysisView === 'Commercial Analysis') {
            const officeData = agreementChartData.office || [];
            const shopData = agreementChartData.shop || [];

            labels = getCategories(officeData);
            if (labels.length === 0) labels = getCategories(shopData);

            datasets = [
                {
                    label: 'Office',
                    data: officeData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
                    borderColor: '#FF6B6B',
                    backgroundColor: '#FF6B6B',
                    tension: 0.3
                },
                {
                    label: 'Shop',
                    data: shopData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
                    borderColor: '#4ECDC4',
                    backgroundColor: '#4ECDC4',
                    tension: 0.3
                }
            ];
        } else if (analysisView === 'Bhk Analysis') {
            const bhk1Data = agreementChartData['1Bhk'] || [];
            const bhk2Data = agreementChartData['2Bhk'] || [];
            const bhk3Data = agreementChartData['3Bhk'] || [];
            const bhk3PlusData = agreementChartData['>3Bhk'] || [];

            labels = getCategories(bhk1Data);
            if (labels.length === 0) labels = getCategories(bhk2Data);
            if (labels.length === 0) labels = getCategories(bhk3Data);
            if (labels.length === 0) labels = getCategories(bhk3PlusData);

            datasets = [
                {
                    label: '1 BHK',
                    data: bhk1Data.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
                    borderColor: '#448C74',
                    backgroundColor: '#448C74',
                    tension: 0.3
                },
                {
                    label: '2 BHK',
                    data: bhk2Data.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
                    borderColor: '#FF6B6B',
                    backgroundColor: '#FF6B6B',
                    tension: 0.3
                },
                {
                    label: '3 BHK',
                    data: bhk3Data.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
                    borderColor: '#4ECDC4',
                    backgroundColor: '#4ECDC4',
                    tension: 0.3
                },
                {
                    label: '>3 BHK',
                    data: bhk3PlusData.map(d => Math.round(parseFloat(d.average_agreement_price || 0))),
                    borderColor: '#FFE66D',
                    backgroundColor: '#FFE66D',
                    tension: 0.3
                }
            ];
        }

        const data = { labels, datasets };
        const options = {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: `Average Agreement Price Trend - ${viewType}` },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: { title: { display: true, text: 'Average Agreement Price (₹)' } },
                x: { title: { display: true, text: viewType === 'Year on Year' ? 'Year' : viewType === 'Quarter on Quarter' ? 'Quarter' : 'Month' } }
            }
        };
        return { data, options };
    };

    const { data: chartConfigData, options: chartConfigOptions } = getChartConfig();
    const { data: agreementChartConfigData, options: agreementChartConfigOptions } = getAgreementChartConfig();

    return (
        <div className="col-12 fade-in-up stagger-4 mt-5">
            <div className="text-center mb-4">
                <h3 className="fw-bold text-dark mb-1">
                    <i className="fas fa-chart-line me-3" style={{ color: '#448C74' }}></i>
                    Market Research
                </h3>
            </div>

            <div className="text-center">
                <a
                    href="https://sigmavalue.in/market-lense/"
                    target="_blank"
                >
                    Click here
                </a>{" "}
                for indepth <b>Real Estate Market Analysis</b>
            </div>

            <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
                {/* Analysis Type Buttons */}
                <div className="mb-4 text-start">
                    <label className="form-label fw-semibold small text-uppercase">
                        Analysis View
                    </label>
                    <div className="btn-group w-100" role="group">
                        <input
                            type="radio"
                            className="btn-check"
                            name="analysisType"
                            id="at_overview"
                            autoComplete="off"
                            checked={analysisView === 'Overview Analysis'}
                            onChange={() => setAnalysisView('Overview Analysis')}
                        />
                        <label className={`btn ${analysisView === 'Overview Analysis' ? 'btn-primary' : 'btn-outline-primary'} `} htmlFor="at_overview">Overview Analysis</label>

                        <input
                            type="radio"
                            className="btn-check"
                            name="analysisType"
                            id="at_bhk"
                            autoComplete="off"
                            checked={analysisView === 'Bhk Analysis'}
                            onChange={() => setAnalysisView('Bhk Analysis')}
                        />
                        <label className={`btn ${analysisView === 'Bhk Analysis' ? 'btn-primary' : 'btn-outline-primary'} `} htmlFor="at_bhk">Bhk Analysis</label>

                        <input
                            type="radio"
                            className="btn-check"
                            name="analysisType"
                            id="at_commercial"
                            autoComplete="off"
                            checked={analysisView === 'Commercial Analysis'}
                            onChange={() => setAnalysisView('Commercial Analysis')}
                        />
                        <label className={`btn ${analysisView === 'Commercial Analysis' ? 'btn-primary' : 'btn-outline-primary'} `} htmlFor="at_commercial">Commercial Analysis</label>
                    </div>
                </div>

                {/* Calculation Mode Toggle */}
                <div className="mb-4 text-start">
                    <label className="form-label fw-semibold small text-uppercase">
                        Calculation Mode *
                    </label>
                    <div className="btn-group w-100" role="group">
                        <input
                            type="radio"
                            className="btn-check"
                            name="ma_calculationMode"
                            id="ma_carpetMode"
                            autoComplete="off"
                            checked={calculationMode === 'carpet'}
                            onChange={() => setCalculationMode('carpet')}
                        />
                        <label className={`btn ${calculationMode === 'carpet' ? 'btn-success' : 'btn-outline-secondary'} `} htmlFor="ma_carpetMode">
                            Calculate on Carpet Area
                        </label>

                        <input
                            type="radio"
                            className="btn-check"
                            name="ma_calculationMode"
                            id="ma_saleableMode"
                            autoComplete="off"
                            checked={calculationMode === 'saleable'}
                            onChange={() => setCalculationMode('saleable')}
                        />
                        <label className={`btn ${calculationMode === 'saleable' ? 'btn-success' : 'btn-outline-secondary'} `} htmlFor="ma_saleableMode">
                            Calculate on Saleable Area
                        </label>
                    </div>
                </div>

                {/* Filters: Year and View Type */}
                <div className="row g-3 mb-4 text-start">
                    <div className="col-md-6">
                        <label htmlFor="ma_year" className="form-label fw-semibold small text-uppercase">Year</label>
                        <select
                            className="form-select form-select-sm"
                            id="ma_year"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                        >
                            <option value="All">All</option>
                            <option value="2020">2020</option>
                            <option value="2021">2021</option>
                            <option value="2022">2022</option>
                            <option value="2023">2023</option>
                            <option value="2024">2024</option>
                        </select>
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="ma_viewType" className="form-label fw-semibold small text-uppercase">View Type</label>
                        <select
                            className="form-select form-select-sm"
                            id="ma_viewType"
                            value={viewType}
                            onChange={(e) => setViewType(e.target.value)}
                        >
                            <option value="Year on Year">Year on Year</option>
                            <option value="Quarter on Quarter">Quarter on Quarter</option>
                        </select>
                    </div>
                </div>

                {/* Charts Section: Side by Side */}
                <div className="row mt-4">
                    {/* Rate Chart */}
                    <div className="col-md-6">
                        {chartLoading && (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="text-muted mt-2">Loading chart data...</p>
                            </div>
                        )}

                        {chartError && (
                            <div className="alert alert-warning" role="alert">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                {chartError}
                            </div>
                        )}

                        {!chartLoading && !chartError && (!chartData || (chartConfigData.datasets.length === 0)) && (
                            <div className="alert alert-info" role="alert">
                                <i className="fas fa-info-circle me-2"></i>
                                No data available for the selected filters
                            </div>
                        )}

                        {!chartLoading && !chartError && chartData && chartConfigData.datasets.length > 0 && (
                            <div className="card border-0 shadow-sm mb-5 h-100">
                                <div className="card-body">
                                    {isBarChart ? (
                                        <Bar options={chartConfigOptions} data={chartConfigData} height={250} />
                                    ) : (
                                        <Line options={chartConfigOptions} data={chartConfigData} height={250} />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Agreement Price Chart */}
                    <div className="col-md-6">
                        {agreementChartLoading && (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="text-muted mt-2">Loading agreement chart data...</p>
                            </div>
                        )}

                        {agreementChartError && (
                            <div className="alert alert-warning" role="alert">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                {agreementChartError}
                            </div>
                        )}

                        {!agreementChartLoading && !agreementChartError && (!agreementChartData || (agreementChartConfigData.datasets.length === 0)) && (
                            <div className="alert alert-info" role="alert">
                                <i className="fas fa-info-circle me-2"></i>
                                No data available for the selected filters
                            </div>
                        )}

                        {!agreementChartLoading && !agreementChartError && agreementChartData && agreementChartConfigData.datasets.length > 0 && (
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    {isBarChart ? (
                                        <Bar options={agreementChartConfigOptions} data={agreementChartConfigData} height={250} />
                                    ) : (
                                        <Line options={agreementChartConfigOptions} data={agreementChartConfigData} height={250} />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Supply-Demand Chart Section 
                <div className="row mt-5">
                    <div className="col-12">
                        <h5 className="fw-bold mb-3">
                            <i className="fas fa-balance-scale me-2" style={{ color: '#448C74' }}></i>
                            Supply vs Demand Analysis
                        </h5>

                        {supplyDemandLoading && (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="text-muted mt-2">Loading supply-demand data...</p>
                            </div>
                        )}

                        {supplyDemandError && (
                            <div className="alert alert-warning" role="alert">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                {supplyDemandError}
                            </div>
                        )}

                        {!supplyDemandLoading && !supplyDemandError && (!supplyDemandData || !supplyDemandData.data) && (
                            <div className="alert alert-info" role="alert">
                                <i className="fas fa-info-circle me-2"></i>
                                No supply-demand data available for the selected filters
                            </div>
                        )}

                        {!supplyDemandLoading && !supplyDemandError && supplyDemandData && supplyDemandData.data && (() => {
                            const chartConfigs = getSupplyDemandChartConfig();

                            if (chartConfigs.length === 0) {
                                return (
                                    <div className="col-12">
                                        <div className="alert alert-info" role="alert">
                                            <i className="fas fa-info-circle me-2"></i>
                                            No supply-demand data available for {analysisView} with the selected filters
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div className="row">
                                    {chartConfigs.map((chartConfig, index) => (
                                        <div className="col-md-6 mb-4" key={index}>
                                            <div className="card border-0 shadow-sm h-100">
                                                <div className="card-body">
                                                    <Bar
                                                        options={chartConfig.options}
                                                        data={chartConfig.data}
                                                        height={300}
                                                    />
                                                    {chartConfig.supplyDemandRatios.some(ratio => ratio > 0) && (
                                                        <div className="mt-3 text-center">
                                                            <small className="text-muted">
                                                                Supply-Demand Ratios:
                                                                {chartConfig.supplyDemandRatios.map((ratio, idx) => (
                                                                    ratio > 0 && (
                                                                        <span key={idx} className="ms-2">
                                                                            {chartConfig.data.labels[idx]}: {ratio.toFixed(3)}
                                                                        </span>
                                                                    )
                                                                ))}
                                                            </small>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        {supplyDemandData && supplyDemandData.summary && supplyDemandData.summary.overall_totals && (
                            <div className="row mt-3">
                                <div className="col-12">
                                    <div className="alert alert-light border">
                                        <div className="row text-center">
                                            <div className="col-md-3">
                                                <h6 className="text-muted">Total Supply</h6>
                                                <h4 className="fw-bold" style={{ color: '#448C74' }}>
                                                    {new Intl.NumberFormat('en-IN').format(supplyDemandData.summary.overall_totals.total_supply)}
                                                </h4>
                                            </div>
                                            <div className="col-md-3">
                                                <h6 className="text-muted">Total Demand</h6>
                                                <h4 className="fw-bold" style={{ color: '#FF6B6B' }}>
                                                    {new Intl.NumberFormat('en-IN').format(supplyDemandData.summary.overall_totals.total_demand)}
                                                </h4>
                                            </div>
                                            <div className="col-md-3">
                                                <h6 className="text-muted">Total Projects</h6>
                                                <h4 className="fw-bold text-dark">
                                                    {supplyDemandData.summary.overall_totals.total_projects}
                                                </h4>
                                            </div>
                                            <div className="col-md-3">
                                                <h6 className="text-muted">Overall Ratio</h6>
                                                <h4 className="fw-bold" style={{ color: '#4ECDC4' }}>
                                                    {supplyDemandData.summary.overall_totals.overall_supply_demand_ratio}
                                                </h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>*/}

                {/* Supply Analysis Chart Section */}
                <div className="row mt-5">
                    <div className="col-12">
                        <h5 className="fw-bold mb-3">
                            <i className="fas fa-chart-bar me-2" style={{ color: '#4ECDC4' }}></i>
                            Supply And Demand Analysis
                            {city && <span className="text-muted fw-normal ms-2" style={{ fontSize: '0.0rem' }}>({city})</span>}
                        </h5>

                        {supplyAnalysisLoading && (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="text-muted mt-2">Loading supply analysis data...</p>
                            </div>
                        )}

                        {supplyAnalysisError && (
                            <div className="alert alert-warning" role="alert">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                {supplyAnalysisError}
                            </div>
                        )}

                        {!supplyAnalysisLoading && !supplyAnalysisError && (!supplyAnalysisData || !supplyAnalysisData.data || Object.keys(supplyAnalysisData.data).length === 0) && (
                            <div className="alert alert-info" role="alert">
                                <i className="fas fa-info-circle me-2"></i>
                                No supply analysis data available for the selected filters
                            </div>
                        )}

                        {!supplyAnalysisLoading && !supplyAnalysisError && supplyAnalysisData && supplyAnalysisData.data && Object.keys(supplyAnalysisData.data).length > 0 && (() => {
                            const chartConfigs = getSupplyAnalysisChartConfig();

                            if (chartConfigs.length === 0) {
                                return (
                                    <div className="alert alert-info" role="alert">
                                        <i className="fas fa-info-circle me-2"></i>
                                        No supply analysis data available for {analysisView} with the selected filters
                                    </div>
                                );
                            }

                            return (
                                <div className="row">
                                    {chartConfigs.map((chartConfig, index) => (
                                        <div className="col-md-6 mb-4" key={index}>
                                            <div className="card border-0 shadow-sm h-100">
                                                <div className="card-body">
                                                    <Bar
                                                        options={chartConfig.options}
                                                        data={chartConfig.data}
                                                        height={300}
                                                    />
                                                    {chartConfig.supplyDemandRatios && chartConfig.supplyDemandRatios.some(ratio => ratio > 0) && (
                                                        <div className="mt-3 text-center">
                                                            <small className="text-muted">
                                                                Supply-Demand Ratios:
                                                                {chartConfig.supplyDemandRatios.map((ratio, idx) => (
                                                                    ratio > 0 && (
                                                                        <span key={idx} className="ms-2">
                                                                            {chartConfig.data.labels[idx]}: {ratio.toFixed(3)}
                                                                        </span>
                                                                    )
                                                                ))}
                                                            </small>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                        {/* === BHK PIE CHART (only for Bhk Analysis) === */}
                        {analysisView === 'Bhk Analysis' && bhkPieData && (
                            <div className="row mb-4 justify-content-center">
                                <div className="col-12 col-md-8 col-lg-6">
                                    <div className="card border-0 shadow-sm">
                                        <div className="card-body">
                                            <Pie
                                                data={bhkPieData.data}
                                                options={{
                                                    ...bhkPieData.options,
                                                    maintainAspectRatio: true,  // keep aspect ratio
                                                }}
                                                height={150}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {supplyAnalysisData && supplyAnalysisData.summary && supplyAnalysisData.summary.overall_totals && (
                            <div className="row mt-3">
                                <div className="col-12">
                                    <div className="alert alert-light border">
                                        <div className="row text-center">
                                            <div className="col-md-4">
                                                <h6 className="text-muted">Total Supply</h6>
                                                <h4 className="fw-bold" style={{ color: '#448C74' }}>
                                                    {new Intl.NumberFormat('en-IN').format(supplyAnalysisData.summary.overall_totals.total_supply)}
                                                </h4>
                                            </div>
                                            <div className="col-md-4">
                                                <h6 className="text-muted">View Type</h6>
                                                <h4 className="fw-bold text-dark" style={{ fontSize: '1.1rem' }}>
                                                    {supplyAnalysisData.period_type}
                                                </h4>
                                            </div>
                                            <div className="col-md-4">
                                                <h6 className="text-muted">Categories</h6>
                                                <h4 className="fw-bold" style={{ color: '#4ECDC4', fontSize: '1.1rem' }}>
                                                    {supplyAnalysisData.summary.categories_analyzed?.join(', ')}
                                                </h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Marketanalysis;