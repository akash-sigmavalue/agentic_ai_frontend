import type { Metadata } from "next";
import { connection } from "next/server";
import MahaReraAgentApp from "@/components/maharera_agent/MahaReraAgentApp";

export const metadata: Metadata = {
  title: "MahaRERA Agent | Sigmavalue AI Pilot",
  description: "Frontend UI for the Universal RERA browser agent.",
};

export default async function MahaReraAgentPage() {
  await connection();

  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_MAHARERA_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "");

  return <MahaReraAgentApp initialApiBaseUrl={apiBaseUrl} />;
}
