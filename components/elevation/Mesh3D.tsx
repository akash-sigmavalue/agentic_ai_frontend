"use client";

import React, { useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { Box } from "lucide-react";
import type { ElevationGridResponse } from "@/types/elevation.ts";

/* ── Elevation color ramp (low → high) ────────────────────────────────── */
function elevationColor(t: number): THREE.Color {
  const stops: [number, [number, number, number]][] = [
    [0.0,  [0.08, 0.32, 0.18]],  // deep forest green
    [0.1,  [0.14, 0.50, 0.22]],  // green
    [0.22, [0.38, 0.62, 0.20]],  // yellow-green
    [0.35, [0.68, 0.72, 0.28]],  // light green / grassland
    [0.48, [0.78, 0.68, 0.36]],  // tan / sandy
    [0.60, [0.62, 0.48, 0.32]],  // brown earth
    [0.72, [0.55, 0.45, 0.40]],  // dark rock
    [0.84, [0.70, 0.68, 0.65]],  // light grey rock
    [0.94, [0.88, 0.88, 0.90]],  // near snow
    [1.0,  [0.98, 0.98, 1.0]],   // snow white
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return new THREE.Color(
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f
      );
    }
  }
  return new THREE.Color(0.98, 0.98, 1.0);
}

/* ── Proportional footprint and dynamic height scaling calculation ───── */
function calculateMeshDimensions(data: ElevationGridResponse, exaggeration: number) {
  const { min_lat, max_lat, min_lng, max_lng } = data.bounds;
  const latMid = (min_lat + max_lat) / 2;
  const radLat = (latMid * Math.PI) / 180;

  // Approximate relative physical scaling
  const latDistance = (max_lat - min_lat) * 111320;
  const lngDistance = (max_lng - min_lng) * 111320 * Math.cos(radLat);

  // Maximum dimension is mapped to 10 units in the WebGL canvas footprint
  const maxDistance = Math.max(latDistance, lngDistance) || 1;

  const widthUnits = (lngDistance / maxDistance) * 10;
  const heightUnits = (latDistance / maxDistance) * 10;

  const scaleX = widthUnits / (data.cols - 1 || 1);
  const scaleZ = heightUnits / (data.rows - 1 || 1);

  // Vertical scale matches the horizontal scale proportionally, times exaggeration
  const verticalScale = (10 / maxDistance) * exaggeration;

  return {
    widthUnits,
    heightUnits,
    scaleX,
    scaleZ,
    verticalScale,
  };
}

/* ── Build terrain geometry from elevation grid ───────────────────────── */
function buildTerrainGeometry(data: ElevationGridResponse, exaggeration: number, colorMode: "elevation" | "cutfill") {
  const { rows, cols, elevations, mask, min_elevation, max_elevation } = data;
  if (min_elevation == null || max_elevation == null) return null;

  const range = max_elevation - min_elevation || 1;

  const points: { x: number; y: number; z: number; t: number; dz: number }[] = [];
  const indexMap: (number | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  const { widthUnits, heightUnits, scaleX, scaleZ, verticalScale } = calculateMeshDimensions(data, exaggeration);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!mask[r][c] || elevations[r][c] == null) continue;
      const elev = elevations[r][c]!;
      const normalizedElev = (elev - min_elevation) / range; // 0..1

      const px = c * scaleX - (widthUnits / 2);
      const py = (elev - min_elevation) * verticalScale;
      const pz = (heightUnits / 2) - r * scaleZ; // North is at -Z (top), South is at +Z (bottom)
      const dz = data.cut_fill_depths?.[r]?.[c] ?? 0;

      indexMap[r][c] = points.length;
      points.push({ x: px, y: py, z: pz, t: normalizedElev, dz });
    }
  }

  if (points.length < 3) return null;

  // Build triangles from grid adjacency
  const indices: number[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = indexMap[r][c];
      const tr = indexMap[r][c + 1];
      const bl = indexMap[r + 1][c];
      const br = indexMap[r + 1][c + 1];

      if (tl != null && bl != null && tr != null) {
        indices.push(tl, bl, tr);
      }
      if (tr != null && bl != null && br != null) {
        indices.push(tr, bl, br);
      }
    }
  }

  // Build BufferGeometry
  const positions = new Float32Array(points.length * 3);
  const colors = new Float32Array(points.length * 3);

  let maxCut = 1.0;
  let maxFill = 1.0;
  if (colorMode === "cutfill" && data.cut_fill_depths) {
    const flatDepths = data.cut_fill_depths.flat().filter((d): d is number => d !== null && d !== undefined);
    const cuts = flatDepths.filter(d => d > 0);
    const fills = flatDepths.filter(d => d < 0);
    if (cuts.length > 0) maxCut = Math.max(...cuts);
    if (fills.length > 0) maxFill = Math.abs(Math.min(...fills));
  }

  points.forEach((p, i) => {
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;

    if (colorMode === "cutfill") {
      const dz = p.dz;
      if (dz > 0) {
        const t = dz / maxCut;
        // Interpolate between slate grey (0.2, 0.25, 0.33) and red (0.9, 0.2, 0.2)
        colors[i * 3] = 0.2 + (0.9 - 0.2) * t;
        colors[i * 3 + 1] = 0.25 + (0.2 - 0.25) * t;
        colors[i * 3 + 2] = 0.33 + (0.2 - 0.33) * t;
      } else if (dz < 0) {
        const t = Math.abs(dz) / maxFill;
        // Interpolate between slate grey (0.2, 0.25, 0.33) and blue/cyan (0.1, 0.6, 0.9)
        colors[i * 3] = 0.2 + (0.1 - 0.2) * t;
        colors[i * 3 + 1] = 0.25 + (0.6 - 0.25) * t;
        colors[i * 3 + 2] = 0.33 + (0.9 - 0.33) * t;
      } else {
        colors[i * 3] = 0.2;
        colors[i * 3 + 1] = 0.25;
        colors[i * 3 + 2] = 0.33;
      }
    } else {
      const col = elevationColor(p.t);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/* ── Build wireframe edges geometry ───────────────────────────────────── */
function buildWireframeGeometry(data: ElevationGridResponse, exaggeration: number) {
  const { rows, cols, elevations, mask, min_elevation, max_elevation } = data;
  if (min_elevation == null || max_elevation == null) return null;

  const { widthUnits, heightUnits, scaleX, scaleZ, verticalScale } = calculateMeshDimensions(data, exaggeration);

  const linePositions: number[] = [];

  function getPos(r: number, c: number): [number, number, number] | null {
    if (!mask[r]?.[c] || elevations[r][c] == null) return null;
    const elev = elevations[r][c]!;
    return [
      c * scaleX - (widthUnits / 2),
      (elev - min_elevation!) * verticalScale,
      (heightUnits / 2) - r * scaleZ,
    ];
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = getPos(r, c);
      if (!p) continue;

      if (c < cols - 1) {
        const pr = getPos(r, c + 1);
        if (pr) linePositions.push(...p, ...pr);
      }
      if (r < rows - 1) {
        const pb = getPos(r + 1, c);
        if (pb) linePositions.push(...p, ...pb);
      }
    }
  }

  if (linePositions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(linePositions, 3)
  );
  return geometry;
}

/* ── Base thickness constant ─────────────────────────────────────────── */
const BASE_Y = -0.5;

/* ── Build solid base and skirt geometry ──────────────────────────────── */
function buildTerrainBaseGeometry(data: ElevationGridResponse, exaggeration: number) {
  const { rows, cols, elevations, mask, min_elevation, max_elevation } = data;
  if (min_elevation == null || max_elevation == null) return null;

  const points: { x: number; y: number; z: number }[] = [];
  const indexMap: (number | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  const { widthUnits, heightUnits, scaleX, scaleZ, verticalScale } = calculateMeshDimensions(data, exaggeration);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!mask[r][c] || elevations[r][c] == null) continue;
      const elev = elevations[r][c]!;
      const px = c * scaleX - (widthUnits / 2);
      const py = (elev - min_elevation) * verticalScale;
      const pz = (heightUnits / 2) - r * scaleZ;

      indexMap[r][c] = points.length;
      points.push({ x: px, y: py, z: pz });
    }
  }

  const N = points.length;
  if (N < 3) return null;

  // Build top indices to identify boundary edges
  const topIndices: number[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = indexMap[r][c];
      const tr = indexMap[r][c + 1];
      const bl = indexMap[r + 1][c];
      const br = indexMap[r + 1][c + 1];

      if (tl != null && bl != null && tr != null) {
        topIndices.push(tl, bl, tr);
      }
      if (tr != null && bl != null && br != null) {
        topIndices.push(tr, bl, br);
      }
    }
  }

  // Find boundary edges: edges that appear exactly once in topIndices
  const edgeCount = new Map<string, { v0: number; v1: number; count: number }>();
  for (let i = 0; i < topIndices.length; i += 3) {
    const t0 = topIndices[i];
    const t1 = topIndices[i + 1];
    const t2 = topIndices[i + 2];

    const edges = [
      [t0, t1],
      [t1, t2],
      [t2, t0],
    ];

    edges.forEach(([v0, v1]) => {
      const key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;
      const existing = edgeCount.get(key);
      if (existing) {
        existing.count++;
      } else {
        edgeCount.set(key, { v0, v1, count: 1 });
      }
    });
  }

  const boundaryEdges: { v0: number; v1: number }[] = [];
  edgeCount.forEach((val) => {
    if (val.count === 1) {
      boundaryEdges.push({ v0: val.v0, v1: val.v1 });
    }
  });

  // Total vertices: 2 * N (0..N-1 are top positions, N..2N-1 are bottom positions)
  const positions = new Float32Array(2 * N * 3);
  for (let i = 0; i < N; i++) {
    const p = points[i];
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;

    positions[(i + N) * 3] = p.x;
    positions[(i + N) * 3 + 1] = BASE_Y; // Base bottom floor
    positions[(i + N) * 3 + 2] = p.z;
  }

  const indices: number[] = [];

  // 1. Bottom plate triangles (flip winding order to face downwards)
  for (let i = 0; i < topIndices.length; i += 3) {
    const t0 = topIndices[i] + N;
    const t1 = topIndices[i + 1] + N;
    const t2 = topIndices[i + 2] + N;
    indices.push(t0, t2, t1);
  }

  // 2. Skirt triangles (side walls)
  boundaryEdges.forEach(({ v0, v1 }) => {
    const v0_top = v0;
    const v0_bot = v0 + N;
    const v1_top = v1;
    const v1_bot = v1 + N;

    // Quad faces
    indices.push(v0_top, v0_bot, v1_top);
    indices.push(v1_top, v0_bot, v1_bot);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/* ── Terrain Mesh Scene ───────────────────────────────────────────────── */
function TerrainScene({
  data,
  showWireframe,
  exaggeration,
  compassDialRef,
  setTooltip,
  colorMode,
}: {
  data: ElevationGridResponse;
  showWireframe: boolean;
  exaggeration: number;
  compassDialRef: React.RefObject<HTMLDivElement | null>;
  setTooltip: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      x: number;
      y: number;
      elevation: number | null;
      lat: number | null;
      lng: number | null;
      cutFillDepth: number | null;
    }>
  >;
  colorMode: "elevation" | "cutfill";
}) {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);

  const lastTerrainGeom = useRef<THREE.BufferGeometry | null>(null);
  const terrainGeometry = useMemo(() => {
    if (lastTerrainGeom.current) {
      lastTerrainGeom.current.dispose();
    }
    const geom = buildTerrainGeometry(data, exaggeration, colorMode);
    lastTerrainGeom.current = geom;
    return geom;
  }, [data, exaggeration, colorMode]);

  const lastBaseGeom = useRef<THREE.BufferGeometry | null>(null);
  const baseGeometry = useMemo(() => {
    if (lastBaseGeom.current) {
      lastBaseGeom.current.dispose();
    }
    const geom = buildTerrainBaseGeometry(data, exaggeration);
    lastBaseGeom.current = geom;
    return geom;
  }, [data, exaggeration]);

  const lastWireframeGeom = useRef<THREE.BufferGeometry | null>(null);
  const wireframeGeometry = useMemo(() => {
    if (lastWireframeGeom.current) {
      lastWireframeGeom.current.dispose();
    }
    const geom = buildWireframeGeometry(data, exaggeration);
    lastWireframeGeom.current = geom;
    return geom;
  }, [data, exaggeration]);

  // Gentle camera-relative 2D HUD Compass orientation (auto-rotation disabled to align with 2D Map)
  useFrame((state, delta) => {
    if (groupRef.current) {
      if (compassDialRef.current) {
        const camX = state.camera.position.x;
        const camZ = state.camera.position.z;
        const camAngleRad = Math.atan2(camX, camZ);
        
        // Subtract model rotation to get relative orientation
        const relAngleRad = camAngleRad - groupRef.current.rotation.y;
        const relAngleDeg = relAngleRad * (180 / Math.PI);
        
        compassDialRef.current.style.transform = `rotate(${relAngleDeg}deg)`;
      }
    }
  });

  // Calculate dynamic dimensions for helpers
  const { widthUnits, heightUnits, scaleX, scaleZ, verticalScale } = useMemo(
    () => calculateMeshDimensions(data, exaggeration),
    [data, exaggeration]
  );

  const modelRadius = useMemo(
    () => Math.sqrt((widthUnits / 2) ** 2 + (heightUnits / 2) ** 2),
    [widthUnits, heightUnits]
  );
  
  const ringRadiusInner = modelRadius + 0.6;
  const ringRadiusOuter = modelRadius + 0.8;
  const labelRadius = modelRadius + 1.2;
  const gridHelperSize = Math.max(14, Math.ceil((modelRadius + 2) * 2));

  // Handle raycast hover to extract coordinates and elevation
  const handlePointerMove = useCallback((e: any) => {
    e.stopPropagation();
    if (!groupRef.current) return;

    // Convert raycast point from world coordinates to local rotated group coordinates
    const localPoint = groupRef.current.worldToLocal(e.point.clone());
    const { x, z } = localPoint;

    const c = Math.max(0, Math.min(data.cols - 1, Math.round((x + widthUnits / 2) / scaleX)));
    const r = Math.max(0, Math.min(data.rows - 1, Math.round((heightUnits / 2 - z) / scaleZ)));

    const elev = data.elevations[r]?.[c];
    if (elev != null && data.mask[r]?.[c]) {
      const lat = data.bounds.min_lat + r * data.bounds.lat_step;
      const lng = data.bounds.min_lng + c * data.bounds.lng_step;
      const cutFillDepth = data.cut_fill_depths?.[r]?.[c] ?? null;

      const py = (elev - data.min_elevation!) * verticalScale;
      const px = c * scaleX - (widthUnits / 2);
      const pz = (heightUnits / 2) - r * scaleZ;

      setHoverPoint(new THREE.Vector3(px, py, pz));

      // Bounding box for HTML placement relative to canvas wrapper
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();

      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        elevation: elev,
        lat,
        lng,
        cutFillDepth,
      });
    } else {
      setHoverPoint(null);
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  }, [data, widthUnits, heightUnits, scaleX, scaleZ, verticalScale, setTooltip, gl]);

  const handlePointerOut = useCallback(() => {
    setHoverPoint(null);
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, [setTooltip]);

  if (!terrainGeometry) {
    return (
      <Text position={[0, 0, 0]} fontSize={0.5} color="#94a3b8">
        No elevation data to render
      </Text>
    );
  }

  return (
    <group ref={groupRef}>
      {/* Solid terrain mesh */}
      <mesh
        geometry={terrainGeometry}
        castShadow
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.65}
          metalness={0.05}
          flatShading
        />
      </mesh>

      {/* Solid vertical base skirt and bottom plate */}
      {baseGeometry && (
        <mesh geometry={baseGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color="#1e293b" // slate dark block color
            side={THREE.DoubleSide}
            roughness={0.8}
            metalness={0.1}
            flatShading
          />
        </mesh>
      )}

      {/* Hover Highlighter Marker and Projector Line */}
      {hoverPoint && (
        <group>
          {/* Snap dot */}
          <mesh position={hoverPoint}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#22d3ee" toneMapped={false} />
          </mesh>
          {/* Projector cylinder line to base */}
          <mesh position={[hoverPoint.x, (hoverPoint.y + BASE_Y) / 2, hoverPoint.z]}>
            <cylinderGeometry args={[0.012, 0.012, hoverPoint.y - BASE_Y, 8]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.35} />
          </mesh>
        </group>
      )}

      {/* Wireframe overlay */}
      {showWireframe && wireframeGeometry && (
        <lineSegments geometry={wireframeGeometry}>
          <lineBasicMaterial
            color="#818cf8"
            transparent
            opacity={0.12}
            linewidth={1}
          />
        </lineSegments>
      )}

      {/* Base shadow plane (placed at bottom of base block) */}
      <mesh position={[0, BASE_Y - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[gridHelperSize, gridHelperSize]} />
        <meshStandardMaterial
          color="#0f1729"
          transparent
          opacity={0.8}
          roughness={1}
        />
      </mesh>

      {/* Grid lines on floor */}
      <gridHelper
        args={[gridHelperSize, gridHelperSize, "#1e293b", "#1e293b"]}
        position={[0, BASE_Y - 0.01, 0]}
      />

      {/* 3D Floor Compass ring and indicators */}
      <group position={[0, BASE_Y + 0.01, 0]}>
        {/* Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringRadiusInner, ringRadiusOuter, 64]} />
          <meshBasicMaterial color="#334155" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
        {/* North Arrow pointer (Red, points to -Z / top) */}
        <mesh position={[0, 0, -(ringRadiusInner - 0.3)]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.5, 4]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        {/* South pointer (Grey, points to +Z / bottom) */}
        <mesh position={[0, 0, ringRadiusInner - 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.12, 0.4, 4]} />
          <meshBasicMaterial color="#64748b" />
        </mesh>
      </group>

      {/* Flat Floor Direction labels */}
      <Text position={[0, BASE_Y + 0.02, -labelRadius]} fontSize={0.65} color="#ef4444" rotation={[-Math.PI / 2, 0, 0]}>
        N
      </Text>
      <Text position={[0, BASE_Y + 0.02, labelRadius]} fontSize={0.5} color="#94a3b8" rotation={[-Math.PI / 2, 0, 0]}>
        S
      </Text>
      <Text position={[labelRadius, BASE_Y + 0.02, 0]} fontSize={0.5} color="#94a3b8" rotation={[-Math.PI / 2, 0, 0]}>
        E
      </Text>
      <Text position={[-labelRadius, BASE_Y + 0.02, 0]} fontSize={0.5} color="#94a3b8" rotation={[-Math.PI / 2, 0, 0]}>
        W
      </Text>
    </group>
  );
}

/* ── Cut & Fill Color Legend ────────────────────────────────────────── */
function CutFillLegend({
  maxCut,
  maxFill,
}: {
  maxCut: number;
  maxFill: number;
}) {
  return (
    <div className="absolute bottom-6 right-6 z-10 glass-card p-3.5 fade-in-up flex flex-col gap-1.5 min-w-[180px] border border-white/5">
      <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wider mb-1">
        Earthwork Depth (ΔZ)
      </p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-rose-500 shadow-sm border border-white/10" />
            <span className="text-[10px] text-slate-300 font-semibold">Cut (Excavate)</span>
          </div>
          <span className="text-[10px] text-rose-400 font-mono font-bold">+{maxCut.toFixed(1)}m</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-slate-600 shadow-sm border border-white/10" />
            <span className="text-[10px] text-slate-300 font-semibold">Balance (0m)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono font-bold">0.0m</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-cyan-500 shadow-sm border border-white/10" />
            <span className="text-[10px] text-slate-300 font-semibold">Fill (Deposit)</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono font-bold">-{maxFill.toFixed(1)}m</span>
        </div>
      </div>
    </div>
  );
}

/* ── Color Legend ─────────────────────────────────────────────────────── */
function ColorLegend({
  minElev,
  maxElev,
}: {
  minElev: number;
  maxElev: number;
}) {
  const stops = [0, 0.25, 0.5, 0.75, 1.0];
  return (
    <div className="absolute bottom-6 right-6 z-10 glass-card p-3 fade-in-up">
      <p className="text-xs text-[var(--text-muted)] mb-2 font-semibold">
        Elevation
      </p>
      <div className="flex items-end gap-1">
        {stops.map((t) => {
          const c = elevationColor(t);
          const hex = `rgb(${Math.round(c.r * 255)}, ${Math.round(
            c.g * 255
          )}, ${Math.round(c.b * 255)})`;
          const label = Math.round(minElev + t * (maxElev - minElev));
          return (
            <div key={t} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {label}m
              </span>
              <div
                className="w-6 h-10 rounded"
                style={{ backgroundColor: hex }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Mesh3D Component ────────────────────────────────────────────── */
interface Mesh3DProps {
  data: ElevationGridResponse | null;
  showWireframe: boolean;
  exaggeration: number;
  colorMode: "elevation" | "cutfill";
  balanceZ: number;
  onBalanceZChange: (val: number | null) => void;
}

export default function Mesh3D({
  data,
  showWireframe,
  exaggeration,
  colorMode = "elevation",
  balanceZ,
  onBalanceZChange,
}: Mesh3DProps) {
  const compassDialRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    elevation: number | null;
    lat: number | null;
    lng: number | null;
    cutFillDepth: number | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    elevation: null,
    lat: null,
    lng: null,
    cutFillDepth: null,
  });

  return (
    <div className="relative w-full h-full" style={{ background: "#0b0e17" }}>
      {/* Always-mounted Canvas — never hidden, never unmounted */}
      <Canvas
        camera={{ position: [0, 8, 12], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        shadows
        style={{ width: "100%", height: "100%", borderRadius: "var(--radius-lg)" }}
      >
        <color attach="background" args={["#0b0e17"]} />

        {/* Lighting — key + fill + rim */}
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[8, 12, 6]}
          intensity={1.6}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          color="#f8fafc"
        />
        <directionalLight
          position={[-6, 8, -4]}
          intensity={0.4}
          color="#818cf8"
        />
        <pointLight position={[0, 12, 0]} intensity={0.3} color="#22d3ee" />

        {/* Subtle fog to soften far edges */}
        <fog attach="fog" args={["#0b0e17", 25, 60]} />

        {data ? (
          <>
            {/* Terrain and Base scene */}
            <TerrainScene
              data={data}
              showWireframe={showWireframe}
              exaggeration={exaggeration}
              compassDialRef={compassDialRef}
              setTooltip={setTooltip}
              colorMode={colorMode}
            />

            {/* Camera controls */}
            <OrbitControls
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.5}
              zoomSpeed={0.8}
              minDistance={4}
              maxDistance={30}
              maxPolarAngle={Math.PI / 2.05}
              target={[0, 1.5, 0]}
            />
          </>
        ) : (
          /* Empty scene placeholder — just an invisible mesh so the canvas renders */
          <mesh visible={false}>
            <boxGeometry args={[0.01, 0.01, 0.01]} />
            <meshBasicMaterial />
          </mesh>
        )}
      </Canvas>

      {/* HTML placeholder overlay — shown on top of the dark canvas when no data */}
      {!data && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center glass-card p-8 max-w-sm border border-slate-800/40 pointer-events-auto">
            <Box className="w-10 h-10 text-[var(--accent-indigo)] mx-auto mb-3 opacity-40 animate-pulse" />
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1">
              No 3D Terrain Generated
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Draw an area using the <strong>Draw Area</strong> tool on the 2D map, and click <strong>Generate 3D Terrain</strong> in the header to visualize elevation in 3D.
            </p>
          </div>
        </div>
      )}

      {/* 2D HUD Compass overlay */}
      {data && (
        <div className="absolute top-4 left-4 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Compass</div>
          <div className="relative w-12 h-12 rounded-full border border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-center shadow-lg">
            <div className="absolute -top-0.5 w-1 h-2 bg-cyan-400 rounded-sm z-30" />
            <div
              ref={compassDialRef}
              className="w-full h-full rounded-full relative flex items-center justify-center transition-transform duration-75"
              style={{ transform: "rotate(0deg)" }}
            >
              <div className="absolute top-0.5 text-[9px] font-black text-red-500">N</div>
              <div className="absolute bottom-0.5 text-[9px] font-bold text-slate-400">S</div>
              <div className="absolute right-1 text-[9px] font-bold text-slate-400">E</div>
              <div className="absolute left-1 text-[9px] font-bold text-slate-400">W</div>
              <div className="w-2 h-2 rounded-full border border-slate-500/20" />
              <div className="absolute w-5 h-[1px] bg-slate-500/10" />
              <div className="absolute h-5 w-[1px] bg-slate-500/10" />
            </div>
          </div>
        </div>
      )}

      {/* 3D Map Balance Elevation Adjustment Overlay */}
      {data && data.min_elevation != null && data.max_elevation != null && (
        <div className="absolute top-4 right-4 z-20 glass-card p-3.5 border border-white/10 w-72 flex flex-col gap-2.5 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Balance Z Adjustment
            </span>
            <button
              onClick={() => onBalanceZChange(null)}
              className="text-[9px] font-bold text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700/60 cursor-pointer"
              title="Reset to automatically calculated mean elevation"
            >
              Reset to Mean
            </button>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
              <span>Target Pad Z:</span>
              <div className="flex items-center gap-1 bg-slate-950/40 px-2 py-1 rounded border border-slate-800/80 focus-within:border-indigo-500/50">
                <input
                  type="number"
                  step="0.1"
                  min={data.min_elevation}
                  max={data.max_elevation}
                  value={Number(balanceZ.toFixed(1))}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onBalanceZChange(val);
                  }}
                  className="w-16 bg-transparent focus:outline-none text-white text-center font-bold font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500">m</span>
              </div>
            </div>
            
            <input
              type="range"
              min={data.min_elevation}
              max={data.max_elevation}
              step={Number(((data.max_elevation - data.min_elevation) / 200).toFixed(2)) || 0.1}
              value={balanceZ}
              onChange={(e) => onBalanceZChange(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
            />
            
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>Min: {data.min_elevation.toFixed(1)}m</span>
              <span>Max: {data.max_elevation.toFixed(1)}m</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip overlay */}
      {data && tooltip.visible && tooltip.elevation != null && (
        <div
          className="absolute pointer-events-none z-30 transition-all duration-75 -translate-x-1/2 -translate-y-[calc(100%+16px)]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className={`glass-card px-3.5 py-2.5 flex flex-col gap-1 min-w-[140px] shadow-2xl relative border ${
            colorMode === "cutfill"
              ? tooltip.cutFillDepth != null
                ? tooltip.cutFillDepth > 0
                  ? "border-rose-500/35"
                  : tooltip.cutFillDepth < 0
                  ? "border-cyan-500/35"
                  : "border-slate-500/35"
                : "border-cyan-500/25"
              : "border-cyan-500/25"
          }`}>
            <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest flex items-center justify-between gap-2">
              <span>{colorMode === "cutfill" ? "Cut/Fill Info" : "Terrain Info"}</span>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                colorMode === "cutfill"
                  ? tooltip.cutFillDepth != null
                    ? tooltip.cutFillDepth > 0
                      ? "bg-rose-500"
                      : tooltip.cutFillDepth < 0
                      ? "bg-cyan-400"
                      : "bg-slate-400"
                    : "bg-cyan-400"
                  : "bg-cyan-400"
              }`} />
            </div>
            {colorMode === "cutfill" && tooltip.cutFillDepth != null ? (
              <div className="flex flex-col gap-0.5 my-0.5">
                <div className="flex items-baseline gap-1">
                  {tooltip.cutFillDepth > 0 ? (
                    <>
                      <span className="text-sm font-black text-rose-400 font-mono">
                        {tooltip.cutFillDepth.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-semibold text-rose-500">m (Cut)</span>
                    </>
                  ) : tooltip.cutFillDepth < 0 ? (
                    <>
                      <span className="text-sm font-black text-cyan-400 font-mono">
                        {Math.abs(tooltip.cutFillDepth).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-semibold text-cyan-500">m (Fill)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-black text-slate-300 font-mono">0.00</span>
                      <span className="text-[10px] font-semibold text-slate-400">m (Balance)</span>
                    </>
                  )}
                </div>
                <div className="text-[9px] text-slate-400 font-mono">
                  Elev: {tooltip.elevation.toFixed(1)}m
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-black text-white font-mono">{tooltip.elevation.toFixed(1)}</span>
                <span className="text-[10px] font-semibold text-slate-400">meters</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5 border-t border-white/5 pt-1.5 mt-1 text-[9px] font-mono text-slate-400">
              <div>Lat: {tooltip.lat?.toFixed(5)}°</div>
              <div>Lng: {tooltip.lng?.toFixed(5)}°</div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-slate-900/90" />
          </div>
        </div>
      )}

      {/* Legend */}
      {data && data.min_elevation != null && data.max_elevation != null && (
        colorMode === "cutfill" ? (
          <CutFillLegend
            maxCut={(() => {
              if (!data.cut_fill_depths) return 1.0;
              const flatDepths = data.cut_fill_depths.flat().filter((d): d is number => d !== null && d !== undefined);
              const cuts = flatDepths.filter(d => d > 0);
              return cuts.length > 0 ? Math.max(...cuts) : 1.0;
            })()}
            maxFill={(() => {
              if (!data.cut_fill_depths) return 1.0;
              const flatDepths = data.cut_fill_depths.flat().filter((d): d is number => d !== null && d !== undefined);
              const fills = flatDepths.filter(d => d < 0);
              return fills.length > 0 ? Math.abs(Math.min(...fills)) : 1.0;
            })()}
          />
        ) : (
          <ColorLegend minElev={data.min_elevation} maxElev={data.max_elevation} />
        )
      )}

      {/* Controls hint */}
      <div className="absolute bottom-6 left-6 z-10 fade-in-up">
        <div className="glass-card-subtle px-3 py-2">
          <p className="text-[11px] text-[var(--text-muted)]">
            🖱️ Drag to orbit · Scroll to zoom · Right-drag to pan
          </p>
        </div>
      </div>
    </div>
  );
}
