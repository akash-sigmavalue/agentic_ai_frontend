"use client";

import dynamic from "next/dynamic";
import RoleGuard from "@/components/shared/RoleGuard";

const MarketResearchApp = dynamic(() => import("@/components/market_research/MarketResearchApp"), { ssr: false });

export default function MarketResearchPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN"]} agentKey="market_research">
      <MarketResearchApp />
    </RoleGuard>
  );
}
