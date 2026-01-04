export type Graph = { id: number; title: string; user_id: number };
export type NodeT = { id: number; name: string; graph_id: number };
export type EdgeT = { id: number; from_node_id: number; to_node_id: number };

const API_BASE = "/api"; //Vite proxy

export async function listGraphs(): Promise<Graph[]> { //fetches all graphs
  const r = await fetch(`${API_BASE}/graphs/`);
  if (!r.ok) throw new Error(`Failed to load graphs: ${r.status}`);
  return r.json();
}

export async function listNodes(): Promise<NodeT[]> { //fetches all nodes
  const r = await fetch(`${API_BASE}/nodes/`);
  if (!r.ok) throw new Error(`Failed to load nodes: ${r.status}`);
  return r.json();
}

export async function listEdges(): Promise<EdgeT[]> { //feteches all edges
  const r = await fetch(`${API_BASE}/edges/`);
  if (!r.ok) throw new Error(`Failed to load edges: ${r.status}`);
  return r.json();
}

export async function apiFetch( //wrapper that automatically adds headers to fetch requests
  path: string,
  init: RequestInit = {},
  token?: string | null
) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body != null) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
