"use client";

import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function AnimatedDots() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const dots = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      r: Math.random() * 2.5 + 1.5,
    }));

    let rafId;
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(56,189,248,0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      dots.forEach((dot) => {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > 1) dot.vx *= -1;
        if (dot.y < 0 || dot.y > 1) dot.vy *= -1;
      });

      for (let i = 0; i < dots.length; i += 1) {
        for (let j = i + 1; j < dots.length; j += 1) {
          const dx = (dots[i].x - dots[j].x) * width;
          const dy = (dots[i].y - dots[j].y) * height;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 100) {
            ctx.strokeStyle = `rgba(59,130,246,${0.16 * (1 - distance / 100)})`;
            ctx.beginPath();
            ctx.moveTo(dots[i].x * width, dots[i].y * height);
            ctx.lineTo(dots[j].x * width, dots[j].y * height);
            ctx.stroke();
          }
        }
      }

      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x * width, dot.y * height, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(125,211,252,0.55)";
        ctx.fill();
      });

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

const STATS = [
  { label: "Layers", value: "Live", icon: "🗂️" },
  { label: "Coverage", value: "Geo", icon: "📡" },
];

export default function MapPanelClient({ markers }) {
  const defaultCenter = [20.5937, 78.9629];
  const center = markers.length ? [markers[0].lat, markers[0].lng] : defaultCenter;

  return (
    <section className="panel-shell relative min-h-[320px] overflow-hidden">
      <div className="panel-header-shell relative z-10">
        <div className="flex items-center gap-3">
          <div className="panel-icon bg-cyan-400/15 text-cyan-300">🗺️</div>
          <div>
            <h2 className="panel-heading">Map & Visualization</h2>
            <p className="panel-subheading">Coordinates extracted from the agent response</p>
          </div>
        </div>
        <span className={`status-pill ${markers.length ? "status-pill-success" : "status-pill-warn"}`}>
          {markers.length ? `${markers.length} location${markers.length > 1 ? "s" : ""}` : "No markers yet"}
        </span>
      </div>

      <AnimatedDots />

      <div className="relative z-10 flex-1">
        {markers.length ? (
          <MapContainer center={center} zoom={8} scrollWheelZoom className="h-full min-h-[280px] w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
            />
            {markers.map((marker, index) => (
              <Marker key={`${marker.lat}-${marker.lng}-${index}`} position={[marker.lat, marker.lng]}>
                <Popup>
                  <div className="max-w-[250px] text-sm text-slate-900">
                    <strong>{marker.address}</strong>
                    <br />
                    {marker.insight}
                    <br />
                    <span className="mt-1 block text-xs text-slate-500">
                      {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-cyan-400/40 bg-cyan-400/10 text-3xl text-cyan-200">
              🗺️
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Geospatial View</h3>
              <p className="mt-2 max-w-[220px] text-xs leading-6 text-slate-400">
                Ask about a project, locality, or address and any detected coordinates will show up here.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STATS.map((item) => (
                <div key={item.label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-400">
                  {item.icon} {item.label}: {item.value}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
