import dagre from 'dagre';
import { WorkflowNode, WorkflowEdge, MarkerData } from '../types/agents';

export function extractCoordinates(text: string): MarkerData[] {
  const markers: MarkerData[] = [];
  
  // Regex for latitude: 18.5597, longitude: 73.7799
  const regex1 = /latitude:\s*(-?\d+\.\d+),\s*longitude:\s*(-?\d+\.\d+)/gi;
  // Regex for 18.5597, 73.7799 or (18.5597, 73.7799)
  const regex2 = /\(?(-?\d+\.\d+),\s*(-?\d+\.\d+)\)?/g;

  let match;
  while ((match = regex1.exec(text)) !== null) {
    markers.push({
      id: Math.random().toString(36).substr(2, 9),
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
      label: `Location ${markers.length + 1}`,
    });
  }

  while ((match = regex2.exec(text)) !== null) {
    // Avoid double counting if already matched by regex1
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!markers.some(m => m.lat === lat && m.lng === lng)) {
      markers.push({
        id: Math.random().toString(36).substr(2, 9),
        lat,
        lng,
        label: `Location ${markers.length + 1}`,
      });
    }
  }

  return markers;
}

export function extractWorkflow(text: string): any | null {
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.nodes && data.edges) {
        return data;
      }
    } catch (e) {
      console.error("Failed to parse workflow JSON", e);
    }
  }
  return null;
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 100;

export const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return {
    nodes: nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        targetPosition: isHorizontal ? 'left' : 'top',
        sourcePosition: isHorizontal ? 'right' : 'bottom',
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      };
    }),
    edges,
  };
};

export function saveMarkers(markers: MarkerData[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sigmavalue_markers', JSON.stringify(markers));
  }
}

export function loadMarkers(): MarkerData[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('sigmavalue_markers');
    return data ? JSON.parse(data) : [];
  }
  return [];
}
