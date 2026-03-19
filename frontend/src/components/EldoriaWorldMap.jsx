import { useMemo, useRef, useState } from "react";

function getNodeLayout(index, total) {
  const layouts = {
    1: [{ x: 50, y: 58 }],
    2: [
      { x: 42, y: 56 },
      { x: 68, y: 46 }
    ],
    3: [
      { x: 46, y: 58 },
      { x: 28, y: 40 },
      { x: 72, y: 38 }
    ],
    4: [
      { x: 46, y: 58 },
      { x: 24, y: 42 },
      { x: 70, y: 38 },
      { x: 78, y: 72 }
    ],
    5: [
      { x: 46, y: 58 },
      { x: 24, y: 42 },
      { x: 70, y: 38 },
      { x: 78, y: 72 },
      { x: 20, y: 22 }
    ]
  };

  return (layouts[Math.min(total, 5)] || layouts[5])[index] || { x: 50, y: 50 };
}

function buildEntries(entries = []) {
  const realEntries = entries.map((entry, index) => ({
    ...entry,
    layout: getNodeLayout(index, entries.length),
    state: entry.state || (entry.slug ? "available" : "unwritten")
  }));

  if (entries.length >= 5) {
    return realEntries;
  }

  const placeholderLayout = [
    { x: 20, y: 22 },
    { x: 78, y: 24 },
    { x: 84, y: 64 },
    { x: 26, y: 76 }
  ];

  const placeholders = Array.from({ length: Math.max(0, 5 - entries.length) }, (_, index) => ({
    id: `eldoria-map-placeholder-${index + 1}`,
    slug: "",
    title: index === 0 ? "Unrecorded Territory" : "Sealed Region",
    subtitle: index === 0 ? "Yet To Be Recorded" : "Sealed",
    state: index === 0 ? "unwritten" : "sealed",
    action: index === 0 ? "Awaiting Chronicle" : "Sealed By The Crown",
    layout: placeholderLayout[index] || { x: 82, y: 18 + index * 14 }
  }));

  return [...realEntries, ...placeholders];
}

function buildConnections(nodes) {
  const realNodes = nodes.filter((node) => node.slug);
  const connections = [];

  for (let index = 0; index < realNodes.length - 1; index += 1) {
    connections.push({
      from: realNodes[index].id,
      to: realNodes[index + 1].id,
      kind: "path"
    });
  }

  if (realNodes[0]) {
    nodes
      .filter((node) => !node.slug)
      .forEach((node) => {
        connections.push({
          from: realNodes[0].id,
          to: node.id,
          kind: node.state
        });
      });
  }

  return connections;
}

export default function EldoriaWorldMap({ currentSlug, entries, onEnterChronicle }) {
  const [hoveredId, setHoveredId] = useState("");
  const [focusedId, setFocusedId] = useState("");
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 });
  const nodes = useMemo(() => buildEntries(entries), [entries]);
  const activeNode = nodes.find((node) => node.slug === currentSlug) || nodes.find((node) => node.slug) || null;
  const interactiveNodeId = hoveredId || focusedId || activeNode?.id || "";
  const displayNode = nodes.find((node) => node.id === interactiveNodeId) || activeNode || nodes[0] || null;
  const connections = useMemo(() => buildConnections(nodes), [nodes]);

  function beginDrag(event) {
    setIsDragging(true);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: panOffset.x,
      startOffsetY: panOffset.y
    };
  }

  function handleDrag(event) {
    if (!isDragging) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;

    setPanOffset({
      x: Math.max(-42, Math.min(42, dragRef.current.startOffsetX + deltaX * 0.18)),
      y: Math.max(-32, Math.min(32, dragRef.current.startOffsetY + deltaY * 0.18))
    });
  }

  function endDrag() {
    setIsDragging(false);
  }

  return (
    <section className="intro-card homepage-panel eldoria-map-panel">
      <div className="section-head eldoria-chronicle-head">
        <h2>World Map</h2>
        <span>Navigate Eldoria as a place, not a list</span>
      </div>
      <div
        className={`eldoria-map-canvas${isDragging ? " dragging" : ""}`}
        onMouseLeave={() => setHoveredId("")}
        onMouseMove={handleDrag}
        onMouseUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div className="eldoria-map-fog" />
        <div className="eldoria-map-particles" />
        <div
          className="eldoria-map-stage"
          onMouseDown={beginDrag}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${interactiveNodeId ? 1.03 : 1})`
          }}
        >
          <svg className="eldoria-map-connections" preserveAspectRatio="none" viewBox="0 0 100 100">
            {connections.map((connection) => {
              const from = nodes.find((node) => node.id === connection.from);
              const to = nodes.find((node) => node.id === connection.to);

              if (!from || !to) {
                return null;
              }

              const highlighted = interactiveNodeId && (connection.from === interactiveNodeId || connection.to === interactiveNodeId);

              return (
                <line
                  className={`eldoria-map-line eldoria-map-line-${connection.kind}${highlighted ? " active" : ""}`}
                  key={`${connection.from}-${connection.to}`}
                  x1={from.layout.x}
                  x2={to.layout.x}
                  y1={from.layout.y}
                  y2={to.layout.y}
                />
              );
            })}
          </svg>

          {nodes.map((node) => {
            const isActive = node.slug === currentSlug;
            const isInteractive = node.id === interactiveNodeId;

            return (
              <button
                className={`eldoria-map-node eldoria-map-node-${node.state}${isActive ? " active" : ""}${isInteractive ? " focused" : ""}`}
                disabled={!node.slug}
                key={node.id}
                onBlur={() => setFocusedId("")}
                onClick={() => {
                  if (node.slug) {
                    onEnterChronicle(node.slug);
                  }
                }}
                onFocus={() => setFocusedId(node.id)}
                onMouseEnter={() => setHoveredId(node.id)}
                style={{
                  left: `${node.layout.x}%`,
                  top: `${node.layout.y}%`
                }}
                type="button"
              >
                <span className="eldoria-map-node-core" />
                <span className="eldoria-map-node-ring" />
                {node.state === "sealed" ? <span className="eldoria-map-node-seal" /> : null}
              </button>
            );
          })}

          {displayNode ? (
            <div
              className={`eldoria-map-tooltip eldoria-map-tooltip-${displayNode.state}`}
              style={{
                left: `${displayNode.layout.x}%`,
                top: `${displayNode.layout.y}%`
              }}
            >
              <p className="eyebrow">{displayNode.subtitle}</p>
              <strong>{displayNode.title}</strong>
              <p>{displayNode.action}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
