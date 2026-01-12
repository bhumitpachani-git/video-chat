import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  type: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  downlink: number; // Mbps
  rtt: number; // Round trip time in ms
  effectiveType: string;
  isOnline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    type: 'good',
    downlink: 10,
    rtt: 50,
    effectiveType: '4g',
    isOnline: navigator.onLine,
  });

  const updateNetworkStatus = useCallback(() => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    if (connection) {
      const { downlink, rtt, effectiveType } = connection;
      
      let type: NetworkStatus['type'] = 'good';
      
      if (!navigator.onLine) {
        type = 'offline';
      } else if (effectiveType === '4g' && downlink >= 5 && rtt < 100) {
        type = 'excellent';
      } else if (effectiveType === '4g' || (downlink >= 2 && rtt < 200)) {
        type = 'good';
      } else if (effectiveType === '3g' || (downlink >= 0.5 && rtt < 400)) {
        type = 'fair';
      } else {
        type = 'poor';
      }

      setStatus({
        type,
        downlink: downlink || 0,
        rtt: rtt || 0,
        effectiveType: effectiveType || 'unknown',
        isOnline: navigator.onLine,
      });
    } else {
      // Fallback for browsers without Network Information API
      setStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        type: navigator.onLine ? 'good' : 'offline',
      }));
    }
  }, []);

  useEffect(() => {
    updateNetworkStatus();

    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Poll every 5 seconds for RTT changes
    const interval = setInterval(updateNetworkStatus, 5000);

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
      return 'text-green-500';
    case 'good':
      return 'text-green-400';
    case 'fair':
      return 'text-yellow-500';
    case 'poor':
      return 'text-red-500';
    case 'offline':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}

export function getNetworkStatusLabel(status: NetworkStatus): string {
  switch (status.type) {
    case 'excellent':
      return `Excellent (${status.rtt}ms)`;
    case 'good':
      return `Good (${status.rtt}ms)`;
    case 'fair':
      return `Fair (${status.rtt}ms)`;
    case 'poor':
      return `Poor (${status.rtt}ms)`;
    case 'offline':
      return 'Offline';
    default:
      return 'Unknown';
  }
}
