import type { Metadata } from "next";
import MapAgentClient from "@/components/mapAgent/MapAgentClient";
import "@/components/mapAgent/map-agent.css";

export const metadata: Metadata = {
  title: "Map Agent | Sigmavalue AI",
  description: "Interactive real-estate valuation and market intelligence map.",
};

export default function MapAgentPage() {
  return <MapAgentClient />;
}
