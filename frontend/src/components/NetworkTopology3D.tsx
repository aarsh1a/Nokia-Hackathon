/**
 * Network Topology Visualization with Cost-Aware Capacity Recommendations
 * 
 * This component renders a 2D canvas visualization of the fronthaul network topology
 * showing BBU, links, and cells with their capacity tier recommendations.
 * 
 * Features:
 * - Interactive canvas with hover effects
 * - Color-coded capacity tiers (10G/25G/50G)
 * - Animated data flow particles
 * - Tooltips with detailed info
 */

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { cellTopology, linkColors, calculateLinkData, LinkData, CellData } from "@/data/networkData";

// Capacity tier definitions with colors and costs
const CAPACITY_TIERS = {
  "10G": { capacity: 10, color: "#22c55e", cost: 1, label: "10 Gbps" },
  "25G": { capacity: 25, color: "#f59e0b", cost: 2.2, label: "25 Gbps" },
  "50G": { capacity: 50, color: "#ef4444", cost: 4, label: "50 Gbps" },
} as const;

type CapacityTier = keyof typeof CAPACITY_TIERS;

// Calculate recommended capacity tier for a link
function calculateCapacityRecommendation(link: LinkData): {
  recommendedTier: CapacityTier;
  tierAnalysis: Record<CapacityTier, { 
    passes: boolean; 
    estimatedLoss: number; 
    congestionRisk: number;
    headroom: number;
  }>;
  costSavings: number;
} {
  const tierAnalysis: Record<CapacityTier, any> = {} as any;
  let recommendedTier: CapacityTier = "50G";
  
  for (const [tierName, tierInfo] of Object.entries(CAPACITY_TIERS)) {
    const tier = tierName as CapacityTier;
    const capacity = tierInfo.capacity;
    
    const headroom = (capacity - link.peakTraffic) / capacity;
    const utilizationRatio = link.peakTraffic / capacity;
    const bufferAbsorption = 0.15;
    const effectiveUtilization = Math.max(0, utilizationRatio - bufferAbsorption);
    
    let estimatedLoss = 0;
    if (effectiveUtilization > 0.85) {
      estimatedLoss = Math.pow((effectiveUtilization - 0.85) / 0.15, 2) * 0.1;
    }
    estimatedLoss = Math.min(estimatedLoss, 1);
    
    const congestionRisk = Math.min(1, Math.max(0, (utilizationRatio - 0.5) / 0.5));
    const passes = estimatedLoss <= 0.01 && headroom > 0;
    
    tierAnalysis[tier] = {
      passes,
      estimatedLoss,
      congestionRisk,
      headroom: Math.max(0, headroom),
    };
    
    if (passes && tierInfo.cost < CAPACITY_TIERS[recommendedTier].cost) {
      recommendedTier = tier;
    }
  }
  
  const peakBasedCost = CAPACITY_TIERS["50G"].cost;
  const recommendedCost = CAPACITY_TIERS[recommendedTier].cost;
  const costSavings = ((peakBasedCost - recommendedCost) / peakBasedCost) * 100;
  
  return { recommendedTier, tierAnalysis, costSavings };
}

interface NodePosition {
  x: number;
  y: number;
  radius: number;
  type: 'bbu' | 'link' | 'cell';
  data?: any;
  color?: string;
}

export function NetworkTopology3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<NodePosition | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<{x: number, y: number, progress: number, linkIdx: number}[]>([]);

  const linkData = useMemo(() => calculateLinkData(), []);
  
  const recommendations = useMemo(() => 
    linkData.map(link => ({
      link,
      ...calculateCapacityRecommendation(link)
    })), [linkData]
  );

  // Calculate node positions
  const nodePositions = useMemo(() => {
    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;
    const positions: NodePosition[] = [];

    // BBU at center
    positions.push({
      x: centerX,
      y: centerY,
      radius: 35,
      type: 'bbu',
    });

    // Links in a circle around BBU
    const linkRadius = 150;
    linkData.forEach((link, i) => {
      const angle = (i / linkData.length) * Math.PI * 2 - Math.PI / 2;
      const rec = recommendations.find(r => r.link.linkId === link.linkId);
      positions.push({
        x: centerX + Math.cos(angle) * linkRadius,
        y: centerY + Math.sin(angle) * linkRadius,
        radius: 25,
        type: 'link',
        data: { link, recommendation: rec },
        color: rec ? CAPACITY_TIERS[rec.recommendedTier].color : link.color,
      });
    });

    // Cells around their links
    const cellRadius = 80;
    cellTopology.forEach((cell) => {
      const linkInfo = linkData.find(l => l.linkId === cell.linkId);
      if (!linkInfo) return;
      
      const linkIdx = linkData.findIndex(l => l.linkId === cell.linkId);
      const linkAngle = (linkIdx / linkData.length) * Math.PI * 2 - Math.PI / 2;
      const linkX = centerX + Math.cos(linkAngle) * linkRadius;
      const linkY = centerY + Math.sin(linkAngle) * linkRadius;
      
      const cellsInLink = cellTopology.filter(c => c.linkId === cell.linkId);
      const cellIndex = cellsInLink.findIndex(c => c.cellId === cell.cellId);
      const cellCount = cellsInLink.length;
      
      const spread = Math.PI / 2.5;
      const cellAngle = linkAngle + (cellIndex - (cellCount - 1) / 2) * (spread / Math.max(1, cellCount - 1));
      
      positions.push({
        x: linkX + Math.cos(cellAngle) * cellRadius,
        y: linkY + Math.sin(cellAngle) * cellRadius,
        radius: 12,
        type: 'cell',
        data: { cell, linkColor: linkColors[cell.linkId] },
        color: linkColors[cell.linkId],
      });
    });

    return positions;
  }, [linkData, recommendations]);

  // Initialize particles
  useEffect(() => {
    particlesRef.current = [];
    linkData.forEach((_, idx) => {
      const count = 3;
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: 0,
          y: 0,
          progress: Math.random(),
          linkIdx: idx,
        });
      }
    });
  }, [linkData]);

  // Draw the canvas
  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#1e3a5f20';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const bbu = nodePositions[0];
    const links = nodePositions.filter(n => n.type === 'link');
    const cells = nodePositions.filter(n => n.type === 'cell');

    // Draw connections from cells to links
    cells.forEach(cell => {
      const linkNode = links.find(l => l.data?.link.linkId === cell.data?.cell.linkId);
      if (linkNode) {
        ctx.beginPath();
        ctx.strokeStyle = cell.color + '40';
        ctx.lineWidth = 1;
        ctx.moveTo(cell.x, cell.y);
        ctx.lineTo(linkNode.x, linkNode.y);
        ctx.stroke();
      }
    });

    // Draw connections from links to BBU with glow
    links.forEach((link, idx) => {
      const rec = recommendations[idx];
      const tierColor = rec ? CAPACITY_TIERS[rec.recommendedTier].color : '#666';
      
      // Glow effect
      ctx.beginPath();
      ctx.strokeStyle = tierColor + '30';
      ctx.lineWidth = 8;
      ctx.moveTo(link.x, link.y);
      ctx.lineTo(bbu.x, bbu.y);
      ctx.stroke();
      
      // Main line
      ctx.beginPath();
      ctx.strokeStyle = tierColor + '80';
      ctx.lineWidth = 3;
      ctx.moveTo(link.x, link.y);
      ctx.lineTo(bbu.x, bbu.y);
      ctx.stroke();
    });

    // Animate and draw particles
    particlesRef.current.forEach((particle) => {
      particle.progress += 0.005;
      if (particle.progress > 1) particle.progress = 0;
      
      const link = links[particle.linkIdx];
      if (link) {
        const t = particle.progress;
        particle.x = link.x + (bbu.x - link.x) * t;
        particle.y = link.y + (bbu.y - link.y) * t;
        
        const rec = recommendations[particle.linkIdx];
        const tierColor = rec ? CAPACITY_TIERS[rec.recommendedTier].color : '#666';
        
        ctx.beginPath();
        ctx.fillStyle = tierColor;
        ctx.shadowColor = tierColor;
        ctx.shadowBlur = 10;
        ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw BBU node
    ctx.beginPath();
    ctx.fillStyle = '#22d3ee30';
    ctx.arc(bbu.x, bbu.y, bbu.radius + 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 20;
    ctx.arc(bbu.x, bbu.y, bbu.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BBU', bbu.x, bbu.y);

    // Draw link nodes
    links.forEach((link, idx) => {
      const rec = recommendations[idx];
      const tierColor = rec ? CAPACITY_TIERS[rec.recommendedTier].color : '#666';
      const isHovered = hoveredNode?.type === 'link' && hoveredNode?.data?.link.linkId === link.data?.link.linkId;
      
      // Glow ring
      ctx.beginPath();
      ctx.strokeStyle = tierColor + '60';
      ctx.lineWidth = 3;
      ctx.arc(link.x, link.y, link.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      
      // Main node
      ctx.beginPath();
      ctx.fillStyle = isHovered ? '#ffffff' : tierColor;
      ctx.shadowColor = tierColor;
      ctx.shadowBlur = isHovered ? 25 : 15;
      ctx.arc(link.x, link.y, link.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px system-ui';
      ctx.fillText(`L${link.data?.link.linkId}`, link.x, link.y - 35);
      
      // Tier badge
      ctx.fillStyle = tierColor;
      ctx.font = '9px system-ui';
      ctx.fillText(rec ? CAPACITY_TIERS[rec.recommendedTier].label : '', link.x, link.y + 38);
    });

    // Draw cell nodes
    cells.forEach(cell => {
      const isHovered = hoveredNode?.type === 'cell' && hoveredNode?.data?.cell.cellId === cell.data?.cell.cellId;
      
      ctx.beginPath();
      ctx.fillStyle = isHovered ? '#ffffff' : cell.color || '#666';
      ctx.shadowColor = cell.color || '#666';
      ctx.shadowBlur = isHovered ? 15 : 8;
      ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = cell.color || '#666';
      ctx.font = '8px system-ui';
      ctx.fillText(cell.data?.cell.cellId.replace('cell_', 'C'), cell.x, cell.y + 22);
    });

  }, [nodePositions, recommendations, hoveredNode]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (time: number) => {
      draw(ctx, time);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  // Handle mouse move for hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });
    
    // Check if hovering over any node
    let found: NodePosition | null = null;
    for (const node of nodePositions) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < node.radius + 5) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  };

  // Calculate summary stats
  const totalSavings = useMemo(() => {
    const total = recommendations.reduce((sum, r) => sum + r.costSavings, 0);
    return total / recommendations.length;
  }, [recommendations]);

  const tierCounts = useMemo(() => {
    const counts: Record<CapacityTier, number> = { "10G": 0, "25G": 0, "50G": 0 };
    recommendations.forEach(r => counts[r.recommendedTier]++);
    return counts;
  }, [recommendations]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full rounded-lg border border-slate-700"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        style={{ cursor: hoveredNode ? 'pointer' : 'default' }}
      />
      
      {/* Tooltip */}
      {hoveredNode && hoveredNode.type !== 'bbu' && (
        <div 
          className="fixed z-50 bg-slate-900/95 border border-slate-600 rounded-lg p-3 min-w-[220px] backdrop-blur-sm shadow-xl pointer-events-none"
          style={{ 
            left: mousePos.x + 15, 
            top: mousePos.y + 15,
          }}
        >
          {hoveredNode.type === 'link' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold">{hoveredNode.data.link.linkName}</span>
                <span 
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ 
                    backgroundColor: CAPACITY_TIERS[hoveredNode.data.recommendation.recommendedTier].color + '30',
                    color: CAPACITY_TIERS[hoveredNode.data.recommendation.recommendedTier].color 
                  }}
                >
                  {CAPACITY_TIERS[hoveredNode.data.recommendation.recommendedTier].label}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Cells:</span>
                  <span className="text-white">{hoveredNode.data.link.cells.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Peak Traffic:</span>
                  <span className="text-white">{hoveredNode.data.link.peakTraffic.toFixed(2)} Gbps</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Avg Traffic:</span>
                  <span className="text-white">{hoveredNode.data.link.avgTraffic.toFixed(2)} Gbps</span>
                </div>
                <div className="border-t border-slate-700 pt-2 mt-2">
                  <div className="text-slate-500 mb-1">Tier Analysis:</div>
                  {(Object.entries(hoveredNode.data.recommendation.tierAnalysis) as [CapacityTier, any][]).map(([tier, analysis]) => (
                    <div key={tier} className="flex items-center gap-2 text-xs">
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: CAPACITY_TIERS[tier].color }}
                      />
                      <span className="text-slate-400">{CAPACITY_TIERS[tier].label}:</span>
                      <span className={analysis.passes ? "text-green-400" : "text-red-400"}>
                        {analysis.passes ? "✓" : "✗"}
                      </span>
                      <span className="text-slate-500 ml-auto">
                        {(analysis.congestionRisk * 100).toFixed(0)}% risk
                      </span>
                    </div>
                  ))}
                </div>
                {hoveredNode.data.recommendation.costSavings > 0 && (
                  <div className="bg-green-500/20 rounded p-1.5 mt-2">
                    <span className="text-green-400 text-xs">
                      💰 {hoveredNode.data.recommendation.costSavings.toFixed(0)}% savings
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
          {hoveredNode.type === 'cell' && (
            <>
              <div className="text-white font-bold mb-2">{hoveredNode.data.cell.cellId}</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Link:</span>
                  <span className="text-white">{hoveredNode.data.cell.linkName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Peak:</span>
                  <span className="text-white">{hoveredNode.data.cell.peakTraffic.toFixed(2)} Gbps</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Avg:</span>
                  <span className="text-white">{hoveredNode.data.cell.avgTraffic.toFixed(2)} Gbps</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Loss Rate:</span>
                  <span className={hoveredNode.data.cell.packetLossRate > 0.1 ? "text-red-400" : "text-green-400"}>
                    {(hoveredNode.data.cell.packetLossRate * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 rounded-lg p-3 backdrop-blur-sm">
        <div className="text-white font-semibold mb-2 text-sm">Capacity Tiers</div>
        <div className="space-y-1.5">
          {(Object.entries(CAPACITY_TIERS) as [CapacityTier, typeof CAPACITY_TIERS[CapacityTier]][]).map(([tier, info]) => (
            <div key={tier} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: info.color, boxShadow: `0 0 6px ${info.color}` }}
              />
              <span className="text-slate-300 text-xs">{info.label}</span>
              <span className="text-slate-500 text-xs ml-auto">{info.cost}x</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Panel */}
      <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-3 backdrop-blur-sm min-w-[180px]">
        <div className="text-white font-semibold mb-2 text-sm">Cost Summary</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Links:</span>
            <span className="text-white">{linkData.length}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Cells:</span>
            <span className="text-white">{cellTopology.length}</span>
          </div>
          <div className="border-t border-slate-700 my-1.5" />
          {(Object.entries(tierCounts) as [CapacityTier, number][]).map(([tier, count]) => (
            <div key={tier} className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CAPACITY_TIERS[tier].color }}
                />
                <span className="text-slate-300">{tier}</span>
              </div>
              <span className="text-white">{count}</span>
            </div>
          ))}
          <div className="bg-green-500/20 rounded p-1.5 mt-2">
            <div className="text-green-400 font-medium text-center">
              {totalSavings.toFixed(1)}% Avg Savings
            </div>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 border border-slate-700 rounded px-2 py-1">
        <span className="text-slate-400 text-xs">👆 Hover for details</span>
      </div>
    </div>
  );
}

export default NetworkTopology3D;
