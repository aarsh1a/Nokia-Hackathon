import { useState, useEffect } from "react";
import { RefreshCw, Loader2, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = "http://localhost:8000";

interface TierEvaluation {
  loss_percent: number;
  sla_pass: boolean;
}

interface LinkRecommendation {
  link_id: string;
  cells: string[];
  peak_traffic_gbps: number;
  recommended_tier: string;
  recommended_tier_gbps: number;
  cost_savings_percent: number;
  tier_evaluation: Record<string, TierEvaluation>;
}

interface RecommendationsData {
  links: LinkRecommendation[];
  summary: {
    total_links: number;
    overall_cost_savings_percent: number;
  };
}

// Cost model: relative cost units per tier
const TIER_COSTS: Record<string, number> = { "10G": 1, "25G": 2, "50G": 4 };
const TIER_GBPS: Record<string, number> = { "10G": 10, "25G": 25, "50G": 50 };

// Determine peak-based tier (traditional approach: always provision for worst-case)
function getPeakBasedTier(peakTraffic: number): string {
  if (peakTraffic <= 10) return "10G";
  if (peakTraffic <= 25) return "25G";
  return "50G";
}

export function CapacityPlanning() {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/capacity-recommendations`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleRow = (linkId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(linkId)) {
        next.delete(linkId);
      } else {
        next.add(linkId);
      }
      return next;
    });
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Analyzing traffic patterns...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Explanation Header */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300 leading-relaxed">
            Instead of provisioning links based on worst-case peak traffic, we simulate real traffic 
            and buffer behavior to recommend the <span className="text-white font-medium">lowest-cost link</span> that 
            still meets the <span className="text-white font-medium">1% packet-loss SLA</span>.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{data.summary.total_links}</div>
          <div className="text-xs text-slate-400 mt-1">Links Analyzed</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{data.summary.overall_cost_savings_percent}%</div>
          <div className="text-xs text-green-400/70 mt-1">Total Cost Savings</div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">≤1%</div>
          <div className="text-xs text-slate-400 mt-1">Packet Loss SLA</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="bg-slate-800/80 border-b border-slate-700">
          <div className="grid grid-cols-[40px_80px_1fr_120px_120px_100px] gap-2 px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
            <div></div>
            <div>Link</div>
            <div>Cells</div>
            <div className="text-center">Peak-Based</div>
            <div className="text-center">Optimized</div>
            <div className="text-right">Savings</div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-700/50">
          {data.links.map((link) => {
            const isExpanded = expandedRows.has(link.link_id);
            const optimizedTier = link.recommended_tier;
            const peakBasedTier = getPeakBasedTier(link.peak_traffic_gbps);
            const hasSavings = link.cost_savings_percent > 0;
            const isCheaper = TIER_COSTS[optimizedTier] < TIER_COSTS[peakBasedTier];
            
            const peakCost = TIER_COSTS[peakBasedTier];
            const optimizedCost = TIER_COSTS[optimizedTier];
            const savedUnits = peakCost - optimizedCost;

            return (
              <div key={link.link_id}>
                {/* Main Row */}
                <div 
                  className={`grid grid-cols-[40px_80px_1fr_120px_120px_100px] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-slate-800/30 transition-colors ${isExpanded ? 'bg-slate-800/20' : ''}`}
                  onClick={() => toggleRow(link.link_id)}
                >
                  {/* Expand Icon */}
                  <div className="text-slate-500">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  
                  {/* Link ID */}
                  <div className="font-mono font-medium text-white">{link.link_id}</div>
                  
                  {/* Cells */}
                  <div className="text-sm text-slate-400">
                    {link.cells.length} cell{link.cells.length !== 1 ? 's' : ''}
                    <span className="text-slate-500 ml-2 text-xs">
                      ({link.cells.slice(0, 3).map(c => c.replace('cell_', 'C')).join(', ')}{link.cells.length > 3 ? '...' : ''})
                    </span>
                  </div>
                  
                  {/* Peak-Based Tier (muted) */}
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 rounded text-sm font-medium bg-slate-700/50 text-slate-400">
                      {TIER_GBPS[peakBasedTier]} Gbps
                    </span>
                  </div>
                  
                  {/* Optimized Tier */}
                  <div className="text-center">
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      isCheaper 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-slate-700/50 text-slate-300'
                    }`}>
                      {link.recommended_tier_gbps} Gbps
                    </span>
                  </div>
                  
                  {/* Cost Savings */}
                  <div className="text-right">
                    <span className={`font-bold ${hasSavings ? 'text-green-400' : 'text-slate-500'}`}>
                      {hasSavings ? `${link.cost_savings_percent}%` : '—'}
                    </span>
                  </div>
                </div>

                {/* Expanded Detail Row */}
                {isExpanded && (
                  <div className="bg-slate-900/50 border-t border-slate-700/30 px-4 py-4 pl-14">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Tier-by-Tier Analysis */}
                      <div>
                        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                          Tier Analysis
                        </h4>
                        <div className="space-y-2">
                          {(["10G", "25G", "50G"] as const).map((tier) => {
                            const eval_ = link.tier_evaluation[tier];
                            if (!eval_) return null;
                            
                            const passes = eval_.sla_pass;
                            const lossPercent = eval_.loss_percent;
                            
                            return (
                              <div key={tier} className="flex items-start gap-2 text-sm">
                                <span className={`font-mono ${passes ? 'text-green-400' : 'text-red-400'}`}>
                                  {passes ? '✓' : '✗'}
                                </span>
                                <div>
                                  <span className={`font-medium ${passes ? 'text-green-400' : 'text-red-400'}`}>
                                    {TIER_GBPS[tier]} Gbps {passes ? 'works' : 'fails'}
                                  </span>
                                  <span className="text-slate-400"> — </span>
                                  {passes ? (
                                    <span className="text-slate-300">
                                      Packet loss only {lossPercent.toFixed(2)}% (within 1% SLA)
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">
                                      Would cause {lossPercent.toFixed(2)}% packet loss (exceeds 1% SLA)
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cost Comparison */}
                      <div>
                        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                          Cost Comparison
                        </h4>
                        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Peak-based approach:</span>
                            <span className="text-slate-300">{peakBasedTier} ({peakCost} units)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Optimized recommendation:</span>
                            <span className={isCheaper ? 'text-green-400 font-medium' : 'text-slate-300'}>
                              {optimizedTier} ({optimizedCost} unit{optimizedCost !== 1 ? 's' : ''})
                            </span>
                          </div>
                          {savedUnits > 0 && (
                            <div className="flex justify-between text-sm pt-2 border-t border-slate-700/50">
                              <span className="text-green-400/80">Saving:</span>
                              <span className="text-green-400 font-bold">
                                {savedUnits} unit{savedUnits !== 1 ? 's' : ''} ({link.cost_savings_percent}%)
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Traffic Info */}
                        <div className="mt-3 text-xs text-slate-500">
                          Peak traffic observed: {link.peak_traffic_gbps.toFixed(2)} Gbps
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with refresh */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-500">
          Click any row to see detailed tier analysis and cost breakdown.
        </p>
        <Button onClick={fetchData} variant="ghost" size="sm" disabled={loading} className="text-slate-400 hover:text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>
    </div>
  );
}
