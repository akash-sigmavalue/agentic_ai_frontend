"use client";

import dynamic from "next/dynamic";

const FullScreenMap = dynamic(() => import("./FullScreenMap"), {
  ssr: false,
  loading: () => <div className="map-agent-loading"><span />Preparing map intelligence...</div>,
});

export default function MapAgentClient() {
  return <FullScreenMap />;
}
