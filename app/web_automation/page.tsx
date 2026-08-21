import type { Metadata } from "next";
import { connection } from "next/server";
import WebAutomationApp from "@/components/web_automation/WebAutomationApp";
import AutomationRouteTabs from "@/components/web_automation/AutomationRouteTabs";
import "./web_automation.css";

export const metadata: Metadata = {
  title: "Web Automation | Sigmavalue AI Pilot",
  description: "Universal browser automation agent interface.",
};

export default async function WebAutomationPage() {
  await connection();
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_WEB_AUTOMATION_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "");
  return (
    <>
      <AutomationRouteTabs />
      <WebAutomationApp initialApiBaseUrl={apiBaseUrl} />
    </>
  );
}
