import { useState, useEffect, useRef, useCallback } from "react";

interface StreamingOptions {
  /** Interval between data points in milliseconds */
  interval?: number;
  /** Whether streaming is enabled */
  enabled?: boolean;
  /** Callback when streaming completes */
  onComplete?: () => void;
}

/**
 * Hook for streaming data points progressively
 * Creates a live data feed effect
 */
export function useStreamingData<T>(
  fullData: T[],
  options: StreamingOptions = {}
) {
  const { interval = 50, enabled = true, onComplete } = options;
  const [visibleData, setVisibleData] = useState<T[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const indexRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  // Reset when full data changes
  useEffect(() => {
    if (enabled && fullData.length > 0) {
      indexRef.current = 0;
      setVisibleData([]);
      setIsStreaming(true);
      setProgress(0);
    }
  }, [fullData, enabled]);

  // Stream data progressively
  useEffect(() => {
    if (!enabled || !isStreaming || fullData.length === 0) return;

    intervalRef.current = window.setInterval(() => {
      if (indexRef.current < fullData.length) {
        // Add multiple points per tick for faster streaming
        const batchSize = Math.max(1, Math.floor(fullData.length / 100));
        const endIndex = Math.min(indexRef.current + batchSize, fullData.length);
        
        setVisibleData(fullData.slice(0, endIndex));
        setProgress((endIndex / fullData.length) * 100);
        indexRef.current = endIndex;
      } else {
        // Streaming complete
        setIsStreaming(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onComplete?.();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fullData, interval, enabled, isStreaming, onComplete]);

  const restart = useCallback(() => {
    indexRef.current = 0;
    setVisibleData([]);
    setIsStreaming(true);
    setProgress(0);
  }, []);

  const skipToEnd = useCallback(() => {
    setVisibleData(fullData);
    setIsStreaming(false);
    setProgress(100);
    indexRef.current = fullData.length;
  }, [fullData]);

  return {
    data: visibleData,
    isStreaming,
    progress,
    restart,
    skipToEnd,
    totalPoints: fullData.length,
    visiblePoints: visibleData.length,
  };
}
