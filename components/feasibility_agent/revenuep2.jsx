// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import { FaMapMarkerAlt } from 'react-icons/fa';
// import PricerateAnalysis from "./components/PricerateAnalysis";
// import SaleAnalysis from "./components/SaleAnalysis";
// import SupplyDemandAnalysis from "./components/SupplyDemandAnalysis";
// import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";

// const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

// const c = (value, { formula = null, type = 'text', editable = false } = {}) => ({
//   value,
//   formula,
//   type,
//   editable,
// });

// const buildDefaultGrid = () => [
//   [
//     c('UNIT MIX'),
//     c('', { type: 'number', editable: true }),
//     c(''),
//     c(''),
//     c(''),
//     c(''),
//     c(''),
//     c(''),
//     c(''),
//     c(''),
//     c(''),
//   ],
//   [c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c('')],
//   [
//     c('Objective - What Size sales fastest?'),
//     c('Variable'),
//     c('Variable'),
//     c(''),
//     c(''),
//     c('Derived'),
//     c('sigmavalue data recommendation'),
//     c('Sigmavalue data recommendation'),
//     c('optional'),
//     c('optional'),
//     c(''),
//   ],
//   [
//     c('Unit Type'),
//     c('percent of unit mix (user input)'),
//     c('Avg Unit Area (sqft) (user input)'),
//     c(''),
//     c(''),
//     c('Carpet Area (sqft)'),
//     c('SALES VELOCITY AS PER BHK in same micromarket (does not change on user input) (Per month)'),
//     c('saLES VELOCITY AS PER unit size selected in same micromarket for same bhk (changes as per user input of avg unit area alone) (per month )'),
//     c('Size adjustment factor'),
//     c('Adjusted sales velocity <br>(Base BHK velocity * Size adjustment factor )'),
//     c(''),
//   ],
//   [
//     c('1 BHK'),
//     c('', { type: 'percentage', editable: true }),
//     c('', { type: 'number', editable: true }),
//     c(''),
//     c(''),
//     c('', { formula: 'B5*B1', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c(1.05, { type: 'number' }),
//     c('', { formula: 'G5*I5', type: 'number' }),
//     c(''),
//   ],
//   [
//     c('2 BHK'),
//     c('', { type: 'percentage', editable: true }),
//     c('', { type: 'number', editable: true }),
//     c(''),
//     c(''),
//     c('', { formula: 'B6*B1', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c(1.01, { type: 'number' }),
//     c('', { formula: 'G6*I6', type: 'number' }),
//     c(''),
//   ],
//   [
//     c('3 BHK'),
//     c('', { type: 'percentage', editable: true }),
//     c('', { type: 'number', editable: true }),
//     c(''),
//     c(''),
//     c('', { formula: 'B7*B1', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0.08, { type: 'number' }),
//     c('', { formula: 'G7*I7', type: 'number' }),
//     c(''),
//   ],
//   [
//     c('>3BHK'),
//     c('', { type: 'percentage', editable: true }),
//     c('', { type: 'number', editable: true }),
//     c(''),
//     c(''),
//     c('', { formula: 'B8*B1', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c(1.06, { type: 'number' }),
//     c('', { formula: 'G8*I8', type: 'number' }),
//     c(''),
//   ],
//   [
//     c('Shop'),
//     c('', { type: 'percentage', editable: true }),
//     c('', { type: 'number', editable: true }),
//     c(''),
//     c(''),
//     c('', { formula: 'B9*B1', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c(1.12, { type: 'number' }),
//     c('', { formula: 'G9*I9', type: 'number' }),
//     c(''),
//   ],
//   [
//     c('office'),
//     c('', { type: 'percentage', editable: true }),
//     c('', { type: 'number', editable: true }),
//     c(''),
//     c(''),
//     c('', { formula: 'B10*B1', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c(1.11, { type: 'number' }),
//     c('', { formula: 'G10*I10', type: 'number' }),
//     c(''),
//   ],
//   [
//     c('TOTAL'),
//     c(''),
//     c(''),
//     c(''),
//     c(''),
//     c('', { formula: 'SUM(F5:F10)', type: 'number' }),
//     c(''),
//     c(''),
//     c(0.09, { type: 'number' }),
//     c(''),
//     c(''),
//   ],
//   [c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c('')],
//   [c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c('')],
//   [
//     c('Revenue Table'),
//     c('Derived component'),
//     c('Fixed component'),
//     c('Variable (Simulation is required for this)'),
//     c('Derived'),
//     c('Fixed component'),
//     c('Revenue (₹ Cr)'),
//     c('average rate of selected property specification in selected micromarket (doesnt change on user input)'),
//     c('Sales velocity in Market as per ticket size for particular bhk (Changes as per user input)'),
//     c('Sales velocity in Market as per rate selected  (Changes as per user input)'),
//     c(''),
//   ],
//   [
//     c('Unit Type'),
//     c('No. of Units'),
//     c('Avg Unit Area (sqft) (From unit mix)'),
//     c('Rate (₹/sqft) (User input)'),
//     c('aVG TICKET SIZE'),
//     c('Carpet Area (sqft)(From unit mix)'),
//     c('Revenue (₹ Cr)'),
//     c('average rate of selected property specification in selected micromarket (doesnt change on user input)'),
//     c('Sales velocity in Market as per ticket size for particular bhk (Changes as per user input)'),
//     c('Sales velocity in Market as per rate selected  (Changes as per user input)'),
//     c(''),
//   ],
//   [
//     c('1 BHK'),
//     c('', { formula: 'F16/C16', type: 'number' }),
//     c('', { formula: 'C5', type: 'number' }),
//     c(7000, { type: 'number', editable: true }),
//     c('', { formula: 'C16*D16', type: 'number' }),
//     c('', { formula: 'F5', type: 'number' }),
//     c('', { formula: 'D16*F16/10^7', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c('', { type: 'number' }),
//     c(''),
//   ],
//   [
//     c('2 BHK'),
//     c('', { formula: 'F17/C17', type: 'number' }),
//     c('', { formula: 'C6', type: 'number' }),
//     c(8000, { type: 'number', editable: true }),
//     c('', { formula: 'C17*D17', type: 'number' }),
//     c('', { formula: 'F6', type: 'number' }),
//     c('', { formula: 'D17*F17/10^7', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c('', { type: 'number' }),
//     c(''),
//   ],
//   [
//     c('3 BHK'),
//     c('', { formula: 'F18/C18', type: 'number' }),
//     c('', { formula: 'C7', type: 'number' }),
//     c(8800, { type: 'number', editable: true }),
//     c('', { formula: 'C18*D18', type: 'number' }),
//     c('', { formula: 'F7', type: 'number' }),
//     c('', { formula: 'D18*F18/10^7', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c('', { type: 'number' }),
//     c(''),
//   ],
//   [
//     c('>3BHK'),
//     c('', { formula: 'F19/C19', type: 'number' }),
//     c('', { formula: 'C8', type: 'number' }),
//     c(8801, { type: 'number', editable: true }),
//     c('', { formula: 'C19*D19', type: 'number' }),
//     c('', { formula: 'F8', type: 'number' }),
//     c('', { formula: 'D19*F19/10^7', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c('', { type: 'number' }),
//     c(''),
//   ],
//   [
//     c('Shop'),
//     c('', { formula: 'F20/C20', type: 'number' }),
//     c('', { formula: 'C9', type: 'number' }),
//     c(9000, { type: 'number', editable: true }),
//     c('', { formula: 'C20*D20', type: 'number' }),
//     c('', { formula: 'F9', type: 'number' }),
//     c('', { formula: 'D20*F20/10^7', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c('', { type: 'number' }),
//     c(''),
//   ],
//   [
//     c('office'),
//     c('', { formula: 'F21/C21', type: 'number' }),
//     c('', { formula: 'C10', type: 'number' }),
//     c(10000, { type: 'number', editable: true }),
//     c('', { formula: 'C21*D21', type: 'number' }),
//     c('', { formula: 'F10', type: 'number' }),
//     c('', { formula: 'D21*F21/10^7', type: 'number' }),
//     c(0, { type: 'number' }),
//     c(0, { type: 'number' }),
//     c('', { type: 'number' }),
//     c('Since we have to find most optimum rate for highest sales . tHuS THIS Constitute training data set'),
//   ],
//   [
//     c('TOTAL'),
//     c('', { formula: 'SUM(B16:B21)', type: 'number' }),
//     c('—'),
//     c('—'),
//     c(''),
//     c('', { formula: 'SUM(F16:F21)', type: 'number' }),
//     c('', { formula: 'SUM(G16:G21)', type: 'number' }),
//     c(''),
//     c(''),
//     c(''),
//     c(''),
//   ],
// ];

// const cloneGrid = (grid) => grid.map((row) => row.map((cell) => ({ ...cell })));

// const evaluateCellReference = (ref, grid) => {
//   ref = String(ref).replace(/\$/g, '');
//   const colLetter = ref.match(/[A-Z]+/)?.[0];
//   const rowNum = parseInt(ref.match(/[0-9]+/)?.[0] || '', 10);
//   const colIndex = colLetters.indexOf(colLetter);
//   const rowIndex = rowNum - 1;
//   if (colIndex >= 0 && rowIndex >= 0 && grid[rowIndex] && grid[rowIndex][colIndex]) {
//     const value = grid[rowIndex][colIndex].value;
//     return typeof value === 'number' ? value : 0;
//   }
//   return 0;
// };

// const evaluateSumRange = (range, grid) => {
//   const [start, end] = range.split(':');
//   const startCol = start.match(/[A-Z]+/)?.[0]?.replace(/\$/g, '');
//   const startRow = parseInt(start.match(/[0-9]+/)?.[0] || '', 10);
//   const endCol = end.match(/[A-Z]+/)?.[0]?.replace(/\$/g, '');
//   const endRow = parseInt(end.match(/[0-9]+/)?.[0] || '', 10);
//   const startColIndex = colLetters.indexOf(startCol);
//   const endColIndex = colLetters.indexOf(endCol);
//   let sum = 0;
//   for (let row = startRow - 1; row < endRow; row++) {
//     for (let col = startColIndex; col <= endColIndex; col++) {
//       const value = grid[row]?.[col]?.value;
//       sum += typeof value === 'number' ? value : 0;
//     }
//   }
//   return sum;
// };

// const evaluateFormula = (formula, grid) => {
//   try {
//     formula = String(formula).replace(/^=/, '');

//     if (formula.startsWith('SUM(')) {
//       const range = formula.match(/SUM\(([^)]+)\)/)?.[1];
//       return range ? evaluateSumRange(range, grid) : 0;
//     }

//     // Support simple arithmetic expressions with multiple * and / (e.g., D16*F16/10^7).
//     // This intentionally stays small and only supports: cell refs, numbers, + - * /.
//     const expr = formula
//       .replace(/\$/g, '')
//       .replace(/\s+/g, '')
//       .replace(/10\^7/g, '10000000');

//     const tokens = expr.match(/([A-Z]+[0-9]+|\d+(?:\.\d+)?|[+\-*/])/g);
//     if (!tokens || tokens.length === 0) {
//       return evaluateCellReference(expr, grid);
//     }

//     const toValue = (tok) => {
//       if (/^[A-Z]+[0-9]+$/.test(tok)) return evaluateCellReference(tok, grid);
//       const num = parseFloat(tok);
//       return Number.isFinite(num) ? num : 0;
//     };

//     // Handle unary minus (e.g. -A1)
//     let idx = 0;
//     let current = 0;
//     if (tokens[0] === '-') {
//       current = -toValue(tokens[1]);
//       idx = 2;
//     } else {
//       current = toValue(tokens[0]);
//       idx = 1;
//     }

//     const terms = [];
//     const addOps = [];

//     while (idx < tokens.length) {
//       const op = tokens[idx];
//       const rhsTok = tokens[idx + 1];
//       if (!op || rhsTok == null) break;

//       const rhs = toValue(rhsTok);

//       if (op === '*') {
//         current = current * rhs;
//       } else if (op === '/') {
//         current = rhs !== 0 ? current / rhs : 0;
//       } else if (op === '+' || op === '-') {
//         terms.push(current);
//         addOps.push(op);
//         current = rhs;
//       } else {
//         // Unknown token; bail out safely
//         return 0;
//       }

//       idx += 2;
//     }

//     terms.push(current);

//     let result = terms[0] ?? 0;
//     for (let i = 0; i < addOps.length; i++) {
//       const op = addOps[i];
//       const rhs = terms[i + 1] ?? 0;
//       result = op === '+' ? result + rhs : result - rhs;
//     }

//     return result;
//   } catch (error) {
//     return 0;
//   }
// };

// const recalculateAll = (grid) => {
//   let next = cloneGrid(grid);
//   // Perform 3 passes to handle dependency chains (e.g., Unit Mix input -> Revenue Formula -> Total Formula)
//   for (let i = 0; i < 3; i++) {
//     for (let row = 0; row < next.length; row++) {
//       for (let col = 0; col < next[row].length; col++) {
//         const cellData = next[row][col];
//         if (cellData.formula && !cellData.editable) {
//           cellData.value = evaluateFormula(cellData.formula, next);
//         }
//       }
//     }
//   }
//   return next;
// };

// const readUnitDesignStructure = () => {
//   try {
//     const raw = localStorage.getItem('unitDesignStructure');
//     if (!raw) return null;
//     return JSON.parse(raw);
//   } catch {
//     return null;
//   }
// };

// const normalizeUnitTypeKey = (value) => {
//   const v = String(value ?? '').trim();
//   if (!v) return '';
//   let lower = v.toLowerCase();

//   // Standardize spaces (e.g., "1BHK" -> "1 bhk")
//   lower = lower.replace(/(\d+)(bhk)/gi, '$1 $2');

//   // Handle >3BHK variations
//   if (lower === '4 bhk' || lower === '5 bhk' || lower === '6 bhk' || lower.includes('>3') || lower.includes('> 3')) {
//     return '>3 bhk';
//   }

//   if (lower.includes('1 bhk')) return '1 bhk';
//   if (lower.includes('2 bhk')) return '2 bhk';
//   if (lower.includes('3 bhk')) return '3 bhk';
//   if (lower.includes('shop')) return 'shop';
//   if (lower.includes('office')) return 'office';

//   return lower;
// };

// const AREA_RANGES = [
//   "0-50", "51-100", "101-150", "151-200", "201-250", "251-300",
//   "301-350", "351-400", "401-450", "451-500", "501-550", "551-600",
//   "601-650", "651-700", "701-750", "751-800", "801-850", "851-900",
//   "901-950", "951-1000", "1001-1050", "1051-1100", "1101-1150", "1151-1200",
//   "1201-1250", "1251-1300", "1301-1350", "1351-1400", "1401-1450", "1451-1500",
//   "1501-1550", "1551-1600", "1601-1650", "1651-1700", "1701-1750", "1751-1800",
//   "1801-1850", "1851-1900", "1901-1950", "1951-2000", "2001-2050", "2051-2100",
//   "2101-2150", "2151-2200", "2201-2250", "2251-2300", "2301-2350", "2351-2400",
//   "2401-2450", "2451-2500", "2501-2550", "2551-2600", "2601-2650", "2651-2700",
//   "2701-2750", "2751-2800", "2801-2850", "2851-2900", "2901-2950", "2951-3000",
//   "3001-3050", "3051-3100", "3101-3150", "3151-3200", "3201-3250", "3251-3300",
//   "3301-3350", "3351-3400", "3401-3450", "3451-3500", "3501-3550", "3551-3600",
//   "3601-3650", "3651-3700", "3701-3750", "3751-3800", "3801-3850", "3851-3900",
//   "3901-3950", "3951-4000", "4001-4050", "4051-4100", "4101-4150", "4151-4200",
//   "4201-4250", "4251-4300", "4301-4350", "4351-4400", "4401-4450", "4451-4500",
//   "4501-4550", "4551-4600", "4601-4650", "4651-4700", "4701-4750", "4751-4800",
//   "4801-4850", "4851-4900", "4901-4950", "4951-5000", "5001-5050", "5051-5100",
//   "5101-5150", "5151-5200", "5201-5250", "5251-5300", "5301-5350", "5351-5400",
//   "5401-5450", "5451-5500", "5501-5550", "5551-5600", "5601-5650", "5651-5700",
//   "5701-5750", "5751-5800", "5801-5850", "5851-5900", "5901-5950", "5951-6000",
//   "6001-6050", "6051-6100", "6101-6150", "6151-6200", "6201-6250", "6251-6300",
//   "6301-6350", "6351-6400", "6401-6450", "6451-6500", "6501-6550", "6551-6600",
//   "6601-6650", "6651-6700", "6701-6750", "6751-6800", "6801-6850", "6851-6900",
//   "6901-6950", "6951-7000", "7001-7050", "7051-7100", "7101-7150", "7151-7200",
//   "7201-7250", "7251-7300", "7301-7350", "7351-7400", "7401-7450", "7451-7500",
//   "7501-7550", "7551-7600", "7601-7650", "7651-7700", "7701-7750", "7751-7800",
//   "7801-7850", "7851-7900", "7901-7950", "7951-8000", "8001-8050", "8051-8100",
//   "8101-8150", "8151-8200", "8201-8250", "8251-8300", "8301-8350", "8351-8400",
//   "8401-8450", "8451-8500", "8501-8550", "8551-8600", "8601-8650", "8651-8700",
//   "8701-8750", "8751-8800", "8801-8850", "8851-8900", "8901-8950", "8951-9000",
//   "9001-9050", "9051-9100", "9101-9150", "9151-9200", "9201-9250", "9251-9300",
//   "9301-9350", "9351-9400", "9401-9450", "9451-9500", "9501-9550", "9551-9600",
//   "9601-9650", "9651-9700", "9701-9750", "9751-9800", "9801-9850", "9851-9900",
//   "9901-9950", "9951-10000"
// ];

// const getAreaRange = (avgArea) => {
//   if (avgArea == null || isNaN(avgArea)) return { low: null, high: null };

//   for (const rangeStr of AREA_RANGES) {
//     const [low, high] = rangeStr.split('-').map(Number);
//     // Use Math.floor to match integer ranges like 0-50, 51-100
//     if (avgArea >= low && avgArea <= high) {
//       return { low, high };
//     }
//   }

//   const lastRange = AREA_RANGES[AREA_RANGES.length - 1];
//   const [lastLow, lastHigh] = lastRange.split('-').map(Number);
//   if (avgArea >= lastHigh) return { low: lastLow, high: lastHigh };

//   return { low: null, high: null };
// };

// const getTicketSizeRange = (avgTicketSize) => {
//   if (avgTicketSize == null || isNaN(avgTicketSize) || avgTicketSize <= 0) {
//     return { low: null, high: null };
//   }
//   const STEP = 1000000; // 10 Lakh
//   const low = Math.floor((avgTicketSize - 1) / STEP) * STEP + 1;
//   const high = low + STEP - 1;
//   return { low, high };
// };

// const readLandDetailsForm = () => {
//   try {
//     const raw = localStorage.getItem('landDetailsForm');
//     if (!raw) return null;
//     return JSON.parse(raw);
//   } catch {
//     return null;
//   }
// };

// const RevenueProjection2 = ({ embedded = false } = {}) => {
//   const navigate = useNavigate();
//   const [grid, setGrid] = useState(() => buildDefaultGrid());
//   const [village, setVillage] = useState(() => readLandDetailsForm()?.village || '');
//   const [villageMeta, setVillageMeta] = useState({ id: null, loading: false, error: '' });
//   const [isUpdatingAnalysis, setIsUpdatingAnalysis] = useState(false);


//   useEffect(() => {
//     setGrid((prev) => recalculateAll(prev));
//   }, []);

//   // Hydrate saved simulation data (especially Rates) from localStorage if village matches
//   useEffect(() => {
//     const saved = localStorage.getItem('revenuep2_unitMix');
//     if (saved) {
//       try {
//         const payload = JSON.parse(saved);
//         if (payload.village === village) {
//           setGrid((prev) => {
//             const next = cloneGrid(prev);
//             let updated = false;

//             // Restore Rates (A16:D21 -> rows 15-20, col 3)
//             if (payload.revenuepRateRange && Array.isArray(payload.revenuepRateRange)) {
//               payload.revenuepRateRange.forEach((item, i) => {
//                 const rowIndex = 15 + i;
//                 if (next[rowIndex] && next[rowIndex][3] && item.UserRate != null) {
//                   // Only update if it's different from default to avoid unnecessary setGrid
//                   if (next[rowIndex][3].value !== item.UserRate) {
//                     next[rowIndex][3].value = item.UserRate;
//                     updated = true;
//                   }
//                 }
//               });
//             }

//             return updated ? recalculateAll(next) : prev;
//           });
//         }
//       } catch (err) {
//         console.error("Failed to restore saved simulation rates:", err);
//       }
//     }
//   }, [village]);

//   useEffect(() => {
//     const syncUnitMixFromUnitDesign = () => {
//       const unitDesign = readUnitDesignStructure();
//       if (!unitDesign) return;

//       const residentialVariations = unitDesign?.residentialData?.variations || [];
//       const commercialVariations = unitDesign?.commercialData?.variations || [];

//       // Logic to aggregate multiple variations of the same type
//       const aggregateVariations = (variations, typeKeyName) => {
//         const aggregated = {};
//         for (const v of variations) {
//           const key = normalizeUnitTypeKey(v?.[typeKeyName]);
//           if (!key) continue;

//           const area = parseFloat(v?.area) || 0;
//           const pct = parseFloat(v?.splitPct) || 0;
//           const allotted = parseFloat(v?.areaAllotted) || 0;

//           if (!aggregated[key]) {
//             aggregated[key] = { totalPct: 0, weightedAreaSum: 0, totalAllotted: 0 };
//           }
//           aggregated[key].totalPct += pct;
//           aggregated[key].weightedAreaSum += area * pct;
//           aggregated[key].totalAllotted += allotted;
//         }

//         const result = {};
//         for (const key in aggregated) {
//           const { totalPct, weightedAreaSum, totalAllotted } = aggregated[key];
//           result[key] = {
//             totalPct: totalPct,
//             avgArea: totalPct > 0 ? weightedAreaSum / totalPct : 0,
//             totalAllotted: totalAllotted
//           };
//         }
//         return result;
//       };

//       const resAgg = aggregateVariations(residentialVariations, 'bhkType');
//       const commAgg = aggregateVariations(commercialVariations, 'unitType');

//       setGrid((prev) => {
//         const next = cloneGrid(prev);
//         let updated = false;

//         const developmentCategory = String(unitDesign?.developmentCategory || '').toLowerCase();
//         const residentialTotal = parseFloat(unitDesign?.residentialData?.totalCarpet) || 0;
//         const commercialTotal = parseFloat(unitDesign?.commercialData?.totalCarpet) || 0;
//         const totalCarpetValue =
//           developmentCategory === 'commercial'
//             ? commercialTotal
//             : developmentCategory === 'mixed'
//               ? residentialTotal + commercialTotal
//               : residentialTotal;

//         if (next?.[0]?.[1] && next[0][1].value !== totalCarpetValue) {
//           next[0][1].value = Number.isFinite(totalCarpetValue) ? totalCarpetValue : '';
//           updated = true;
//         }

//         // A5:A10 (rows 4-9), B5:B10 (col 1), C5:C10 (col 2)
//         for (let rowIndex = 4; rowIndex <= 9; rowIndex++) {
//           const unitType = next?.[rowIndex]?.[0]?.value;
//           const key = normalizeUnitTypeKey(unitType);

//           const agg = rowIndex <= 7 ? resAgg[key] : commAgg[key];

//           // Set percentage (B column)
//           const pctDecimal = agg && Number.isFinite(agg.totalPct) ? agg.totalPct / 100 : '';
//           if (next?.[rowIndex]?.[1] && next[rowIndex][1].value !== pctDecimal) {
//             next[rowIndex][1].value = pctDecimal;
//             updated = true;
//           }

//           // Set area (C column) - use raw avgArea instead of adjusted area
//           const unitAreaValue = agg && Number.isFinite(agg.avgArea) ? agg.avgArea : '';
//           if (next?.[rowIndex]?.[2] && next[rowIndex][2].value !== unitAreaValue) {
//             next[rowIndex][2].value = unitAreaValue;
//             updated = true;
//           }

//           // Special logic for all types: Fetch Column F (Carpet Area) from Area Allotted
//           if (rowIndex >= 4 && rowIndex <= 9) {
//             const allottedVal = agg && Number.isFinite(agg.totalAllotted) ? agg.totalAllotted : '';
//             if (next?.[rowIndex]?.[5] && next[rowIndex][5].value !== allottedVal) {
//               next[rowIndex][5].value = allottedVal;
//               // Clear formula to prevent it from being overwritten by recalculateAll
//               next[rowIndex][5].formula = null;
//               updated = true;
//             }
//           }
//         }

//         return updated ? recalculateAll(next) : prev;
//       });
//     };

//     syncUnitMixFromUnitDesign();
//     window.addEventListener('unitDesignUpdated', syncUnitMixFromUnitDesign);
//     window.addEventListener('storage', syncUnitMixFromUnitDesign);
//     return () => {
//       window.removeEventListener('unitDesignUpdated', syncUnitMixFromUnitDesign);
//       window.removeEventListener('storage', syncUnitMixFromUnitDesign);
//     };
//   }, []);

//   useEffect(() => {
//     const sync = () => setVillage(readLandDetailsForm()?.village || '');
//     sync();
//     window.addEventListener('landDetailsUpdated', sync);
//     window.addEventListener('storage', sync);
//     return () => {
//       window.removeEventListener('landDetailsUpdated', sync);
//       window.removeEventListener('storage', sync);
//     };
//   }, []);

//   useEffect(() => {
//     const syncVillageToMarketPayload = () => {
//       const existingRaw = localStorage.getItem('Market Analysis Payload');
//       let existing = {};
//       try {
//         existing = existingRaw ? JSON.parse(existingRaw) : {};
//       } catch (e) {
//         console.error("Failed to parse existing Market Analysis Payload", e);
//       }

//       // Check if update is needed to avoid infinite loops or unnecessary writes
//       if (existing.villageName !== village || existing.villageId !== villageMeta.id) {
//         const payload = {
//           ...existing,
//           villageName: village,
//           villageId: villageMeta.id
//         };
//         localStorage.setItem('Market Analysis Payload', JSON.stringify(payload));
//       }
//     };

//     syncVillageToMarketPayload();
//   }, [village, villageMeta.id]);

//   // Fetch village ID from backend whenever village name changes
//   useEffect(() => {
//     const name = (village || '').trim();
//     if (!name) {
//       setVillageMeta({ id: null, loading: false, error: '' });
//       return;
//     }

//     let aborted = false;
//     const fetchVillageId = async () => {
//       try {
//         setVillageMeta(prev => ({ ...prev, loading: true, error: '' }));
//         const params = new URLSearchParams({ name });
//         const resp = await fetch(`/data_db/get_village_id_by_name/?${params.toString()}`, {
//           method: 'GET',
//           headers: {
//             'Accept': 'application/json',
//           },
//         });

//         if (aborted) return;

//         if (!resp.ok) {
//           const data = await resp.json().catch(() => null);
//           const msg = data?.error || `Lookup failed with status ${resp.status}`;
//           setVillageMeta({ id: null, loading: false, error: msg });
//           return;
//         }

//         const data = await resp.json();
//         if (!aborted && data?.ok && data?.village?.id != null) {
//           setVillageMeta({ id: data.village.id, loading: false, error: '' });
//         } else if (!aborted) {
//           setVillageMeta({ id: null, loading: false, error: 'Village not found' });
//         }
//       } catch (err) {
//         if (!aborted) {
//           console.error('Failed to fetch village id:', err);
//           setVillageMeta({ id: null, loading: false, error: 'Unable to fetch village id' });
//         }
//       }
//     };

//     fetchVillageId();

//     return () => {
//       aborted = true;
//     };
//   }, [village]);


//   const updateMarketAnalysis = useCallback(async () => {
//     const villageId = villageMeta.id;
//     if (!villageId || villageMeta.loading) {
//       alert("Please select a valid village and wait for it to load.");
//       return;
//     }

//     setIsUpdatingAnalysis(true);
//     let currentLocalGrid = grid;

//     const hasPrefix = (str) => /^[<≤]+/.test(String(str || '').trim());
//     const hasGreaterThanPrefix = (str) => /^[>≥]+/.test(String(str || '').trim()) || String(str || '').toLowerCase().includes('4') || String(str || '').toLowerCase().includes('5');
//     const extractNumber = (str) => {
//       const match = String(str || '').match(/\d+/);
//       return match ? parseInt(match[0], 10) : null;
//     };

//     try {
//       const params = new URLSearchParams({ igr_village_id: String(villageId) });

//       // 1. fetchBhkMonthlyAverage (GET)
//       const bhkMonthlyAvgResp = await fetch(`/new_rate_simulator/simulator/bhk-monthly-average/?${params.toString()}`);
//       if (bhkMonthlyAvgResp.ok) {
//         const data = await bhkMonthlyAvgResp.json();
//         if (data?.success && Array.isArray(data?.data)) {
//           const bhkRowMap = { '1 BHK': 4, '2 BHK': 5, '3 BHK': 6, '>3BHK': 7, '>3 BHK': 7, 'Shop': 8, 'office': 9, 'Office': 9 };
//           const next = cloneGrid(currentLocalGrid);
//           let updated = false;
//           const updatedRows = new Set();
//           const sortedData = [...data.data].sort((a, b) => (hasPrefix(a?.bhk) && !hasPrefix(b?.bhk) ? 1 : !hasPrefix(a?.bhk) && hasPrefix(b?.bhk) ? -1 : 0));

//           sortedData.forEach((bhkData) => {
//             const bhkName = String(bhkData?.bhk || '').trim();
//             const avgTransactions = bhkData?.summary?.average_transactions_per_month;
//             if (!bhkName || avgTransactions == null || avgTransactions === 0) return;
//             const bhkNormalized = normalizeUnitTypeKey(bhkName);
//             let rowIndex = null;
//             for (const [key, idx] of Object.entries(bhkRowMap)) { if (normalizeUnitTypeKey(key) === bhkNormalized) { rowIndex = idx; break; } }
//             if (rowIndex == null) {
//               const apiNum = extractNumber(bhkNormalized);
//               for (let i = 4; i <= 9; i++) {
//                 const cellVal = String(next[i]?.[0]?.value || '').trim();
//                 const cellNorm = normalizeUnitTypeKey(cellVal);
//                 if (cellNorm === bhkNormalized || cellNorm.includes(bhkNormalized) || bhkNormalized.includes(cellNorm)) { rowIndex = i; break; }
//                 if (apiNum !== null && i <= 7) {
//                   const cellNum = extractNumber(cellNorm);
//                   if (cellNum !== null && apiNum === cellNum && /bhk/i.test(bhkNormalized) && /bhk/i.test(cellNorm)) { rowIndex = i; break; }
//                 }
//               }
//             }
//             if (rowIndex != null && next[rowIndex]?.[6] && (!updatedRows.has(rowIndex) || !hasPrefix(bhkName))) {
//               const cell = next[rowIndex][6];
//               if (cell.type === 'number' && !cell.formula) {
//                 cell.value = Number(avgTransactions);
//                 updated = true;
//                 updatedRows.add(rowIndex);
//               }
//             }
//           });
//           if (updated) currentLocalGrid = recalculateAll(next);
//         }
//       }

//       // 2. fetchTransactionCounts (POST)
//       const ticketSizeRange = [];
//       for (let i = 15; i <= 20; i++) {
//         const bhkType = String(currentLocalGrid?.[i]?.[0]?.value || '').trim();
//         const avgTicketSize = currentLocalGrid?.[i]?.[4]?.value;
//         if (bhkType && avgTicketSize != null && Number.isFinite(avgTicketSize)) {
//           const { low, high } = getTicketSizeRange(avgTicketSize);
//           ticketSizeRange.push({
//             BHK_Type: bhkType,
//             AVG_TICKET_SIZE: avgTicketSize,
//             Lowrange: low,
//             Highrange: high,
//           });
//         }
//       }
//       if (ticketSizeRange.length > 0) {
//         const transCountResp = await fetch(`/new_rate_simulator/simulator/transaction-counts-detailed?${params.toString()}`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
//           body: JSON.stringify(ticketSizeRange),
//         });
//         if (transCountResp.ok) {
//           const data = await transCountResp.json();
//           if (data?.success && Array.isArray(data?.data)) {
//             const next = cloneGrid(currentLocalGrid);
//             let updated = false;
//             data.data.forEach((resultItem) => {
//               const apiBhkType = String(resultItem?.BHK_Type || '').trim();
//               const transactionCount = resultItem?.transaction_count;
//               if (!apiBhkType || transactionCount == null) return;
//               const apiBhkNormalized = normalizeUnitTypeKey(apiBhkType);
//               const apiHasGreaterThan = hasGreaterThanPrefix(apiBhkType);
//               let matchedRow = null;
//               for (let i = 15; i <= 20; i++) {
//                 const cellVal = String(next[i]?.[0]?.value || '').trim();
//                 const cellNorm = normalizeUnitTypeKey(cellVal);
//                 const cellHasGT = hasGreaterThanPrefix(cellVal);
//                 if (cellNorm === apiBhkNormalized || (apiHasGreaterThan && cellHasGT && (cellNorm.includes(apiBhkNormalized) || apiBhkNormalized.includes(cellNorm)))) { matchedRow = i; break; }
//               }
//               if (matchedRow !== null && next[matchedRow]?.[8] && next[matchedRow][8].type === 'number' && !next[matchedRow][8].formula) {
//                 const count = Number(transactionCount);
//                 next[matchedRow][8].value = count > 0 ? count / 36 : 0;
//                 updated = true;
//               }
//             });
//             if (updated) currentLocalGrid = recalculateAll(next);
//           }
//         }
//       }

//       // 3. fetchBhkMonthlyAverageByArea (POST)
//       const areaPayload = [];
//       for (let i = 4; i <= 9; i++) {
//         const bhkType = String(currentLocalGrid?.[i]?.[0]?.value ?? '').trim();
//         const avgUnitArea = parseFloat(currentLocalGrid?.[i]?.[2]?.value);
//         if (bhkType && !isNaN(avgUnitArea)) {
//           const { low, high } = getAreaRange(avgUnitArea);
//           areaPayload.push({ BHK_type: bhkType, Avg_Unit_Area: avgUnitArea, Lowrange: low, Highrange: high });
//         }
//       }
//       if (areaPayload.length > 0) {
//         const areaResp = await fetch(`/new_rate_simulator/simulator/bhk-monthly-average-by-area?${params.toString()}`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
//           body: JSON.stringify(areaPayload),
//         });
//         if (areaResp.ok) {
//           const data = await areaResp.json();
//           if (data?.success && Array.isArray(data?.data)) {
//             const next = cloneGrid(currentLocalGrid);
//             let updated = false;
//             data.data.forEach((item) => {
//               const apiBhkType = String(item?.BHK_type || '').trim();
//               const avgPerMonth = item?.average_transactions_per_month;
//               if (!apiBhkType || avgPerMonth == null) return;
//               const apiBhkNormalized = normalizeUnitTypeKey(apiBhkType);
//               const apiHasGreaterThan = hasGreaterThanPrefix(apiBhkType);

//               for (let i = 4; i <= 9; i++) {
//                 const cellVal = String(next?.[i]?.[0]?.value || '').trim();
//                 const cellNorm = normalizeUnitTypeKey(cellVal);
//                 const cellHasGT = hasGreaterThanPrefix(cellVal);

//                 if (cellNorm === apiBhkNormalized || (apiHasGreaterThan && cellHasGT && (cellNorm.includes(apiBhkNormalized) || apiBhkNormalized.includes(cellNorm)))) {
//                   if (next[i]?.[7] && next[i][7].type === 'number' && !next[i][7].formula) {
//                     next[i][7].value = Number(avgPerMonth);
//                     updated = true;
//                   }
//                   break;
//                 }
//               }
//             });
//             if (updated) currentLocalGrid = recalculateAll(next);
//           }
//         }
//       }

//       // 4. fetchAverageRate (POST)
//       const ratePayload = [];
//       for (let i = 15; i <= 20; i++) {
//         const bhkType = String(currentLocalGrid?.[i]?.[0]?.value ?? '').trim();
//         const userRate = parseFloat(currentLocalGrid?.[i]?.[3]?.value);
//         if (bhkType && !isNaN(userRate)) {
//           ratePayload.push({ BHK_type: bhkType, UserRate: userRate, Lowrange: userRate * 0.9, Highrange: userRate * 1.1 });
//         }
//       }
//       if (ratePayload.length > 0) {
//         const rateResp = await fetch(`/new_rate_simulator/simulator/average-rate/?${params.toString()}`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
//           body: JSON.stringify(ratePayload),
//         });
//         if (rateResp.ok) {
//           const data = await rateResp.json();
//           if (data?.success && Array.isArray(data?.data)) {
//             const next = cloneGrid(currentLocalGrid);
//             let updated = false;
//             data.data.forEach((item) => {
//               const apiBhkType = String(item?.BHK_type || '').trim();
//               const avgRate = item?.average_rate_per_sqft_on_sa;
//               if (!apiBhkType || avgRate == null) return;
//               const apiBhkNormalized = normalizeUnitTypeKey(apiBhkType);
//               let matchedRow = null;
//               for (let i = 15; i <= 20; i++) {
//                 const cellVal = String(next?.[i]?.[0]?.value || '').trim();
//                 if (cellVal.toLowerCase() === apiBhkType.toLowerCase() || normalizeUnitTypeKey(cellVal) === apiBhkNormalized) { matchedRow = i; break; }
//               }
//               if (matchedRow !== null && next[matchedRow]?.[7] && next[matchedRow][7].type === 'number') {
//                 next[matchedRow][7].formula = null;
//                 next[matchedRow][7].value = Number(avgRate);
//                 updated = true;
//               }
//             });
//             if (updated) currentLocalGrid = recalculateAll(next);
//           }
//         }
//       }

//       // 5. fetchBhkMonthlyAverageByRate (POST)
//       if (ratePayload.length > 0) {
//         const rateAvgResp = await fetch(`/new_rate_simulator/simulator/bhk-monthly-average-by-rate?${params.toString()}`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
//           body: JSON.stringify(ratePayload),
//         });
//         if (rateAvgResp.ok) {
//           const data = await rateAvgResp.json();
//           if (data?.success && Array.isArray(data?.data)) {
//             const next = cloneGrid(currentLocalGrid);
//             let updated = false;
//             data.data.forEach((item) => {
//               const apiBhkType = String(item?.BHK_type || '').trim();
//               const avgPerMonth = item?.average_transactions_per_month;
//               if (!apiBhkType || avgPerMonth == null) return;
//               const apiBhkNormalized = normalizeUnitTypeKey(apiBhkType);
//               let matchedRow = null;
//               for (let i = 15; i <= 20; i++) {
//                 const cellVal = String(next?.[i]?.[0]?.value || '').trim();
//                 if (cellVal.toLowerCase() === apiBhkType.toLowerCase() || normalizeUnitTypeKey(cellVal) === apiBhkNormalized) { matchedRow = i; break; }
//               }
//               if (matchedRow !== null && next[matchedRow]?.[9] && next[matchedRow][9].type === 'number') {
//                 next[matchedRow][9].formula = null;
//                 next[matchedRow][9].value = Number(avgPerMonth);
//                 updated = true;
//               }
//             });
//             if (updated) currentLocalGrid = recalculateAll(next);
//           }
//         }
//       }

//       setGrid(currentLocalGrid);
//     } catch (err) {
//       console.error('Failed to update analysis data:', err);
//       alert("Error updating analysis data. Check console for details.");
//     } finally {
//       setIsUpdatingAnalysis(false);
//     }
//   }, [villageMeta.id, villageMeta.loading, grid]);


//   const handleCellChange = useCallback((rowIndex, colIndex, raw) => {
//     setGrid((prev) => {
//       const next = cloneGrid(prev);
//       const cell = next[rowIndex][colIndex];
//       if (cell.type === 'percentage') {
//         cell.value = parseFloat(raw) / 100;
//       } else {
//         cell.value = parseFloat(raw);
//       }
//       return recalculateAll(next);
//     });
//   }, []);

//   const resetToDefaults = useCallback(() => {
//     setGrid(recalculateAll(buildDefaultGrid()));
//   }, []);

//   const saveUnitMixToLocal = useCallback(() => {
//     const revenueTableStartRow = grid.findIndex((row) =>
//       row.some((cell) => String(cell?.value ?? '') === 'Revenue Table')
//     );
//     const unitMixGrid = revenueTableStartRow >= 0 ? grid.slice(0, revenueTableStartRow) : grid;

//     const toNumber = (val) => {
//       if (typeof val === 'number' && Number.isFinite(val)) return val;
//       const parsed = parseFloat(val);
//       return Number.isFinite(parsed) ? parsed : null;
//     };

//     const TicketSizeRange = Array.from({ length: 6 }, (_, i) => {
//       const rowIndex = 15 + i; // 16..21 (1-indexed)
//       const bhkType = String(grid?.[rowIndex]?.[0]?.value ?? '').trim(); // A16..A21
//       const avgTicketSize = toNumber(grid?.[rowIndex]?.[4]?.value); // E16..E21
//       const { low, high } = getTicketSizeRange(avgTicketSize);

//       return {
//         BHK_Type: bhkType,
//         AVG_TICKET_SIZE: avgTicketSize,
//         Lowrange: low,
//         Highrange: high,
//       };
//     });

//     // Revenuep Unit Range - from A5 to A10 (rows 4-9, 0-indexed)
//     const revenuepUnitRange = Array.from({ length: 6 }, (_, i) => {
//       const rowIndex = 4 + i; // 4-9 (0-indexed) = A5-A10 (1-indexed)
//       const bhkType = String(grid?.[rowIndex]?.[0]?.value ?? '').trim(); // A column (index 0)
//       const avgUnitArea = toNumber(grid?.[rowIndex]?.[2]?.value); // C column (index 2) - Avg Unit Area
//       const { low: lowrange, high: highrange } = getAreaRange(avgUnitArea);

//       return {
//         BHK_type: bhkType,
//         Avg_Unit_Area: avgUnitArea,
//         Lowrange: lowrange,
//         Highrange: highrange,
//       };
//     });

//     // Revenuep Rate Range - from A16 to A21 (rows 15-20, 0-indexed)
//     const revenuepRateRange = Array.from({ length: 6 }, (_, i) => {
//       const rowIndex = 15 + i; // 15-20 (0-indexed) = A16-A21 (1-indexed)
//       const bhkType = String(grid?.[rowIndex]?.[0]?.value ?? '').trim(); // A column (index 0) - BHK_type
//       const userRate = toNumber(grid?.[rowIndex]?.[3]?.value); // D column (index 3) - Rate (₹/sqft) (User input)
//       const lowrange = userRate == null ? null : userRate * 0.9; // -10%
//       const highrange = userRate == null ? null : userRate * 1.1; // +10%

//       return {
//         BHK_type: bhkType,
//         UserRate: userRate,
//         Lowrange: lowrange,
//         Highrange: highrange,
//       };
//     });

//     const payload = {
//       savedAt: new Date().toISOString(),
//       village: readLandDetailsForm()?.village || '',
//       unitMixGrid,
//       TicketSizeRange,
//       revenuepUnitRange,
//       revenuepRateRange,
//     };

//     localStorage.setItem('revenuep2_unitMix', JSON.stringify(payload));
//     alert('UNIT MIX Section saved locally.');
//   }, [grid]);

//   const css = useMemo(
//     () => `
//       .rp2-body { 
//         min-height: 100vh; 
//         background-color: #f3f5f9; 
//         font-family: 'Inter', sans-serif;
//         padding: 20px;
//       }
//       .rp2-container { 
//         max-width: 100%; 
//         width: 100%;
//         margin: 0 auto; 
//         background: white; 
//         padding: 30px; 
//         border-radius: 16px; 
//         box-shadow: 0 4px 20px rgba(0,0,0,0.08);
//         border: 1px solid rgba(0,0,0,0.05);
//       }

//       /* When embedded inside /new_rate_simulator, match surrounding card width */
//       .rp2-container.rp2-embedded {
//         max-width: 100% !important;
//         width: 100% !important;
//         margin: 0 !important;
//       }

//       @media (min-width: 1600px) {
//         .rp2-container {
//           max-width: 1600px;
//         }
//       }
//       .section-title { 
//         background: linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(74, 144, 226, 0.05) 100%);
//         padding: 15px 20px; 
//         margin: 25px 0 15px 0; 
//         border-left: 4px solid #4a90e2; 
//         font-weight: bold;
//         border-radius: 8px;
//         color: #1a1a1a;
//         font-size: 1.1rem;
//         box-shadow: 0 2px 8px rgba(0,0,0,0.04);
//       }
//       .excel-grid { 
//         display: grid; 
//         gap: 1px; 
//         background-color: transparent; 
//         border: none;
//         width: fit-content;
//         max-width: 100%;
//         overflow: hidden;
//       }

//       /* Optimized column widths to fit all 11 columns (A-K) exactly within container */
//       /* Optimized column widths for Unit Mix Table (8 columns: A,B,C,F,G,H,I,J) */
//       .excel-grid-first {
//         grid-template-columns: 
//           90px  /* A */
//           100px /* B */
//           100px /* C */
//           100px /* F */
//           140px /* G */
//           140px /* H */
//           140px /* I */
//           120px /* J */;
//         width: fit-content;
//         max-width: 100%;
//         background-color: #ffffff;
//         border-radius: 6px;
//         border: none;
//         box-shadow: none;
//       }

//       /* Optimized column widths for Revenue Table (10 columns: A-J) */
//       .excel-grid-second {
//         grid-template-columns: 
//           90px  /* A */
//           100px /* B */
//           100px /* C */
//           80px  /* D */
//           100px /* E */
//           100px /* F */
//           140px /* G */
//           140px /* H */
//           140px /* I */
//           120px /* J */;
//         width: fit-content;
//         max-width: 100%;
//         background-color: #ffffff;
//         border-radius: 6px;
//         border: 2px solid #495057;
//         box-shadow: 0 2px 8px rgba(0,0,0,0.1);
//       }

//       /* Responsive adjustments for smaller screens */
//       @media (min-width: 1400px) {
//         .excel-grid-first {
//           grid-template-columns: 100px 110px 110px 110px 150px 150px 150px 130px;
//         }
//         .excel-grid-second {
//           grid-template-columns: 100px 110px 110px 90px 110px 110px 150px 150px 150px 130px;
//         }
//       }

//       @media (max-width: 1399px) and (min-width: 1200px) {
//         .excel-grid-first {
//           grid-template-columns: 85px 95px 95px 95px 130px 130px 130px 115px;
//         }
//         .excel-grid-second {
//           grid-template-columns: 85px 95px 95px 75px 95px 95px 130px 130px 130px 115px;
//         }
//       }

//       @media (max-width: 1199px) {
//         .excel-grid-first {
//           grid-template-columns: 70px 80px 80px 80px 110px 110px 110px 100px;
//         }
//         .excel-grid-second {
//           grid-template-columns: 70px 80px 80px 65px 80px 80px 110px 110px 110px 100px;
//         }
//       }
//       .cell { 
//         background-color: white; 
//         padding: 8px 6px; 
//         min-height: 45px; 
//         display: flex; 
//         align-items: center; 
//         font-size: 12px; 
//         overflow: hidden;
//         word-wrap: break-word;
//         transition: background-color 0.2s ease, transform 0.1s ease;
//       }
//       .cell:hover {
//         background-color: #f8f9fa;
//         transform: scale(1.01);
//         z-index: 1;
//         box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//       }
//       .header { 
//         background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
//         font-weight: bold; 
//         text-align: center;
//         color: #2c3e50;
//         border-bottom: 2px solid #dee2e6;
//       }
//       .input-cell { 
//         width: 100%; 
//         border: 2px solid #e0e0e0; 
//         padding: 5px 6px; 
//         font-size: 12px; 
//         border-radius: 6px;
//         transition: all 0.2s ease;
//         background-color: #fff;
//         min-width: 0;
//       }
//       .input-cell:focus {
//         outline: none;
//         border-color: #4a90e2;
//         box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
//         background-color: #fff;
//       }
//       .formula-cell { 
//         background: linear-gradient(135deg, #d8e8d8 0%, #c8dcc8 100%) !important;
//         font-weight: 500;
//       }
//       .formula-cell:hover {
//         background: linear-gradient(135deg, #c8dcc8 0%, #b8d0b8 100%) !important;
//       }
//       .percentage-wrapper { 
//         position: relative; 
//         width: 100%; 
//       }
//       .percentage-wrapper::after { 
//         content: '%'; 
//         position: absolute; 
//         right: 12px; 
//         top: 50%; 
//         transform: translateY(-50%); 
//         color: #666; 
//         font-size: 13px;
//         font-weight: 600;
//         pointer-events: none;
//       }
//       .cell-id { 
//         display: block; 
//         font-size: 9px; 
//         color: #6c757d; 
//         line-height: 1; 
//         margin-bottom: 4px;
//         font-weight: 600;
//         letter-spacing: 0.5px;
//       }

//       .cell-id {
//         display: none;
//       }
//       .cell-content { 
//         width: 100%; 
//       }
//       .cell-container { 
//         position: relative; 
//         width: 100%; 
//       }
//       .total-row { 
//         border-top: 3px solid #495057;
//         border-bottom: 2px solid #495057;
//         font-weight: bold;
//         background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
//       }
//       .total-row .cell {
//         background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
//       }
//       .empty-cell { 
//         background-color: #f8f9fa; 
//       }

//       .cell-hidden {
//         visibility: hidden;
//         pointer-events: none;
//         background: transparent !important;
//         box-shadow: none !important;
//         transform: none !important;
//       }

//       .cell-gap {
//         min-height: 14px !important;
//         padding: 0 !important;
//         background: transparent !important;
//         box-shadow: none !important;
//       }

//       .unitmix-subtable-cell {
//         border: 1px solid #c0c6cc;
//       }
//       .unitmix-edge-top {
//         border-top: 2px solid #495057;
//       }
//       .unitmix-edge-bottom {
//         border-bottom: 2px solid #495057;
//       }
//       .unitmix-edge-left {
//         border-left: 2px solid #495057;
//       }
//       .unitmix-edge-right {
//         border-right: 2px solid #495057;
//       }

//       .a1-border-cell {
//         border-top: 2px solid #495057 !important;
//         border-bottom: 2px solid #495057 !important;
//         border-left: 2px solid #495057 !important;
//         border-right: 1px solid #495057 !important;
//         border-top-left-radius: 8px;
//         border-bottom-left-radius: 8px;
//       }

//       .b1-border-cell {
//         border-top: 2px solid #495057 !important;
//         border-bottom: 2px solid #495057 !important;
//         border-right: 2px solid #495057 !important;
//         border-left: 0 !important;
//         border-top-right-radius: 8px;
//         border-bottom-right-radius: 8px;
//       }

//       /* Interactive styles */
//       .interactive-card {
//         transition: all 0.3s ease;
//         position: relative;
//         overflow: hidden;
//         border: 1px solid rgba(0,0,0,0.05) !important;
//       }

//       .interactive-card:hover {
//         transform: translateY(-2px);
//         box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
//       }

//       .interactive-btn {
//         transition: all 0.2s ease;
//         transform: translateY(0);
//       }

//       .interactive-btn:hover {
//         transform: translateY(-2px);
//         box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
//       }

//       .interactive-btn:active {
//         transform: translateY(0);
//       }

//       @keyframes fadeInUp {
//         from {
//           opacity: 0;
//           transform: translateY(20px);
//         }
//         to {
//           opacity: 1;
//           transform: translateY(0);
//         }
//       }

//       .fade-in-up {
//         animation: fadeInUp 0.5s ease forwards;
//       }

//       .ls-1 { 
//         letter-spacing: 1px; 
//       }
//       .card-hover-lift { 
//         transition: transform 0.2s ease, box-shadow 0.2s ease; 
//       }
//       .card-hover-lift:hover { 
//         transform: translateY(-5px); 
//         box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; 
//       }
//     `,
//     []
//   );

//   const formatCellContent = useCallback((rowIndex, colIndex, cellData) => {
//     if (cellData.editable) {
//       if (cellData.type === 'percentage') {
//         const percentValue = (cellData.value || 0) * 100;
//         return (
//           <div className="percentage-wrapper">
//             <input
//               type="number"
//               className="input-cell"
//               value={Number.isFinite(percentValue) ? percentValue : ''}
//               step="0.1"
//               onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
//             />
//           </div>
//         );
//       }

//       return (
//         <input
//           type="number"
//           className="input-cell"
//           value={Number.isFinite(cellData.value) ? cellData.value : ''}
//           step="any"
//           onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
//         />
//       );
//     }

//     if (cellData.type === 'percentage' && cellData.value !== '') {
//       return `${(cellData.value * 100).toFixed(1)}%`;
//     }

//     if (cellData.type === 'number' && cellData.value !== '') {
//       if (colIndex === 6 && rowIndex >= 15 && rowIndex <= 20) {
//         return `₹${Number(cellData.value).toFixed(2)} Cr`;
//       }
//       if (colIndex === 1 && rowIndex === 0) {
//         return Number(cellData.value).toLocaleString();
//       }
//       if (colIndex === 4 && rowIndex >= 15 && rowIndex <= 20) {
//         return `₹${Number(cellData.value).toLocaleString()}`;
//       }
//       if (colIndex === 3 && rowIndex >= 15 && rowIndex <= 20) {
//         return `₹${Number(cellData.value).toLocaleString()}`;
//       }
//       if (colIndex === 7 && rowIndex >= 15 && rowIndex <= 20) {
//         return `₹${Number(cellData.value).toLocaleString()}`;
//       }
//       return Number(cellData.value).toLocaleString();
//     }

//     if (typeof cellData.value === 'string' && cellData.value.includes('<br>')) {
//       return <span dangerouslySetInnerHTML={{ __html: cellData.value }} />;
//     }

//     return cellData.value;
//   }, [handleCellChange]);

//   return (
//     <div className="rp2-body">
//       <style>{css}</style>

//       <main className={`rp2-container fade-in-up ${embedded ? 'rp2-embedded' : ''}`}>
//         {/* Header Section (hidden when embedded in /new_rate_simulator) */}
//         {!embedded && (
//           <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 pb-3 border-bottom border-2" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
//             <div className="mb-3 mb-md-0">
//               <div className="d-flex align-items-center mb-2">
//                 <button
//                   className="btn btn-outline-secondary btn-sm me-3 shadow-sm rounded-pill px-3 interactive-btn"
//                   onClick={() => navigate(-1)}
//                 >
//                   <i className="fas fa-arrow-left me-1"></i> Back
//                 </button>
//                 <h1 className="display-6 fw-bold text-dark mb-0">
//                   <i className="fas fa-chart-line text-primary me-3"></i>Revenue Projection 2.0
//                 </h1>
//               </div>
//               <p className="text-secondary mb-0 ms-1 fw-medium text-dark">Interactive unit mix analysis and revenue calculation model.</p>
//             </div>
//           </div>
//         )}

//         {/* Instructions Card (hidden when embedded in /new_rate_simulator) */}
//         {!embedded && (
//           <div className="card border-0 shadow-sm rounded-4 mb-4 interactive-card" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
//             <div className="card-body p-4">
//               <div className="d-flex align-items-start">
//                 <div className="icon-shape bg-warning bg-opacity-20 text-warning rounded-circle p-2 me-3">
//                   <i className="fas fa-info-circle"></i>
//                 </div>
//                 <div className="flex-grow-1">
//                   <h6 className="fw-bold text-dark mb-2"><i className="fas fa-lightbulb me-2"></i>Instructions</h6>
//                   <div className="row g-2 text-dark small">
//                     <div className="col-md-6">
//                       <div><i className="fas fa-check-circle me-2 text-success"></i>Cells with formulas are highlighted in light green</div>
//                       <div><i className="fas fa-check-circle me-2 text-success"></i>Percentage inputs automatically handle % suffix (enter 15 for 15%)</div>
//                     </div>
//                     <div className="col-md-6">
//                       <div><i className="fas fa-check-circle me-2 text-success"></i>All calculations update automatically when you change any input</div>
//                       <div><i className="fas fa-check-circle me-2 text-success"></i>Gray cells are calculated values (read-only)</div>
//                       <div><i className="fas fa-check-circle me-2 text-success"></i>White cells with borders are user inputs</div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Village Info Card */}
//         {village ? (
//           <div className="card border-0 shadow-sm rounded-4 mb-4 interactive-card fade-in-up">
//             <div className="card-body p-3">
//               <div className="d-flex flex-wrap align-items-center gap-3">
//                 <div className="d-flex align-items-center">
//                   <div className="icon-shape bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-2">
//                     {/* <i className="fas fa-map-marker-alt"></i> */}

//                     <FaMapMarkerAlt />
//                   </div>

//                   <div>
//                     <span className="fw-semibold text-dark d-block small">Village</span>
//                     <span className="text-dark fw-bold">{village}</span>
//                   </div>
//                 </div>
//                 {villageMeta.loading && (
//                   <div className="d-flex align-items-center">
//                     <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
//                       <span className="visually-hidden">Loading...</span>
//                     </div>
//                     <span className="text-secondary small">Fetching ID...</span>
//                   </div>
//                 )}
//                 {villageMeta.id != null && !villageMeta.loading && (
//                   <div className="badge bg-white text-primary shadow-sm px-3 py-2 border border-primary rounded-pill">
//                     <i className="far fa-id-badge me-2"></i>ID: <span className="fw-bold">{villageMeta.id}</span>
//                   </div>
//                 )}
//                 {villageMeta.error && !villageMeta.loading && (
//                   <span className="badge bg-danger-subtle text-danger border border-danger rounded-pill px-3 py-2">
//                     <i className="fas fa-exclamation-triangle me-2"></i>{villageMeta.error}
//                   </span>
//                 )}
//               </div>
//             </div>
//           </div>
//         ) : null}

//         {/* First Table - Unit Mix Section (Rows 1-13) */}
//         <div className="section-title fade-in-up">
//           <i className="fas fa-table me-2"></i>UNIT MIX Section
//         </div>
//         <p className="small text-muted">Sigma value recommendations are calculated using historical data from the years 2022, 2023, and 2024.</p>

//         <div className="card border-0 shadow-lg rounded-4 mb-5 overflow-hidden interactive-card fade-in-up" style={{ background: 'white' }}>
//           <div className="card-header bg-gradient text-white p-3" style={{ background: 'linear-gradient(135deg, #4a90e2 0%, #5ba0f2 100%)' }}>
//             <h6 className="fw-bold mb-0"><i className="fas fa-calculator me-2"></i>Unit Mix Calculation Table</h6>
//           </div>
//           <div className="card-body p-3" style={{ overflowX: 'hidden', width: '100%', display: 'flex', justifyContent: 'center' }}>
//             <div className="excel-grid excel-grid-first" id="excelGridFirst" style={{ width: 'fit-content', maxWidth: '100%' }}>
//               {grid.slice(0, 13).map((row, rowIndex) =>
//                 row.map((cellData, colIndex) => {
//                   if (rowIndex >= 11) return null; // Hide A12:J13 (cosmetic only)
//                   if (colIndex === 10) return null; // Hide K1:K13 (cosmetic only)
//                   if (colIndex === 3 || colIndex === 4) return null; // Hide D and E (they are empty in Unit Mix table)
//                   const cellId = `${colLetters[colIndex]}${rowIndex + 1}`;

//                   const classList = ['cell'];
//                   if (rowIndex < 4) classList.push('header');
//                   if (rowIndex === 10) classList.push('total-row');
//                   if (cellData.formula) classList.push('formula-cell');
//                   if (cellData.value === '' && !cellData.formula) classList.push('empty-cell');

//                   // Cosmetic-only visibility rules:
//                   // - Hide C1:J1 (row 1, cols C-J)
//                   // - Hide row 2 (A2:K2) and use it as a small spacer gap
//                   const hideRow2 = rowIndex === 1;
//                   const hideC1ToJ1 = rowIndex === 0 && colIndex >= 2 && colIndex <= 9;
//                   if (hideC1ToJ1) classList.push('cell-hidden');
//                   if (hideRow2) classList.push('cell-gap', 'cell-hidden');

//                   // Border only around A1:B1
//                   if (rowIndex === 0 && colIndex === 0) classList.push('a1-border-cell');
//                   if (rowIndex === 0 && colIndex === 1) classList.push('b1-border-cell');

//                   // Cosmetic-only subtable styling for A3:J11 (rows 3-11, cols A-J)
//                   const inUnitMixSubtable = rowIndex >= 2 && rowIndex <= 10 && colIndex >= 0 && colIndex <= 9;
//                   if (inUnitMixSubtable) {
//                     classList.push('unitmix-subtable-cell');
//                     if (rowIndex === 2) classList.push('unitmix-edge-top');
//                     if (rowIndex === 10) classList.push('unitmix-edge-bottom');
//                     if (colIndex === 0) classList.push('unitmix-edge-left');
//                     if (colIndex === 9) classList.push('unitmix-edge-right');
//                   }

//                   return (
//                     <div key={`first-${rowIndex}-${colIndex}`} className={classList.join(' ')}>
//                       <div className="cell-container">
//                         <div className="cell-id">{cellId}</div>
//                         <div className="cell-content">{formatCellContent(rowIndex, colIndex, cellData)}</div>
//                       </div>
//                     </div>
//                   );
//                 })
//               )}
//             </div>
//           </div>
//         </div>


//         {/* Market Analysis Charts Section (Hidden for now) */}
//         {/*
//         <div className="section-title fade-in-up mt-5">
//           <i className="fas fa-chart-pie me-2"></i>Market Analysis Charts
//         </div>
//         <div className="row g-4 mb-4 fade-in-up">
//           <div className="col-lg-3">
//             <PricerateAnalysis />
//           </div>
//           <div className="col-lg-3">
//             <SaleAnalysis />
//           </div>
//           <div className="col-lg-3">
//             <SupplyDemandAnalysis option="demand" />
//           </div>
//           <div className="col-lg-3">
//             <SupplyDemandAnalysis option="supply" />
//           </div>
//         </div>
//         */}

//         {/* Second Table - Revenue Table Section (Rows 14+) */}
//         <div className="section-title fade-in-up mt-5">
//           <i className="fas fa-chart-line me-2"></i>Revenue Table Section
//         </div>

//         <div className="card border-0 shadow-lg rounded-4 mb-4 overflow-hidden interactive-card fade-in-up" style={{ background: 'white' }}>
//           <div className="card-header bg-gradient text-white p-3" style={{ background: 'linear-gradient(135deg, #28a745 0%, #34ce57 100%)' }}>
//             <h6 className="fw-bold mb-0"><i className="fas fa-money-bill-wave me-2"></i>Revenue Calculation Table</h6>
//           </div>
//           <div className="card-body p-3" style={{ overflowX: 'hidden', width: '100%', display: 'flex', justifyContent: 'center' }}>
//             <div className="excel-grid excel-grid-second" id="excelGridSecond" style={{ width: 'fit-content', maxWidth: '100%' }}>
//               {grid.slice(13).map((row, rowIndex) => {
//                 const actualRowIndex = rowIndex + 13; // Actual row index in the grid
//                 return row.map((cellData, colIndex) => {
//                   if (colIndex === 10) return null; // Hide K14:K22 (cosmetic only)
//                   const cellId = `${colLetters[colIndex]}${actualRowIndex + 1}`;

//                   const classList = ['cell'];
//                   if (actualRowIndex === 14 || actualRowIndex === 15) classList.push('header');
//                   if (actualRowIndex === 22) classList.push('total-row');
//                   if (cellData.formula) classList.push('formula-cell');
//                   if (cellData.value === '' && !cellData.formula) classList.push('empty-cell');

//                   return (
//                     <div key={`second-${actualRowIndex}-${colIndex}`} className={classList.join(' ')}>
//                       <div className="cell-container">
//                         <div className="cell-id">{cellId}</div>
//                         <div className="cell-content">{formatCellContent(actualRowIndex, colIndex, cellData)}</div>
//                       </div>
//                     </div>
//                   );
//                 });
//               })}
//             </div>
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="card border-0 shadow-sm rounded-4 my-4 interactive-card fade-in-up">
//           <div className="card-body p-4">
//             <div className="d-flex flex-wrap align-items-center gap-3">
//               <button
//                 className="btn btn-success rounded-pill px-4 py-2 shadow-sm interactive-btn"
//                 onClick={async () => {
//                   saveUnitMixToLocal();
//                   await updateMarketAnalysis();
//                 }}
//                 disabled={isUpdatingAnalysis}
//               >
//                 <i className={`fas ${isUpdatingAnalysis ? 'fa-spinner fa-spin' : 'fa-save'} me-2`}></i>
//                 {isUpdatingAnalysis ? 'Updating Analysis...' : 'Save and Update Analysis'}
//               </button>

//               <button
//                 className="btn btn-primary rounded-pill px-4 py-2 shadow-sm interactive-btn"
//                 onClick={resetToDefaults}
//               >
//                 <i className="fas fa-undo me-2"></i>Reset to Default Values
//               </button>
//               <button
//                 className="btn btn-outline-primary rounded-pill px-4 py-2 shadow-sm interactive-btn"
//                 onClick={async () => {
//                   setGrid((prev) => recalculateAll(prev));
//                   await updateMarketAnalysis();
//                 }}
//                 disabled={isUpdatingAnalysis}
//               >
//                 <i className={`fas ${isUpdatingAnalysis ? 'fa-spinner fa-spin' : 'fa-sync-alt'} me-2`}></i>
//                 {isUpdatingAnalysis ? 'Recalculating...' : 'Recalculate and Update Market Data'}
//               </button>

//               <div className="d-flex align-items-center ms-md-auto">
//                 <i className="fas fa-info-circle text-primary me-2"></i>
//                 <span className="text-muted small">All calculations update automatically</span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Note Card (hidden when embedded in /new_rate_simulator) */}
//         {!embedded && (
//           <div className="card border-0 shadow-sm rounded-4 mt-4 interactive-card fade-in-up" style={{ background: 'linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)' }}>
//             <div className="card-body p-4">
//               <div className="d-flex align-items-start">
//                 <div className="icon-shape bg-info bg-opacity-20 text-info rounded-circle p-2 me-3">
//                   <i className="fas fa-lightbulb"></i>
//                 </div>
//                 <div>
//                   <h6 className="fw-bold text-dark mb-2"><i className="fas fa-sticky-note me-2"></i>Note</h6>
//                   <p className="mb-2 text-dark">
//                     Since we have to find most optimum rate for highest sales. Thus THIS Constitute training data set
//                   </p>
//                   <p className="mb-0 text-dark">
//                     This simulation allows you to test different rates to find the optimal pricing strategy.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </main>
//     </div>
//   );
// };

// export default RevenueProjection2;


import {
  FaMapMarkerAlt,
  FaArrowLeft,
  FaChartLine,
  FaInfoCircle,
  FaLightbulb,
  FaCheckCircle,
  FaTable,
  FaCalculator,
  FaSave,
  FaUndo,
  FaSyncAlt,
  FaLayerGroup,
  FaCubes,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaStickyNote,
} from "react-icons/fa";
import { FaIdBadge } from "react-icons/fa6";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PricerateAnalysis from "./components/PricerateAnalysis";
import SaleAnalysis from "./components/SaleAnalysis";
import SupplyDemandAnalysis from "./components/SupplyDemandAnalysis";
import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
import { apiUrl } from "@/lib/api-client";

const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

const c = (value, { formula = null, type = 'text', editable = false } = {}) => ({
  value,
  formula,
  type,
  editable,
});

const buildDefaultGrid = () => [
  [
    c('Total Area Which nit Mix be designed'),
    c('', { type: 'number', editable: true }),
    c(''),
    c(''),
    c(''),
    c(''),
    c(''),
    c(''),
    c(''),
    c(''),
    c(''),
  ],
  [c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c('')],
  [
    c(''),
    c('Variable'),
    c('Variable'),
    c(''),
    c(''),
    c('Derived'),
    c('sigmavalue data recommendation'),
    c('Sigmavalue data recommendation'),
    c('optional'),
    c('optional'),
    c(''),
  ],
  [
    c('Unit Type'),
    c('percent of unit mix (user input)'),
    c('Avg Unit Area (sqft) (user input)'),
    c(''),
    c(''),
    c('Carpet Area (sqft)'),
    c('SALES VELOCITY AS PER BHK in same micromarket (does not change on user input) (Per month)'),
    c('SALES VELOCITY AS PER unit size selected in same micromarket for same bhk (changes as per user input of avg unit area alone) (per month )'),
    c('Size adjustment factor'),
    c('Adjusted sales velocity <br>(Base BHK velocity * Size adjustment factor )'),
    c(''),
  ],
  [
    c('1 BHK'),
    c('', { type: 'percentage', editable: true }),
    c('', { type: 'number', editable: true }),
    c(''),
    c(''),
    c('', { formula: 'B5*B1', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c(1.05, { type: 'number' }),
    c('', { formula: 'G5*I5', type: 'number' }),
    c(''),
  ],
  [
    c('2 BHK'),
    c('', { type: 'percentage', editable: true }),
    c('', { type: 'number', editable: true }),
    c(''),
    c(''),
    c('', { formula: 'B6*B1', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c(1.01, { type: 'number' }),
    c('', { formula: 'G6*I6', type: 'number' }),
    c(''),
  ],
  [
    c('3 BHK'),
    c('', { type: 'percentage', editable: true }),
    c('', { type: 'number', editable: true }),
    c(''),
    c(''),
    c('', { formula: 'B7*B1', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c(0.08, { type: 'number' }),
    c('', { formula: 'G7*I7', type: 'number' }),
    c(''),
  ],
  [
    c('>3BHK'),
    c('', { type: 'percentage', editable: true }),
    c('', { type: 'number', editable: true }),
    c(''),
    c(''),
    c('', { formula: 'B8*B1', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c(1.06, { type: 'number' }),
    c('', { formula: 'G8*I8', type: 'number' }),
    c(''),
  ],
  [
    c('Shop'),
    c('', { type: 'percentage', editable: true }),
    c('', { type: 'number', editable: true }),
    c(''),
    c(''),
    c('', { formula: 'B9*B1', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c(1.12, { type: 'number' }),
    c('', { formula: 'G9*I9', type: 'number' }),
    c(''),
  ],
  [
    c('office'),
    c('', { type: 'percentage', editable: true }),
    c('', { type: 'number', editable: true }),
    c(''),
    c(''),
    c('', { formula: 'B10*B1', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c(1.11, { type: 'number' }),
    c('', { formula: 'G10*I10', type: 'number' }),
    c(''),
  ],
  [
    c('TOTAL'),
    c(''),
    c(''),
    c(''),
    c(''),
    c('', { formula: 'SUM(F5:F10)', type: 'number' }),
    c(''),
    c(''),
    c(0.09, { type: 'number' }),
    c(''),
    c(''),
  ],
  [c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c('')],
  [c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c(''), c('')],
  [
    c('Revenue Table'),
    c('Derived component'),
    c('Fixed component'),
    c('Variable (Simulation is required for this)'),
    c('Derived'),
    c('Fixed component'),
    c('Revenue (₹ Cr)'),
    c('average rate of selected property specification in selected micromarket (doesnt change on user input)'),
    c('Sales velocity in Market as per ticket size for particular bhk (Changes as per user input)'),
    c('Sales velocity in Market as per rate selected  (Changes as per user input)'),
    c(''),
  ],
  [
    c('Unit Type'),
    c('No. of Units'),
    c('Avg Unit Area (sqft) (From unit mix)'),
    c('Rate (₹/sqft) (User input)'),
    c('aVG TICKET SIZE'),
    c('Carpet Area (sqft)(From unit mix)'),
    c('Revenue (₹ Cr)'),
    c('average rate of selected property specification in selected micromarket (doesnt change on user input)'),
    c('Sales velocity in Market as per ticket size for particular bhk (Changes as per user input)'),
    c('Sales velocity in Market as per rate selected  (Changes as per user input)'),
    c(''),
  ],
  [
    c('1 BHK'),
    c('', { formula: 'F16/C16', type: 'number' }),
    c('', { formula: 'C5', type: 'number' }),
    c(7000, { type: 'number', editable: true }),
    c('', { formula: 'C16*D16', type: 'number' }),
    c('', { formula: 'F5', type: 'number' }),
    c('', { formula: 'D16*F16/10^7', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c('', { type: 'number' }),
    c(''),
  ],
  [
    c('2 BHK'),
    c('', { formula: 'F17/C17', type: 'number' }),
    c('', { formula: 'C6', type: 'number' }),
    c(8000, { type: 'number', editable: true }),
    c('', { formula: 'C17*D17', type: 'number' }),
    c('', { formula: 'F6', type: 'number' }),
    c('', { formula: 'D17*F17/10^7', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c('', { type: 'number' }),
    c(''),
  ],
  [
    c('3 BHK'),
    c('', { formula: 'F18/C18', type: 'number' }),
    c('', { formula: 'C7', type: 'number' }),
    c(8800, { type: 'number', editable: true }),
    c('', { formula: 'C18*D18', type: 'number' }),
    c('', { formula: 'F7', type: 'number' }),
    c('', { formula: 'D18*F18/10^7', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c('', { type: 'number' }),
    c(''),
  ],
  [
    c('>3BHK'),
    c('', { formula: 'F19/C19', type: 'number' }),
    c('', { formula: 'C8', type: 'number' }),
    c(8801, { type: 'number', editable: true }),
    c('', { formula: 'C19*D19', type: 'number' }),
    c('', { formula: 'F8', type: 'number' }),
    c('', { formula: 'D19*F19/10^7', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c('', { type: 'number' }),
    c(''),
  ],
  [
    c('Shop'),
    c('', { formula: 'F20/C20', type: 'number' }),
    c('', { formula: 'C9', type: 'number' }),
    c(9000, { type: 'number', editable: true }),
    c('', { formula: 'C20*D20', type: 'number' }),
    c('', { formula: 'F9', type: 'number' }),
    c('', { formula: 'D20*F20/10^7', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c('', { type: 'number' }),
    c(''),
  ],
  [
    c('office'),
    c('', { formula: 'F21/C21', type: 'number' }),
    c('', { formula: 'C10', type: 'number' }),
    c(10000, { type: 'number', editable: true }),
    c('', { formula: 'C21*D21', type: 'number' }),
    c('', { formula: 'F10', type: 'number' }),
    c('', { formula: 'D21*F21/10^7', type: 'number' }),
    c(0, { type: 'number' }),
    c(0, { type: 'number' }),
    c('', { type: 'number' }),
    c('Since we have to find most optimum rate for highest sales . tHuS THIS Constitute training data set'),
  ],
  [
    c('TOTAL'),
    c('', { formula: 'SUM(B16:B21)', type: 'number' }),
    c('—'),
    c('—'),
    c(''),
    c('', { formula: 'SUM(F16:F21)', type: 'number' }),
    c('', { formula: 'SUM(G16:G21)', type: 'number' }),
    c(''),
    c(''),
    c(''),
    c(''),
  ],
];

const cloneGrid = (grid) => grid.map((row) => row.map((cell) => ({ ...cell })));

const evaluateCellReference = (ref, grid) => {
  ref = String(ref).replace(/\$/g, '');
  const colLetter = ref.match(/[A-Z]+/)?.[0];
  const rowNum = parseInt(ref.match(/[0-9]+/)?.[0] || '', 10);
  const colIndex = colLetters.indexOf(colLetter);
  const rowIndex = rowNum - 1;
  if (colIndex >= 0 && rowIndex >= 0 && grid[rowIndex] && grid[rowIndex][colIndex]) {
    const value = grid[rowIndex][colIndex].value;
    return typeof value === 'number' ? value : 0;
  }
  return 0;
};

const evaluateSumRange = (range, grid) => {
  const [start, end] = range.split(':');
  const startCol = start.match(/[A-Z]+/)?.[0]?.replace(/\$/g, '');
  const startRow = parseInt(start.match(/[0-9]+/)?.[0] || '', 10);
  const endCol = end.match(/[A-Z]+/)?.[0]?.replace(/\$/g, '');
  const endRow = parseInt(end.match(/[0-9]+/)?.[0] || '', 10);
  const startColIndex = colLetters.indexOf(startCol);
  const endColIndex = colLetters.indexOf(endCol);
  let sum = 0;
  for (let row = startRow - 1; row < endRow; row++) {
    for (let col = startColIndex; col <= endColIndex; col++) {
      const value = grid[row]?.[col]?.value;
      sum += typeof value === 'number' ? value : 0;
    }
  }
  return sum;
};

const evaluateFormula = (formula, grid) => {
  try {
    formula = String(formula).replace(/^=/, '');

    if (formula.startsWith('SUM(')) {
      const range = formula.match(/SUM\(([^)]+)\)/)?.[1];
      return range ? evaluateSumRange(range, grid) : 0;
    }

    // Support simple arithmetic expressions with multiple * and / (e.g., D16*F16/10^7).
    // This intentionally stays small and only supports: cell refs, numbers, + - * /.
    const expr = formula
      .replace(/\$/g, '')
      .replace(/\s+/g, '')
      .replace(/10\^7/g, '10000000');

    const tokens = expr.match(/([A-Z]+[0-9]+|\d+(?:\.\d+)?|[+\-*/])/g);
    if (!tokens || tokens.length === 0) {
      return evaluateCellReference(expr, grid);
    }

    const toValue = (tok) => {
      if (/^[A-Z]+[0-9]+$/.test(tok)) return evaluateCellReference(tok, grid);
      const num = parseFloat(tok);
      return Number.isFinite(num) ? num : 0;
    };

    // Handle unary minus (e.g. -A1)
    let idx = 0;
    let current = 0;
    if (tokens[0] === '-') {
      current = -toValue(tokens[1]);
      idx = 2;
    } else {
      current = toValue(tokens[0]);
      idx = 1;
    }

    const terms = [];
    const addOps = [];

    while (idx < tokens.length) {
      const op = tokens[idx];
      const rhsTok = tokens[idx + 1];
      if (!op || rhsTok == null) break;

      const rhs = toValue(rhsTok);

      if (op === '*') {
        current = current * rhs;
      } else if (op === '/') {
        current = rhs !== 0 ? current / rhs : 0;
      } else if (op === '+' || op === '-') {
        terms.push(current);
        addOps.push(op);
        current = rhs;
      } else {
        // Unknown token; bail out safely
        return 0;
      }

      idx += 2;
    }

    terms.push(current);

    let result = terms[0] ?? 0;
    for (let i = 0; i < addOps.length; i++) {
      const op = addOps[i];
      const rhs = terms[i + 1] ?? 0;
      result = op === '+' ? result + rhs : result - rhs;
    }

    return result;
  } catch (error) {
    return 0;
  }
};

const recalculateAll = (grid) => {
  let next = cloneGrid(grid);
  // Perform 3 passes to handle dependency chains (e.g., Unit Mix input -> Revenue Formula -> Total Formula)
  for (let i = 0; i < 3; i++) {
    for (let row = 0; row < next.length; row++) {
      for (let col = 0; col < next[row].length; col++) {
        const cellData = next[row][col];
        if (cellData.formula && !cellData.editable) {
          cellData.value = evaluateFormula(cellData.formula, next);
        }
      }
    }
  }
  return next;
};

const readUnitDesignStructure = () => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('unitDesignStructure');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizeUnitTypeKey = (value) => {
  const v = String(value ?? '').trim();
  if (!v) return '';
  let lower = v.toLowerCase();

  // Standardize spaces (e.g., "1BHK" -> "1 bhk")
  lower = lower.replace(/(\d+)(bhk)/gi, '$1 $2');

  // Handle >3BHK variations
  if (lower === '4 bhk' || lower === '5 bhk' || lower === '6 bhk' || lower.includes('>3') || lower.includes('> 3')) {
    return '>3 bhk';
  }

  if (lower.includes('1 bhk')) return '1 bhk';
  if (lower.includes('2 bhk')) return '2 bhk';
  if (lower.includes('3 bhk')) return '3 bhk';
  if (lower.includes('shop')) return 'shop';
  if (lower.includes('office')) return 'office';

  return lower;
};

const AREA_RANGES = [
  "0-50", "51-100", "101-150", "151-200", "201-250", "251-300",
  "301-350", "351-400", "401-450", "451-500", "501-550", "551-600",
  "601-650", "651-700", "701-750", "751-800", "801-850", "851-900",
  "901-950", "951-1000", "1001-1050", "1051-1100", "1101-1150", "1151-1200",
  "1201-1250", "1251-1300", "1301-1350", "1351-1400", "1401-1450", "1451-1500",
  "1501-1550", "1551-1600", "1601-1650", "1651-1700", "1701-1750", "1751-1800",
  "1801-1850", "1851-1900", "1901-1950", "1951-2000", "2001-2050", "2051-2100",
  "2101-2150", "2151-2200", "2201-2250", "2251-2300", "2301-2350", "2351-2400",
  "2401-2450", "2451-2500", "2501-2550", "2551-2600", "2601-2650", "2651-2700",
  "2701-2750", "2751-2800", "2801-2850", "2851-2900", "2901-2950", "2951-3000",
  "3001-3050", "3051-3100", "3101-3150", "3151-3200", "3201-3250", "3251-3300",
  "3301-3350", "3351-3400", "3401-3450", "3451-3500", "3501-3550", "3551-3600",
  "3601-3650", "3651-3700", "3701-3750", "3751-3800", "3801-3850", "3851-3900",
  "3901-3950", "3951-4000", "4001-4050", "4051-4100", "4101-4150", "4151-4200",
  "4201-4250", "4251-4300", "4301-4350", "4351-4400", "4401-4450", "4451-4500",
  "4501-4550", "4551-4600", "4601-4650", "4651-4700", "4701-4750", "4751-4800",
  "4801-4850", "4851-4900", "4901-4950", "4951-5000", "5001-5050", "5051-5100",
  "5101-5150", "5151-5200", "5201-5250", "5251-5300", "5301-5350", "5351-5400",
  "5401-5450", "5451-5500", "5501-5550", "5551-5600", "5601-5650", "5651-5700",
  "5701-5750", "5751-5800", "5801-5850", "5851-5900", "5901-5950", "5951-6000",
  "6001-6050", "6051-6100", "6101-6150", "6151-6200", "6201-6250", "6251-6300",
  "6301-6350", "6351-6400", "6401-6450", "6451-6500", "6501-6550", "6551-6600",
  "6601-6650", "6651-6700", "6701-6750", "6751-6800", "6801-6850", "6851-6900",
  "6901-6950", "6951-7000", "7001-7050", "7051-7100", "7101-7150", "7151-7200",
  "7201-7250", "7251-7300", "7301-7350", "7351-7400", "7401-7450", "7451-7500",
  "7501-7550", "7551-7600", "7601-7650", "7651-7700", "7701-7750", "7751-7800",
  "7801-7850", "7851-7900", "7901-7950", "7951-8000", "8001-8050", "8051-8100",
  "8101-8150", "8151-8200", "8201-8250", "8251-8300", "8301-8350", "8351-8400",
  "8401-8450", "8451-8500", "8501-8550", "8551-8600", "8601-8650", "8651-8700",
  "8701-8750", "8751-8800", "8801-8850", "8851-8900", "8901-8950", "8951-9000",
  "9001-9050", "9051-9100", "9101-9150", "9151-9200", "9201-9250", "9251-9300",
  "9301-9350", "9351-9400", "9401-9450", "9451-9500", "9501-9550", "9551-9600",
  "9601-9650", "9651-9700", "9701-9750", "9751-9800", "9801-9850", "9851-9900",
  "9901-9950", "9951-10000"
];

const getAreaRange = (avgArea) => {
  if (avgArea == null || isNaN(avgArea)) return { low: null, high: null };

  for (const rangeStr of AREA_RANGES) {
    const [low, high] = rangeStr.split('-').map(Number);
    // Use Math.floor to match integer ranges like 0-50, 51-100
    if (avgArea >= low && avgArea <= high) {
      return { low, high };
    }
  }

  const lastRange = AREA_RANGES[AREA_RANGES.length - 1];
  const [lastLow, lastHigh] = lastRange.split('-').map(Number);
  if (avgArea >= lastHigh) return { low: lastLow, high: lastHigh };

  return { low: null, high: null };
};

const getTicketSizeRange = (avgTicketSize) => {
  if (avgTicketSize == null || isNaN(avgTicketSize) || avgTicketSize <= 0) {
    return { low: null, high: null };
  }
  const STEP = 1000000; // 10 Lakh
  const low = Math.floor((avgTicketSize - 1) / STEP) * STEP + 1;
  const high = low + STEP - 1;
  return { low, high };
};

const readLandDetailsForm = () => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('landDetailsForm');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const RevenueProjection2 = ({ embedded = false } = {}) => {
  const navigate = useNavigate();
  const [grid, setGrid] = useState(() => buildDefaultGrid());
  const [village, setVillage] = useState(() => readLandDetailsForm()?.village || '');
  const [villageMeta, setVillageMeta] = useState({ id: null, loading: false, error: '' });
  const [isUpdatingAnalysis, setIsUpdatingAnalysis] = useState(false);


  useEffect(() => {
    setGrid((prev) => recalculateAll(prev));
  }, []);

  // Hydrate saved simulation data (especially Rates) from localStorage if village matches
  useEffect(() => {
    const saved = localStorage.getItem('revenuep2_unitMix');
    if (saved) {
      try {
        const payload = JSON.parse(saved);
        if (payload.village === village) {
          setGrid((prev) => {
            const next = cloneGrid(prev);
            let updated = false;

            // Restore Rates (A16:D21 -> rows 15-20, col 3)
            if (payload.revenuepRateRange && Array.isArray(payload.revenuepRateRange)) {
              payload.revenuepRateRange.forEach((item, i) => {
                const rowIndex = 15 + i;
                if (next[rowIndex] && next[rowIndex][3] && item.UserRate != null) {
                  // Only update if it's different from default to avoid unnecessary setGrid
                  if (next[rowIndex][3].value !== item.UserRate) {
                    next[rowIndex][3].value = item.UserRate;
                    updated = true;
                  }
                }
              });
            }

            return updated ? recalculateAll(next) : prev;
          });
        }
      } catch (err) {
        console.error("Failed to restore saved simulation rates:", err);
      }
    }
  }, [village]);

  useEffect(() => {
    const syncUnitMixFromUnitDesign = () => {
      const unitDesign = readUnitDesignStructure();
      if (!unitDesign) return;

      const residentialVariations = unitDesign?.residentialData?.variations || [];
      const commercialVariations = unitDesign?.commercialData?.variations || [];

      // Logic to aggregate multiple variations of the same type
      const aggregateVariations = (variations, typeKeyName) => {
        const aggregated = {};
        for (const v of variations) {
          const key = normalizeUnitTypeKey(v?.[typeKeyName]);
          if (!key) continue;

          const area = parseFloat(v?.area) || 0;
          const pct = parseFloat(v?.splitPct) || 0;
          const allotted = parseFloat(v?.areaAllotted) || 0;

          if (!aggregated[key]) {
            aggregated[key] = { totalPct: 0, weightedAreaSum: 0, totalAllotted: 0 };
          }
          aggregated[key].totalPct += pct;
          aggregated[key].weightedAreaSum += area * pct;
          aggregated[key].totalAllotted += allotted;
        }

        const result = {};
        for (const key in aggregated) {
          const { totalPct, weightedAreaSum, totalAllotted } = aggregated[key];
          result[key] = {
            totalPct: totalPct,
            avgArea: totalPct > 0 ? weightedAreaSum / totalPct : 0,
            totalAllotted: totalAllotted
          };
        }
        return result;
      };

      const resAgg = aggregateVariations(residentialVariations, 'bhkType');
      const commAgg = aggregateVariations(commercialVariations, 'unitType');

      setGrid((prev) => {
        const next = cloneGrid(prev);
        let updated = false;

        const developmentCategory = String(unitDesign?.developmentCategory || '').toLowerCase();
        const residentialTotal = parseFloat(unitDesign?.residentialData?.totalCarpet) || 0;
        const commercialTotal = parseFloat(unitDesign?.commercialData?.totalCarpet) || 0;
        const totalCarpetValue =
          developmentCategory === 'commercial'
            ? commercialTotal
            : developmentCategory === 'mixed'
              ? residentialTotal + commercialTotal
              : residentialTotal;

        if (next?.[0]?.[1] && next[0][1].value !== totalCarpetValue) {
          next[0][1].value = Number.isFinite(totalCarpetValue) ? totalCarpetValue : '';
          updated = true;
        }

        // A5:A10 (rows 4-9), B5:B10 (col 1), C5:C10 (col 2)
        for (let rowIndex = 4; rowIndex <= 9; rowIndex++) {
          const unitType = next?.[rowIndex]?.[0]?.value;
          const key = normalizeUnitTypeKey(unitType);

          const agg = rowIndex <= 7 ? resAgg[key] : commAgg[key];

          // Set percentage (B column)
          const pctDecimal = agg && Number.isFinite(agg.totalPct) ? agg.totalPct / 100 : '';
          if (next?.[rowIndex]?.[1] && next[rowIndex][1].value !== pctDecimal) {
            next[rowIndex][1].value = pctDecimal;
            updated = true;
          }

          // Set area (C column) - use raw avgArea instead of adjusted area
          const unitAreaValue = agg && Number.isFinite(agg.avgArea) ? agg.avgArea : '';
          if (next?.[rowIndex]?.[2] && next[rowIndex][2].value !== unitAreaValue) {
            next[rowIndex][2].value = unitAreaValue;
            updated = true;
          }

          // Special logic for all types: Fetch Column F (Carpet Area) from Area Allotted
          if (rowIndex >= 4 && rowIndex <= 9) {
            const allottedVal = agg && Number.isFinite(agg.totalAllotted) ? agg.totalAllotted : '';
            if (next?.[rowIndex]?.[5] && next[rowIndex][5].value !== allottedVal) {
              next[rowIndex][5].value = allottedVal;
              // Clear formula to prevent it from being overwritten by recalculateAll
              next[rowIndex][5].formula = null;
              updated = true;
            }
          }
        }

        return updated ? recalculateAll(next) : prev;
      });
    };

    syncUnitMixFromUnitDesign();
    window.addEventListener('unitDesignUpdated', syncUnitMixFromUnitDesign);
    window.addEventListener('storage', syncUnitMixFromUnitDesign);
    return () => {
      window.removeEventListener('unitDesignUpdated', syncUnitMixFromUnitDesign);
      window.removeEventListener('storage', syncUnitMixFromUnitDesign);
    };
  }, []);

  useEffect(() => {
    const sync = () => setVillage(readLandDetailsForm()?.village || '');
    sync();
    window.addEventListener('landDetailsUpdated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('landDetailsUpdated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    const syncVillageToMarketPayload = () => {
      const existingRaw = localStorage.getItem('Market Analysis Payload');
      let existing = {};
      try {
        existing = existingRaw ? JSON.parse(existingRaw) : {};
      } catch (e) {
        console.error("Failed to parse existing Market Analysis Payload", e);
      }

      // Check if update is needed to avoid infinite loops or unnecessary writes
      if (existing.villageName !== village || existing.villageId !== villageMeta.id) {
        const payload = {
          ...existing,
          villageName: village,
          villageId: villageMeta.id
        };
        localStorage.setItem('Market Analysis Payload', JSON.stringify(payload));
      }
    };

    syncVillageToMarketPayload();
  }, [village, villageMeta.id]);

  // Fetch village ID from backend whenever village name changes
  useEffect(() => {
    const name = (village || '').trim();
    if (!name) {
      setVillageMeta({ id: null, loading: false, error: '' });
      return;
    }

    let aborted = false;
    const fetchVillageId = async () => {
      try {
        setVillageMeta(prev => ({ ...prev, loading: true, error: '' }));
        const params = new URLSearchParams({ name });
        const resp = await fetch(`${apiUrl('/data_db/get_village_id_by_name')}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (aborted) return;

        if (!resp.ok) {
          const data = await resp.json().catch(() => null);
          const msg = data?.error || `Lookup failed with status ${resp.status}`;
          setVillageMeta({ id: null, loading: false, error: msg });
          return;
        }

        const data = await resp.json();
        if (!aborted && data?.ok && data?.village?.id != null) {
          setVillageMeta({ id: data.village.id, loading: false, error: '' });
        } else if (!aborted) {
          setVillageMeta({ id: null, loading: false, error: 'Village not found' });
        }
      } catch (err) {
        if (!aborted) {
          console.error('Failed to fetch village id:', err);
          setVillageMeta({ id: null, loading: false, error: 'Unable to fetch village id' });
        }
      }
    };

    fetchVillageId();

    return () => {
      aborted = true;
    };
  }, [village]);


  const updateMarketAnalysis = useCallback(async () => {
    const villageId = villageMeta.id;
    if (!villageId || villageMeta.loading) {
      alert("Please select a valid village and wait for it to load.");
      return;
    }

    setIsUpdatingAnalysis(true);
    let currentLocalGrid = grid;

    const hasPrefix = (str) => /^[<≤]+/.test(String(str || '').trim());
    const hasGreaterThanPrefix = (str) => /^[>≥]+/.test(String(str || '').trim()) || String(str || '').toLowerCase().includes('4') || String(str || '').toLowerCase().includes('5');
    const extractNumber = (str) => {
      const match = String(str || '').match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    };

    try {
      const params = new URLSearchParams({ igr_village_id: String(villageId) });

      // 1. fetchBhkMonthlyAverage (GET)
      const bhkMonthlyAvgResp = await fetch(apiUrl(`/new_rate_simulator/simulator/bhk-monthly-average/?${params.toString()}`));
      if (bhkMonthlyAvgResp.ok) {
        const data = await bhkMonthlyAvgResp.json();
        if (data?.success && Array.isArray(data?.data)) {
          const bhkRowMap = { '1 BHK': 4, '2 BHK': 5, '3 BHK': 6, '>3BHK': 7, '>3 BHK': 7, 'Shop': 8, 'office': 9, 'Office': 9 };
          const next = cloneGrid(currentLocalGrid);
          let updated = false;
          const updatedRows = new Set();
          const sortedData = [...data.data].sort((a, b) => (hasPrefix(a?.bhk) && !hasPrefix(b?.bhk) ? 1 : !hasPrefix(a?.bhk) && hasPrefix(b?.bhk) ? -1 : 0));

          sortedData.forEach((bhkData) => {
            const bhkName = String(bhkData?.bhk || '').trim();
            const avgTransactions = bhkData?.summary?.average_transactions_per_month;
            if (!bhkName || avgTransactions == null || avgTransactions === 0) return;
            const bhkNormalized = normalizeUnitTypeKey(bhkName);
            let rowIndex = null;
            for (const [key, idx] of Object.entries(bhkRowMap)) { if (normalizeUnitTypeKey(key) === bhkNormalized) { rowIndex = idx; break; } }
            if (rowIndex == null) {
              const apiNum = extractNumber(bhkNormalized);
              for (let i = 4; i <= 9; i++) {
                const cellVal = String(next[i]?.[0]?.value || '').trim();
                const cellNorm = normalizeUnitTypeKey(cellVal);
                if (cellNorm === bhkNormalized || cellNorm.includes(bhkNormalized) || bhkNormalized.includes(cellNorm)) { rowIndex = i; break; }
                if (apiNum !== null && i <= 7) {
                  const cellNum = extractNumber(cellNorm);
                  if (cellNum !== null && apiNum === cellNum && /bhk/i.test(bhkNormalized) && /bhk/i.test(cellNorm)) { rowIndex = i; break; }
                }
              }
            }
            if (rowIndex != null && next[rowIndex]?.[6] && (!updatedRows.has(rowIndex) || !hasPrefix(bhkName))) {
              const cell = next[rowIndex][6];
              if (cell.type === 'number' && !cell.formula) {
                cell.value = Number(avgTransactions);
                updated = true;
                updatedRows.add(rowIndex);
              }
            }
          });
          if (updated) currentLocalGrid = recalculateAll(next);
        }
      }

      // 2. fetchTransactionCounts (POST)
      const ticketSizeRange = [];
      for (let i = 15; i <= 20; i++) {
        const bhkType = String(currentLocalGrid?.[i]?.[0]?.value || '').trim();
        const avgTicketSize = currentLocalGrid?.[i]?.[4]?.value;
        if (bhkType && avgTicketSize != null && Number.isFinite(avgTicketSize)) {
          const { low, high } = getTicketSizeRange(avgTicketSize);
          ticketSizeRange.push({
            BHK_Type: bhkType,
            AVG_TICKET_SIZE: avgTicketSize,
            Lowrange: low,
            Highrange: high,
          });
        }
      }
      if (ticketSizeRange.length > 0) {
        const transCountResp = await fetch(apiUrl(`/new_rate_simulator/simulator/transaction-counts-detailed?${params.toString()}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(ticketSizeRange),
        });
        if (transCountResp.ok) {
          const data = await transCountResp.json();
          if (data?.success && Array.isArray(data?.data)) {
            const next = cloneGrid(currentLocalGrid);
            let updated = false;
            data.data.forEach((resultItem) => {
              const apiBhkType = String(resultItem?.BHK_Type || '').trim();
              const transactionCount = resultItem?.transaction_count;
              if (!apiBhkType || transactionCount == null) return;
              const apiBhkNormalized = normalizeUnitTypeKey(apiBhkType);
              const apiHasGreaterThan = hasGreaterThanPrefix(apiBhkType);
              let matchedRow = null;
              for (let i = 15; i <= 20; i++) {
                const cellVal = String(next[i]?.[0]?.value || '').trim();
                const cellNorm = normalizeUnitTypeKey(cellVal);
                const cellHasGT = hasGreaterThanPrefix(cellVal);
                if (cellNorm === apiBhkNormalized || (apiHasGreaterThan && cellHasGT && (cellNorm.includes(apiBhkNormalized) || apiBhkNormalized.includes(cellNorm)))) { matchedRow = i; break; }
              }
              if (matchedRow !== null && next[matchedRow]?.[8] && next[matchedRow][8].type === 'number' && !next[matchedRow][8].formula) {
                const count = Number(transactionCount);
                next[matchedRow][8].value = count > 0 ? count / 36 : 0;
                updated = true;
              }
            });
            if (updated) currentLocalGrid = recalculateAll(next);
          }
        }
      }

      // 3. fetchBhkMonthlyAverageByArea (POST)
      const areaPayload = [];
      let areaCalcForm = {};
      try {
        areaCalcForm = JSON.parse(localStorage.getItem('areaCalculationForm')) || {};
      } catch (e) { }

      const resLoading = parseFloat(areaCalcForm.resLoadingRatio) || 1.35;
      const shopLoading = parseFloat(areaCalcForm.shopLoading) || 1.50;
      const officeLoading = parseFloat(areaCalcForm.officeLoading) || 1.45;

      const unitDesign = readUnitDesignStructure();
      const calcMode = unitDesign?.calculationMode || 'carpet';

      for (let i = 4; i <= 9; i++) {
        const bhkType = String(currentLocalGrid?.[i]?.[0]?.value ?? '').trim();
        const avgUnitArea = parseFloat(currentLocalGrid?.[i]?.[2]?.value);
        if (bhkType && !isNaN(avgUnitArea)) {
          let searchArea = avgUnitArea;
          if (calcMode === 'saleable') {
            const normalizedBhk = normalizeUnitTypeKey(bhkType);
            let loadingFactor = 1.0;
            if (normalizedBhk === 'shop') loadingFactor = shopLoading;
            else if (normalizedBhk === 'office') loadingFactor = officeLoading;
            else loadingFactor = resLoading;
            searchArea = avgUnitArea / loadingFactor;
          }

          const { low, high } = getAreaRange(searchArea);
          areaPayload.push({ BHK_type: bhkType, Avg_Unit_Area: searchArea, Lowrange: low, Highrange: high });
        }
      }
      if (areaPayload.length > 0) {
        const areaResp = await fetch(apiUrl(`/new_rate_simulator/simulator/bhk-monthly-average-by-area?${params.toString()}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(areaPayload),
        });
        if (areaResp.ok) {
          const data = await areaResp.json();
          if (data?.success && Array.isArray(data?.data)) {
            const next = cloneGrid(currentLocalGrid);
            let updated = false;
            data.data.forEach((item) => {
              const apiBhkType = String(item?.BHK_type || '').trim();
              const avgPerMonth = item?.average_transactions_per_month;
              if (!apiBhkType || avgPerMonth == null) return;
              const apiBhkNormalized = normalizeUnitTypeKey(apiBhkType);
              const apiHasGreaterThan = hasGreaterThanPrefix(apiBhkType);

              for (let i = 4; i <= 9; i++) {
                const cellVal = String(next?.[i]?.[0]?.value || '').trim();
                const cellNorm = normalizeUnitTypeKey(cellVal);
                const cellHasGT = hasGreaterThanPrefix(cellVal);

                if (cellNorm === apiBhkNormalized || (apiHasGreaterThan && cellHasGT && (cellNorm.includes(apiBhkNormalized) || apiBhkNormalized.includes(cellNorm)))) {
                  if (next[i]?.[7] && next[i][7].type === 'number' && !next[i][7].formula) {
                    next[i][7].value = Number(avgPerMonth);
                    updated = true;
                  }
                  break;
                }
              }
            });
            if (updated) currentLocalGrid = recalculateAll(next);
          }
        }
      }

      // 4. fetchAverageRate (POST)
      const ratePayload = [];
      for (let i = 15; i <= 20; i++) {
        const bhkType = String(currentLocalGrid?.[i]?.[0]?.value ?? '').trim();
        const userRate = parseFloat(currentLocalGrid?.[i]?.[3]?.value);
        if (bhkType && !isNaN(userRate)) {
          let searchRate = userRate;
          if (calcMode === 'saleable') {
            const normalizedBhk = normalizeUnitTypeKey(bhkType);
            let loadingFactor = 1.0;
            if (normalizedBhk === 'shop') loadingFactor = shopLoading;
            else if (normalizedBhk === 'office') loadingFactor = officeLoading;
            else loadingFactor = resLoading;
            searchRate = userRate * loadingFactor;
          }

          ratePayload.push({
            BHK_type: bhkType,
            UserRate: searchRate,
            Lowrange: searchRate * 0.9,
            Highrange: searchRate * 1.1
          });
        }
      }
      if (ratePayload.length > 0) {
        const rateResp = await fetch(apiUrl(`/new_rate_simulator/simulator/average-rate/?${params.toString()}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(ratePayload),
        });
        if (rateResp.ok) {
          const data = await rateResp.json();
          if (data?.success && Array.isArray(data?.data)) {
            const next = cloneGrid(currentLocalGrid);
            let updated = false;
            data.data.forEach((item) => {
              const apiBhkType = String(item?.BHK_type || '').trim();
              let avgRate = item?.average_rate_per_sqft_on_sa;
              if (!apiBhkType || avgRate == null) return;

              if (calcMode === 'saleable') {
                const normalizedBhk = normalizeUnitTypeKey(apiBhkType);
                let loadingFactor = 1.0;
                if (normalizedBhk === 'shop') loadingFactor = shopLoading;
                else if (normalizedBhk === 'office') loadingFactor = officeLoading;
                else loadingFactor = resLoading;
                avgRate = avgRate / loadingFactor;
              }

              const apiBhkNormalized = normalizeUnitTypeKey(apiBhkType);
              let matchedRow = null;
              for (let i = 15; i <= 20; i++) {
                const cellVal = String(next?.[i]?.[0]?.value || '').trim();
                if (cellVal.toLowerCase() === apiBhkType.toLowerCase() || normalizeUnitTypeKey(cellVal) === apiBhkNormalized) { matchedRow = i; break; }
              }
              if (matchedRow !== null && next[matchedRow]?.[7] && next[matchedRow][7].type === 'number') {
                next[matchedRow][7].formula = null;
                next[matchedRow][7].value = Number(avgRate);
                updated = true;
              }
            });
            if (updated) currentLocalGrid = recalculateAll(next);
          }
        }
      }

      // 5. fetchBhkMonthlyAverageByRate (POST)
      if (ratePayload.length > 0) {
        const rateAvgResp = await fetch(apiUrl(`/new_rate_simulator/simulator/bhk-monthly-average-by-rate?${params.toString()}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(ratePayload),
        });
        if (rateAvgResp.ok) {
          const data = await rateAvgResp.json();
          if (data?.success && Array.isArray(data?.data)) {
            const next = cloneGrid(currentLocalGrid);
            let updated = false;
            data.data.forEach((item) => {
              const apiBhkType = String(item?.BHK_type || '').trim();
              const avgPerMonth = item?.average_transactions_per_month;
              if (!apiBhkType || avgPerMonth == null) return;
              const apiBhkNormalized = normalizeUnitTypeKey(apiBhkType);
              let matchedRow = null;
              for (let i = 15; i <= 20; i++) {
                const cellVal = String(next?.[i]?.[0]?.value || '').trim();
                if (cellVal.toLowerCase() === apiBhkType.toLowerCase() || normalizeUnitTypeKey(cellVal) === apiBhkNormalized) { matchedRow = i; break; }
              }
              if (matchedRow !== null && next[matchedRow]?.[9] && next[matchedRow][9].type === 'number') {
                next[matchedRow][9].formula = null;
                next[matchedRow][9].value = Number(avgPerMonth);
                updated = true;
              }
            });
            if (updated) currentLocalGrid = recalculateAll(next);
          }
        }
      }

      setGrid(currentLocalGrid);
    } catch (err) {
      console.error('Failed to update analysis data:', err);
      alert("Error updating analysis data. Check console for details.");
    } finally {
      setIsUpdatingAnalysis(false);
    }
  }, [villageMeta.id, villageMeta.loading, grid]);


  const handleCellChange = useCallback((rowIndex, colIndex, raw) => {
    setGrid((prev) => {
      const next = cloneGrid(prev);
      const cell = next[rowIndex][colIndex];
      if (cell.type === 'percentage') {
        cell.value = parseFloat(raw) / 100;
      } else {
        cell.value = parseFloat(raw);
      }
      return recalculateAll(next);
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setGrid(recalculateAll(buildDefaultGrid()));
  }, []);

  const saveUnitMixToLocal = useCallback(() => {
    const revenueTableStartRow = grid.findIndex((row) =>
      row.some((cell) => String(cell?.value ?? '') === 'Revenue Table')
    );
    const unitMixGrid = revenueTableStartRow >= 0 ? grid.slice(0, revenueTableStartRow) : grid;

    const toNumber = (val) => {
      if (typeof val === 'number' && Number.isFinite(val)) return val;
      const parsed = parseFloat(val);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const TicketSizeRange = Array.from({ length: 6 }, (_, i) => {
      const rowIndex = 15 + i; // 16..21 (1-indexed)
      const bhkType = String(grid?.[rowIndex]?.[0]?.value ?? '').trim(); // A16..A21
      const avgTicketSize = toNumber(grid?.[rowIndex]?.[4]?.value); // E16..E21
      const { low, high } = getTicketSizeRange(avgTicketSize);

      return {
        BHK_Type: bhkType,
        AVG_TICKET_SIZE: avgTicketSize,
        Lowrange: low,
        Highrange: high,
      };
    });

    // Revenuep Unit Range - from A5 to A10 (rows 4-9, 0-indexed)
    const unitDesign = readUnitDesignStructure();
    const calcMode = unitDesign?.calculationMode || 'carpet';
    let areaCalcForm = {};
    try {
      areaCalcForm = JSON.parse(localStorage.getItem('areaCalculationForm')) || {};
    } catch (e) { }
    const resLoading = parseFloat(areaCalcForm.resLoadingRatio) || 1.35;
    const shopLoading = parseFloat(areaCalcForm.shopLoading) || 1.50;
    const officeLoading = parseFloat(areaCalcForm.officeLoading) || 1.45;

    const revenuepUnitRange = Array.from({ length: 6 }, (_, i) => {
      const rowIndex = 4 + i; // 4-9 (0-indexed) = A5-A10 (1-indexed)
      const bhkType = String(grid?.[rowIndex]?.[0]?.value ?? '').trim(); // A column (index 0)
      let avgUnitArea = toNumber(grid?.[rowIndex]?.[2]?.value); // C column (index 2) - Avg Unit Area

      if (avgUnitArea != null && calcMode === 'saleable') {
        const normalizedBhk = normalizeUnitTypeKey(bhkType);
        let loadingFactor = 1.0;
        if (normalizedBhk === 'shop') loadingFactor = shopLoading;
        else if (normalizedBhk === 'office') loadingFactor = officeLoading;
        else loadingFactor = resLoading;

        avgUnitArea = avgUnitArea / loadingFactor;
      }

      const lowrange = avgUnitArea != null ? avgUnitArea - 25 : null;
      const highrange = avgUnitArea != null ? avgUnitArea + 25 : null;

      return {
        BHK_type: bhkType,
        Avg_Unit_Area: avgUnitArea,
        Lowrange: lowrange,
        Highrange: highrange,
      };
    });

    // Revenuep Rate Range - from A16 to A21 (rows 15-20, 0-indexed)
    const revenuepRateRange = Array.from({ length: 6 }, (_, i) => {
      const rowIndex = 15 + i; // 15-20 (0-indexed) = A16-A21 (1-indexed)
      const bhkType = String(grid?.[rowIndex]?.[0]?.value ?? '').trim(); // A column (index 0) - BHK_type
      const userRate = toNumber(grid?.[rowIndex]?.[3]?.value); // D column (index 3) - Rate (₹/sqft) (User input)
      const lowrange = userRate == null ? null : userRate * 0.9; // -10%
      const highrange = userRate == null ? null : userRate * 1.1; // +10%

      return {
        BHK_type: bhkType,
        UserRate: userRate,
        Lowrange: lowrange,
        Highrange: highrange,
      };
    });

    // Unit Count Data - from A16:B21 (rows 15-20, 0-indexed)
    const unitCountData = Array.from({ length: 6 }, (_, i) => {
      const rowIndex = 15 + i; // 15-20 (0-indexed) = A16-A21 (1-indexed)
      const unitType = String(grid?.[rowIndex]?.[0]?.value ?? '').trim(); // A column (index 0)
      const noOfUnits = toNumber(grid?.[rowIndex]?.[1]?.value); // B column (index 1) - No. of Units

      return {
        Unit_Type: unitType,
        No_Of_Units: noOfUnits !== null ? Math.round(noOfUnits) : null,
      };
    });

    const payload = {
      savedAt: new Date().toISOString(),
      village: readLandDetailsForm()?.village || '',
      unitMixGrid,
      TicketSizeRange,
      revenuepUnitRange,
      revenuepRateRange,
      unitCountData,
    };

    localStorage.setItem('revenuep2_unitMix', JSON.stringify(payload));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('unitCountDataUpdated', { detail: payload.unitCountData }));

    alert('UNIT MIX Section saved locally.');
  }, [grid]);

  const css = useMemo(
    () => ` 
      .rp2-body { 
        min-height: 100vh; 
        background-color: #f3f5f9; 
        font-family: 'Inter', sans-serif;
        padding: 20px;
      }
      .rp2-container { 
        max-width: 100%; 
        width: 100%;
        margin: 0 auto; 
        background: white; 
        padding: 30px; 
        border-radius: 16px; 
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        border: 1px solid rgba(0,0,0,0.05);
      }

      /* When embedded inside /new_rate_simulator, match surrounding card width */
      .rp2-container.rp2-embedded {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
      }
      
      @media (min-width: 1600px) {
        .rp2-container {
          max-width: 1600px;
        }
      }
      .section-title { 
        background: linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(74, 144, 226, 0.05) 100%);
        padding: 15px 20px; 
        margin: 25px 0 15px 0; 
        border-left: 4px solid #4a90e2; 
        font-weight: bold;
        border-radius: 8px;
        color: #1a1a1a;
        font-size: 1.1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      }
      .excel-grid { 
        display: grid; 
        gap: 1px; 
        background-color: transparent; 
        border: none;
        width: fit-content;
        max-width: 100%;
        overflow: hidden;
      }
      
      /* Optimized column widths to fit all 11 columns (A-K) exactly within container */
      /* Optimized column widths for Unit Mix Table (8 columns: A,B,C,F,G,H,I,J) */
      .excel-grid-first {
        grid-template-columns: 
          120px /* A */
          130px /* B */
          130px /* C */
          130px /* F */
          180px /* G */
          180px /* H */
          180px /* I */
          155px /* J */;
        width: fit-content;
        max-width: 100%;
        background-color: #ffffff;
        border-radius: 6px;
        border: none;
        box-shadow: none;
      }

      /* Optimized column widths for Revenue Table (7 columns: A,C,D,E,H,I,J; B,F,G hidden) */
      .excel-grid-second {
        grid-template-columns: 
          115px /* A */
          130px /* C */
          105px /* D */
          130px /* E */
          180px /* H */
          180px /* I */
          155px /* J */;
        width: fit-content;
        max-width: 100%;
        background-color: #ffffff;
        border-radius: 6px;
        border: 2px solid #495057;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      /* Responsive adjustments for smaller screens */
      @media (min-width: 1400px) {
        .excel-grid-first {
          grid-template-columns: 130px 145px 145px 145px 195px 195px 195px 170px;
        }
        .excel-grid-second {
          grid-template-columns: 130px 145px 115px 145px 195px 195px 170px;
        }
      }
      
      @media (max-width: 1399px) and (min-width: 1200px) {
        .excel-grid-first {
          grid-template-columns: 110px 125px 125px 125px 170px 170px 170px 150px;
        }
        .excel-grid-second {
          grid-template-columns: 110px 125px 100px 125px 170px 170px 150px;
        }
      }
      
      @media (max-width: 1199px) {
        .excel-grid-first {
          grid-template-columns: 90px 105px 105px 105px 145px 145px 145px 130px;
        }
        .excel-grid-second {
          grid-template-columns: 90px 105px 85px 105px 145px 145px 130px;
        }
      }
      .cell { 
        background-color: white; 
        padding: 8px 6px; 
        min-height: 45px; 
        display: flex; 
        align-items: center; 
        font-size: 12px; 
        overflow: hidden;
        word-wrap: break-word;
        transition: background-color 0.2s ease, transform 0.1s ease;
      }
      .cell:hover {
        background-color: #f8f9fa;
        transform: scale(1.01);
        z-index: 1;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .header { 
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        font-weight: bold; 
        text-align: center;
        color: #2c3e50;
        border-bottom: 2px solid #dee2e6;
      }
      .input-cell { 
        width: 100%; 
        border: 2px solid #e0e0e0; 
        padding: 5px 6px; 
        font-size: 12px; 
        border-radius: 6px;
        transition: all 0.2s ease;
        background-color: #fff;
        min-width: 0;
      }
      .input-cell:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
        background-color: #fff;
      }
      .formula-cell { 
        background: linear-gradient(135deg, #d8e8d8 0%, #c8dcc8 100%) !important;
        font-weight: 500;
      }
      .formula-cell:hover {
        background: linear-gradient(135deg, #c8dcc8 0%, #b8d0b8 100%) !important;
      }
      .percentage-wrapper { 
        position: relative; 
        width: 100%; 
      }
      .percentage-wrapper::after { 
        content: '%'; 
        position: absolute; 
        right: 12px; 
        top: 50%; 
        transform: translateY(-50%); 
        color: #666; 
        font-size: 13px;
        font-weight: 600;
        pointer-events: none;
      }
      .cell-id { 
        display: block; 
        font-size: 9px; 
        color: #6c757d; 
        line-height: 1; 
        margin-bottom: 4px;
        font-weight: 600;
        letter-spacing: 0.5px;
        z-index: 10;
        display: block !important;
      }


      .cell-content { 
        width: 100%; 
      }
      .cell-container { 
        position: relative; 
        width: 100%; 
      }
      .total-row { 
        border-top: 3px solid #495057;
        border-bottom: 2px solid #495057;
        font-weight: bold;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      }
      .total-row .cell {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      }
      .empty-cell { 
        background-color: #f8f9fa; 
      }

      .cell-hidden {
        visibility: hidden;
        pointer-events: none;
        background: transparent !important;
        box-shadow: none !important;
        transform: none !important;
      }

      .cell-gap {
        min-height: 14px !important;
        padding: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .unitmix-subtable-cell {
        border: 1px solid #c0c6cc;
      }
      .unitmix-edge-top {
        border-top: 2px solid #495057;
      }
      .unitmix-edge-bottom {
        border-bottom: 2px solid #495057;
      }
      .unitmix-edge-left {
        border-left: 2px solid #495057;
      }
      .unitmix-edge-right {
        border-right: 2px solid #495057;
      }

      .a1-border-cell {
        border-top: 2px solid #495057 !important;
        border-bottom: 2px solid #495057 !important;
        border-left: 2px solid #495057 !important;
        border-right: 1px solid #495057 !important;
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
      }

      .b1-border-cell {
        border-top: 2px solid #495057 !important;
        border-bottom: 2px solid #495057 !important;
        border-right: 2px solid #495057 !important;
        border-left: 0 !important;
        border-top-right-radius: 8px;
        border-bottom-right-radius: 8px;
      }
      
      /* Interactive styles */
      .interactive-card {
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(0,0,0,0.05) !important;
      }
      
      .interactive-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
      }
      
      .interactive-btn {
        transition: all 0.2s ease;
        transform: translateY(0);
      }
      
      .interactive-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      }
      
      .interactive-btn:active {
        transform: translateY(0);
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .fade-in-up {
        animation: fadeInUp 0.5s ease forwards;
      }
      
      .ls-1 { 
        letter-spacing: 1px; 
      }
      .card-hover-lift { 
        transition: transform 0.2s ease, box-shadow 0.2s ease; 
      }
      .card-hover-lift:hover { 
        transform: translateY(-5px); 
        box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; 
      }
    `,
    []
  );

  const formatCellContent = useCallback((rowIndex, colIndex, cellData) => {
    if (cellData.editable) {
      if (cellData.type === 'percentage') {
        const percentValue = (cellData.value || 0) * 100;
        return (
          <div className="percentage-wrapper">
            <input
              type="number"
              className="input-cell"
              value={Number.isFinite(percentValue) ? percentValue : ''}
              step="0.1"
              onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
            />
          </div>
        );
      }

      return (
        <input
          type="number"
          className="input-cell"
          value={Number.isFinite(cellData.value) ? cellData.value : ''}
          step="any"
          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
        />
      );
    }

    if (cellData.type === 'percentage' && cellData.value !== '') {
      return `${(cellData.value * 100).toFixed(1)}%`;
    }

    if (cellData.type === 'number' && cellData.value !== '') {
      if (colIndex === 6 && rowIndex >= 15 && rowIndex <= 20) {
        return `₹${Number(cellData.value).toFixed(2)} Cr`;
      }
      if (colIndex === 1 && rowIndex === 0) {
        return Number(cellData.value).toLocaleString();
      }
      if (colIndex === 4 && rowIndex >= 15 && rowIndex <= 20) {
        return `₹${Number(cellData.value).toLocaleString()}`;
      }
      if (colIndex === 3 && rowIndex >= 15 && rowIndex <= 20) {
        return `₹${Number(cellData.value).toLocaleString()}`;
      }
      if (colIndex === 7 && rowIndex >= 15 && rowIndex <= 20) {
        return `₹${Number(cellData.value).toLocaleString()}`;
      }
      // Round values in B16:B22 (No. of Units column)
      if (colIndex === 1 && rowIndex >= 15 && rowIndex <= 21) {
        return Math.round(Number(cellData.value)).toLocaleString();
      }
      return Number(cellData.value).toLocaleString();
    }

    if (typeof cellData.value === 'string' && cellData.value.includes('<br>')) {
      return <span dangerouslySetInnerHTML={{ __html: cellData.value }} />;
    }

    return cellData.value;
  }, [handleCellChange]);

  return (
    <div className="rp2-body">
      <style>{css}</style>
      <style>{`
        .rp2-selected-panel {
          background: #ffffff;
          border: 1px solid #e7ebf1;
          border-radius: 24px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
          overflow: hidden;
          margin-top: 24px;
          margin-bottom: 28px;
        }

        .rp2-selected-header {
          padding: 24px 26px 14px;
          background: #ffffff;
          border-bottom: 1px solid #edf1f6;
        }

        .rp2-selected-eyebrow {
          color: #8b95a5;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .rp2-selected-title {
          color: #111827;
          font-size: 32px;
          line-height: 1;
          font-weight: 800;
          margin: 0;
        }

        .rp2-selected-copy {
          color: #687384;
          font-size: 13px;
          font-weight: 600;
          margin: 10px 0 0;
        }

        .rp2-selected-body {
          padding: 26px;
          background: #ffffff;
        }

        .rp2-tool-card,
        .rp2-table-card {
          border: 1px solid #e5eaf2 !important;
          background: #fbfcff !important;
          border-radius: 18px !important;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035) !important;
          overflow: hidden;
        }

        .rp2-table-card .card-header {
          background: #f4f7fb !important;
          color: #273242 !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }

        .rp2-table-card .card-header h5,
        .rp2-table-card .card-header h6,
        .rp2-table-card .card-header p {
          color: #273242 !important;
        }

        .rp2-grid-card {
          background: #ffffff !important;
          border: 1px solid #dfe7f1 !important;
          border-radius: 20px !important;
        }

        .rp2-grid-card .card-header {
          padding: 18px 20px !important;
          background: #f8fafc !important;
        }

        .rp2-grid-card .card-header h5,
        .rp2-grid-card .card-header h6 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          line-height: 1.2;
          margin: 0;
        }

        .rp2-grid-card .card-header p {
          color: #738095 !important;
          font-size: 12px;
          font-weight: 700;
          margin-top: 8px;
        }

        .rp2-grid-shell {
          background: #f8fafc;
          border: 1px solid #e4ebf5;
          border-radius: 16px;
          padding: 14px;
          width: 100%;
          overflow-x: auto;
          display: flex;
          justify-content: center;
        }

        .rp2-selected-panel .excel-grid {
          gap: 8px;
          background: transparent;
          border: 0;
          box-shadow: none;
        }

        .rp2-selected-panel .excel-grid-first,
        .rp2-selected-panel .excel-grid-second {
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }

        .rp2-selected-panel .excel-grid-first {
          --rp2-unitmix-visible-offset: 171px;
          transform: translateX(var(--rp2-unitmix-visible-offset));
        }

        .rp2-selected-panel .cell {
          min-height: 58px;
          padding: 10px 12px;
          background: #ffffff;
          border: 1px solid #e1e8f2;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.035);
          color: #273242;
          font-size: 12px;
          line-height: 1.25;
          transform: none;
        }

        .rp2-selected-panel .cell:hover {
          background: #ffffff;
          transform: none;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
        }

        .rp2-selected-panel .header {
          background: #eef3f8 !important;
          border: 1px solid #dbe4ef !important;
          color: #334155;
          font-weight: 800;
        }

        .rp2-selected-panel .formula-cell {
          background: #f1f8f4 !important;
          border-color: #cfe6d8 !important;
          color: #1f4d35;
        }

        .rp2-selected-panel .formula-cell:hover {
          background: #edf6f1 !important;
        }

        .rp2-selected-panel .rp2-value-look-cell {
          background: #ffffff !important;
          border-color: #e1e8f2 !important;
          color: #273242 !important;
          font-weight: 400;
        }

        .rp2-selected-panel .rp2-value-look-cell:hover {
          background: #ffffff !important;
        }

        .rp2-selected-panel .total-row {
          background: #eef3f8 !important;
          border: 1px solid #cbd7e5 !important;
          color: #1f2937;
        }

        .rp2-selected-panel .empty-cell {
          background: #f8fafc !important;
        }

        .rp2-selected-panel .cell-id {
          color: #8a97a8;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .rp2-selected-panel .input-cell {
          min-height: 36px;
          border: 1px solid #d8e1ec;
          border-radius: 10px;
          background: #ffffff;
          color: #273242;
        }

        .rp2-selected-panel .unitmix-subtable-cell,
        .rp2-selected-panel .unitmix-edge-top,
        .rp2-selected-panel .unitmix-edge-bottom,
        .rp2-selected-panel .unitmix-edge-left,
        .rp2-selected-panel .unitmix-edge-right,
        .rp2-selected-panel .a1-border-cell,
        .rp2-selected-panel .b1-border-cell {
          border: 1px solid #e1e8f2 !important;
        }

        .rp2-selected-panel .table thead th {
          background: #f4f7fb !important;
          color: #3f4a5a !important;
          border-color: #e2e8f0 !important;
          font-size: 12px;
          font-weight: 800 !important;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .rp2-selected-panel .table tbody td {
          border-color: #e2e8f0 !important;
          color: #273242;
        }

        .rp2-selected-panel .btn {
          min-height: 40px;
          font-weight: 800;
          border-radius: 999px;
        }

        @media (max-width: 768px) {
          .rp2-selected-header,
          .rp2-selected-body {
            padding-left: 20px;
            padding-right: 20px;
          }

          .rp2-selected-title {
            font-size: 28px;
          }
        }

        @media (min-width: 1400px) {
          .rp2-selected-panel .excel-grid-first {
            --rp2-unitmix-visible-offset: 187px;
          }
        }

        @media (max-width: 1399px) and (min-width: 1200px) {
          .rp2-selected-panel .excel-grid-first {
            --rp2-unitmix-visible-offset: 164px;
          }
        }

        @media (max-width: 1199px) {
          .rp2-selected-panel .excel-grid-first {
            --rp2-unitmix-visible-offset: 142px;
          }
        }
      `}</style>

      <main className={`rp2-container fade-in-up ${embedded ? 'rp2-embedded' : ''}`}>
        {/* Header Section (hidden when embedded in /new_rate_simulator) */}
        {!embedded && (
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 pb-3 border-bottom border-2" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
            <div className="mb-3 mb-md-0">
              <div className="d-flex align-items-center mb-2">
                <button
                  className="btn btn-outline-secondary btn-sm me-3 shadow-sm rounded-pill px-3 interactive-btn"
                  onClick={() => navigate(-1)}
                >
                  <FaArrowLeft className="me-1" /> Back
                </button>
                <h1 className="display-6 fw-bold text-dark mb-0">
                  <FaChartLine className="text-primary me-3" />Revenue Projection 2.0
                </h1>
              </div>
              <p className="text-secondary mb-0 ms-1 fw-medium text-dark">Interactive unit mix analysis and revenue calculation model.</p>
            </div>
          </div>
        )}

        {/* Instructions Card (hidden when embedded in /new_rate_simulator) */}
        {!embedded && (
          <div className="card border-0 shadow-sm rounded-4 mb-4 interactive-card" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-start">
                <div className="icon-shape bg-warning bg-opacity-20 text-warning rounded-circle p-2 me-3">
                  <FaInfoCircle />
                </div>
                <div className="flex-grow-1">
                  <h6 className="fw-bold text-dark mb-2"><FaLightbulb className="me-2" />Instructions</h6>
                  <div className="row g-2 text-dark small">
                    <div className="col-md-6">
                      <div><FaCheckCircle className="me-2 text-success" /> with formulas are highlighted in light green</div>
                      <div><FaCheckCircle className="me-2 text-success" />Percentage inputs automatically handle % suffix (enter 15 for 15%)</div>
                    </div>
                    <div className="col-md-6">
                      <div><FaCheckCircle className="me-2 text-success" />All calculations update automatically when you change any input</div>
                      <div><FaCheckCircle className="me-2 text-success" />Gray cells are calculated values (read-only)</div>
                      <div><FaCheckCircle className="me-2 text-success" />White cells with borders are user inputs</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Village Info Card */}
        {village ? (
          <div className="card border-0 shadow-sm rounded-4 mb-4 interactive-card fade-in-up">
            <div className="card-body p-3">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <div className="d-flex align-items-center">
                  <div className="icon-shape bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-2">
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <span className="fw-semibold text-dark d-block small">Village</span>
                    <span className="text-dark fw-bold">{village}</span>
                  </div>
                </div>
                {villageMeta.loading && (
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <span className="text-secondary small">Fetching ID...</span>
                  </div>
                )}
                {villageMeta.id != null && !villageMeta.loading && (
                  <div className="badge bg-white text-primary shadow-sm px-3 py-2 border border-primary rounded-pill">
                    <FaIdBadge className="me-2" />ID: <span className="fw-bold">{villageMeta.id}</span>
                  </div>
                )}
                {villageMeta.error && !villageMeta.loading && (
                  <span className="badge bg-danger-subtle text-danger border border-danger rounded-pill px-3 py-2">
                    <FaExclamationTriangle className="me-2" />{villageMeta.error}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* First Table - Unit Mix Section (Rows 1-13) */}
        <div className="rp2-selected-panel fade-in-up">
          <div className="rp2-selected-header">
            <div className="rp2-selected-eyebrow">Selected Section</div>
            <h2 className="rp2-selected-title">UNIT MIX Section</h2>
            <p className="rp2-selected-copy">Sigmavalue recommendations are calculated using historical data from the years 2022, 2023, and 2024.</p>
          </div>
          <div className="rp2-selected-body">
            <div className="card border-0 rounded-4 mb-4 overflow-hidden interactive-card fade-in-up rp2-table-card rp2-grid-card">
              <div className="card-header p-3">
                <h5 className="fw-bold mb-1"><FaCalculator className="me-2" />Unit Mix Calculation Table</h5>
                <p className="small mb-0">Objective: To Find Sales Velocity for a given Ticket Size for a Particular BHK</p>
              </div>
              <div className="card-body p-3" style={{ overflowX: 'hidden', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div className="rp2-grid-shell">
                  <div className="excel-grid excel-grid-first" id="excelGridFirst" style={{ width: 'fit-content', maxWidth: '100%' }}>
                    {grid.slice(0, 13).map((row, rowIndex) =>
                      row.map((cellData, colIndex) => {
                        if (rowIndex >= 11) return null; // Hide A12:J13 (cosmetic only)
                        if (colIndex === 10) return null; // Hide K1:K13 (cosmetic only)
                        if (colIndex === 3 || colIndex === 4) return null; // Hide D and E (they are empty in Unit Mix table)
                        const cellId = `${colLetters[colIndex]}${rowIndex + 1}`;

                        const classList = ['cell'];
                        if (rowIndex < 4) classList.push('header');
                        if (rowIndex === 10) classList.push('total-row');
                        if (cellData.formula) classList.push('formula-cell');
                        if (cellData.value === '' && !cellData.formula) classList.push('empty-cell');

                        // Cosmetic-only visibility rules:
                        // - Hide C1:J1 (row 1, cols C-J)
                        // - Hide row 2 (A2:K2) and use it as a small spacer gap
                        const hideRow2 = rowIndex === 1;
                        const hideC1ToJ1 = rowIndex === 0 && colIndex >= 2 && colIndex <= 9;
                        if (hideC1ToJ1) classList.push('cell-hidden');
                        if (hideRow2) classList.push('cell-gap', 'cell-hidden');

                        // Hide I3:J11 (row indices 2-10, col indices 8-9)
                        const hideI3ToJ11 = rowIndex >= 2 && rowIndex <= 10 && colIndex >= 8 && colIndex <= 9;
                        if (hideI3ToJ11) classList.push('cell-hidden');

                        // Border only around A1:B1
                        if (rowIndex === 0 && colIndex === 0) classList.push('a1-border-cell');
                        if (rowIndex === 0 && colIndex === 1) classList.push('b1-border-cell');

                        // Cosmetic-only subtable styling for A3:J11 (rows 3-11, cols A-J)
                        const inUnitMixSubtable = rowIndex >= 2 && rowIndex <= 10 && colIndex >= 0 && colIndex <= 9;
                        if (inUnitMixSubtable) {
                          classList.push('unitmix-subtable-cell');
                          if (rowIndex === 2) classList.push('unitmix-edge-top');
                          if (rowIndex === 10) classList.push('unitmix-edge-bottom');
                          if (colIndex === 0) classList.push('unitmix-edge-left');
                          if (colIndex === 9) classList.push('unitmix-edge-right');
                          // Add right border to H3:H11 (col index 7) since I3:J11 are hidden
                          if (colIndex === 7 && rowIndex >= 2 && rowIndex <= 10) classList.push('unitmix-edge-right');
                        }

                        return (
                          <div key={`first-${rowIndex}-${colIndex}`} className={classList.join(' ')}>
                            <div className="cell-container">
                              <div className="cell-id">{cellId}</div>
                              <div className="cell-content">{formatCellContent(rowIndex, colIndex, cellData)}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="card border-0 rounded-4 my-4 interactive-card fade-in-up rp2-tool-card">
              <div className="card-body p-4">
                <div className="d-flex flex-wrap align-items-center gap-3">
                  <button
                    className="btn btn-success rounded-pill px-4 py-2 shadow-sm interactive-btn"
                    onClick={async () => {
                      saveUnitMixToLocal();
                      await updateMarketAnalysis();
                    }}
                    disabled={isUpdatingAnalysis}
                  >
                    {isUpdatingAnalysis ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : (
                      <FaSave className="me-2" />
                    )}
                    {isUpdatingAnalysis ? 'Updating Analysis...' : 'Save and Update Analysis'}
                  </button>

                  <button
                    className="btn btn-primary rounded-pill px-4 py-2 shadow-sm interactive-btn"
                    onClick={resetToDefaults}
                  >
                    <FaUndo className="me-2" />Reset to Default Values
                  </button>
                  <button
                    className="btn btn-outline-primary rounded-pill px-4 py-2 shadow-sm interactive-btn"
                    onClick={async () => {
                      setGrid((prev) => recalculateAll(prev));
                      await updateMarketAnalysis();
                    }}
                    disabled={isUpdatingAnalysis}
                  >
                    {isUpdatingAnalysis ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : (
                      <FaSyncAlt className="me-2" />
                    )}
                    {isUpdatingAnalysis ? 'Recalculating...' : 'Recalculate and Update Market Data'}
                  </button>

                  <div className="d-flex align-items-center ms-md-auto">
                    <FaInfoCircle className="text-primary me-2" />
                    <span className="text-muted small">All calculations update automatically</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Market Analysis Charts Section (Hidden for now) */}
        {/*
        <div className="section-title fade-in-up mt-5">
          <i className="fas fa-chart-pie me-2"></i>Market Analysis Charts
        </div>
        <div className="row g-4 mb-4 fade-in-up">
          <div className="col-lg-3">
            <PricerateAnalysis />
          </div>
          <div className="col-lg-3">
            <SaleAnalysis />
          </div>
          <div className="col-lg-3">
            <SupplyDemandAnalysis option="demand" />
          </div>
          <div className="col-lg-3">
            <SupplyDemandAnalysis option="supply" />
          </div>
        </div>
        */}

        {/* Finalize Product Mix Summary Table */}
        <div className="rp2-selected-panel fade-in-up">
          <div className="rp2-selected-header">
            <div className="rp2-selected-eyebrow">Selected Section</div>
            <h2 className="rp2-selected-title">Finalize Product Mix Summary</h2>
          </div>
          <div className="rp2-selected-body">
            <div className="card border-0 rounded-4 mb-0 overflow-hidden interactive-card fade-in-up rp2-table-card">
              <div className="card-header p-3">
                <h6 className="fw-bold mb-0"><FaCubes className="me-2" />Product Mix Summary</h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-bordered table-hover mb-0" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th className="text-center fw-bold py-3 px-4" style={{ minWidth: '120px' }}>Unit Type</th>
                        <th className="text-center fw-bold py-3 px-4" style={{ minWidth: '160px' }}>Total Area Allotted (sqft)</th>
                        <th className="text-center fw-bold py-3 px-4" style={{ minWidth: '160px' }}>Area per Unit (sqft)</th>
                        <th className="text-center fw-bold py-3 px-4" style={{ minWidth: '140px' }}>Number of Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[4, 5, 6, 7, 8, 9].map((rowIdx) => {
                        const unitType = String(grid?.[rowIdx]?.[0]?.value ?? '').trim();
                        const totalArea = grid?.[rowIdx]?.[5]?.value;      // Col F â€“ Carpet Area (Unit Mix)
                        const areaPerUnit = grid?.[rowIdx]?.[2]?.value;    // Col C â€“ Avg Unit Area (Unit Mix)
                        const numUnits = grid?.[rowIdx + 11]?.[1]?.value; // Col B â€“ No. of Units (Revenue table)

                        // Only show rows where Total Area Allotted is a positive number
                        if (!(Number.isFinite(Number(totalArea)) && Number(totalArea) > 0)) return null;

                        const fmtNum = (v) =>
                          v != null && Number.isFinite(Number(v))
                            ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })
                            : 'â€”';
                        const fmtUnits = (v) =>
                          v != null && Number.isFinite(Number(v))
                            ? Math.round(Number(v)).toLocaleString()
                            : 'â€”';

                        return (
                          <tr key={`pmix-${rowIdx}`} style={{ transition: 'background 0.15s' }}>
                            <td className="text-center fw-semibold py-2 px-4" style={{ color: '#495057' }}>{unitType || 'â€”'}</td>
                            <td className="text-center py-2 px-4" style={{ color: '#2c3e50' }}>{fmtNum(totalArea)}</td>
                            <td className="text-center py-2 px-4" style={{ color: '#2c3e50' }}>{fmtNum(areaPerUnit)}</td>
                            <td className="text-center py-2 px-4 fw-bold" style={{ color: '#009255ff' }}>{fmtUnits(numUnits)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {false && (
          <div className="d-none card border-0 shadow-lg rounded-4 mb-5 overflow-hidden interactive-card fade-in-up" style={{ background: 'white' }}>
            <div className="card-header text-white p-3" style={{ background: 'linear-gradient(135deg, #00d660ff 0%, #00d660ff 100%)' }}>
              <h6 className="fw-bold mb-0"><FaCubes className="me-2" />Product Mix Summary</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered table-hover mb-0" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', color: '#2c3e50' }}>
                      <th className="text-center fw-bold py-3 px-4" style={{ borderBottom: '2px solid #7bff91ff', minWidth: '120px' }}>Unit Type</th>
                      <th className="text-center fw-bold py-3 px-4" style={{ borderBottom: '2px solid #7bff91ff', minWidth: '160px' }}>Total Area Allotted (sqft)</th>
                      <th className="text-center fw-bold py-3 px-4" style={{ borderBottom: '2px solid #7bff91ff', minWidth: '160px' }}>Area per Unit (sqft)</th>
                      <th className="text-center fw-bold py-3 px-4" style={{ borderBottom: '2px solid #7bff91ff', minWidth: '140px' }}>Number of Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[4, 5, 6, 7, 8, 9].map((rowIdx) => {
                      const unitType = String(grid?.[rowIdx]?.[0]?.value ?? '').trim();
                      const totalArea = grid?.[rowIdx]?.[5]?.value;      // Col F – Carpet Area (Unit Mix)
                      const areaPerUnit = grid?.[rowIdx]?.[2]?.value;    // Col C – Avg Unit Area (Unit Mix)
                      const numUnits = grid?.[rowIdx + 11]?.[1]?.value; // Col B – No. of Units (Revenue table)

                      // Only show rows where Total Area Allotted is a positive number
                      if (!(Number.isFinite(Number(totalArea)) && Number(totalArea) > 0)) return null;

                      const fmtNum = (v) =>
                        v != null && Number.isFinite(Number(v))
                          ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : '—';
                      const fmtUnits = (v) =>
                        v != null && Number.isFinite(Number(v))
                          ? Math.round(Number(v)).toLocaleString()
                          : '—';

                      return (
                        <tr key={`pmix-${rowIdx}`} style={{ transition: 'background 0.15s' }}>
                          <td className="text-center fw-semibold py-2 px-4" style={{ color: '#495057' }}>{unitType || '—'}</td>
                          <td className="text-center py-2 px-4" style={{ color: '#2c3e50' }}>{fmtNum(totalArea)}</td>
                          <td className="text-center py-2 px-4" style={{ color: '#2c3e50' }}>{fmtNum(areaPerUnit)}</td>
                          <td className="text-center py-2 px-4 fw-bold" style={{ color: '#009255ff' }}>{fmtUnits(numUnits)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        )}

        {/* Second Table - Revenue Table Section (Rows 14+) */}
        <div
          id="section-ticket-size"
          className="rp2-selected-panel fade-in-up"
          style={{ scrollMarginTop: "120px" }}
        >
          <div className="rp2-selected-header">
            <div className="rp2-selected-eyebrow">Selected Section</div>
            <h2 className="rp2-selected-title">Ticket Size Calculation</h2>
          </div>
          <div className="rp2-selected-body">
            <div className="card border-0 rounded-4 mb-4 overflow-hidden interactive-card fade-in-up rp2-table-card rp2-grid-card">
              <div className="card-header p-3">
                <h6 className="fw-bold mb-0"><FaMoneyBillWave className="me-2" />Ticket Size Calculation Table</h6>
              </div>
              <div className="card-body p-3" style={{ overflowX: 'hidden', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div className="rp2-grid-shell">
                  <div className="excel-grid excel-grid-second" id="excelGridSecond" style={{ width: 'fit-content', maxWidth: '100%' }}>
                    {grid.slice(13).map((row, rowIndex) => {
                      const actualRowIndex = rowIndex + 13; // Actual row index in the grid
                      return row.map((cellData, colIndex) => {
                        if (colIndex === 10) return null; // Hide K column (cosmetic only)
                        if (colIndex === 6) return null;  // Hide G column (G14:G22)
                        if (colIndex === 1) return null;  // Hide B column (B14:B21)
                        if (colIndex === 5) return null;  // Hide F column (F14:F21)
                        if (actualRowIndex === 21) return null; // Hide row 22 (A22:J22 TOTAL row)
                        const cellId = `${colLetters[colIndex]}${actualRowIndex + 1}`;

                        const classList = ['cell'];
                        if (actualRowIndex === 14) classList.push('header');
                        if (actualRowIndex === 22) classList.push('total-row');
                        if (cellData.formula) classList.push('formula-cell');
                        if (actualRowIndex >= 15 && actualRowIndex <= 20 && (colIndex === 2 || colIndex === 4)) {
                          classList.push('rp2-value-look-cell');
                        }
                        if (cellData.value === '' && !cellData.formula) classList.push('empty-cell');

                        return (
                          <div key={`second-${actualRowIndex}-${colIndex}`} className={classList.join(' ')}>
                            <div className="cell-container">
                              <div className="cell-id">{cellId}</div>
                              <div className="cell-content">{formatCellContent(actualRowIndex, colIndex, cellData)}</div>
                            </div>
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>
              </div>
            </div>

            {false && (
              <div className="d-none card border-0 shadow-lg rounded-4 mb-4 overflow-hidden interactive-card fade-in-up" style={{ background: 'white' }}>
                <div className="card-header bg-gradient text-white p-3" style={{ background: 'linear-gradient(135deg, #28a745 0%, #34ce57 100%)' }}>
                  <h6 className="fw-bold mb-0"><FaMoneyBillWave className="me-2" />Ticket Size Calculation Table</h6>
                </div>
                <div className="card-body p-3" style={{ overflowX: 'hidden', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <div className="excel-grid excel-grid-second" id="excelGridSecond" style={{ width: 'fit-content', maxWidth: '100%' }}>
                    {grid.slice(13).map((row, rowIndex) => {
                      const actualRowIndex = rowIndex + 13; // Actual row index in the grid
                      return row.map((cellData, colIndex) => {
                        if (colIndex === 10) return null; // Hide K column (cosmetic only)
                        if (colIndex === 6) return null;  // Hide G column (G14:G22)
                        if (colIndex === 1) return null;  // Hide B column (B14:B21)
                        if (colIndex === 5) return null;  // Hide F column (F14:F21)
                        if (actualRowIndex === 21) return null; // Hide row 22 (A22:J22 TOTAL row)
                        const cellId = `${colLetters[colIndex]}${actualRowIndex + 1}`;

                        const classList = ['cell'];
                        if (actualRowIndex === 14 || actualRowIndex === 15) classList.push('header');
                        if (actualRowIndex === 22) classList.push('total-row');
                        if (cellData.formula) classList.push('formula-cell');
                        if (cellData.value === '' && !cellData.formula) classList.push('empty-cell');

                        return (
                          <div key={`second-${actualRowIndex}-${colIndex}`} className={classList.join(' ')}>
                            <div className="cell-container">
                              <div className="cell-id">{cellId}</div>
                              <div className="cell-content">{formatCellContent(actualRowIndex, colIndex, cellData)}</div>
                            </div>
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>
              </div>

            )}

            {/* Action Buttons */}
            <div className="card border-0 shadow-sm rounded-4 my-4 interactive-card fade-in-up">
              <div className="card-body p-4">
                <div className="d-flex flex-wrap align-items-center gap-3">
                  <button
                    className="btn btn-success rounded-pill px-4 py-2 shadow-sm interactive-btn"
                    onClick={async () => {
                      saveUnitMixToLocal();
                      await updateMarketAnalysis();
                    }}
                    disabled={isUpdatingAnalysis}
                  >
                    {isUpdatingAnalysis ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : (
                      <FaSave className="me-2" />
                    )}
                    {isUpdatingAnalysis ? 'Updating Analysis...' : 'Save and Update Analysis'}
                  </button>

                  <button
                    className="btn btn-primary rounded-pill px-4 py-2 shadow-sm interactive-btn"
                    onClick={resetToDefaults}
                  >
                    <FaUndo className="me-2" />Reset to Default Values
                  </button>
                  <button
                    className="btn btn-outline-primary rounded-pill px-4 py-2 shadow-sm interactive-btn"
                    onClick={async () => {
                      setGrid((prev) => recalculateAll(prev));
                      await updateMarketAnalysis();
                    }}
                    disabled={isUpdatingAnalysis}
                  >
                    {isUpdatingAnalysis ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : (
                      <FaSyncAlt className="me-2" />
                    )}
                    {isUpdatingAnalysis ? 'Recalculating...' : 'Recalculate and Update Market Data'}
                  </button>

                  <div className="d-flex align-items-center ms-md-auto">
                    <i className="fas fa-info-circle text-primary me-2"></i>
                    <span className="text-muted small">All calculations update automatically</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Note Card (hidden when embedded in /new_rate_simulator) */}
        {!embedded && (
          <div className="card border-0 shadow-sm rounded-4 mt-4 interactive-card fade-in-up" style={{ background: 'linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)' }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-start">
                <div className="icon-shape bg-info bg-opacity-20 text-info rounded-circle p-2 me-3">
                  <FaLightbulb />
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-2"><FaStickyNote className="me-2" />Note</h6>
                  <p className="mb-2 text-dark">
                    Since we have to find most optimum rate for highest sales. Thus THIS Constitute training data set
                  </p>
                  <p className="mb-0 text-dark">
                    This simulation allows you to test different rates to find the optimal pricing strategy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RevenueProjection2;
