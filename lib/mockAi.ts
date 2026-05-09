export async function getAiResponse(userMessage: string): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const lower = userMessage.toLowerCase();

  if (lower.includes('workflow') || lower.includes('process')) {
    return `Certainly. I have generated an intelligent workflow for your request. 

Check the workflow panel for the updated visualization.

\`\`\`json
{
  "nodes": [
    { "id": "1", "type": "input", "data": { "label": "Initiate Search", "description": "Starting the data discovery phase", "owner": "System", "status": "Done" } },
    { "id": "2", "type": "default", "data": { "label": "Analyze Vectors", "description": "Processing high-dimensional embeddings", "owner": "AI Core", "status": "In Progress" } },
    { "id": "3", "type": "decision", "data": { "label": "Quality Check", "description": "Verifying data integrity", "owner": "Validator" } },
    { "id": "4", "type": "output", "data": { "label": "Final Report", "description": "Generating executive summary", "owner": "Reporting" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "animated": true },
    { "id": "e2-3", "source": "2", "target": "3", "animated": true },
    { "id": "e3-4", "source": "3", "target": "4", "label": "Approved" }
  ]
}
\`\`\``;
  }

  if (lower.includes('map') || lower.includes('location') || lower.includes('coordinate')) {
    return `I have identified key geographical nodes for this operation. I've pinned them to your navigation console.

Key points found:
- Primary Hub: (18.5204, 73.8567)
- Secure Node: latitude: 18.5597, longitude: 73.7799
- Research Center: 18.5913, 73.7412

You can now view these locations in the Map & Visualization panel.`;
  }

  return `I am Sigmavalue AI Pilot, your intelligent workspace assistant. 

I can help you visualize complex workflows, map out geographical data, and manage your AI-driven tasks.

Try asking me to "generate a workflow for data processing" or "show me locations in Pune".`;
}
