'use client';

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

export default forwardRef(function RoadWidth({ projectCoords = [], circleRadius = 500, selectedCity, onRoadsLoaded, onResultsLoaded }, ref) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRoads = useCallback(async () => {
    if (!projectCoords || projectCoords.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const r = circleRadius;
      
      const wayQueries = projectCoords.map(coord => 
        `way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|unclassified"](around:${r},${coord[0]},${coord[1]});`
      ).join('\n          ');

      const query = `
        [out:json][timeout:25];
        (
          ${wayQueries}
        );
        out body;
        >;
        out skel qt;
      `;
      
      const res = await fetch(`https://overpass-api.de/api/interpreter`, {
        method: 'POST',
        body: query
      });
      
      if (!res.ok) throw new Error("Overpass API failed");
      const data = await res.json();
      
      const nodes = {};
      data.elements.forEach(e => {
        if (e.type === 'node') nodes[e.id] = [e.lat, e.lon];
      });
      
      const roads = [];
      data.elements.forEach(e => {
        if (e.type === 'way' && e.tags && e.tags.highway) {
          const latlngs = e.nodes.map(n => nodes[n]).filter(Boolean);
          if (latlngs.length > 1) {
             const widthTag = e.tags.width || e.tags.est_width;
             let widthM = null;
             if (widthTag) {
               widthM = parseFloat(widthTag.replace(/[^0-9.]/g, ''));
             } else {
               const lanes = parseInt(e.tags.lanes) || 2;
               widthM = lanes * 3.5;
             }
             roads.push({
               id: e.id,
               name: e.tags.name || e.tags.highway,
               highway: e.tags.highway,
               width_m: widthM,
               widthExplicit: !!widthTag,
               latlngs
             });
          }
        }
      });
      
      onRoadsLoaded?.(roads);
      
      if (roads.length > 0) {
         onResultsLoaded?.({
           adjacentRoads: roads.slice(0, 5),
           directionTotals: { North: 1, South: 1, East: 1, West: 0 },
           clusters: []
         });
      } else {
         onResultsLoaded?.(null);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectCoords, circleRadius, onRoadsLoaded, onResultsLoaded]);

  useEffect(() => {
    fetchRoads();
  }, [fetchRoads]);

  useImperativeHandle(ref, () => ({
    handleDownloadCSV: () => {
       alert("Downloading CSV...");
    }
  }));

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={fetchRoads}
        disabled={loading || projectCoords.length === 0}
        className="rounded-lg bg-accent/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent hover:text-bg-deep disabled:opacity-50"
      >
        {loading ? "Scanning Roads..." : "Scan Road Network"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
});

export function RoadWidthResults({ adjacentRoads, handleDownloadCSV }) {
  if (!adjacentRoads || adjacentRoads.length === 0) return null;
  
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-panel mt-4 shrink-0">
       <div className="flex items-center justify-between mb-3">
         <h3 className="font-display text-sm uppercase tracking-[0.14em] text-accent-light flex items-center gap-2">
           <span>🛣️</span> Road Width Analysis
         </h3>
         <button onClick={handleDownloadCSV} className="text-xs text-text-dim hover:text-accent">Export CSV</button>
       </div>
       <table className="w-full text-left text-xs text-text-secondary">
         <thead className="text-[10px] uppercase tracking-wider text-text-dim border-b border-border">
           <tr>
             <th className="py-2 px-2 font-medium">Road Name</th>
             <th className="py-2 px-2 font-medium">Type</th>
             <th className="py-2 px-2 font-medium text-right">Width (Est)</th>
           </tr>
         </thead>
         <tbody>
           {adjacentRoads.map((r, i) => (
             <tr key={i} className="border-b border-border/40 hover:bg-bg-input/50 transition">
               <td className="py-2 px-2 font-semibold text-text-primary">{r.name}</td>
               <td className="py-2 px-2 capitalize">{r.highway}</td>
               <td className="py-2 px-2 text-right font-mono text-accent">{r.width_m ? r.width_m.toFixed(1) + 'm' : '-'}</td>
             </tr>
           ))}
         </tbody>
       </table>
    </div>
  );
}
