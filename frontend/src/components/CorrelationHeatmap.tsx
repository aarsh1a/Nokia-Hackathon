import { useMemo } from "react";
import { generateCorrelationMatrix, cellTopology, linkColors } from "@/data/networkData";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CorrelationHeatmapProps {
  liveCorrelation?: Record<string, Record<string, number>>;
  liveTopology?: Record<string, string>;
}

export function CorrelationHeatmap({ liveCorrelation, liveTopology }: CorrelationHeatmapProps) {
  // Use live data if provided, otherwise use static data
  const { cells, matrix } = useMemo(() => {
    if (liveCorrelation && liveTopology) {
      // Convert live correlation data to matrix format
      const cellIds = Object.keys(liveCorrelation).sort((a, b) => {
        const numA = parseInt(a.split('_')[1]);
        const numB = parseInt(b.split('_')[1]);
        return numA - numB;
      });
      
      // Reorder by link for better visualization
      const linkGroups: Record<string, string[]> = {};
      cellIds.forEach(cellId => {
        const linkName = liveTopology[cellId];
        if (!linkGroups[linkName]) linkGroups[linkName] = [];
        linkGroups[linkName].push(cellId);
      });
      
      // Order: shared links first (by link number), then isolated
      const orderedCells: string[] = [];
      Object.keys(linkGroups)
        .sort((a, b) => {
          const numA = parseInt(a.split('_')[1]);
          const numB = parseInt(b.split('_')[1]);
          return numA - numB;
        })
        .forEach(linkName => {
          orderedCells.push(...linkGroups[linkName].sort((a, b) => {
            const numA = parseInt(a.split('_')[1]);
            const numB = parseInt(b.split('_')[1]);
            return numA - numB;
          }));
        });
      
      // Build matrix
      const mat: number[][] = [];
      for (const cellI of orderedCells) {
        const row: number[] = [];
        for (const cellJ of orderedCells) {
          const value = liveCorrelation[cellI]?.[cellJ] ?? 0;
          row.push(value);
        }
        mat.push(row);
      }
      
      return { cells: orderedCells, matrix: mat };
    }
    
    return generateCorrelationMatrix();
  }, [liveCorrelation, liveTopology]);

  // Group cells by link for coloring
  const cellLinkMap = useMemo(() => {
    const map: Record<string, number> = {};
    
    if (liveTopology) {
      // Use live topology
      Object.entries(liveTopology).forEach(([cellId, linkName]) => {
        const linkId = parseInt(linkName.split('_')[1]);
        map[cellId] = linkId;
      });
    } else {
      // Use static topology
      cellTopology.forEach((cell) => {
        map[cell.cellId] = cell.linkId;
      });
    }
    
    return map;
  }, [liveTopology]);

  const getColor = (value: number) => {
    if (value >= 0.9) return "bg-cyan-400";
    if (value >= 0.7) return "bg-cyan-500/80";
    if (value >= 0.5) return "bg-purple-500/70";
    if (value >= 0.3) return "bg-purple-500/40";
    if (value >= 0.1) return "bg-slate-600/60";
    return "bg-slate-800/40";
  };

  const isLive = !!liveCorrelation;

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        {isLive 
          ? "Live correlation data from backend analysis - High correlation (bright cyan) indicates cells on the same fronthaul link"
          : "Real correlation data from eval1_results.json - High correlation (bright cyan) indicates cells on the same fronthaul link"
        }
      </div>

      <div className="overflow-auto">
        <div className="inline-block min-w-max">
          {/* Header */}
          <div className="flex">
            <div className="w-12 h-5" />
            {cells.map((cell) => {
              const linkId = cellLinkMap[cell];
              const color = linkColors[linkId] || "#888";
              return (
                <div
                  key={cell}
                  className="w-5 h-5 flex items-center justify-center text-[7px] -rotate-45 origin-center font-medium"
                  style={{ color }}
                >
                  {cell.replace("cell_", "")}
                </div>
              );
            })}
          </div>

          {/* Matrix */}
          {matrix.map((row, i) => {
            const cellId = cells[i];
            const linkId = cellLinkMap[cellId];
            const color = linkColors[linkId] || "#888";
            return (
              <div key={cellId} className="flex items-center">
                <div
                  className="w-12 h-5 flex items-center text-[8px] pr-1 font-medium"
                  style={{ color }}
                >
                  {cellId.replace("cell_", "C")}
                </div>
                {row.map((value, j) => (
                  <Tooltip key={j}>
                    <TooltipTrigger>
                      <div
                        className={`w-5 h-5 ${getColor(value)} border border-background/10 hover:border-white/50 transition-colors`}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover border-border">
                      <div className="text-xs">
                        <div className="font-medium">
                          {cells[i]} ↔ {cells[j]}
                        </div>
                        <div className="text-foreground font-mono">
                          Correlation: {(value * 100).toFixed(1)}%
                        </div>
                        <div className="text-muted-foreground">
                          {cellLinkMap[cells[i]] === cellLinkMap[cells[j]]
                            ? `Same Link (Link_${cellLinkMap[cells[i]]})`
                            : "Different Links"}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-4">
        <span className="font-medium">Correlation:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-slate-800/40 rounded" />
          <span>&lt;10%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-slate-600/60 rounded" />
          <span>10-30%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-purple-500/40 rounded" />
          <span>30-50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-purple-500/70 rounded" />
          <span>50-70%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-cyan-500/80 rounded" />
          <span>70-90%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-cyan-400 rounded" />
          <span>&gt;90%</span>
        </div>
      </div>
    </div>
  );
}
