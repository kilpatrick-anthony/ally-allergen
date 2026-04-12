// components/kiosk/OfflineIndicator.tsx
// Visual indicator for offline status and data freshness

'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface OfflineIndicatorProps {
  isOffline: boolean;
  isStale: boolean;
  lastUpdated: number;
  onRefresh?: () => void;
  showDetails?: boolean;
}

export default function OfflineIndicator({
  isOffline,
  isStale,
  lastUpdated,
  onRefresh,
  showDetails = true,
}: OfflineIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState('');

  // Update time ago display
  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdated) {
        setTimeAgo('Never');
        return;
      }

      const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
      
      if (seconds < 60) {
        setTimeAgo('Just now');
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeAgo(`${minutes}m ago`);
      } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        setTimeAgo(`${hours}h ago`);
      } else {
        const days = Math.floor(seconds / 86400);
        setTimeAgo(`${days}d ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // If online and fresh, show minimal indicator
  if (!isOffline && !isStale) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <Wifi className="h-4 w-4" />
        <span className="hidden sm:inline">Connected</span>
      </div>
    );
  }

  // Offline mode
  if (isOffline) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <WifiOff className="h-5 w-5 text-amber-700" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-amber-900 text-sm sm:text-base">
                Offline Mode
              </h3>
            </div>
            
            {showDetails && (
              <>
                <p className="text-amber-700 text-xs sm:text-sm mb-2">
                  You're viewing cached menu data. Some information may be outdated.
                </p>
                
                <div className="flex items-center justify-between gap-3">
                  <span className="text-amber-600 text-xs">
                    Last updated: {timeAgo}
                  </span>
                  
                  {onRefresh && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onRefresh}
                      className="flex items-center gap-1 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span className="hidden sm:inline">Try Again</span>
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Stale data warning
  if (isStale) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <p className="text-blue-700 text-sm">
              Menu data may be outdated. 
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="ml-2 underline font-medium hover:text-blue-900"
                >
                  Refresh now
                </button>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Compact version for header/navbar
export function OfflineIndicatorCompact({
  isOffline,
  isStale,
  onRefresh,
}: Omit<OfflineIndicatorProps, 'lastUpdated' | 'showDetails'>) {
  if (!isOffline && !isStale) {
    return (
      <div className="flex items-center gap-1.5 text-green-600 text-xs">
        <Wifi className="h-3.5 w-3.5" />
        <span>Online</span>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 text-xs">
        <WifiOff className="h-3.5 w-3.5" />
        <span>Offline</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="ml-1 p-1 hover:bg-amber-100 rounded"
            title="Try to reconnect"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-blue-600 text-xs">
      <AlertCircle className="h-3.5 w-3.5" />
      <span>Outdated</span>
    </div>
  );
}
