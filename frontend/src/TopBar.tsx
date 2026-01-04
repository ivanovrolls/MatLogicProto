import React from "react";

//types
export type Theme = "light" | "dark";

export type Graph = {
  id: number;
  title: string;
};

export type SearchResult = {
  id: number;
  name: string;
};

export type TopBarUi = {
  barShell: React.CSSProperties;
  barHeader: React.CSSProperties;
  barContent: React.CSSProperties;
  row: React.CSSProperties;
  label: React.CSSProperties;
  input: React.CSSProperties;
  select: React.CSSProperties;
  button: React.CSSProperties;
  iconButton: React.CSSProperties;
  pill: React.CSSProperties;
};

export type TopBarProps = {
  //state
  theme: Theme;
  isMenuOpen: boolean;

  //setters
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  setSelectedGraphId: React.Dispatch<React.SetStateAction<number | null>>;
  setNewGraphTitle: React.Dispatch<React.SetStateAction<string>>;
  setNewNodeName: React.Dispatch<React.SetStateAction<string>>;
  setEdgeLabelDraft: React.Dispatch<React.SetStateAction<string>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setRfNodes: React.Dispatch<React.SetStateAction<any[]>>;

  //data
  ui: TopBarUi;
  meEmail: string;
  error: string | null;

  graphs: Graph[];
  selectedGraphId: number | null;

  newGraphTitle: string;
  newNodeName: string;

  selectedEdgeId: number | null;
  edgeLabelDraft: string;

  searchWrapRef: React.RefObject<HTMLDivElement>;
  searchQuery: string;
  isSearchOpen: boolean;
  searchResults: SearchResult[];

  //actions
  loadAll: () => void | Promise<void>;
  groupNodesCenter: () => void;
  createGraph: () => void | Promise<void>;
  createNode: () => void | Promise<void>;
  saveSelectedEdgeLabel: () => void | Promise<void>;
  focusNodeById: (nodeId: number) => void;
  openTechniquePanel: (nodeId: number) => Promise<void>;
  onLogout: () => void;

  //misc
  rfNodesLength: number;
};

export default function TopBar(props: TopBarProps) {
  const {
    //state
    theme,
    isMenuOpen,

    //setters
    setIsMenuOpen,
    setTheme,
    setSelectedGraphId,
    setNewGraphTitle,
    setNewNodeName,
    setEdgeLabelDraft,
    setSearchQuery,
    setIsSearchOpen,
    setRfNodes,

    //data
    ui,
    meEmail,
    error,
    graphs,
    selectedGraphId,
    newGraphTitle,
    newNodeName,
    selectedEdgeId,
    edgeLabelDraft,
    searchWrapRef,
    searchQuery,
    isSearchOpen,
    searchResults,

    //actions
    loadAll,
    groupNodesCenter,
    createGraph,
    createNode,
    saveSelectedEdgeLabel,
    focusNodeById,
    openTechniquePanel,
    onLogout,

    //misc
    rfNodesLength,
  } = props;

  //derived
  const contentOpenStyle: React.CSSProperties = isMenuOpen
    ? { maxHeight: 240, opacity: 1, transform: "translateY(0px)" }
    : { maxHeight: 0, opacity: 0, transform: "translateY(-6px)", pointerEvents: "none" };

  const canGroup = Boolean(selectedGraphId) && rfNodesLength > 0;

  return (
    <div style={ui.barShell}>
      {/*header*/}
      <div style={ui.barHeader}>
        <button
          onClick={() => setIsMenuOpen((v) => !v)}
          title={isMenuOpen ? "Hide menu" : "Show menu"}
          aria-label={isMenuOpen ? "Hide menu" : "Show menu"}
          style={ui.iconButton}
        >
          {isMenuOpen ? "▴" : "▾"}
        </button>

        <div style={{ fontWeight: 900, fontSize: 13, marginRight: 6 }}>MatLogic</div>

        <button onClick={() => void loadAll()} style={ui.button}>
          Reload
        </button>

        {/*theme toggle*/}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 5 }}>
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            title="Toggle theme"
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: theme === "dark" ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
              background: theme === "dark" ? "#111827" : "#f8fafc",
              color: theme === "dark" ? "#e5e7eb" : "#111827",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        {/*group nodes*/}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 5 }}>
          <button
            onClick={groupNodesCenter}
            disabled={!canGroup}
            title="Group all nodes together"
            style={{ ...ui.button, opacity: !canGroup ? 0.5 : 1 }}
          >
            Group Nodes 📦
          </button>
        </div>

        {/*error*/}
        {error && <span style={{ color: "crimson", fontSize: 12, marginLeft: 4, lineHeight: "30px" }}>{error}</span>}

        {/*account*/}
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{meEmail}</span>
          <button onClick={onLogout} style={ui.button} title="Logout">
            Logout
          </button>
        </span>
      </div>

      {/*menu*/}
      <div style={{ ...ui.barContent, ...contentOpenStyle }}>
        <div style={{ ...ui.row, paddingTop: 2 }}>
          {/*graph select*/}
          <span style={{ ...ui.pill, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={ui.label}>Graph</span>
            <select
              value={selectedGraphId ?? ""}
              onChange={(e) => {
                setSelectedGraphId(Number(e.target.value));
                setSearchQuery("");
                setIsSearchOpen(false);
              }}
              disabled={graphs.length === 0}
              style={ui.select}
            >
              {graphs.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </span>

          {/*create graph*/}
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input
              value={newGraphTitle}
              onChange={(e) => setNewGraphTitle(e.target.value)}
              placeholder="New graph…"
              style={{ ...ui.input, width: 150 }}
            />
            <button onClick={() => void createGraph()} style={ui.button}>
              Add graph
            </button>
          </span>

          {/*create node*/}
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              placeholder="New technique…"
              disabled={!selectedGraphId}
              style={{ ...ui.input, width: 170, opacity: !selectedGraphId ? 0.6 : 1 }}
            />
            <button
              onClick={() => void createNode()}
              disabled={!selectedGraphId}
              style={{ ...ui.button, opacity: !selectedGraphId ? 0.5 : 1 }}
            >
              Add node
            </button>
          </span>

          {/*edge label*/}
          {selectedEdgeId != null && (
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input
                value={edgeLabelDraft}
                onChange={(e) => setEdgeLabelDraft(e.target.value)}
                placeholder="Edge label…"
                style={{ ...ui.input, width: 170 }}
              />
              <button onClick={() => void saveSelectedEdgeLabel()} style={ui.button}>
                Save label
              </button>
            </span>
          )}

          {/*search*/}
          <div
            ref={searchWrapRef}
            style={{
              position: "relative",
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
              marginLeft: 6,
            }}
          >
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search techniques…"
              style={{ ...ui.input, width: 220 }}
            />

            {searchQuery.trim() && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                  setRfNodes((prev) => prev.map((n) => ({ ...n, selected: false })));
                }}
                style={ui.button}
                title="Clear search"
              >
                Clear
              </button>
            )}

            {isSearchOpen && searchQuery.trim() && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  width: 320,
                  maxHeight: 260,
                  overflow: "auto",
                  borderRadius: 12,
                  border: theme === "dark" ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
                  background: theme === "dark" ? "#0b0f19" : "#ffffff",
                  boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
                  padding: 6,
                  zIndex: 50,
                }}
              >
                {searchResults.length === 0 ? (
                  <div style={{ padding: 10, fontSize: 12, opacity: 0.75 }}>No matches in this graph.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {searchResults.map((n) => (
                      <button
                        key={n.id}
                        onClick={async () => {
                          setIsSearchOpen(false);
                          focusNodeById(n.id);
                          await openTechniquePanel(n.id);
                        }}
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          borderRadius: 10,
                          border:
                            theme === "dark"
                              ? "1px solid rgba(255,255,255,0.10)"
                              : "1px solid rgba(0,0,0,0.10)",
                          background: theme === "dark" ? "#111827" : "#fff7ed",
                          color: theme === "dark" ? "#e5e7eb" : "#111827",
                          cursor: "pointer",
                        }}
                        title="Jump to node & open technique"
                      >
                        <div style={{ fontWeight: 800, fontSize: 12 }}>{n.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.75 }}>Open technique panel</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
