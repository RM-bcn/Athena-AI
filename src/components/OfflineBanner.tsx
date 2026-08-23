import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-[52px] md:top-[68px] left-0 right-0 md:left-64 z-30 bg-amber-50 text-amber-900 border-b border-amber-200 px-4 py-1.5 flex items-center justify-center gap-2 font-['Inter'] text-xs font-semibold">
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      Je bent offline — je ziet de laatst gesynchroniseerde gegevens.
    </div>
  );
};
