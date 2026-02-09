import { useEffect, useRef, useMemo } from "react";
import cytoscape from "cytoscape";
import { cellTopology, linkColors, calculateLinkData } from "@/data/networkData";

export function NetworkTopology() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const elements = useMemo(() => {
    const linkData = calculateLinkData();
    const nodes: cytoscape.ElementDefinition[] = [];
    const edges: cytoscape.ElementDefinition[] = [];

    // Add BBU (central node)
    nodes.push({
      data: {
        id: "bbu",
        label: "BBU",
        type: "bbu",
      },
    });

    // Add link nodes and edges to BBU
    linkData.forEach((link) => {
      const isPrimary = link.linkId >= 1 && link.linkId <= 3;
      nodes.push({
        data: {
          id: `link_${link.linkId}`,
          label: link.linkName,
          type: link.isolated ? "isolated-link" : "shared-link",
          isPrimary,
          color: link.color,
          cellCount: link.cells.length,
          avgTraffic: link.avgTraffic,
          peakTraffic: link.peakTraffic,
        },
      });

      // Edge from link to BBU
      edges.push({
        data: {
          id: `edge_bbu_link_${link.linkId}`,
          source: `link_${link.linkId}`,
          target: "bbu",
          weight: link.peakTraffic,
        },
      });
    });

    // Add cell nodes and edges to their links
    cellTopology.forEach((cell) => {
      // Shorter label - just the number
      const shortLabel = cell.cellId.replace("cell_", "C");
      nodes.push({
        data: {
          id: cell.cellId,
          label: shortLabel,
          type: cell.isolated ? "isolated-cell" : "cell",
          linkId: cell.linkId,
          color: linkColors[cell.linkId],
          avgTraffic: cell.avgTraffic,
          peakTraffic: cell.peakTraffic,
          packetLoss: cell.packetLossRate,
        },
      });

      // Edge from cell to its link
      edges.push({
        data: {
          id: `edge_${cell.cellId}_link_${cell.linkId}`,
          source: cell.cellId,
          target: `link_${cell.linkId}`,
        },
      });
    });

    return [...nodes, ...edges];
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        // BBU node (center) - 3D effect with gradient-like border
        {
          selector: 'node[type="bbu"]',
          style: {
            "background-color": "#22d3ee",
            "background-opacity": 1,
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            color: "#000",
            "font-size": "20px",
            "font-weight": "bold",
            width: 80,
            height: 80,
            "border-width": 5,
            "border-color": "#0e7490",
            "border-opacity": 1,
            "shadow-blur": 20,
            "shadow-color": "#22d3ee",
            "shadow-opacity": 0.8,
            "shadow-offset-x": 0,
            "shadow-offset-y": 4,
          },
        },
        // Shared link nodes - 3D effect
        {
          selector: 'node[type="shared-link"]',
          style: {
            "background-color": "data(color)",
            "background-opacity": 1,
            label: "data(label)",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 12,
            color: "#ffffff",
            "font-size": "15px",
            "font-weight": "bold",
            "text-outline-color": "#000000",
            "text-outline-width": 3,
            "text-background-color": "#000000",
            "text-background-opacity": 0.7,
            "text-background-padding": "4px",
            "text-background-shape": "roundrectangle",
            width: 55,
            height: 55,
            "border-width": 4,
            "border-color": "#1a1a1a",
            "border-opacity": 0.8,
            "shadow-blur": 15,
            "shadow-color": "data(color)",
            "shadow-opacity": 0.6,
            "shadow-offset-x": 0,
            "shadow-offset-y": 3,
          },
        },
        // Primary links (1, 2, 3) - intense white glow
        {
          selector: 'node[id="link_1"], node[id="link_2"], node[id="link_3"]',
          style: {
            width: 75,
            height: 75,
            "border-width": 6,
            "border-color": "#ffffff",
            "border-opacity": 1,
            "shadow-blur": 150,
            "shadow-color": "#ffffff",
            "shadow-opacity": 1,
            "shadow-offset-x": 0,
            "shadow-offset-y": 0,
          },
        },
        // Isolated link nodes - 3D effect
        {
          selector: 'node[type="isolated-link"]',
          style: {
            "background-color": "data(color)",
            "background-opacity": 0.85,
            label: "data(label)",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 12,
            color: "#ffffff",
            "font-size": "13px",
            "font-weight": "bold",
            "text-outline-color": "#000000",
            "text-outline-width": 2,
            "text-background-color": "#000000",
            "text-background-opacity": 0.6,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
            width: 40,
            height: 40,
            "border-width": 3,
            "border-color": "#333",
            "shadow-blur": 10,
            "shadow-color": "data(color)",
            "shadow-opacity": 0.4,
            "shadow-offset-x": 0,
            "shadow-offset-y": 2,
          },
        },
        // Cell nodes - 3D effect
        {
          selector: 'node[type="cell"]',
          style: {
            "background-color": "data(color)",
            "background-opacity": 1,
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            color: "#000000",
            "font-size": "12px",
            "font-weight": "bold",
            width: 34,
            height: 34,
            "border-width": 3,
            "border-color": "#222",
            "shadow-blur": 8,
            "shadow-color": "data(color)",
            "shadow-opacity": 0.5,
            "shadow-offset-x": 0,
            "shadow-offset-y": 2,
          },
        },
        // Isolated cell nodes - 3D diamond effect
        {
          selector: 'node[type="isolated-cell"]',
          style: {
            "background-color": "data(color)",
            "background-opacity": 1,
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            color: "#000000",
            "font-size": "11px",
            "font-weight": "bold",
            width: 30,
            height: 30,
            shape: "diamond",
            "border-width": 2,
            "border-color": "#444",
            "shadow-blur": 6,
            "shadow-color": "data(color)",
            "shadow-opacity": 0.4,
            "shadow-offset-x": 0,
            "shadow-offset-y": 2,
          },
        },
        // Edges from links to BBU - glowing effect
        {
          selector: "edge[source ^= 'link_']",
          style: {
            width: 4,
            "line-color": "#555",
            "curve-style": "bezier",
            opacity: 0.7,
            "line-cap": "round",
          },
        },
        // Edges from cells to links
        {
          selector: "edge[source ^= 'cell_']",
          style: {
            width: 2,
            "line-color": "#444",
            "curve-style": "bezier",
            opacity: 0.5,
            "line-cap": "round",
          },
        },
        // Highlighted state
        {
          selector: "node:selected",
          style: {
            "border-width": 5,
            "border-color": "#fff",
          },
        },
        {
          selector: "node.highlighted",
          style: {
            "border-color": "#fff",
            "border-width": 4,
            opacity: 1,
            "shadow-opacity": 1,
          },
        },
        {
          selector: "node.faded",
          style: {
            opacity: 0.15,
            "shadow-opacity": 0,
          },
        },
        {
          selector: "edge.highlighted",
          style: {
            opacity: 1,
            width: 4,
            "line-color": "#888",
          },
        },
        {
          selector: "edge.faded",
          style: {
            opacity: 0.05,
          },
        },
      ],
      layout: {
        name: "concentric",
        concentric: (node: cytoscape.NodeSingular) => {
          const type = node.data("type");
          if (type === "bbu") return 3;
          if (type === "shared-link" || type === "isolated-link") return 2;
          return 1;
        },
        levelWidth: () => 1,
        minNodeSpacing: 60,
        animate: false,
      },
      minZoom: 0.4,
      maxZoom: 2.5,
      wheelSensitivity: 0.3,
    });

    // Hover interactions
    cy.on("mouseover", "node", (e) => {
      const node = e.target;
      const type = node.data("type");

      if (type === "bbu") {
        // Highlight all
        cy.elements().addClass("highlighted");
      } else if (type === "shared-link" || type === "isolated-link") {
        // Highlight this link and its cells
        const linkId = node.id();
        cy.elements().addClass("faded");
        node.removeClass("faded").addClass("highlighted");
        cy.nodes().filter((n) => n.data("linkId") === parseInt(linkId.replace("link_", ""))).removeClass("faded").addClass("highlighted");
        cy.edges().filter((e) => e.source().id() === linkId || e.target().id() === linkId).removeClass("faded").addClass("highlighted");
        cy.getElementById("bbu").removeClass("faded");
      } else {
        // Highlight this cell and its link
        const linkId = node.data("linkId");
        cy.elements().addClass("faded");
        node.removeClass("faded").addClass("highlighted");
        cy.getElementById(`link_${linkId}`).removeClass("faded").addClass("highlighted");
        cy.edges().filter((e) => e.source().id() === node.id() || e.target().id() === `link_${linkId}`).removeClass("faded").addClass("highlighted");
        cy.getElementById("bbu").removeClass("faded");
      }
    });

    cy.on("mouseout", "node", () => {
      cy.elements().removeClass("highlighted faded");
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [elements]);

  return (
    <div className="relative w-full h-[550px] rounded-lg overflow-hidden border border-border" style={{ background: "radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 100%)" }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-sm space-y-3">
        <div className="text-foreground font-semibold mb-3">Network Topology</div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
          <span className="text-foreground">BBU (Central Unit)</span>
        </div>
        <div
          className="flex items-center gap-3 cursor-pointer hover:bg-white/10 rounded px-1 -mx-1 transition-colors"
          onMouseEnter={() => {
            const cy = cyRef.current;
            if (!cy) return;
            cy.elements().addClass("faded");
            cy.getElementById("link_1").removeClass("faded").addClass("highlighted");
            cy.getElementById("link_2").removeClass("faded").addClass("highlighted");
            cy.getElementById("link_3").removeClass("faded").addClass("highlighted");
            cy.getElementById("bbu").removeClass("faded");
            // Highlight cells belonging to link 1, 2, 3
            cy.nodes().filter((n) => [1, 2, 3].includes(n.data("linkId"))).removeClass("faded").addClass("highlighted");
            // Highlight edges
            cy.edges().filter((e) => ["link_1", "link_2", "link_3"].includes(e.source().id()) || ["link_1", "link_2", "link_3"].includes(e.target().id())).removeClass("faded").addClass("highlighted");
          }}
          onMouseLeave={() => {
            const cy = cyRef.current;
            if (!cy) return;
            cy.elements().removeClass("highlighted faded");
          }}
        >
          <div className="w-4 h-4 rounded-full bg-purple-400 shadow-md shadow-purple-400/50 ring-2 ring-white" />
          <span className="text-foreground">Primary Links (1,2,3)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-purple-400 shadow-md shadow-purple-400/50" />
          <span className="text-muted-foreground">Shared Fronthaul Link</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
          <span className="text-muted-foreground">Radio Cell</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rotate-45 bg-gray-400 shadow-sm" />
          <span className="text-muted-foreground">Isolated Cell</span>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 text-sm text-muted-foreground bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg">
        <span className="text-foreground font-medium">Controls:</span> Drag to pan • Scroll to zoom • Hover to highlight
      </div>
    </div>
  );
}
