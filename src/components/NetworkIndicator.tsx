import React from 'react';
import { Wifi, WifiOff, Signal, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NetworkStatus, getNetworkStatusColor } from '@/hooks/useNetworkStatus';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NetworkIndicatorProps {
  status: NetworkStatus;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function NetworkIndicator({ 
  status, 
  showDetails = true, 
  compact = false,
  className 
}: NetworkIndicatorProps) {
  const colorClass = getNetworkStatusColor(status.type);

  // Signal strength bars
  const SignalBars = () => {
    const getBarsActive = () => {
      switch (status.type) {
        case 'excellent': return 4;
        case 'good': return 3;
        case 'fair': return 2;
        case 'poor': return 1;
        case 'offline': return 0;
        default: return 2;
      }
    };

    const activeBars = getBarsActive();

    return (
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={cn(
              'w-1 rounded-sm transition-all duration-300',
              bar <= activeBars ? colorClass.replace('text-', 'bg-') : 'bg-muted-foreground/30'
            )}
            style={{ height: `${bar * 25}%` }}
          />
        ))}
      </div>
    );
  };

  if (status.type === 'offline') {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/20",
        className
      )}>
        <WifiOff className="w-4 h-4 text-destructive" />
        {!compact && (
          <span className="text-xs font-medium text-destructive">Offline</span>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 cursor-help",
              className
            )}>
              <SignalBars />
              <span className={cn('text-xs font-medium tabular-nums', colorClass)}>
                {status.rtt}ms
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="p-3">
            <NetworkDetails status={status} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 cursor-help transition-colors hover:bg-muted/70",
            className
          )}>
            <SignalBars />
            <div className="flex flex-col">
              <span className={cn('text-xs font-semibold capitalize', colorClass)}>
                {status.type}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {status.rtt}ms • {status.downlink}Mbps
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3">
          <NetworkDetails status={status} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function NetworkDetails({ status }: { status: NetworkStatus }) {
  const colorClass = getNetworkStatusColor(status.type);

  return (
    <div className="space-y-2 min-w-[160px]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold capitalize flex items-center gap-2">
          <Activity className={cn("w-4 h-4", colorClass)} />
          {status.type}
        </span>
        <span className={cn("text-xs font-medium", colorClass)}>
          {status.effectiveType.toUpperCase()}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col">
          <span className="text-muted-foreground">Latency</span>
          <span className="font-medium tabular-nums">{status.rtt}ms</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Speed</span>
          <span className="font-medium tabular-nums">{status.downlink} Mbps</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Jitter</span>
          <span className="font-medium tabular-nums">{status.jitter}ms</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Loss</span>
          <span className="font-medium tabular-nums">{status.packetLoss}%</span>
        </div>
      </div>
    </div>
  );
}
