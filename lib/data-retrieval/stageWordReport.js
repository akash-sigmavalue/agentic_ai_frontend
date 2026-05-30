function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sortStageEntries(stages = {}, orderedStageNames = []) {
  const entries = Object.entries(stages || {});
  if (!orderedStageNames?.length) {
    return entries.sort(([left], [right]) => left.localeCompare(right));
  }
  const orderMap = new Map(orderedStageNames.map((name, index) => [name, index]));
  return entries.sort(([left], [right]) => {
    const leftOrder = orderMap.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderMap.get(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.localeCompare(right);
  });
}

export function buildStageWordReportHtml(data, modelLabel = "Unknown model") {
  const generatedAt = new Date().toLocaleString();
  const reactIterations = data.react_iterations || [];
  const stageLabels = data.stage_labels || {};
  const loopStagePattern = /^stage_3_[1-4](?:_iteration_\d+)?$/;

  const stageSections = sortStageEntries(data.stages, data.ordered_stage_names)
    .filter(([stageName]) => !reactIterations.length || !loopStagePattern.test(stageName))
    .map(([stageName, value]) => {
      const heading = stageLabels[stageName] || stageName.replaceAll("_", ".");
      return `
    <h2>${escapeHtml(heading)}</h2>
    <p><em>${escapeHtml(stageName)}</em></p>
    <pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>
  `;
    })
    .join("");

  const reactSections = reactIterations
    .map((iteration) => {
      const blocks = [
        ["Stage 3.1 - SQL Review", iteration.sql_review_output],
        ["Stage 3.2 - SQL Probe", iteration.sql_probe_output],
        ["Stage 3.3 - SQL Observe", iteration.sql_observe_output],
        ["Stage 3.4 - SQL Fix", iteration.sql_fix_output],
      ]
        .filter(([, value]) => value)
        .map(
          ([stageLabel, value]) => `
      <h3>${escapeHtml(stageLabel)}</h3>
      <pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>
    `,
        )
        .join("");
      return `
    <h2>ReAct Iteration ${escapeHtml(iteration.iteration)}</h2>
    ${blocks}
  `;
    })
    .join("");

  const supplemental = [
    ["SQL Build Output", data.sql_build_output],
    ["SQL Review Output", data.sql_review_output],
    ["SQL Probe Output", data.sql_probe_output],
    ["SQL Observe Output", data.sql_observe_output],
    ["SQL Fix Output", data.sql_fix_output],
    ["Final Answer Output", data.sql_final_output],
  ]
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
    <h2>${escapeHtml(label)}</h2>
    <pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>
  `,
    )
    .join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Data Retrieval Agent v2 - Stage Report</title>
      <style>
        body { font-family: Arial, sans-serif; color: #19221f; margin: 24px; }
        h1 { color: #125a47; }
        h2 { margin-top: 26px; border-bottom: 1px solid #d7ddd7; padding-bottom: 6px; color: #125a47; }
        h3 { margin-top: 18px; color: #334155; }
        .metadata { border: 1px solid #d7ddd7; background: #f5f5f0; padding: 12px; border-radius: 8px; }
        pre { white-space: pre-wrap; word-wrap: break-word; font-family: Consolas, monospace; font-size: 10pt; background: #f8faf8; border: 1px solid #e2e8e2; padding: 12px; border-radius: 6px; }
      </style>
    </head>
    <body>
      <h1>Real Estate Data Retrieval Agent v2 — Stage Report</h1>
      <div class="metadata">
        <p><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p>
        <p><strong>Model:</strong> ${escapeHtml(modelLabel)}</p>
        <p><strong>Status:</strong> ${escapeHtml(data.pipeline_status)}</p>
        <p><strong>Query:</strong> ${escapeHtml(data.query)}</p>
        <p><strong>Message:</strong> ${escapeHtml(data.message || "")}</p>
        ${
          data.token_count
            ? `<p><strong>Total Tokens:</strong> ${escapeHtml(data.token_count.total_tokens || 0)}</p>`
            : ""
        }
      </div>
      ${
        data.token_count
          ? `<h2>Token Usage</h2><pre>${escapeHtml(JSON.stringify(data.token_count, null, 2))}</pre>`
          : ""
      }
      <h2>All Stage JSON Outputs</h2>
      ${stageSections || "<p>No stage outputs were returned.</p>"}
      ${reactSections}
      ${supplemental}
    </body>
  </html>`;
}

export function downloadStageWordReport(data, modelLabel = "Unknown model") {
  if (!data || typeof window === "undefined") {
    return;
  }

  const documentBody = buildStageWordReportHtml(data, modelLabel);
  const reportBlob = new Blob(["\ufeff", documentBody], {
    type: "application/msword;charset=utf-8",
  });
  const reportUrl = URL.createObjectURL(reportBlob);
  const downloadLink = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  downloadLink.href = reportUrl;
  downloadLink.download = `data-retrieval-v2-stages-${dateStamp}.doc`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(reportUrl);
}

export function isSuccessfulPipelineStatus(status) {
  return status === "completed" || status === "no_data";
}
