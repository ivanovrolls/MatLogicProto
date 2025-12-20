import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

type Graph = {
  id: number;
  title: string;
  user_id: number;
};

type NodeT = {
  id: number;
  name: string;
  graph_id: number;
};

type EdgeT = {
  id: number;
  from_node_id: number;
  to_node_id: number;
};

const API_BASE = "/api"; // via Vite proxy → http://localhost:8000

export default function App() {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [edges, setEdges] = useState<EdgeT[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

//load
  useEffect(() => {
    async function load() {
      try {
        const [g, n, e] = await Promise.all([
          fetch(`${API_BASE}/graphs/`).then(r => r.json()),
          fetch(`${API_BASE}/nodes/`).then(r => r.json()),
          fetch(`${API_BASE}/edges/`).then(r => r.json()),
        ]);

        setGraphs(g);
        setNodes(n);
        setEdges(e);

        if (g.length > 0) {
          setSelectedGraphId(g[0].id);
        }
      } catch (err) {
        setError("Failed to load data from backend");
      }
    }

    load();
  }, []);

//convert backend nodes to react flow nodes
  const flowNodes = useMemo(() => {
    if (!selectedGraphId) return [];

    return nodes
      .filter(n => n.graph_id === selectedGraphId)
      .map(n => ({
        id: String(n.id),
        data: { label: n.name },
        position: {
          x: Math.random() * 400,
          y: Math.random() * 400,
        },
      }));
  }, [nodes, selectedGraphId]);

//same conversion for edges
  const flowEdges = useMemo(() => {
    if (!selectedGraphId) return [];

    const nodeIds = new Set(
      nodes.filter(n => n.graph_id === selectedGraphId).map(n => n.id)
    );

    return edges
      .filter(e => nodeIds.has(e.from_node_id) && nodeIds.has(e.to_node_id))
      .map(e => ({
        id: String(e.id),
        source: String(e.from_node_id),
        target: String(e.to_node_id),
      }));
  }, [edges, nodes, selectedGraphId]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ padding: 12, borderBottom: "1px solid #ddd" }}>
        <strong>MatsLogic</strong>

        {error && (
          <span style={{ marginLeft: 12, color: "crimson" }}>
            {error}
          </span>
        )}

        <span style={{ marginLeft: 12 }}>
          Graph:{" "}
          <select
            value={selectedGraphId ?? ""}
            onChange={e => setSelectedGraphId(Number(e.target.value))}
          >
            {graphs.map(g => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </span>
      </div>

      {/* Graph canvas */}
      <div style={{ flex: 1 }}>
        <ReactFlow nodes={flowNodes} edges={flowEdges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
