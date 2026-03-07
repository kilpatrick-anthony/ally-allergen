// components/ServiceWorkerRegistrar.tsx
'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/serviceWorkerRegistration';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Only register in production or when explicitly enabled
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW === 'true') {
      registerServiceWorker();
    }
  }, []);

  return null; // This component doesn't render anything
}
