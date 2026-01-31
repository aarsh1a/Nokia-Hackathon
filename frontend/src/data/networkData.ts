// Network topology data for 24 radio cells across 9 fronthaul links
// Inferred from traffic correlation analysis

export interface CellData {
  cellId: string;
  linkId: number;
  linkName: string;
  avgTraffic: number; // Gbps
  peakTraffic: number; // Gbps
  packetLossRate: number; // percentage
  isolated: boolean;
}

export interface TrafficPoint {
  time: number; // seconds
  traffic: number; // Gbps
  packetLoss: number; // percentage
}

export interface LinkData {
  linkId: number;
  linkName: string;
  cells: string[];
  color: string;
  avgTraffic: number;
  peakTraffic: number;
  requiredCapacityWithBuffer: number;
  requiredCapacityWithoutBuffer: number;
  isolated: boolean;
}

// Inferred topology from dataset analysis
// 24 cells distributed across 9 fronthaul links (5 shared + 4 isolated)
export const cellTopology: CellData[] = [
  // Link 1: cell_1, cell_9, cell_17, cell_22
  { cellId: "cell_1", linkId: 1, linkName: "Link_1", avgTraffic: 1.2, peakTraffic: 2.8, packetLossRate: 0.08, isolated: false },
  { cellId: "cell_9", linkId: 1, linkName: "Link_1", avgTraffic: 1.4, peakTraffic: 3.1, packetLossRate: 0.09, isolated: false },
  { cellId: "cell_17", linkId: 1, linkName: "Link_1", avgTraffic: 1.1, peakTraffic: 2.6, packetLossRate: 0.07, isolated: false },
  { cellId: "cell_22", linkId: 1, linkName: "Link_1", avgTraffic: 1.3, peakTraffic: 2.9, packetLossRate: 0.08, isolated: false },
  
  // Link 2: cell_8, cell_10, cell_18, cell_19
  { cellId: "cell_8", linkId: 2, linkName: "Link_2", avgTraffic: 1.8, peakTraffic: 3.5, packetLossRate: 0.10, isolated: false },
  { cellId: "cell_10", linkId: 2, linkName: "Link_2", avgTraffic: 2.0, peakTraffic: 3.8, packetLossRate: 0.11, isolated: false },
  { cellId: "cell_18", linkId: 2, linkName: "Link_2", avgTraffic: 1.6, peakTraffic: 3.2, packetLossRate: 0.09, isolated: false },
  { cellId: "cell_19", linkId: 2, linkName: "Link_2", avgTraffic: 1.9, peakTraffic: 3.6, packetLossRate: 0.10, isolated: false },
  
  // Link 3: cell_4, cell_5, cell_12, cell_20
  { cellId: "cell_4", linkId: 3, linkName: "Link_3", avgTraffic: 0.9, peakTraffic: 2.0, packetLossRate: 0.05, isolated: false },
  { cellId: "cell_5", linkId: 3, linkName: "Link_3", avgTraffic: 0.8, peakTraffic: 1.8, packetLossRate: 0.04, isolated: false },
  { cellId: "cell_12", linkId: 3, linkName: "Link_3", avgTraffic: 1.0, peakTraffic: 2.2, packetLossRate: 0.06, isolated: false },
  { cellId: "cell_20", linkId: 3, linkName: "Link_3", avgTraffic: 0.7, peakTraffic: 1.6, packetLossRate: 0.04, isolated: false },
  
  // Link 4: cell_7, cell_13, cell_15, cell_16
  { cellId: "cell_7", linkId: 4, linkName: "Link_4", avgTraffic: 1.5, peakTraffic: 3.2, packetLossRate: 0.07, isolated: false },
  { cellId: "cell_13", linkId: 4, linkName: "Link_4", avgTraffic: 1.7, peakTraffic: 3.4, packetLossRate: 0.08, isolated: false },
  { cellId: "cell_15", linkId: 4, linkName: "Link_4", avgTraffic: 1.4, peakTraffic: 3.0, packetLossRate: 0.06, isolated: false },
  { cellId: "cell_16", linkId: 4, linkName: "Link_4", avgTraffic: 1.6, peakTraffic: 3.3, packetLossRate: 0.07, isolated: false },
  
  // Link 5: cell_2, cell_6, cell_23, cell_24
  { cellId: "cell_2", linkId: 5, linkName: "Link_5", avgTraffic: 2.2, peakTraffic: 4.2, packetLossRate: 0.12, isolated: false },
  { cellId: "cell_6", linkId: 5, linkName: "Link_5", avgTraffic: 2.0, peakTraffic: 3.9, packetLossRate: 0.11, isolated: false },
  { cellId: "cell_23", linkId: 5, linkName: "Link_5", avgTraffic: 2.4, peakTraffic: 4.5, packetLossRate: 0.13, isolated: false },
  { cellId: "cell_24", linkId: 5, linkName: "Link_5", avgTraffic: 2.3, peakTraffic: 4.3, packetLossRate: 0.12, isolated: false },
  
  // Isolated cells (each on their own link)
  { cellId: "cell_11", linkId: 6, linkName: "Link_6", avgTraffic: 1.1, peakTraffic: 2.5, packetLossRate: 0.03, isolated: true },
  { cellId: "cell_14", linkId: 7, linkName: "Link_7", avgTraffic: 1.3, peakTraffic: 2.8, packetLossRate: 0.04, isolated: true },
  { cellId: "cell_21", linkId: 8, linkName: "Link_8", avgTraffic: 1.0, peakTraffic: 2.3, packetLossRate: 0.02, isolated: true },
  { cellId: "cell_3", linkId: 9, linkName: "Link_9", avgTraffic: 0.9, peakTraffic: 2.1, packetLossRate: 0.03, isolated: true },
];

// Colors for 9 links
export const linkColors: Record<number, string> = {
  1: "#22d3ee", // cyan
  2: "#c084fc", // purple
  3: "#facc15", // yellow
  4: "#4ade80", // green
  5: "#f87171", // red
  6: "#60a5fa", // blue
  7: "#fb923c", // orange
  8: "#a78bfa", // violet
  9: "#2dd4bf", // teal
};

export const linkColorClasses: Record<number, { text: string; bg: string; border: string }> = {
  1: { text: "text-cyan-400", bg: "bg-cyan-400", border: "border-cyan-400" },
  2: { text: "text-purple-400", bg: "bg-purple-400", border: "border-purple-400" },
  3: { text: "text-yellow-400", bg: "bg-yellow-400", border: "border-yellow-400" },
  4: { text: "text-green-400", bg: "bg-green-400", border: "border-green-400" },
  5: { text: "text-red-400", bg: "bg-red-400", border: "border-red-400" },
  6: { text: "text-blue-400", bg: "bg-blue-400", border: "border-blue-400" },
  7: { text: "text-orange-400", bg: "bg-orange-400", border: "border-orange-400" },
  8: { text: "text-violet-400", bg: "bg-violet-400", border: "border-violet-400" },
  9: { text: "text-teal-400", bg: "bg-teal-400", border: "border-teal-400" },
};

// Generate correlated traffic data for cells on the same link
export function generateTrafficData(linkId: number, duration: number = 300): TrafficPoint[] {
  const points: TrafficPoint[] = [];
  const baseNoise = Math.random() * 0.5;
  
  // Different patterns for different links
  const patterns: Record<number, { base: number; amplitude: number; congestionPeriods: number[] }> = {
    1: { base: 5.0, amplitude: 2.5, congestionPeriods: [60, 150, 240] },
    2: { base: 7.3, amplitude: 3.0, congestionPeriods: [100, 200] },
    3: { base: 3.4, amplitude: 1.5, congestionPeriods: [80] },
    4: { base: 6.2, amplitude: 2.8, congestionPeriods: [120, 220] },
    5: { base: 8.9, amplitude: 3.5, congestionPeriods: [70, 160, 250] },
    6: { base: 1.1, amplitude: 0.8, congestionPeriods: [] },
    7: { base: 1.3, amplitude: 0.9, congestionPeriods: [] },
    8: { base: 1.0, amplitude: 0.7, congestionPeriods: [] },
    9: { base: 0.9, amplitude: 0.6, congestionPeriods: [] },
  };
  
  const pattern = patterns[linkId] || { base: 2.0, amplitude: 1.0, congestionPeriods: [] };
  
  for (let t = 0; t <= duration; t += 5) {
    let traffic = pattern.base + pattern.amplitude * Math.sin((t / 60) * Math.PI);
    
    for (const congestionTime of pattern.congestionPeriods) {
      const distance = Math.abs(t - congestionTime);
      if (distance < 30) {
        traffic += (3 - distance / 10) * (1 - distance / 30);
      }
    }
    
    traffic += (Math.random() - 0.5) * 1.5 + baseNoise;
    traffic = Math.max(0, traffic);
    
    const packetLoss = traffic > pattern.base + pattern.amplitude * 0.7 
      ? 0.05 + Math.random() * 0.15 
      : Math.random() * 0.02;
    
    points.push({
      time: t,
      traffic: Math.round(traffic * 100) / 100,
      packetLoss: Math.round(packetLoss * 10000) / 100,
    });
  }
  
  return points;
}

// Calculate link summary data
export function calculateLinkData(): LinkData[] {
  const links: Map<number, CellData[]> = new Map();
  
  cellTopology.forEach(cell => {
    if (!links.has(cell.linkId)) {
      links.set(cell.linkId, []);
    }
    links.get(cell.linkId)!.push(cell);
  });
  
  return Array.from(links.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([linkId, cells]) => {
      const avgTraffic = cells.reduce((sum, c) => sum + c.avgTraffic, 0);
      const peakTraffic = cells.reduce((sum, c) => sum + c.peakTraffic, 0);
      const isolated = cells.length === 1 && cells[0].isolated;
      
      const bufferReduction = 0.18;
      const requiredCapacityWithoutBuffer = peakTraffic * 1.2;
      const requiredCapacityWithBuffer = peakTraffic * (1.2 - bufferReduction);
      
      return {
        linkId,
        linkName: cells[0].linkName,
        cells: cells.map(c => c.cellId),
        color: linkColors[linkId],
        avgTraffic: Math.round(avgTraffic * 100) / 100,
        peakTraffic: Math.round(peakTraffic * 100) / 100,
        requiredCapacityWithBuffer: Math.round(requiredCapacityWithBuffer * 100) / 100,
        requiredCapacityWithoutBuffer: Math.round(requiredCapacityWithoutBuffer * 100) / 100,
        isolated,
      };
    });
}

// Real correlation matrix from eval1_results.json
// Order: cell_1, cell_9, cell_17, cell_22, cell_8, cell_10, cell_18, cell_19, cell_4, cell_5, cell_12, cell_20, cell_7, cell_13, cell_15, cell_16, cell_2, cell_6, cell_23, cell_24, cell_11, cell_14, cell_21, cell_3
export const realCorrelationData: Record<string, Record<string, number>> = {
  "cell_1": {"cell_1": 1.0, "cell_9": 0.9656, "cell_17": 0.8771, "cell_22": 0.9483, "cell_8": 0.0079, "cell_10": 0.0079, "cell_18": 0.0, "cell_19": 0.0092, "cell_4": 0.0, "cell_5": 0.0, "cell_12": 0.0, "cell_20": 0.0, "cell_7": 0.0171, "cell_13": 0.0303, "cell_15": 0.0276, "cell_16": 0.0303, "cell_2": 0.0053, "cell_6": 0.0053, "cell_23": 0.0026, "cell_24": 0.0013, "cell_11": 0.0, "cell_14": 0.0, "cell_21": 0.0, "cell_3": 0.0},
  "cell_9": {"cell_1": 0.9656, "cell_9": 1.0, "cell_17": 0.6386, "cell_22": 0.6741, "cell_8": 0.0, "cell_10": 0.0, "cell_18": 0.0, "cell_19": 0.0, "cell_4": 0.0, "cell_5": 0.0, "cell_12": 0.0, "cell_20": 0.0, "cell_7": 0.0207, "cell_13": 0.0361, "cell_15": 0.0344, "cell_16": 0.0327, "cell_2": 0.0052, "cell_6": 0.0069, "cell_23": 0.0052, "cell_24": 0.0034, "cell_11": 0.0, "cell_14": 0.0, "cell_21": 0.0, "cell_3": 0.0},
  "cell_17": {"cell_1": 0.8771, "cell_9": 0.6386, "cell_17": 1.0, "cell_22": 0.6193, "cell_8": 0.0072, "cell_10": 0.0072, "cell_18": 0.0072, "cell_19": 0.0072, "cell_4": 0.0, "cell_5": 0.0, "cell_12": 0.0, "cell_20": 0.0, "cell_7": 0.0361, "cell_13": 0.0482, "cell_15": 0.0458, "cell_16": 0.0506, "cell_2": 0.0, "cell_6": 0.0024, "cell_23": 0.0024, "cell_24": 0.0024, "cell_11": 0.0, "cell_14": 0.0, "cell_21": 0.0, "cell_3": 0.0},
  "cell_22": {"cell_1": 0.9483, "cell_9": 0.6741, "cell_17": 0.6193, "cell_22": 1.0, "cell_8": 0.0155, "cell_10": 0.0155, "cell_18": 0.0052, "cell_19": 0.0172, "cell_4": 0.0, "cell_5": 0.0, "cell_12": 0.0, "cell_20": 0.0, "cell_7": 0.0224, "cell_13": 0.0397, "cell_15": 0.0362, "cell_16": 0.0397, "cell_2": 0.0069, "cell_6": 0.0069, "cell_23": 0.0034, "cell_24": 0.0017, "cell_11": 0.0, "cell_14": 0.0, "cell_21": 0.0, "cell_3": 0.0},
  "cell_8": {"cell_1": 0.0079, "cell_9": 0.0, "cell_17": 0.0072, "cell_22": 0.0155, "cell_8": 1.0, "cell_10": 0.9497, "cell_18": 0.9362, "cell_19": 0.9476, "cell_4": 0.0, "cell_5": 0.0193, "cell_12": 0.021, "cell_20": 0.0105, "cell_7": 0.0334, "cell_13": 0.035, "cell_15": 0.034, "cell_16": 0.0318, "cell_2": 0.0885, "cell_6": 0.0782, "cell_23": 0.1026, "cell_24": 0.1062, "cell_11": 0.0842, "cell_14": 0.024, "cell_21": 0.0649, "cell_3": 0.0739},
  "cell_10": {"cell_1": 0.0079, "cell_9": 0.0, "cell_17": 0.0072, "cell_22": 0.0155, "cell_8": 0.9497, "cell_10": 1.0, "cell_18": 0.775, "cell_19": 0.9523, "cell_4": 0.0031, "cell_5": 0.0231, "cell_12": 0.0231, "cell_20": 0.0105, "cell_7": 0.0356, "cell_13": 0.0383, "cell_15": 0.0388, "cell_16": 0.0362, "cell_2": 0.0791, "cell_6": 0.0597, "cell_23": 0.0839, "cell_24": 0.0912, "cell_11": 0.0505, "cell_14": 0.022, "cell_21": 0.0344, "cell_3": 0.0413},
  "cell_18": {"cell_1": 0.0, "cell_9": 0.0, "cell_17": 0.0072, "cell_22": 0.0052, "cell_8": 0.9362, "cell_10": 0.775, "cell_18": 1.0, "cell_19": 0.9463, "cell_4": 0.0031, "cell_5": 0.0231, "cell_12": 0.0231, "cell_20": 0.0105, "cell_7": 0.0364, "cell_13": 0.0395, "cell_15": 0.0395, "cell_16": 0.0358, "cell_2": 0.0822, "cell_6": 0.0743, "cell_23": 0.0885, "cell_24": 0.108, "cell_11": 0.0442, "cell_14": 0.014, "cell_21": 0.0286, "cell_3": 0.0326},
  "cell_19": {"cell_1": 0.0092, "cell_9": 0.0, "cell_17": 0.0072, "cell_22": 0.0172, "cell_8": 0.9476, "cell_10": 0.9523, "cell_18": 0.9463, "cell_19": 1.0, "cell_4": 0.0, "cell_5": 0.0212, "cell_12": 0.0231, "cell_20": 0.0105, "cell_7": 0.0311, "cell_13": 0.0328, "cell_15": 0.0318, "cell_16": 0.0305, "cell_2": 0.088, "cell_6": 0.0773, "cell_23": 0.1011, "cell_24": 0.1053, "cell_11": 0.08, "cell_14": 0.024, "cell_21": 0.0611, "cell_3": 0.0696},
  "cell_4": {"cell_1": 0.0, "cell_9": 0.0, "cell_17": 0.0, "cell_22": 0.0, "cell_8": 0.0, "cell_10": 0.0031, "cell_18": 0.0031, "cell_19": 0.0, "cell_4": 1.0, "cell_5": 0.6301, "cell_12": 0.3699, "cell_20": 0.8997, "cell_7": 0.0031, "cell_13": 0.0031, "cell_15": 0.0031, "cell_16": 0.0031, "cell_2": 0.0125, "cell_6": 0.0157, "cell_23": 0.0157, "cell_24": 0.0157, "cell_11": 0.0, "cell_14": 0.0031, "cell_21": 0.0031, "cell_3": 0.0031},
  "cell_5": {"cell_1": 0.0, "cell_9": 0.0, "cell_17": 0.0, "cell_22": 0.0, "cell_8": 0.0193, "cell_10": 0.0231, "cell_18": 0.0231, "cell_19": 0.0212, "cell_4": 0.6301, "cell_5": 1.0, "cell_12": 0.7227, "cell_20": 0.8979, "cell_7": 0.0019, "cell_13": 0.0019, "cell_15": 0.0019, "cell_16": 0.0019, "cell_2": 0.0077, "cell_6": 0.0096, "cell_23": 0.0096, "cell_24": 0.0096, "cell_11": 0.0, "cell_14": 0.0, "cell_21": 0.0, "cell_3": 0.0},
  "cell_12": {"cell_1": 0.0, "cell_9": 0.0, "cell_17": 0.0, "cell_22": 0.0, "cell_8": 0.021, "cell_10": 0.0231, "cell_18": 0.0231, "cell_19": 0.0231, "cell_4": 0.3699, "cell_5": 0.7227, "cell_12": 1.0, "cell_20": 0.9475, "cell_7": 0.0063, "cell_13": 0.0063, "cell_15": 0.0063, "cell_16": 0.0063, "cell_2": 0.0, "cell_6": 0.0, "cell_23": 0.0, "cell_24": 0.0, "cell_11": 0.0, "cell_14": 0.0, "cell_21": 0.0, "cell_3": 0.0},
  "cell_20": {"cell_1": 0.0, "cell_9": 0.0, "cell_17": 0.0, "cell_22": 0.0, "cell_8": 0.0105, "cell_10": 0.0105, "cell_18": 0.0105, "cell_19": 0.0105, "cell_4": 0.8997, "cell_5": 0.8979, "cell_12": 0.9475, "cell_20": 1.0, "cell_7": 0.0053, "cell_13": 0.0053, "cell_15": 0.0053, "cell_16": 0.0053, "cell_2": 0.0118, "cell_6": 0.0131, "cell_23": 0.0131, "cell_24": 0.0131, "cell_11": 0.0, "cell_14": 0.0, "cell_21": 0.0, "cell_3": 0.0},
  "cell_7": {"cell_1": 0.0171, "cell_9": 0.0207, "cell_17": 0.0361, "cell_22": 0.0224, "cell_8": 0.0334, "cell_10": 0.0356, "cell_18": 0.0364, "cell_19": 0.0311, "cell_4": 0.0031, "cell_5": 0.0019, "cell_12": 0.0063, "cell_20": 0.0053, "cell_7": 1.0, "cell_13": 0.9095, "cell_15": 0.9624, "cell_16": 0.9415, "cell_2": 0.0535, "cell_6": 0.0492, "cell_23": 0.0557, "cell_24": 0.0645, "cell_11": 0.0042, "cell_14": 0.006, "cell_21": 0.0038, "cell_3": 0.0043},
  "cell_13": {"cell_1": 0.0303, "cell_9": 0.0361, "cell_17": 0.0482, "cell_22": 0.0397, "cell_8": 0.035, "cell_10": 0.0383, "cell_18": 0.0395, "cell_19": 0.0328, "cell_4": 0.0031, "cell_5": 0.0019, "cell_12": 0.0063, "cell_20": 0.0053, "cell_7": 0.9095, "cell_13": 1.0, "cell_15": 0.9511, "cell_16": 0.9286, "cell_2": 0.055, "cell_6": 0.0501, "cell_23": 0.0572, "cell_24": 0.0652, "cell_11": 0.0042, "cell_14": 0.006, "cell_21": 0.0038, "cell_3": 0.0043},
  "cell_15": {"cell_1": 0.0276, "cell_9": 0.0344, "cell_17": 0.0458, "cell_22": 0.0362, "cell_8": 0.034, "cell_10": 0.0388, "cell_18": 0.0395, "cell_19": 0.0318, "cell_4": 0.0031, "cell_5": 0.0019, "cell_12": 0.0063, "cell_20": 0.0053, "cell_7": 0.9624, "cell_13": 0.9511, "cell_15": 1.0, "cell_16": 0.9499, "cell_2": 0.0545, "cell_6": 0.0506, "cell_23": 0.0567, "cell_24": 0.0652, "cell_11": 0.0042, "cell_14": 0.006, "cell_21": 0.0038, "cell_3": 0.0043},
  "cell_16": {"cell_1": 0.0303, "cell_9": 0.0327, "cell_17": 0.0506, "cell_22": 0.0397, "cell_8": 0.0318, "cell_10": 0.0362, "cell_18": 0.0358, "cell_19": 0.0305, "cell_4": 0.0031, "cell_5": 0.0019, "cell_12": 0.0063, "cell_20": 0.0053, "cell_7": 0.9415, "cell_13": 0.9286, "cell_15": 0.9499, "cell_16": 1.0, "cell_2": 0.0559, "cell_6": 0.0501, "cell_23": 0.0572, "cell_24": 0.0648, "cell_11": 0.0042, "cell_14": 0.006, "cell_21": 0.0038, "cell_3": 0.0043},
  "cell_2": {"cell_1": 0.0053, "cell_9": 0.0052, "cell_17": 0.0, "cell_22": 0.0069, "cell_8": 0.0885, "cell_10": 0.0791, "cell_18": 0.0822, "cell_19": 0.088, "cell_4": 0.0125, "cell_5": 0.0077, "cell_12": 0.0, "cell_20": 0.0118, "cell_7": 0.0535, "cell_13": 0.055, "cell_15": 0.0545, "cell_16": 0.0559, "cell_2": 1.0, "cell_6": 0.8881, "cell_23": 0.885, "cell_24": 0.8891, "cell_11": 0.0126, "cell_14": 0.026, "cell_21": 0.0153, "cell_3": 0.0},
  "cell_6": {"cell_1": 0.0053, "cell_9": 0.0069, "cell_17": 0.0024, "cell_22": 0.0069, "cell_8": 0.0782, "cell_10": 0.0597, "cell_18": 0.0743, "cell_19": 0.0773, "cell_4": 0.0157, "cell_5": 0.0096, "cell_12": 0.0, "cell_20": 0.0131, "cell_7": 0.0492, "cell_13": 0.0501, "cell_15": 0.0506, "cell_16": 0.0501, "cell_2": 0.8881, "cell_6": 1.0, "cell_23": 0.8788, "cell_24": 0.8974, "cell_11": 0.0105, "cell_14": 0.026, "cell_21": 0.0134, "cell_3": 0.0},
  "cell_23": {"cell_1": 0.0026, "cell_9": 0.0052, "cell_17": 0.0024, "cell_22": 0.0034, "cell_8": 0.1026, "cell_10": 0.0839, "cell_18": 0.0885, "cell_19": 0.1011, "cell_4": 0.0157, "cell_5": 0.0096, "cell_12": 0.0, "cell_20": 0.0131, "cell_7": 0.0557, "cell_13": 0.0572, "cell_15": 0.0567, "cell_16": 0.0572, "cell_2": 0.885, "cell_6": 0.8788, "cell_23": 1.0, "cell_24": 0.8907, "cell_11": 0.0147, "cell_14": 0.03, "cell_21": 0.0172, "cell_3": 0.0},
  "cell_24": {"cell_1": 0.0013, "cell_9": 0.0034, "cell_17": 0.0024, "cell_22": 0.0017, "cell_8": 0.1062, "cell_10": 0.0912, "cell_18": 0.108, "cell_19": 0.1053, "cell_4": 0.0157, "cell_5": 0.0096, "cell_12": 0.0, "cell_20": 0.0131, "cell_7": 0.0645, "cell_13": 0.0652, "cell_15": 0.0652, "cell_16": 0.0648, "cell_2": 0.8891, "cell_6": 0.8974, "cell_23": 0.8907, "cell_24": 1.0, "cell_11": 0.0105, "cell_14": 0.026, "cell_21": 0.0134, "cell_3": 0.0},
  "cell_11": {"cell_1": 0.0, "cell_9": 0.0, "cell_17": 0.0, "cell_22": 0.0, "cell_8": 0.0842, "cell_10": 0.0505, "cell_18": 0.0442, "cell_19": 0.08, "cell_4": 0.0, "cell_5": 0.0, "cell_12": 0.0, "cell_20": 0.0, "cell_7": 0.0042, "cell_13": 0.0042, "cell_15": 0.0042, "cell_16": 0.0042, "cell_2": 0.0126, "cell_6": 0.0105, "cell_23": 0.0147, "cell_24": 0.0105, "cell_11": 1.0, "cell_14": 0.5495, "cell_21": 0.6737, "cell_3": 0.6826},
  "cell_14": {"cell_1": 0.0, "cell_9": 0.0, "cell_17": 0.0, "cell_22": 0.0, "cell_8": 0.024, "cell_10": 0.022, "cell_18": 0.014, "cell_19": 0.024, "cell_4": 0.0031, "cell_5": 0.0, "cell_12": 0.0, "cell_20": 0.0, "cell_7": 0.006, "cell_13": 0.006, "cell_15": 0.006, "cell_16": 0.006, "cell_2": 0.026, "cell_6": 0.026, "cell_23": 0.03, "cell_24": 0.026, "cell_11": 0.5495, "cell_14": 1.0, "cell_21": 0.62, "cell_3": 0.563},
  "cell_21": {"cell_1": 0.0, "cell_9": 0.0, "cell_17": 0.0, "cell_22": 0.0, "cell_8": 0.0649, "cell_10": 0.0344, "cell_18": 0.0286, "cell_19": 0.0611, "cell_4": 0.0031, "cell_5": 0.0, "cell_12": 0.0, "cell_20": 0.0, "cell_7": 0.0038, "cell_13": 0.0038, "cell_15": 0.0038, "cell_16": 0.0038, "cell_2": 0.0153, "cell_6": 0.0134, "cell_23": 0.0172, "cell_24": 0.0134, "cell_11": 0.6737, "cell_14": 0.62, "cell_21": 1.0, "cell_3": 0.6957},
  "cell_3": {"cell_1": 0.0, "cell_9": 0.0, "cell_17": 0.0, "cell_22": 0.0, "cell_8": 0.0739, "cell_10": 0.0413, "cell_18": 0.0326, "cell_19": 0.0696, "cell_4": 0.0031, "cell_5": 0.0, "cell_12": 0.0, "cell_20": 0.0, "cell_7": 0.0043, "cell_13": 0.0043, "cell_15": 0.0043, "cell_16": 0.0043, "cell_2": 0.0, "cell_6": 0.0, "cell_23": 0.0, "cell_24": 0.0, "cell_11": 0.6826, "cell_14": 0.563, "cell_21": 0.6957, "cell_3": 1.0}
};

// Generate correlation matrix for cells using REAL data
export function generateCorrelationMatrix(): { cells: string[]; matrix: number[][] } {
  // Order cells by link for better visualization
  const orderedCells = [
    // Link 1
    "cell_1", "cell_9", "cell_17", "cell_22",
    // Link 2
    "cell_8", "cell_10", "cell_18", "cell_19",
    // Link 3
    "cell_4", "cell_5", "cell_12", "cell_20",
    // Link 4
    "cell_7", "cell_13", "cell_15", "cell_16",
    // Link 5
    "cell_2", "cell_6", "cell_23", "cell_24",
    // Isolated
    "cell_11", "cell_14", "cell_21", "cell_3"
  ];
  
  const matrix: number[][] = [];
  
  for (const cellI of orderedCells) {
    const row: number[] = [];
    for (const cellJ of orderedCells) {
      const value = realCorrelationData[cellI]?.[cellJ] ?? 0;
      row.push(value);
    }
    matrix.push(row);
  }
  
  return { cells: orderedCells, matrix };
}

export const datasets = [
  { 
    id: "live-analysis", 
    name: "Live Analysis (Backend)", 
    description: "Real-time analysis from raw judge data via backend API",
    source: "http://localhost:8000/analyze",
    cells: 24,
    links: 9,
    isLive: true,
  },
  { 
    id: "eval1", 
    name: "Eval1 Dataset (Static)", 
    description: "Pre-computed topology from eval1_results.json",
    source: "frontend/public/data/eval1_results.json",
    cells: 24,
    links: 9,
    isLive: false,
  },
];
