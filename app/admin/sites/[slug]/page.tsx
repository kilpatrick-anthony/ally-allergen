// app/sites/[slug]/page.tsx - FIXED VERSION
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Building, MapPin, Phone, Mail, Loader2, Tablet, Edit, ChefHat, Search, Trash2 } from 'lucide-react';
import DeviceManagement from '@/components/admin/DeviceManagement';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import AllergenWarningDisplay from '@/components/kiosk/AllergenWarningDisplay';
import Link from 'next/link';

export default function SiteKioskPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [site, setSite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'menu' | 'devices'>('devices');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuScope, setMenuScope] = useState<'all' | 'global' | 'site'>('all');
  const [menuSearch, setMenuSearch] = useState('');

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug]);

  useEffect(() => {
    if (activeTab === 'menu' && site?.id) {
      loadMenuItems();
    }
  }, [activeTab, site?.id]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sites/${slug}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load site')
      }

      setSite(data.site)
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load site data');
    } finally {
      setLoading(false);
    }
  }

  async function loadMenuItems() {
    try {
      setMenuLoading(true);
      setMenuError(null);

      const params = new URLSearchParams({
        site_id: site.id,
        include_global: 'true'
      });

      const response = await fetch(`/api/menu-items?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load menu items');
      }

      setMenuItems(data.menuItems || []);
    } catch (menuError: any) {
      console.error('Error loading menu items:', menuError);
      setMenuError(menuError?.message || 'Failed to load menu items');
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  }

  async function handleDeleteMenuItem(itemId: string) {
    const confirmed = window.confirm('Delete this menu item? This cannot be undone.')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/menu-items/${itemId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete menu item')
      }
      setMenuItems((prev) => prev.filter((item) => item.id !== itemId))
    } catch (deleteError: any) {
      console.error('Error deleting menu item:', deleteError)
      setMenuError(deleteError?.message || 'Failed to delete menu item')
    }
  }

  const filteredMenuItems = menuItems
    .filter((item) => {
      if (menuScope === 'all') return true
      if (menuScope === 'global') return !item.site_id
      return item.site_id === site?.id
    })
    .filter((item) => {
      if (!menuSearch) return true
      const search = menuSearch.toLowerCase()
      return (
        (item.name || '').toLowerCase().includes(search) ||
        (item.description || '').toLowerCase().includes(search)
      )
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading site...</p>
        </div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Site Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The requested site could not be found.'}</p>
          <a 
            href="/admin/sites" 
            className="inline-block px-6 py-3 bg-[#003842] text-white rounded-lg hover:bg-[#003842]/90"
          >
            Return to Sites
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Site Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-4xl mx-auto mb-6">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6 bg-white rounded-2xl shadow-sm border border-gray-200 min-w-0">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <Building className="h-5 w-5 sm:h-6 sm:w-6 text-[#42b8ac]" />
              </div>
              <div className="text-left min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                  {site.business?.name || 'Allergen Guide'}
                </h1>
                <h2 className="text-base sm:text-xl text-gray-700 font-medium truncate">{site.name}</h2>
              </div>
            </div>
            
            <Link href={`/admin/sites/${slug}/edit`} className="self-start sm:self-auto flex-shrink-0">
              <Button variant="primary" icon={Edit}>
                Edit Site
              </Button>
            </Link>
          </div>

          {/* Location + Map Preview */}
          {(site.address || site.city || site.country || site.eircode) && (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
              <p className="text-sm text-gray-600 mb-4">
                {site.address || 'Address not set'}
                {site.city ? `, ${site.city}` : ''}
                {site.country ? `, ${site.country}` : ''}
              </p>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  title="Site location map"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    [site.address, site.city, site.country, site.eircode].filter(Boolean).join(', ')
                  )}&output=embed`}
                  className="w-full h-64"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Contact Info Tiles */}
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
            {/* Address Tile */}
            {site.address && (
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {site.address}
                      {site.city && `, ${site.city}`}
                      {site.country && `, ${site.country}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Phone Tile */}
            {site.phone && (
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="h-5 w-5 text-[#42b8ac]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{site.phone}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Email Tile */}
            {site.email && (
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mail className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{site.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-6 max-w-7xl mx-auto px-4">
              <button
                onClick={() => setActiveTab('devices')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'devices'
                    ? 'border-[#42b8ac] text-[#003842]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Tablet className="h-4 w-4" />
                Devices & Kiosks
              </button>
              <button
                onClick={() => setActiveTab('menu')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'menu'
                    ? 'border-[#42b8ac] text-[#003842]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Menu Items
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4">
          {activeTab === 'devices' ? (
            <DeviceManagement
              siteId={site.id}
              siteName={site.name}
            />
          ) : (
            <div>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Menu Items</h3>
                  <p className="text-sm text-gray-600">
                    Global items plus site-specific items for {site.name}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      placeholder="Search menu items..."
                      className="pl-9 pr-3 py-2 w-full sm:w-56 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                    />
                  </div>
                  <select
                    value={menuScope}
                    onChange={(e) => setMenuScope(e.target.value as typeof menuScope)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  >
                    <option value="all">Filter</option>
                    <option value="global">Global only</option>
                    <option value="site">{site.name} only</option>
                  </select>
                  <Link href={`/admin/menu-builder?site_id=${site.id}`}>
                    <Button variant="primary" icon={Edit}>
                      Open Menu Builder
                    </Button>
                  </Link>
                </div>
              </div>

              {menuLoading ? (
                <div className="flex items-center gap-3 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading menu items...
                </div>
              ) : menuError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                  {menuError}
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <ChefHat className="h-6 w-6 text-gray-400" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-900">No menu items yet</h4>
                  <p className="text-sm text-gray-500">
                    Add a global item or a site-specific item for {site.name}.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="default">{item.category || 'Uncategorized'}</Badge>
                            <Badge variant={item.site_id ? 'primary' : 'default'}>
                              {item.site_id ? site.name : 'Global'}
                            </Badge>
                            <Badge variant={item.is_active ? 'success' : 'warning'}>
                              {item.is_active ? 'active' : 'draft'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/menu-builder?site_id=${site.id}&item_id=${item.id}`}>
                            <Button variant="ghost" size="sm" icon={Edit} />
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={() => handleDeleteMenuItem(item.id)}
                          />
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        {item.description || 'No description provided.'}
                      </p>

                      <div className="mb-3">
                        <AllergenWarningDisplay
                          warnings={item.allergen_warnings || {}}
                          compact={true}
                          showNone={true}
                        />
                      </div>

                      <div className="text-xs text-gray-500">
                        {(item.ingredients || []).length} ingredient{(item.ingredients || []).length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}