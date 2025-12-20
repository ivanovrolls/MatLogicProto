export type Graph = { id: number; title: string; user_id: number };
export type NodeT = { id: number; name: string; graph_id: number };
export type EdgeT = { id: number; from_node_id: number; to_node_id: number };

const API_BASE = "/api"; //Vite proxy

export async function listGraphs(): Promise<Graph[]> {
  const r = await fetch(`${API_BASE}/graphs/`);
  if (!r.ok) throw new Error(`Failed to load graphs: ${r.status}`);
  return r.json();
}

export async function listNodes(): Promise<NodeT[]> {
  const r = await fetch(`${API_BASE}/nodes/`);
  if (!r.ok) throw new Error(`Failed to load nodes: ${r.status}`);
  return r.json();
}

export async function listEdges(): Promise<EdgeT[]> {
  const r = await fetch(`${API_BASE}/edges/`);
  if (!r.ok) throw new Error(`Failed to load edges: ${r.status}`);
  return r.json();
}
