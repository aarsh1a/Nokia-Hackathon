import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { generateTrafficData, calculateLinkData, linkColors } from "@/data/networkData";
import { useStreamingData } from "@/hooks/useStreamingData";
import { RotateCcw, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrafficChartProps {
  linkIds: number[];
  streaming?: boolean;
}

export function TrafficChart({ linkIds, streaming = true }: TrafficChartProps) {
  const linkDataList = useMemo(() => calculateLinkData(), []);

  // Generate full data
  const { fullChartData, statsPerLink } = useMemo(() => {
    if (linkIds.length === 0) {
      return { fullChartData: [], statsPerLink: [] };
    }

    const duration = 300;
    const series = linkIds.map((id) => generateTrafficData(id, duration));

    const merged = series[0].map((point, i) => {
      const row: Record<string, number | string> = { time: point.time };
      linkIds.forEach((id, j) => {
        row[`link_${id}`] = series[j][i].traffic;
      });
      return row;
    });

    const stats = linkIds.map((id, j) => {
      const data = series[j];
      const maxTraffic = Math.max(...data.map((d) => d.traffic));
      const avgTraffic =
        data.reduce((sum, d) => sum + d.traffic, 0) / data.length;
      const linkMeta = linkDataList.find((l) => l.linkId === id);
      return {
        linkId: id,
        avgTraffic,
        maxTraffic,
        cells: linkMeta?.cells.length ?? 0,
        requiredCapacity: linkMeta?.requiredCapacityWithBuffer ?? 0,
      };
    });

    return { fullChartData: merged, statsPerLink: stats };
  }, [linkIds, linkDataList]);

  // Streaming hook
  const {
    data: chartData,
    isStreaming,
    progress,
    restart,
    skipToEnd,
    visiblePoints,
    totalPoints,
  } = useStreamingData(fullChartData, {
    interval: 30,
    enabled: streaming,
  });


  if (linkIds.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Select one or more links above to compare traffic.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats: one row per selected link when multiple, or grid when single */}
      <div
        className={
          linkIds.length === 1
            ? "grid grid-cols-4 gap-4"
            : "flex flex-wrap gap-4"
        }
      >
        {statsPerLink.map((s) => (
          <div
            key={s.linkId}
            className="p-3 rounded-lg bg-secondary/50 flex items-center gap-3 min-w-[140px] transition-all"
          >
            <div
              className="w-2 h-8 rounded shrink-0"
              style={{ backgroundColor: linkColors[s.linkId] ?? "#888" }}
            />
            <div>
              <div className="text-xs text-muted-foreground">
                Link {s.linkId} · {s.cells} cells
              </div>
              <div className="text-sm font-medium text-foreground">
                Avg {s.avgTraffic.toFixed(2)} Gbps · Peak {s.maxTraffic.toFixed(2)}{" "}
                Gbps
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Streaming controls */}
      {streaming && (
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={restart}
              disabled={isStreaming}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Replay
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={skipToEnd}
              disabled={!isStreaming}
            >
              <FastForward className="w-3 h-3 mr-1" />
              Skip
            </Button>
          </div>
          
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="text-muted-foreground min-w-[80px] text-right">
            {isStreaming && (
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            )}
            {!isStreaming && progress >= 100 && "Complete"}
            <span className="ml-2">{visiblePoints}/{totalPoints}</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              {linkIds.map((id) => {
                const color = linkColors[id] ?? "#888";
                return (
                  <linearGradient
                    key={id}
                    id={`gradient-multi-${id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.5}
            />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `${value}s`}
              fontSize={12}
              domain={[0, 300]}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `${value}`}
              fontSize={12}
              label={{
                value: "Gbps",
                angle: -90,
                position: "insideLeft",
                style: { fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
              labelFormatter={(label) => `Time: ${label}s`}
              formatter={(value: number, name: string) => {
                const id = name.replace("link_", "");
                return [`${Number(value).toFixed(2)} Gbps`, `Link ${id}`];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => `Link ${value.replace("link_", "")}`}
            />
            {linkIds.map((id) => {
              const color = linkColors[id] ?? "#888";
              return (
                <Area
                  key={id}
                  type="monotone"
                  dataKey={`link_${id}`}
                  name={`link_${id}`}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#gradient-multi-${id})`}
                  isAnimationActive={false}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
