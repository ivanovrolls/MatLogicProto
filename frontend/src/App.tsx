import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
} from "reactflow";
import type {
  Connection,
  EdgeChange,
  NodeChange,
  Edge as RFEdge,
  Node as RFNode,
  ReactFlowInstance
} from "reactflow";
import "reactflow/dist/style.css";

type User = {
  id: number;
  name: string;
  email: string;
};

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

const API_BASE = "/api";

//generates localStorage key for node positions per graph
function posKey(graphId: number) {
  return `matlogic:positions:${graphId}`;
}
type PosMap = Record<string, { x: number; y: number }>;

//retrieves saved node positions from localStorage for a graph
function loadPositions(graphId: number): PosMap {
  try {
    const raw = localStorage.getItem(posKey(graphId));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

//saves node positions to localStorage for a graph
function savePositions(graphId: number, map: PosMap) {
  try {
    localStorage.setItem(posKey(graphId), JSON.stringify(map));
  } catch {
  }
}

//custom hexagonal node component for bjj techniques
function HexNode({ data, selected }: { data: { label: string }; selected: boolean }) {
  return (
    <div
      style={{
        width: 75,
        height: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
        textAlign: "center",
        fontSize: 11,
        fontWeight: 500,
        userSelect: "none",
        clipPath: "polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)",

        border: selected ? "2px solid #ea580c" : "1.5px solid #c2410c",

        background: selected
          ? "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)"
          : "linear-gradient(135deg, #c2410c 0%, #9a3412 100%)",

        boxShadow: selected
          ? "0 4px 12px rgba(234, 88, 12, 0.45), inset 0 1px 0 rgba(255,255,255,0.2)"
          : "0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",

        transition: "all 0.2s ease",
        position: "relative",
      }}
    >
      {/* target handle (incoming) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.9)",
          background: selected ? "#ea580c" : "#fdba74",
        }}
      />

      <span style={{ color: selected ? "#7c2d12" : "#fff7ed" }}>
        {data.label}
      </span>

      {/* source handle (outgoing) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.9)",
          background: selected ? "#ea580c" : "#fdba74",
        }}
      />
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [edges, setEdges] = useState<EdgeT[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGraphId, setSelectedGraphId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  //deleting nodes/edges state
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<number[]>([]);

  const nodeTypes = useMemo(() => ({ hex: HexNode }), []); //hexagonal node lock

  //for zooming and panning control
  const rfInstance = useRef<ReactFlowInstance | null>(null);


  const [newGraphTitle, setNewGraphTitle] = useState("");
  const [newNodeName, setNewNodeName] = useState("");

  //react flow state for rendering draggable nodes and connectable edges
  const [rfNodes, setRfNodes, onNodesChangeBase] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChangeBase] = useEdgesState([]);

  //debounces localStorage writes to avoid excessive saves on drag
  const saveTimer = useRef<number | null>(null);

  //dark mode
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("matlogic:theme");
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme; // <html data-theme="...">
    localStorage.setItem("matlogic:theme", theme);
  }, [theme]);

  //fetches all data from backend and sets defaults
  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [u, g, n, e] = await Promise.all([
        fetch(`${API_BASE}/users/`).then((r) => r.json()),
        fetch(`${API_BASE}/graphs/`).then((r) => r.json()),
        fetch(`${API_BASE}/nodes/`).then((r) => r.json()),
        fetch(`${API_BASE}/edges/`).then((r) => r.json()),
      ]);

      setUsers(u);
      setGraphs(g);
      setNodes(n);
      setEdges(e);

      if (u.length > 0 && selectedUserId == null) setSelectedUserId(u[0].id);
      if (g.length > 0 && selectedGraphId == null) setSelectedGraphId(g[0].id);
    } catch {
      setError("Failed to load data from backend");
    }
  }, [selectedGraphId, selectedUserId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  //deletes nodes and their connected edges both in backend and local state
  async function deleteNodesById(ids: number[]) {
    if (ids.length === 0) return;

    //delete in backend first
    await Promise.all(
      ids.map(id => fetch(`${API_BASE}/nodes/${id}`, { method: "DELETE" }))
    );

    //update local state
    setEdges(prev =>
      prev.filter(e => !ids.includes(e.from_node_id) && !ids.includes(e.to_node_id))
    );
    setNodes(prev => prev.filter(n => !ids.includes(n.id)));
  }

  async function deleteEdgesById(ids: number[]) {
    if (ids.length === 0) return;

    await Promise.all(
      ids.map(id => fetch(`${API_BASE}/edges/${id}`, { method: "DELETE" }))
    );

    setEdges(prev => prev.filter(e => !ids.includes(e.id)));
  }

  function isTypingInEditableElement(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    const isInputLike = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    return isInputLike || target.isContentEditable;
  }

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      //backspace + delete
      if (isTypingInEditableElement(e.target)) return;
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      //prevent browser navigation back on Backspace
      e.preventDefault();

      try {
        //prefer deleting edges first if both are selected (safer)
        if (selectedEdgeIds.length > 0) {
          await deleteEdgesById(selectedEdgeIds);
          setSelectedEdgeIds([]);
        }

        if (selectedNodeIds.length > 0) {
          await deleteNodesById(selectedNodeIds);
          setSelectedNodeIds([]);
        }
      } catch {
        setError("Failed to delete selection");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNodeIds, selectedEdgeIds]);

  //filters backend nodes to only those in selected graph
  const graphNodes = useMemo(() => {
    if (!selectedGraphId) return [];
    return nodes.filter((n) => n.graph_id === selectedGraphId);
  }, [nodes, selectedGraphId]);

  //filters backend edges to only those connecting nodes in selected graph
  const graphEdges = useMemo(() => {
    if (!selectedGraphId) return [];
    const nodeIds = new Set(graphNodes.map((n) => n.id));
    return edges.filter((e) => nodeIds.has(e.from_node_id) && nodeIds.has(e.to_node_id));
  }, [edges, graphNodes, selectedGraphId]);

  //rebuilds react flow nodes/edges when graph selection or backend data changes
  useEffect(() => {
    if (!selectedGraphId) {
      setRfNodes([]);
      setRfEdges([]);
      return;
    }

    const pos = loadPositions(selectedGraphId);

    const nextRfNodes: RFNode[] = graphNodes.map((n) => {
      const saved = pos[String(n.id)];
      return {
        id: String(n.id),
        type: "hex",
        data: { label: n.name },
        position: saved ?? { x: 80 + Math.random() * 420, y: 80 + Math.random() * 420 },
      };
    });

    const nextRfEdges: RFEdge[] = graphEdges.map((e) => ({
      id: String(e.id),
      source: String(e.from_node_id),
      target: String(e.to_node_id),
      type: "straight",
    }));

    setRfNodes(nextRfNodes);
    setRfEdges(nextRfEdges);
  }, [selectedGraphId, graphNodes, graphEdges, setRfNodes, setRfEdges]);

  //writes current node positions to localStorage
  const persistPositions = useCallback(
    (nextNodes: RFNode[]) => {
      if (!selectedGraphId) return;
      const map: PosMap = {};
      for (const n of nextNodes) {
        map[n.id] = { x: n.position.x, y: n.position.y };
      }
      savePositions(selectedGraphId, map);
    },
    [selectedGraphId]
  );

  //handles node changes and debounces position persistence
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes);

      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        setRfNodes((curr) => {
          persistPositions(curr);
          return curr;
        });
      }, 200);
    },
    [onNodesChangeBase, persistPositions, setRfNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeBase(changes);
    },
    [onEdgesChangeBase]
  );

  //creates edge in backend when user connects two nodes in ui
  const onConnect = useCallback(
    async (connection: Connection) => {
      setError(null);

      if (!connection.source || !connection.target) return;
      const fromId = Number(connection.source);
      const toId = Number(connection.target);

      //optimistically add edge to ui before backend confirms
      setRfEdges((eds) => addEdge({ ...connection, type: "straight" }, eds));

      try {
        const res = await fetch(`${API_BASE}/edges/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from_node_id: fromId, to_node_id: toId }),
        });

        if (!res.ok) {
          const msg = await res.text();
          await loadAll();
          setError(
            res.status === 409
              ? "That edge already exists."
              : `Failed to create edge (${res.status}): ${msg}`
          );
          return;
        }

        const created: EdgeT = await res.json();
        setEdges((prev) => [...prev, created]);

        //replace optimistic edge with real backend edge id
        setRfEdges((prev) => [
          ...prev.filter((e) => !(e.source === connection.source && e.target === connection.target)),
          { id: String(created.id), source: String(created.from_node_id), target: String(created.to_node_id), type: "straight" },
        ]);
      } catch {
        await loadAll();
        setError("Failed to create edge (network error)");
      }
    },
    [loadAll, setEdges, setRfEdges]
  );

  //creates new graph in backend
  const createGraph = useCallback(async () => {
    setError(null);
    const title = newGraphTitle.trim();
    const userId = selectedUserId ?? users[0]?.id;

    if (!title) {
      setError("Graph title cannot be empty.");
      return;
    }
    if (!userId) {
      setError("No user available to attach the graph to. Create a user first.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/graphs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, user_id: userId }),
      });

      if (!res.ok) {
        const msg = await res.text();
        setError(`Failed to create graph (${res.status}): ${msg}`);
        return;
      }

      const created: Graph = await res.json();
      setGraphs((prev) => [...prev, created]);
      setSelectedGraphId(created.id);
      setNewGraphTitle("");
    } catch {
      setError("Failed to create graph (network error)");
    }
  }, [newGraphTitle, selectedUserId, users]);

  //creates new node (technique) in backend for selected graph
  const createNode = useCallback(async () => {
    setError(null);
    if (!selectedGraphId) {
      setError("Select a graph first.");
      return;
    }

    const name = newNodeName.trim();
    if (!name) {
      setError("Technique name cannot be empty.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/nodes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, graph_id: selectedGraphId }),
      });

      if (!res.ok) {
        const msg = await res.text();
        setError(`Failed to create node (${res.status}): ${msg}`);
        return;
      }

      const created: NodeT = await res.json();
      setNodes((prev) => [...prev, created]);
      setNewNodeName("");

      //add new node to react flow with random position and persist
      setRfNodes((prev) => {
        const next = [
          ...prev,
          {
            id: String(created.id),
            type: "hex",
            data: { label: created.name },
            position: { x: 160 + Math.random() * 260, y: 160 + Math.random() * 260 },
          },
        ];
        persistPositions(next);
        return next;
      });
    } catch {
      setError("Failed to create node (network error)");
    }
  }, [newNodeName, persistPositions, selectedGraphId, setNodes, setRfNodes]);

  useEffect(() => {
    if (!rfInstance.current) return;

    //if there are no nodes, don't try to fit view
    if (rfNodes.length === 0) {
      rfInstance.current.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 0 });
      return;
    }

    //fit the whole graph but prevent zooming in too far
    rfInstance.current.fitView({
      padding: 0.35,
      maxZoom: 1,
      duration: 0,
    });
  }, [rfNodes]);


  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #ddd", display: "flex", gap: 12, alignItems: "center" }}>
        <strong>MatsLogic</strong>

        <button onClick={() => void loadAll()}>Reload</button>

        {error && <span style={{ color: "crimson" }}>{error}</span>}

        <span style={{ marginLeft: "auto" }}>
          User:{" "}
          <select
            value={selectedUserId ?? ""}
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
            disabled={users.length === 0}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </span>

        <span>
          Graph:{" "}
          <select
            value={selectedGraphId ?? ""}
            onChange={(e) => setSelectedGraphId(Number(e.target.value))}
            disabled={graphs.length === 0}
          >
            {graphs.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </span>

        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={newGraphTitle}
            onChange={(e) => setNewGraphTitle(e.target.value)}
            placeholder="New graph title…"
            style={{ width: 180 }}
          />
          <button onClick={() => void createGraph()}>Add graph</button>
        </span>

        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={newNodeName}
            onChange={(e) => setNewNodeName(e.target.value)}
            placeholder="New technique…"
            style={{ width: 180 }}
            disabled={!selectedGraphId}
          />
          <button onClick={() => void createNode()} disabled={!selectedGraphId}>
            Add node
          </button>
        </span>
        <button
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          title="Toggle dark mode"
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            rfInstance.current = instance;
          }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={({ nodes, edges }) => {
            setSelectedNodeIds(nodes.map(n => Number(n.id)));
            setSelectedEdgeIds(edges.map(e => Number(e.id)));
          }}
          deleteKeyCode={null}
          fitView={false}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}