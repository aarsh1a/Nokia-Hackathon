import { useState, useEffect, useRef } from "react";
import { AlertTriangle, TrendingUp, Brain, Activity, RefreshCw, Loader2, Play, Pause, RotateCcw, Radio, ArrowRight, Shuffle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPredictions,
  getModelInfo,
  getLiveStream,
  type PredictionResult,
  type ModelInfo,
  type LiveCell,
} from "@/services/api";

const API_BASE = "http://localhost:8000";

// Cell to Link mapping (from topology inference)
// This will be loaded from API
type TopologyMap = Record<string, string>; // cell_id -> link_id

// Risk category colors
const riskColors = {
  Critical: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/50" },
  High: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/50" },
  Medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/50" },
  Low: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/50" },
};

// Risk bar component
function RiskBar({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const color = score >= 0.75 ? "bg-red-500" : score >= 0.5 ? "bg-orange-500" : score >= 0.25 ? "bg-yellow-500" : "bg-green-500";
  
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-200`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-mono w-12 text-right">{percentage}%</span>
    </div>
  );
}

export function CongestionPrediction() {
  // Static data state
  const [predictions, setPredictions] = useState<PredictionResult | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live streaming state
  const [isLive, setIsLive] = useState(false);
  const [liveCells, setLiveCells] = useState<LiveCell[]>([]);
  const [liveProgress, setLiveProgress] = useState(0);
  const [liveTimestamp, setLiveTimestamp] = useState(0);
  const [totalTimestamps, setTotalTimestamps] = useState(0);
  const [streamSpeed, setStreamSpeed] = useState(1000); // Default to 1x (1 second)
  const [loopCount, setLoopCount] = useState(0);
  
  // Topology for link diversion suggestions
  const [topology, setTopology] = useState<TopologyMap>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  
  // Track congested cells that need action (sticky congestion)
  const [congestedCells, setCongestedCells] = useState<Set<string>>(new Set());
  const [divertedCells, setDivertedCells] = useState<Set<string>>(new Set());
  
  // Use refs to avoid stale closure issues
  const congestedCellsRef = useRef<Set<string>>(new Set());
  const divertedCellsRef = useRef<Set<string>>(new Set());
  
  const intervalRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  
  // Load topology on mount
  useEffect(() => {
    fetch(`${API_BASE}/analyze`)
      .then(res => res.json())
      .then(data => {
        if (data.topology) {
          setTopology(data.topology);
        }
      })
      .catch(err => console.error("Failed to load topology:", err));
  }, []);
  
  // Get link for a cell
  const getCellLink = (cellId: string | number): string => {
    // Try different formats
    const id = String(cellId);
    if (topology[id]) return topology[id];
    if (topology[`cell_${id}`]) return topology[`cell_${id}`];
    // Extract number if it's like "cell_5" or just "5"
    const num = id.replace(/\D/g, '');
    if (topology[`cell_${num}`]) return topology[`cell_${num}`];
    return "Unknown";
  };
  
  // Get alternative links (links that are NOT congested)
  const getAlternativeLinks = (congestedCellId: string | number): string[] => {
    const currentLink = getCellLink(congestedCellId);
    const allLinks = [...new Set(Object.values(topology))];
    
    // Find links with no congested cells (or low risk cells)
    const displayData = isLive && liveCells.length > 0 ? liveCells : (predictions?.predictions || []);
    
    const congestedLinks = new Set<string>();
    displayData.forEach(cell => {
      const isCongested = 'isCongested' in cell ? cell.isCongested : ('packetLoss' in cell && cell.packetLoss > 0);
      if (isCongested || cell.riskScore > 0.7) {
        congestedLinks.add(getCellLink(cell.cellId));
      }
    });
    
    return allLinks.filter(link => link !== currentLink && !congestedLinks.has(link));
  };

  // Fetch initial static data
  const fetchStaticData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [predData, modelData] = await Promise.all([
        getPredictions(),
        getModelInfo(),
      ]);
      setPredictions(predData);
      setModelInfo(modelData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  };

  // Fetch next live data - get 20 timestamps at a time for faster streaming
  // REALISTIC: Once congested, cells STAY congested until diverted
  const fetchLiveData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      const result = await getLiveStream('next', 20);
      
      if (result.timeline && result.timeline.length > 0) {
        const latest = result.timeline[result.timeline.length - 1];
        
        // Track newly congested cells (sticky - they don't auto-recover)
        // Use ref to avoid stale closure
        latest.cells.forEach(cell => {
          const cellId = String(cell.cellId);
          const isCongested = 'isCongested' in cell ? cell.isCongested : ('packetLoss' in cell && cell.packetLoss > 0);
          
          // If congested and NOT diverted, add to sticky list
          if (isCongested && !divertedCellsRef.current.has(cellId)) {
            congestedCellsRef.current.add(cellId);
          }
        });
        // Update state from ref
        setCongestedCells(new Set(congestedCellsRef.current));
        
        setLiveCells(latest.cells);
        setLiveTimestamp(latest.timestamp);
        setLiveProgress(result.pagination.progress);
        setTotalTimestamps(result.pagination.totalTimestamps);
        if (result.pagination.loopCount !== undefined) {
          setLoopCount(result.pagination.loopCount);
        }
      }
    } catch (err) {
      console.error("Live fetch error:", err);
    } finally {
      isFetchingRef.current = false;
    }
  };
  
  // Divert traffic from a congested cell - clears congestion
  const divertCell = (cellId: string) => {
    // Update refs
    divertedCellsRef.current.add(cellId);
    congestedCellsRef.current.delete(cellId);
    
    // Update state
    setDivertedCells(new Set(divertedCellsRef.current));
    setCongestedCells(new Set(congestedCellsRef.current));
    
    // Close the panel
    setSelectedCell(null);
  };

  // Start live streaming
  const startLive = async () => {
    setIsLive(true);
    await fetchLiveData(); // Immediate first fetch
  };

  // Stop live streaming - immediately clear interval
  const stopLive = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsLive(false);
  };

  // Reset stream
  const resetStream = async () => {
    stopLive();
    try {
      await getLiveStream('reset');
      setLiveCells([]);
      setLiveProgress(0);
      setLiveTimestamp(0);
      setLoopCount(0);
      // Clear congestion tracking (both refs and state)
      congestedCellsRef.current = new Set();
      divertedCellsRef.current = new Set();
      setCongestedCells(new Set());
      setDivertedCells(new Set());
      setSelectedCell(null);
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  // Manage polling interval - ALWAYS cleanup on any change
  useEffect(() => {
    // Always clear any existing interval first
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Only start new interval if live
    if (isLive) {
      intervalRef.current = window.setInterval(fetchLiveData, streamSpeed);
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLive, streamSpeed]);

  // Load initial data
  useEffect(() => {
    fetchStaticData();
  }, []);

  // Determine what to display
  const displayCells = isLive && liveCells.length > 0 ? liveCells : predictions?.predictions || [];
  
  // Calculate summary
  // Calculate summary with realistic congestion state
  const summary = {
    critical: displayCells.filter(c => !divertedCells.has(String(c.cellId)) && c.riskCategory === 'Critical').length,
    high: displayCells.filter(c => !divertedCells.has(String(c.cellId)) && c.riskCategory === 'High').length,
    medium: displayCells.filter(c => !divertedCells.has(String(c.cellId)) && c.riskCategory === 'Medium').length,
    low: displayCells.filter(c => !divertedCells.has(String(c.cellId)) && c.riskCategory === 'Low').length + divertedCells.size,
    // In live mode, use sticky congestion (minus diverted)
    congested: isLive 
      ? congestedCells.size - [...congestedCells].filter(id => divertedCells.has(id)).length
      : displayCells.filter(c => 'isCongested' in c ? c.isCongested : ('currentPacketLoss' in c && c.currentPacketLoss > 0)).length,
    diverted: divertedCells.size,
  };

  if (loading && !predictions) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading ML predictions...</span>
      </div>
    );
  }

  if (error && !predictions) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-orange-400 mb-4" />
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchStaticData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  const bestModel = modelInfo?.models?.gradient_boosting;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLive ? 'bg-green-500/20' : 'bg-primary/10'}`}>
            {isLive ? <Radio className="w-5 h-5 text-green-400 animate-pulse" /> : <Brain className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">Gradient Boosting</h4>
              {isLive && (
                <span className="flex items-center gap-1 text-green-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {bestModel && `ROC-AUC: ${(bestModel.roc_auc * 100).toFixed(1)}%`}
              {isLive && ` | Time: ${liveTimestamp.toFixed(2)}s | Progress: ${liveProgress.toFixed(1)}% | Loop: ${loopCount}`}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <select 
            value={streamSpeed}
            onChange={(e) => {
              const newSpeed = Number(e.target.value);
              setStreamSpeed(newSpeed);
            }}
            className="bg-secondary border border-border rounded px-2 py-1 text-xs cursor-pointer"
          >
            <option value={2000}>0.5x (Slow)</option>
            <option value={1000}>1x (Normal)</option>
            <option value={500}>2x</option>
            <option value={250}>4x</option>
            <option value={100}>10x (Fast)</option>
          </select>

          <Button 
            onClick={isLive ? stopLive : startLive}
            variant={isLive ? "destructive" : "default"}
            size="sm"
            className="gap-2"
          >
            {isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isLive ? 'Stop' : 'Start Live'}
          </Button>

          <Button onClick={resetStream} variant="outline" size="sm" disabled={isLive}>
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button onClick={fetchStaticData} variant="outline" size="sm" disabled={loading || isLive}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {isLive && (
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-200"
            style={{ width: `${liveProgress}%` }}
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <div className={`rounded-lg p-3 ${riskColors.Critical.bg} border ${riskColors.Critical.border}`}>
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className={`w-3 h-3 ${riskColors.Critical.text}`} />
            <span className="text-xs">Critical</span>
          </div>
          <div className={`text-xl font-bold ${riskColors.Critical.text}`}>{summary.critical}</div>
        </div>
        
        <div className={`rounded-lg p-3 ${riskColors.High.bg} border ${riskColors.High.border}`}>
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className={`w-3 h-3 ${riskColors.High.text}`} />
            <span className="text-xs">High</span>
          </div>
          <div className={`text-xl font-bold ${riskColors.High.text}`}>{summary.high}</div>
        </div>
        
        <div className={`rounded-lg p-3 ${riskColors.Medium.bg} border ${riskColors.Medium.border}`}>
          <div className="flex items-center gap-1 mb-1">
            <Activity className={`w-3 h-3 ${riskColors.Medium.text}`} />
            <span className="text-xs">Medium</span>
          </div>
          <div className={`text-xl font-bold ${riskColors.Medium.text}`}>{summary.medium}</div>
        </div>
        
        <div className={`rounded-lg p-3 ${riskColors.Low.bg} border ${riskColors.Low.border}`}>
          <div className="flex items-center gap-1 mb-1">
            <Activity className={`w-3 h-3 ${riskColors.Low.text}`} />
            <span className="text-xs">Low</span>
          </div>
          <div className={`text-xl font-bold ${riskColors.Low.text}`}>{summary.low}</div>
        </div>

        <div className={`rounded-lg p-3 bg-red-500/30 border border-red-500/50`}>
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-xs">Congested</span>
          </div>
          <div className="text-xl font-bold text-red-400">{summary.congested}</div>
        </div>
        
        {/* Show diverted count if any */}
        {summary.diverted > 0 && (
          <div className={`rounded-lg p-3 bg-blue-500/30 border border-blue-500/50`}>
            <div className="flex items-center gap-1 mb-1">
              <Shuffle className="w-3 h-3 text-blue-400" />
              <span className="text-xs">Diverted</span>
            </div>
            <div className="text-xl font-bold text-blue-400">{summary.diverted}</div>
          </div>
        )}
      </div>

      {/* Cell Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-secondary/50 px-4 py-2 border-b border-border flex justify-between items-center">
          <span className="text-sm font-medium">Cell Risk Rankings</span>
          {isLive && <span className="text-xs text-green-400">Updating every {streamSpeed}ms</span>}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-background text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2">Cell</th>
                <th className="text-left px-3 py-2">Link</th>
                <th className="text-left px-3 py-2 w-32">Risk</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Loss</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayCells.map((cell) => {
                const cellId = String(cell.cellId);
                const colors = riskColors[cell.riskCategory];
                const loss = 'currentPacketLoss' in cell ? cell.currentPacketLoss : ('packetLoss' in cell ? cell.packetLoss : 0);
                const rawCongested = 'isCongested' in cell ? cell.isCongested : loss > 0;
                
                // REALISTIC: Once congested, stays congested until diverted
                const isDiverted = divertedCells.has(cellId);
                const isStickyCongested = congestedCells.has(cellId);
                const congested = isLive ? (isStickyCongested && !isDiverted) : rawCongested;
                
                const link = getCellLink(cell.cellId);
                const alternatives = congested ? getAlternativeLinks(cell.cellId) : [];
                const isSelected = selectedCell === cellId;
                
                return (
                  <tr 
                    key={cell.cellId} 
                    className={`border-b border-border/50 hover:bg-secondary/30 cursor-pointer ${congested ? 'bg-red-500/10' : isDiverted ? 'bg-green-500/10' : ''} ${isSelected ? 'ring-1 ring-primary' : ''}`}
                    onClick={() => setSelectedCell(isSelected ? null : cellId)}
                  >
                    <td className="px-3 py-2 font-mono text-sm">{cell.cellId}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{link}</td>
                    <td className="px-3 py-2">
                      <RiskBar score={isDiverted ? 0.1 : cell.riskScore} />
                    </td>
                    <td className="px-3 py-2">
                      {isDiverted ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-500/30 text-green-400">
                          DIVERTED
                        </span>
                      ) : (
                        <>
                          <span className={`px-2 py-0.5 rounded text-xs ${colors.bg} ${colors.text}`}>
                            {cell.riskCategory}
                          </span>
                          {congested && (
                            <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-red-500/30 text-red-400 animate-pulse">
                              CONGESTED
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm">
                      {isDiverted ? (
                        <span className="text-green-400">0</span>
                      ) : loss > 0 ? (
                        <span className="text-red-400">{loss}</span>
                      ) : (
                        <span className="text-green-400">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {congested && alternatives.length > 0 && (
                        <div className="flex items-center gap-1 text-blue-400">
                          <Shuffle className="w-3 h-3" />
                          <span className="text-xs">Needs Action</span>
                        </div>
                      )}
                      {isDiverted && (
                        <span className="text-xs text-green-400">Resolved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Diversion Action Panel */}
      {selectedCell && (() => {
        const cellData = displayCells.find(c => String(c.cellId) === selectedCell);
        if (!cellData) return null;
        
        const cellId = String(cellData.cellId);
        const isDiverted = divertedCells.has(cellId);
        const isStickyCongested = congestedCells.has(cellId);
        const congested = isLive ? (isStickyCongested && !isDiverted) : ('isCongested' in cellData ? cellData.isCongested : false);
        
        const currentLink = getCellLink(cellData.cellId);
        const alternatives = getAlternativeLinks(cellData.cellId);
        
        // Show resolved state if diverted
        if (isDiverted) {
          return (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="font-medium text-green-300">Traffic Diverted Successfully</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setSelectedCell(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Cell {selectedCell} traffic has been diverted. Congestion cleared.
              </p>
            </div>
          );
        }
        
        if (!congested) return null;
        
        return (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="font-medium text-red-300">Congestion Alert - Action Required</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center p-2 rounded bg-red-500/20 border border-red-500/30">
                <div className="text-xs text-muted-foreground">Cell {selectedCell}</div>
                <div className="font-mono text-red-400">{currentLink}</div>
                <div className="text-xs text-red-400 font-bold">CONGESTED</div>
              </div>
              
              <ArrowRight className="w-5 h-5 text-blue-400" />
              
              {alternatives.length > 0 ? (
                <div className="flex gap-2">
                  {alternatives.map(alt => (
                    <div key={alt} className="text-center p-2 rounded bg-green-500/20 border border-green-500/30">
                      <div className="font-mono text-green-400">{alt}</div>
                      <div className="text-xs text-green-400">Available</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-2 rounded bg-yellow-500/20 border border-yellow-500/30">
                  <div className="font-mono text-yellow-400">No alternatives</div>
                  <div className="text-xs text-yellow-400">All links busy</div>
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-4">
              {alternatives.length > 0 
                ? `Divert traffic from ${currentLink} to ${alternatives.join(' or ')} to resolve congestion.`
                : "No available links for diversion. Consider capacity upgrade."
              }
            </p>
            
            <div className="flex gap-2">
              {alternatives.length > 0 && (
                <Button 
                  onClick={() => divertCell(cellId)}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                  size="sm"
                >
                  <Shuffle className="w-4 h-4" />
                  Divert Traffic to {alternatives[0]}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedCell(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
