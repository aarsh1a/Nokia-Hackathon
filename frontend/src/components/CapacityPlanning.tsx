import { useState, useEffect } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
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

export function CapacityPlanning() {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Calculating optimal capacity...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-3">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Big Savings Number */}
      <div className="text-center py-6 bg-gradient-to-r from-green-500/10 via-green-500/20 to-green-500/10 rounded-xl border border-green-500/30">
        <div className="text-5xl font-bold text-green-400 mb-2">
          {data.summary.overall_cost_savings_percent}%
        </div>
        <div className="text-lg text-green-300/80">Cost Savings vs Peak Provisioning</div>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          By analyzing actual traffic patterns instead of worst-case peaks, 
          we can use lower-cost links while keeping packet loss under 1%.
        </p>
      </div>

      {/* Link Cards with Reasoning */}
      <div className="space-y-4">
        {data.links.map((link) => {
          const recommended = link.recommended_tier;
          const recommendedGbps = link.recommended_tier_gbps;
          
          // Cost model: 10G = 1x, 25G = 2x, 50G = 4x (relative cost units)
          const tierCost: Record<string, number> = { "10G": 1, "25G": 2, "50G": 4 };
          const peakCost = tierCost["50G"];
          const actualCost = tierCost[recommended] || 4;
          const savedUnits = peakCost - actualCost;
          
          // Check why not using cheaper tier
          const loss10G = link.tier_evaluation["10G"]?.loss_percent ?? 0;
          const loss25G = link.tier_evaluation["25G"]?.loss_percent ?? 0;
          
          const tierColor = recommended === "10G" ? "border-green-500/30 bg-green-500/5" 
            : recommended === "25G" ? "border-yellow-500/30 bg-yellow-500/5" 
            : "border-red-500/30 bg-red-500/5";
          
          const tierTextColor = recommended === "10G" ? "text-green-400/90" 
            : recommended === "25G" ? "text-yellow-400/90" 
            : "text-red-400/90";

          return (
            <div key={link.link_id} className={`rounded-lg border p-4 ${tierColor}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono">{link.link_id}</span>
                  <span className="text-sm text-muted-foreground">({link.cells.length} cells)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xl ${tierTextColor}`}>
                    {recommendedGbps} Gbps
                  </span>
                  <span className="font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded">
                    {link.cost_savings_percent}%
                  </span>
                </div>
              </div>
              
              {/* Reasoning - WHY this tier */}
              <div className="bg-background/50 rounded p-3 space-y-2 text-sm">
                {recommended === "10G" && (
                  <div className="flex items-center gap-2 text-green-400/80">
                    <span>✓</span>
                    <span>10 Gbps is sufficient — Packet loss only {loss10G.toFixed(2)}% (under 1% SLA)</span>
                  </div>
                )}
                
                {recommended === "25G" && (
                  <>
                    <div className="flex items-center gap-2 text-red-400/70">
                      <span>✗</span>
                      <span>10 Gbps fails — Would cause {loss10G.toFixed(2)}% packet loss (exceeds 1% SLA)</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-400/80">
                      <span>✓</span>
                      <span>25 Gbps works — Packet loss only {loss25G.toFixed(2)}% (under 1% SLA)</span>
                    </div>
                  </>
                )}
                
                {recommended === "50G" && (
                  <>
                    <div className="flex items-center gap-2 text-red-400/70">
                      <span>✗</span>
                      <span>10 Gbps fails — Would cause {loss10G.toFixed(2)}% packet loss</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-400/70">
                      <span>✗</span>
                      <span>25 Gbps fails — Would cause {loss25G.toFixed(2)}% packet loss</span>
                    </div>
                    <div className="flex items-center gap-2 text-yellow-400/80">
                      <span>⚠</span>
                      <span>50 Gbps required — Only option meeting SLA</span>
                    </div>
                  </>
                )}
                
                {/* Cost breakdown */}
                <div className="pt-2 border-t border-border/50 mt-2 text-muted-foreground">
                  <span>Cost: </span>
                  <span className="line-through text-red-400/50">50G (4 units)</span>
                  <span className="mx-2">→</span>
                  <span className={tierTextColor}>{recommended} ({actualCost} unit{actualCost > 1 ? 's' : ''})</span>
                  <span className="mx-2">=</span>
                  <span className="text-green-400/90">Saving {savedUnits} unit{savedUnits > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Insight */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-300/80">
          How it works: Instead of buying 50G links for every path (expensive), 
          we simulate real traffic through a 4-symbol buffer. If packet loss stays under 1%, 
          a cheaper 10G or 25G link is sufficient — saving significant CAPEX.
        </p>
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <Button onClick={fetchData} variant="ghost" size="sm" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>
    </div>
  );
}
