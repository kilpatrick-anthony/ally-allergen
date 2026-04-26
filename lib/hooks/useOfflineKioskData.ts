// lib/hooks/useOfflineKioskData.ts
// Custom hook for fetching and caching kiosk data with offline support

import { useState, useEffect, useCallback } from 'react';
import type { AllergenWarnings } from '@/types/allergen';

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  kiosk_display_name: string | null;
  address?: string;
  phone?: string;
  website?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  display_order: number;
  business_id: string;
  is_active: boolean;
  ingredient_names?: string[];
  // New allergen warnings system
  allergen_warnings?: AllergenWarnings;
  // Legacy fields (for backward compatibility during migration)
  contains_cereals_gluten?: boolean;
  contains_crustaceans?: boolean;
  contains_eggs?: boolean;
  contains_fish?: boolean;
  contains_peanuts?: boolean;
  contains_soybeans?: boolean;
  contains_milk?: boolean;
  contains_nuts?: boolean;
  contains_celery?: boolean;
  contains_mustard?: boolean;
  contains_sesame?: boolean;
  contains_sulphites?: boolean;
  contains_lupin?: boolean;
  contains_molluscs?: boolean;
}

export interface Ingredient {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  allergen_warnings?: AllergenWarnings;
  suppliers?: string[];
  status?: string;
}

export interface KioskData {
  business: Business | null;
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  lastUpdated: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - configurable
const STORAGE_KEY_PREFIX = 'kiosk_data_';

export function useOfflineKioskData(slug: string, siteId?: string | null) {
  const [data, setData] = useState<KioskData>({
    business: null,
    menuItems: [],
    ingredients: [],
    lastUpdated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isStale, setIsStale] = useState(false);

  // Check if cached data is stale
  const isCacheStale = (timestamp: number): boolean => {
    return Date.now() - timestamp > CACHE_DURATION;
  };

  // Get data from localStorage
  const getCachedData = useCallback((): KioskData | null => {
    try {
      const cached = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}`);
      if (cached) {
        const parsedData = JSON.parse(cached) as KioskData;
        console.log('📦 [Cache] Retrieved cached data for:', slug, 'Age:', Math.floor((Date.now() - parsedData.lastUpdated) / 1000), 'seconds');
        return parsedData;
      }
    } catch (error) {
      console.error('❌ [Cache] Error reading cached data:', error);
    }
    return null;
  }, [slug]);

  // Save data to localStorage
  const setCachedData = useCallback((kioskData: KioskData) => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}`, JSON.stringify(kioskData));
      console.log('💾 [Cache] Saved data to localStorage for:', slug);
    } catch (error) {
      console.error('❌ [Cache] Error saving data to localStorage:', error);
    }
  }, [slug]);

  // Fetch fresh data from Supabase
  const fetchFreshData = useCallback(async (): Promise<KioskData | null> => {
    try {
      console.log('🌐 [Network] Fetching fresh kiosk data for:', slug, 'site:', siteId || 'none');

      const params = new URLSearchParams({ target: slug });
      if (siteId) {
        params.set('site_id', siteId);
      }

      const response = await fetch(`/api/kiosk/data?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch kiosk data');
      }

      const freshData: KioskData = {
        business: payload.business || null,
        menuItems: payload.menuItems || [],
        ingredients: payload.ingredients || [],
        lastUpdated: Date.now(),
      };

      console.log('✅ [Network] Fetched fresh data successfully');
      return freshData;
    } catch (error) {
      console.error('❌ [Network] Error fetching fresh data:', error);
      return null;
    }
  }, [slug, siteId]);

  // Main data loading logic
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Step 1: Check cache first
    const cachedData = getCachedData();
    
    if (cachedData) {
      // Use cached data immediately
      setData(cachedData);
      setIsStale(isCacheStale(cachedData.lastUpdated));
      setLoading(false);

      // If cache is fresh enough, we're done
      if (!isCacheStale(cachedData.lastUpdated)) {
        console.log('✅ [Cache] Using fresh cached data');
        return;
      }

      console.log('⚠️ [Cache] Data is stale, attempting to refresh...');
    }

    // Step 2: Try to fetch fresh data
    try {
      const freshData = await fetchFreshData();
      
      if (freshData) {
        // Success! Update state and cache
        setData(freshData);
        setCachedData(freshData);
        setIsOffline(false);
        setIsStale(false);
      } else if (!cachedData) {
        // No fresh data and no cache - this is an error
        setError('Unable to load menu data. Please check your connection.');
      } else {
        // Have cached data but couldn't refresh
        setIsOffline(true);
        console.log('📶 [Offline] Using cached data, network unavailable');
      }
    } catch (err) {
      console.error('❌ [Error] Failed to load data:', err);
      
      if (cachedData) {
        // We have cached data, so we're offline
        setIsOffline(true);
        console.log('📶 [Offline] Using cached data due to network error');
      } else {
        // No cached data and network failed
        setError('Unable to load menu data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [slug, getCachedData, fetchFreshData, setCachedData]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    console.log('🔄 [Refresh] Manual refresh triggered');
    await loadData();
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('📶 [Network] Connection restored, refreshing data...');
      setIsOffline(false);
      loadData();
    };

    const handleOffline = () => {
      console.log('📶 [Network] Connection lost');
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData]);

  // Set up periodic refresh when online
  useEffect(() => {
    if (isOffline) return;

    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('⏰ [Auto-refresh] Periodic refresh triggered');
        loadData();
      }
    }, CACHE_DURATION);

    return () => clearInterval(refreshInterval);
  }, [loadData, isOffline]);

  // Refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isStale) {
        console.log('👁️ [Visibility] Tab visible, refreshing stale data...');
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadData, isStale]);

  return {
    business: data.business,
    menuItems: data.menuItems,
    ingredients: data.ingredients,
    loading,
    error,
    isOffline,
    isStale,
    lastUpdated: data.lastUpdated,
    refresh,
  };
}
