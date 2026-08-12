import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import MahaReraClient from "./MahaReraClient";

export const metadata: Metadata = {
  title: "MahaRERA Agent | Sigmavalue AI Pilot",
  description: "Frontend UI for the MahaRERA browser agent.",
};

export default function MahaReraAgentPage() {
  const htmlPath = path.join(process.cwd(), "frontend", "index.html");
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_MAHARERA_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "");
  const html = fs
    .readFileSync(htmlPath, "utf8")
    .replace("__MAHARERA_API_BASE_URL__", apiBaseUrl);

  return <MahaReraClient html={html} />;
}
