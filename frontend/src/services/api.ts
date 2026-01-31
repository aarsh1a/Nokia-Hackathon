/**
 * API Service for fetching data from the backend
 */

const API_BASE = "http://localhost:8000";

export interface CellStat {
  cellId: string;
  linkId: number;
  linkName: string;
  avgThroughput: number;
  peakThroughput: number;
  packetLossRate: number;
  congestionEvents: number;
  totalSamples: number;
  isolated: boolean;
}

export interface LinkStat {
  linkId: number;
  linkName: string;
  cells: string[];
  cellCount: number;
  avgThroughput: number;
  peakThroughput: number;
  packetLossRate: number;
  congestionEvents: number;
  isolated: boolean;
}

export interface AnalysisResult {
  topology: Record<string, string>;
  correlation_matrix: Record<string, Record<string, number>>;
  summary: {
    total_cells: number;
    inferred_links: number;
    congestion_events: number;
    total_data_points: number;
    data_source: string;
    algorithm: string;
  };
}

export interface TimeseriesPoint {
  time: number;
  throughput: number;
  packetLoss: number;
  congested: boolean;
}

export interface TimeseriesResult {
  cellId: string;
  totalPoints: number;
  sampledPoints: number;
  sampleRate: number;
  data: TimeseriesPoint[];
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Run full analysis pipeline on backend
 */
export async function runAnalysis(): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE}/analyze`);
  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get statistics for all cells
 */
export async function getCellStats(): Promise<CellStat[]> {
  const response = await fetch(`${API_BASE}/api/cell-stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch cell stats: ${response.statusText}`);
  }
  const data = await response.json();
  return data.cells;
}

/**
 * Get statistics for all links
 */
export async function getLinkStats(): Promise<LinkStat[]> {
  const response = await fetch(`${API_BASE}/api/link-stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch link stats: ${response.statusText}`);
  }
  const data = await response.json();
  return data.links;
}

/**
 * Get correlation matrix
 */
export async function getCorrelation(): Promise<{
  correlation_matrix: Record<string, Record<string, number>>;
  topology: Record<string, string>;
}> {
  const response = await fetch(`${API_BASE}/api/correlation`);
  if (!response.ok) {
    throw new Error(`Failed to fetch correlation: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get time series data for a specific cell
 */
export async function getCellTimeseries(cellId: string): Promise<TimeseriesResult> {
  const response = await fetch(`${API_BASE}/api/timeseries/${cellId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch timeseries: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get congestion timeline
 */
export async function getCongestionTimeline(): Promise<{
  timeline: Array<{ time: number; cells: Record<string, number> }>;
  topology: Record<string, string>;
}> {
  const response = await fetch(`${API_BASE}/api/congestion-timeline`);
  if (!response.ok) {
    throw new Error(`Failed to fetch congestion timeline: ${response.statusText}`);
  }
  return response.json();
}
