import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
  MarkerType,
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

type Token = {
  access_token: string;
  token_type: string;
};

type LoginRequest = {
  email: string;
  password: string;
};

type RegisterRequest = {
  name: string;
  email: string;
  password: string;
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

type EdgeTypeT = "positive" | "neutral" | "negative";

type EdgeT = {
  id: number;
  from_node_id: number;
  to_node_id: number;
  edge_type: EdgeTypeT;
  label?: string | null;
};

type TechniqueDraft = {
  videoUrl: string;
  steps: string;
  updatedAt: number;
};

const API_BASE = "/api";
const TOKEN_KEY = "matlogic:token";

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
}

async function apiFetch(path: string, init: RequestInit = {}, token?: string | null) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body != null) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

async function fetchMe(token: string) {
  const res = await apiFetch("/auth/me", {}, token);
  if (!res.ok) return null;
  return (await res.json()) as User;
}

async function login(email: string, password: string) {
  const res = await apiFetch("/auth/token", {
    method: "POST",
    body: JSON.stringify({ email, password } satisfies LoginRequest),
  });
  if (!res.ok) return null;
  return (await res.json()) as Token;
}

async function register(name: string, email: string, password: string) {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password } satisfies RegisterRequest),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Register failed (${res.status})`);
  }
  return (await res.json()) as User;
}

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

//loads technique data from backend
async function loadTechniqueDraft(nodeId: number): Promise<TechniqueDraft> {
  try {
    const res = await fetch(`${API_BASE}/nodes/${nodeId}/technique`);
    if (!res.ok) {
      return { videoUrl: "", steps: "", updatedAt: Date.now() };
    }
    const data = await res.json();
    return {
      videoUrl: data.video_url || "",
      steps: data.steps || "",
      updatedAt: Date.now(),
    };
  } catch {
    return { videoUrl: "", steps: "", updatedAt: Date.now() };
  }
}

//saves technique data to backend
async function saveTechniqueDraft(nodeId: number, draft: TechniqueDraft) {
  try {
    //try to update first
    const updateRes = await fetch(`${API_BASE}/nodes/${nodeId}/technique`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_url: draft.videoUrl,
        steps: draft.steps,
      }),
    });

    if (updateRes.ok) return;

    //if update fails (404), create new
    if (updateRes.status === 404) {
      await fetch(`${API_BASE}/nodes/${nodeId}/technique`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: draft.videoUrl,
          steps: draft.steps,
        }),
      });
    }
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

//edge cycling
function edgeStroke(type: EdgeTypeT) {
  if (type === "positive") return "#16a34a";
  if (type === "neutral") return "#1f307cff";
  return "#dc2626";
}

function nextEdgeType(type: EdgeTypeT): EdgeTypeT {
  if (type === "positive") return "neutral";
  if (type === "neutral") return "negative";
  return "positive";
}

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [edges, setEdges] = useState<EdgeT[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGraphId, setSelectedGraphId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  //security
  const [authToken, setAuthToken] = useState<string | null>(() => getToken());
  const [me, setMe] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);


  //deleting nodes/edges state
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<number[]>([]);

  const nodeTypes = useMemo(() => ({ hex: HexNode }), []);

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
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("matlogic:theme", theme);
  }, [theme]);

  //technique panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [techVideoUrl, setTechVideoUrl] = useState("");
  const [techSteps, setTechSteps] = useState("");

  //debounced autosave for technique drafts
  const techniqueSaveTimer = useRef<number | null>(null);

  const [edgeLabelDraft, setEdgeLabelDraft] = useState("");
  const selectedEdgeId = selectedEdgeIds.length === 1 ? selectedEdgeIds[0] : null;

  const activeNode = useMemo(() => {
    if (activeNodeId == null) return null;
    return nodes.find((n) => n.id === activeNodeId) ?? null;
  }, [activeNodeId, nodes]);

  const openTechniquePanel = useCallback(
    async (nodeId: number) => {
      const draft = await loadTechniqueDraft(nodeId);
      setActiveNodeId(nodeId);
      setTechVideoUrl(draft.videoUrl);
      setTechSteps(draft.steps);
      setIsPanelOpen(true);
    },
    []
  );

  const closeTechniquePanel = useCallback(() => {
    setIsPanelOpen(false);
    setActiveNodeId(null);
  }, []);

  //autosave on edits (debounced)
  useEffect(() => {
    if (activeNodeId == null) return;
    if (!isPanelOpen) return;

    if (techniqueSaveTimer.current) window.clearTimeout(techniqueSaveTimer.current);
    techniqueSaveTimer.current = window.setTimeout(() => {
      saveTechniqueDraft(activeNodeId, {
        videoUrl: techVideoUrl,
        steps: techSteps,
        updatedAt: Date.now(),
      });
    }, 500);

    return () => {
      if (techniqueSaveTimer.current) window.clearTimeout(techniqueSaveTimer.current);
    };
  }, [techVideoUrl, techSteps, activeNodeId, isPanelOpen]);

  useEffect(() => {
    const t = authToken;
    if (!t) {
      setMe(null);
      return;
    }
    (async () => {
      const u = await fetchMe(t);
      if (!u) {
        setToken(null);
        setAuthToken(null);
        setMe(null);
        return;
      }
      setMe(u);
    })();
  }, [authToken]);


  //fetches all data from backend and sets defaults
  const loadAll = useCallback(async () => {
    setError(null);
    try {
      if (!authToken) return;

      const [u, g, n, e] = await Promise.all([
        apiFetch(`/users/`, {}, authToken).then((r) => r.json()),
        apiFetch(`/graphs/`, {}, authToken).then((r) => r.json()),
        apiFetch(`/nodes/`, {}, authToken).then((r) => r.json()),
        apiFetch(`/edges/`, {}, authToken).then((r) => r.json()),
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
  }, [authToken, selectedGraphId, selectedUserId]);


  useEffect(() => {
    if (!me) return;
    void loadAll();
  }, [me, loadAll]);

  //deletes nodes and their connected edges both in backend and local state
  async function deleteNodesById(ids: number[]) {
    if (ids.length === 0) return;

    await Promise.all(
      ids.map(id => fetch(`${API_BASE}/nodes/${id}`, { method: "DELETE" }))
    );

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
      if (isTypingInEditableElement(e.target)) return;
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      e.preventDefault();

      try {
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
      label: e.label ?? "",
      style: { stroke: edgeStroke(e.edge_type), strokeWidth: 2.5 },
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

  const updateEdgeBackend = useCallback(
    async (edgeId: number, patch: Partial<EdgeT>) => {
      if (!authToken) return false;
      try {
        const res = await apiFetch(
          `/edges/${edgeId}`,
          {
            method: "PUT",
            body: JSON.stringify(patch),
          },
          authToken
        );
        return res.ok;
      } catch {
        return false;
      }
    },
    [authToken]
  );


  useEffect(() => {
    if (selectedEdgeId == null) {
      setEdgeLabelDraft("");
      return;
    }
    const e = edges.find(x => x.id === selectedEdgeId);
    setEdgeLabelDraft((e?.label ?? "") || "");
  }, [selectedEdgeId, edges]);

  //creates edge in backend when user connects two nodes in ui
  const onConnect = useCallback(
    async (connection: Connection) => {
      setError(null);

      if (!authToken) {
        setError("Not authenticated.");
        return;
      }

      if (!connection.source || !connection.target) return;
      const fromId = Number(connection.source);
      const toId = Number(connection.target);

      setRfEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "straight",
            style: { stroke: edgeStroke("positive"), strokeWidth: 2.5 },
          },
          eds
        )
      );

      try {
        const res = await apiFetch(
          `/edges/`,
          {
            method: "POST",
            body: JSON.stringify({
              from_node_id: fromId,
              to_node_id: toId,
              edge_type: "positive",
            }),
          },
          authToken
        );

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

        setRfEdges((prev) => [
          ...prev.filter((e) => !(e.source === connection.source && e.target === connection.target)),
          {
            id: String(created.id),
            source: String(created.from_node_id),
            target: String(created.to_node_id),
            type: "straight",
            label: created.label ?? "",
            style: { stroke: edgeStroke(created.edge_type ?? "positive"), strokeWidth: 2.5 },
          },
        ]);
      } catch {
        await loadAll();
        setError("Failed to create edge (network error)");
      }
    },
    [authToken, loadAll, setEdges, setRfEdges]
  );


  const onEdgeDoubleClick = useCallback(
    async (_: unknown, rfEdge: RFEdge) => {
      const id = Number(rfEdge.id);
      if (!Number.isFinite(id)) return;

      const current = edges.find(e => e.id === id);
      const currentType: EdgeTypeT = (current?.edge_type ?? "positive") as EdgeTypeT;
      const nextType = nextEdgeType(currentType);

      setEdges(prev =>
        prev.map(e => (e.id === id ? { ...e, edge_type: nextType } : e))
      );

      setRfEdges(prev =>
        prev.map(e =>
          e.id === rfEdge.id
            ? { ...e, style: { ...(e.style ?? {}), stroke: edgeStroke(nextType), strokeWidth: 2.5 } }
            : e
        )
      );

      const ok = await updateEdgeBackend(id, { edge_type: nextType });
      if (!ok) {
        setError("edge updated in ui, but backend did not accept the update (add a put/patch endpoint for edges to persist this).");
      }
    },
    [edges, setEdges, setRfEdges, updateEdgeBackend]
  );

  const saveSelectedEdgeLabel = useCallback(async () => {
    if (selectedEdgeId == null) return;

    const label = edgeLabelDraft.trim();

    setEdges(prev =>
      prev.map(e => (e.id === selectedEdgeId ? { ...e, label } : e))
    );

    setRfEdges(prev =>
      prev.map(e => (Number(e.id) === selectedEdgeId ? { ...e, label } : e))
    );

    const ok = await updateEdgeBackend(selectedEdgeId, { label });
    if (!ok) {
      setError("label updated in ui, but backend did not accept the update (add a put/patch endpoint for edges to persist this).");
    }
  }, [edgeLabelDraft, selectedEdgeId, setEdges, setRfEdges, updateEdgeBackend]);

  //creates new graph in backend
  const createGraph = useCallback(async () => {
    setError(null);
    const title = newGraphTitle.trim();
    const userId = me?.id ?? selectedUserId ?? users[0]?.id;

    if (!title) {
      setError("Graph title cannot be empty.");
      return;
    }
    if (!userId) {
      setError("No user available to attach the graph to.");
      return;
    }
    if (!authToken) {
      setError("Not authenticated.");
      return;
    }

    try {
      const res = await apiFetch(
        `/graphs/`,
        {
          method: "POST",
          body: JSON.stringify({ title, user_id: userId }),
        },
        authToken
      );

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
  }, [newGraphTitle, me, selectedUserId, users, authToken]);


  //creates new node (technique) in backend for selected graph
  const createNode = useCallback(async () => {
    setError(null);
    if (!selectedGraphId) {
      setError("Select a graph first.");
      return;
    }
    if (!authToken) {
      setError("Not authenticated.");
      return;
    }

    const name = newNodeName.trim();
    if (!name) {
      setError("Technique name cannot be empty.");
      return;
    }

    try {
      const res = await apiFetch(
        `/nodes/`,
        {
          method: "POST",
          body: JSON.stringify({ name, graph_id: selectedGraphId }),
        },
        authToken
      );

      if (!res.ok) {
        const msg = await res.text();
        setError(`Failed to create node (${res.status}): ${msg}`);
        return;
      }

      const created: NodeT = await res.json();
      setNodes((prev) => [...prev, created]);
      setNewNodeName("");

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
  }, [selectedGraphId, authToken, newNodeName, setNodes, setRfNodes, persistPositions]);


  //groups all nodes together in a compact layout
  const groupNodesCenter = useCallback(() => {
    if (!selectedGraphId || rfNodes.length === 0) return;

    //calculate grid layout dimensions
    const nodeCount = rfNodes.length;
    const cols = Math.ceil(Math.sqrt(nodeCount));
    const spacing = 120;
    const startX = 200;
    const startY = 200;

    const updatedNodes = rfNodes.map((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        ...node,
        position: {
          x: startX + col * spacing,
          y: startY + row * spacing,
        },
      };
    });

    setRfNodes(updatedNodes);
    persistPositions(updatedNodes);

    //pan to center of grouped nodes
    if (rfInstance.current) {
      setTimeout(() => {
        rfInstance.current?.fitView({
          padding: 0.2,
          maxZoom: 1,
          duration: 400,
        });
      }, 50);
    }
  }, [rfNodes, selectedGraphId, setRfNodes, persistPositions]);

  useEffect(() => {
    if (!rfInstance.current) return;

    if (rfNodes.length === 0) {
      rfInstance.current.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 0 });
      return;
    }

    rfInstance.current.fitView({
      padding: 0.35,
      maxZoom: 1,
      duration: 0,
    });
  }, [rfNodes]);

    if (!me) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>MatLogic</div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthError(null);
              }}
              disabled={authLoading}
              style={{ flex: 1 }}
            >
              Login
            </button>
            <button
              onClick={() => {
                setAuthMode("register");
                setAuthError(null);
              }}
              disabled={authLoading}
              style={{ flex: 1 }}
            >
              Register
            </button>
          </div>

          {authMode === "register" && (
            <input
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              placeholder="Name"
              disabled={authLoading}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
            />
          )}

          <input
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="Email"
            disabled={authLoading}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
          />

          <input
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="Password"
            type="password"
            disabled={authLoading}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
          />

          {authError && <div style={{ color: "crimson", fontSize: 13 }}>{authError}</div>}

          <button
            disabled={authLoading}
            onClick={async () => {
              setAuthError(null);
              setAuthLoading(true);
              try {
                if (authMode === "register") {
                  const name = authName.trim();
                  const email = authEmail.trim();
                  const password = authPassword;
                  if (!name || !email || !password) {
                    setAuthError("Fill in all fields.");
                    setAuthLoading(false);
                    return;
                  }
                  await register(name, email, password);
                }

                const email = authEmail.trim();
                const password = authPassword;
                if (!email || !password) {
                  setAuthError("Enter email and password.");
                  setAuthLoading(false);
                  return;
                }

                const tok = await login(email, password);
                if (!tok?.access_token) {
                  setAuthError("Invalid email or password.");
                  setAuthLoading(false);
                  return;
                }

                setToken(tok.access_token);
                setAuthToken(tok.access_token);

                const u = await fetchMe(tok.access_token);
                if (!u) {
                  setAuthError("Login succeeded but failed to fetch profile.");
                  setAuthLoading(false);
                  return;
                }
                setMe(u);

                setAuthPassword("");
              } catch (e) {
                setAuthError(e instanceof Error ? e.message : "Authentication failed.");
              } finally {
                setAuthLoading(false);
              }
            }}
            style={{ padding: "10px 12px", borderRadius: 10 }}
          >
            {authLoading ? "Please wait..." : authMode === "login" ? "Login" : "Register & Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #ddd", display: "flex", gap: 12, alignItems: "center" }}>
        <strong>MatLogic</strong>

        <button onClick={() => void loadAll()}>Reload</button>

        {error && <span style={{ color: "crimson" }}>{error}</span>}

        <span style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => {
              setToken(null);
              setAuthToken(null);
              setMe(null);
              setUsers([]);
              setGraphs([]);
              setNodes([]);
              setEdges([]);
              setSelectedUserId(null);
              setSelectedGraphId(null);
            }}
          >
            Logout
          </button>
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            Signed in as {me.email}
          </span>
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

        {selectedEdgeId != null && (
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={edgeLabelDraft}
              onChange={(e) => setEdgeLabelDraft(e.target.value)}
              placeholder="Edge label…"
              style={{ width: 180 }}
            />
            <button onClick={() => void saveSelectedEdgeLabel()}>
              Save label
            </button>
          </span>
        )}

        <button
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          title="Toggle dark mode"
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>

        <button
          onClick={groupNodesCenter}
          disabled={!selectedGraphId || rfNodes.length === 0}
          title="Group all nodes together"
        >
          📦 Group Nodes
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ height: "100%", display: "flex" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              onInit={(instance) => {
                rfInstance.current = instance;
              }}
              onNodeDoubleClick={(_, node) => {
                const id = Number(node.id);
                if (!Number.isFinite(id)) return;
                openTechniquePanel(id);
              }}
              onEdgeDoubleClick={onEdgeDoubleClick}
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

          {isPanelOpen && activeNodeId != null && (
            <div
              style={{
                width: 360,
                borderLeft: "1px solid #ddd",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: theme === "dark" ? "#0b0f19" : "#fff",
                color: theme === "dark" ? "#e5e7eb" : "#111827",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {activeNode?.name ?? `Technique #${activeNodeId}`}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Add a video link, then visualise it in first-person and write your steps.
                  </div>
                </div>

                <button onClick={closeTechniquePanel} title="Close">
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Video link</label>
                <input
                  value={techVideoUrl}
                  onChange={(e) => setTechVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/…"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: theme === "dark" ? "#111827" : "#fff",
                    color: theme === "dark" ? "#e5e7eb" : "#111827",
                  }}
                />

                {techVideoUrl.trim() && (
                  <a
                    href={techVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12 }}
                  >
                    Open video ↗
                  </a>
                )}
              </div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: theme === "dark" ? "#0f172a" : "#fff7ed",
                  fontSize: 12,
                  lineHeight: 1.35,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Prompt</div>
                <div>
                  Close your eyes for 10–20 seconds and imagine doing this technique in
                  <b> first person</b>. Feel the grips, weight shift, hip angle, and
                  timing. Then write the steps like you're coaching yourself.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Step-by-step</label>
                <textarea
                  value={techSteps}
                  onChange={(e) => setTechSteps(e.target.value)}
                  placeholder={
                    "Example:\n1) Establish grip…\n2) Shift hips…\n3) Off-balance…\n4) Finish…"
                  }
                  style={{
                    width: "100%",
                    flex: 1,
                    minHeight: 220,
                    resize: "vertical",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: theme === "dark" ? "#111827" : "#fff",
                    color: theme === "dark" ? "#e5e7eb" : "#111827",
                    fontFamily: "inherit",
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    saveTechniqueDraft(activeNodeId, {
                      videoUrl: techVideoUrl,
                      steps: techSteps,
                      updatedAt: Date.now(),
                    });
                  }}
                  title="Save now"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )};
