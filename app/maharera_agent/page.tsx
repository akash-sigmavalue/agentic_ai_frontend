import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";

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

  return (
    <main className="min-h-screen bg-[#f4f5f2] pt-20">
      <iframe
        title="MahaRERA Agent"
        srcDoc={html}
        className="block h-[calc(100vh-5rem)] w-full border-0"
      />
    </main>
  );
}


