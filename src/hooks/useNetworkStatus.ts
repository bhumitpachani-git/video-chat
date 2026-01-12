import { useState, useEffect, useCallback, useRef } from 'react';

export interface NetworkStatus {
  type: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  downlink: number; // Mbps
  rtt: number; // Round trip time in ms
  effectiveType: string;
  isOnline: boolean;
  jitter: number; // Estimated jitter
  packetLoss: number; // Estimated packet loss percentage
}

// Measure actual RTT using fetch
async function measureRTT(): Promise<number> {
  const urls = [
    'https://www.google.com/favicon.ico',
    'https://www.cloudflare.com/favicon.ico',
  ];
  
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    await fetch(urls[Math.floor(Math.random() * urls.length)], {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    return Math.round(performance.now() - start);
  } catch {
    return -1; // Failed to measure
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    type: 'good',
    downlink: 10,
    rtt: 50,
    effectiveType: '4g',
    isOnline: navigator.onLine,
    jitter: 0,
    packetLoss: 0,
  });

  const rttHistoryRef = useRef<number[]>([]);
  const measurementCountRef = useRef(0);

  const updateNetworkStatus = useCallback(async () => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    // Measure actual RTT
    const measuredRTT = await measureRTT();
    
    if (measuredRTT > 0) {
      rttHistoryRef.current.push(measuredRTT);
      if (rttHistoryRef.current.length > 10) {
        rttHistoryRef.current.shift();
      }
    }

    // Calculate jitter (variation in RTT)
    let jitter = 0;
    if (rttHistoryRef.current.length > 1) {
      const diffs: number[] = [];
      for (let i = 1; i < rttHistoryRef.current.length; i++) {
        diffs.push(Math.abs(rttHistoryRef.current[i] - rttHistoryRef.current[i - 1]));
      }
      jitter = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    }

    // Get connection API data or use measured values
    const downlink = connection?.downlink || 10;
    const rtt = measuredRTT > 0 ? measuredRTT : (connection?.rtt || 50);
    const effectiveType = connection?.effectiveType || '4g';

    // Determine connection quality
    let type: NetworkStatus['type'] = 'good';
    
    if (!navigator.onLine) {
      type = 'offline';
    } else if (rtt < 50 && downlink >= 10 && jitter < 20) {
      type = 'excellent';
    } else if (rtt < 100 && downlink >= 5 && jitter < 50) {
      type = 'good';
    } else if (rtt < 200 && downlink >= 1) {
      type = 'fair';
    } else {
      type = 'poor';
    }

    // Estimate packet loss based on jitter and RTT variance
    const avgRTT = rttHistoryRef.current.length > 0 
      ? rttHistoryRef.current.reduce((a, b) => a + b, 0) / rttHistoryRef.current.length 
      : rtt;
    const packetLoss = Math.min(10, Math.max(0, (jitter / avgRTT) * 100));

    setStatus({
      type,
      downlink: Math.round(downlink * 10) / 10,
      rtt,
      effectiveType,
      isOnline: navigator.onLine,
      jitter,
      packetLoss: Math.round(packetLoss * 10) / 10,
    });

    measurementCountRef.current++;
  }, []);

  useEffect(() => {
    // Initial measurement
    updateNetworkStatus();

    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Measure RTT every 3 seconds for accurate readings
    const interval = setInterval(updateNetworkStatus, 3000);

    return () => {
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      clearInterval(interval);
    };
  }, [updateNetworkStatus]);

  return status;
}

export function getNetworkStatusColor(type: NetworkStatus['type']): string {
  switch (type) {
    case 'excellent':
      return 'text-success';
    case 'good':
      return 'text-success/80';
    case 'fair':
      return 'text-yellow-500';
    case 'poor':
      return 'text-destructive';
    case 'offline':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
}

export function getNetworkStatusLabel(status: NetworkStatus): string {
  switch (status.type) {
    case 'excellent':
      return `Excellent`;
    case 'good':
      return `Good`;
    case 'fair':
      return `Fair`;
    case 'poor':
      return `Poor`;
    case 'offline':
      return 'Offline';
    default:
      return 'Unknown';
  }
}

export function getNetworkStatusIcon(type: NetworkStatus['type']): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
  return type;
}
