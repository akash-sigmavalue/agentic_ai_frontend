import { apiUrl } from "@/lib/api-client";

const SIMULATION_ENDPOINT = "/new_rate_simulator/simulator/irr/run-simulation";

/**
 * Runs IRR cashflow simulation using Metric List payload.
 * @param {object} payload - Metric List simulation input JSON
 * @returns {Promise<{ data: object, tokenLedger: object|null }>}
 */
export async function runIrrCashflowSimulation(payload) {
  const response = await fetch(apiUrl(SIMULATION_ENDPOINT), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("Invalid response from simulation server.");
  }

  if (!response.ok || body?.success === false) {
    const message =
      body?.error ||
      body?.message ||
      `Simulation failed (${response.status})`;
    throw new Error(message);
  }

  if (!body?.data) {
    throw new Error("Simulation response did not include result data.");
  }

  return {
    data: body.data,
    tokenLedger: body.tokenLedger ?? null,
  };
}

export async function runSalesInflowSimulation(payload) {
  const response = await fetch(apiUrl("/new_rate_simulator/simulator/irr/run-sales-inflow-simulation"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("Invalid response from server.");
  }

  if (!response.ok || body?.success === false) {
    const message =
      body?.error ||
      body?.message ||
      `Simulation failed (${response.status})`;
    throw new Error(message);
  }

  return body.data;
}
