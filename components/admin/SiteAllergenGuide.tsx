// components/admin/SiteAllergenGuide.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  Plus, Globe, Building, 
  Eye, Trash2, Check,
  Copy, Search, Tag,
  Shield, Euro,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number | null;
  category: string;
  site_id: string | null;
  is_global: boolean;
  visibility: 'global' | 'site-specific';
  created_at: string;
  allergens?: string[];
}

interface Site {
  id: string;
  name: string;
  slug: string;
  city: string;
}

export default function SiteAllergenGuide({ siteId }: { siteId: string }) {
  const { t, language } = useTranslation();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [globalItems, setGlobalItems] = useState<MenuItem[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main',
    make_global: false
  });

  const categories = [
    { id: 'all', name: t('sitePortal.allItems') },
    { id: 'main', name: t('sitePortal.mainDishes') },
    { id: 'starters', name: t('sitePortal.starters') },
    { id: 'desserts', name: t('sitePortal.desserts') },
    { id: 'drinks', name: t('sitePortal.drinks') },
    { id: 'sides', name: t('sitePortal.sides') },
    { id: 'specials', name: t('sitePortal.specialItems') }
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [siteRes, menuRes] = await Promise.all([
        fetch(`/api/sites/${siteId}`),
        fetch(`/api/menu-items?site_id=${siteId}`)
      ]);

      if (siteRes.ok) {
        const siteData = await siteRes.json();
        setSite(siteData.site || siteData);
      }

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        const allItems: MenuItem[] = menuData.menuItems || menuData || [];
        setItems(allItems.filter(i => i.site_id === siteId));
        setGlobalItems(allItems.filter(i => !i.site_id || i.is_global));
      }
    } catch (err) {
      setError(t('sitePortal.guideLoadError'));
    } finally {
      setLoading(false);
    }
  }, [siteId, t]);

  useEffect(() => {
    if (siteId) void loadData();
  }, [siteId, loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site) return;

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: formData.price ? parseFloat(formData.price) : null,
        category: formData.category,
        site_id: formData.make_global ? null : siteId,
        is_global: formData.make_global,
      };

      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(t('sitePortal.createItemError'));
      }

      const data = await response.json();
      const newItem: MenuItem = {
        ...payload,
        id: data.menuItem?.id || data.id,
        visibility: formData.make_global ? 'global' : 'site-specific',
        created_at: new Date().toISOString(),
        allergens: [],
      };

      if (formData.make_global) {
        setGlobalItems(prev => [...prev, newItem]);
      } else {
        setItems(prev => [...prev, newItem]);
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || t('sitePortal.createItemError'));
    }
  };

  const handleCopyToSite = async (item: MenuItem) => {
    if (!site) return;
    try {
      const payload = {
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        site_id: siteId,
        is_global: false,
      };

      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(t('sitePortal.copyItemError'));
      }

      const data = await response.json();
      const copiedItem: MenuItem = {
        ...payload,
        id: data.menuItem?.id || data.id,
        visibility: 'site-specific',
        created_at: new Date().toISOString(),
        allergens: item.allergens || [],
      };
      setItems(prev => [...prev, copiedItem]);
    } catch (err: any) {
      setError(err.message || t('sitePortal.copyItemError'));
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const response = await fetch(`/api/menu-items/${itemId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(t('sitePortal.deleteItemError'));
      }
      setItems(prev => prev.filter(i => i.id !== itemId));
      setGlobalItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err: any) {
      setError(err.message || t('sitePortal.deleteItemError'));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', category: 'main', make_global: false });
    setShowAddForm(false);
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredGlobalItems = globalItems.filter(item =>
    !searchQuery ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="relative mx-auto mb-3">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <span className="text-gray-600">{t('sitePortal.loadingSiteData')}</span>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('admin.siteNotFound')}</h3>
        <p className="text-gray-600 dark:text-gray-300">{t('sitePortal.requestedSiteLoadError')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('sitePortal.allergenGuideFor', { name: site.name })}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {t('sitePortal.manageGuide')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw size={16} />
            {t('admin.refresh')}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#003842] text-white rounded-lg hover:bg-[#003842]/90"
          >
            <Plus size={20} />
            {t('sitePortal.addSiteItem')}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t('admin.searchMenuItems')}
              aria-label={t('admin.searchMenuItems')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              aria-pressed={selectedCategory === category.id}
              className={`px-4 py-2 rounded-lg whitespace-nowrap border-2 transition-all ${
                selectedCategory === category.id
                  ? 'bg-[#42b8ac]/10 border-[#42b8ac] text-[#003842] dark:text-white font-medium'
                  : 'bg-gray-100 dark:bg-gray-700 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('sitePortal.addNewMenuItem')}</h3>
            <button type="button" onClick={resetForm} aria-label={t('accessPoints.cancel')} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="site-item-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('sitePortal.itemName')} *</label>
                <input
                  id="site-item-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="site-item-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('sitePortal.category')} *</label>
                <select
                  id="site-item-category"
                  value={formData.category}
                  onChange={(e) => setFormData((current) => ({ ...current, category: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                >
                  {categories.filter(c => c.id !== 'all').map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="site-item-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('sitePortal.priceEuro')}</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    id="site-item-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData((current) => ({ ...current, price: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="12.99"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="site-item-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('ingredientsPortal.description')}</label>
                <textarea
                  id="site-item-description"
                  value={formData.description}
                  onChange={(e) => setFormData((current) => ({ ...current, description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="make_global"
                  checked={formData.make_global}
                  onChange={(e) => setFormData((current) => ({ ...current, make_global: e.target.checked }))}
                  className="h-4 w-4 text-[#42b8ac] rounded focus:ring-[#42b8ac]"
                />
                <label htmlFor="make_global" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('sitePortal.makeGlobal')}
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                {t('accessPoints.cancel')}
              </button>
              <button type="submit" className="px-4 py-2 bg-[#003842] text-white rounded-lg hover:bg-[#003842]/90">
                {t('sitePortal.addMenuItem')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Site-Specific Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('sitePortal.siteItemsCount', { count: filteredItems.length })}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Building size={16} />
            {t('sitePortal.onlyVisibleAt', { name: site.name })}
          </span>
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-[#42b8ac]/30 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{item.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 bg-[#42b8ac]/10 text-[#003842] dark:text-[#42b8ac] text-xs font-medium rounded">
                          {item.category}
                        </span>
                        {item.price && (
                          <span className="text-sm font-medium text-gray-900 dark:text-white">€{item.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title={t('sitePortal.deleteItem')}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {item.description && <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{item.description}</p>}
                  {item.allergens && item.allergens.length > 0 ? (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={16} className="text-red-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('contains')}:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.allergens.map(allergen => (
                          <span key={allergen} className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">{allergen}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#42b8ac] mb-4">
                      <Check size={16} />
                      <span className="text-sm font-medium">{t('sitePortal.noMajorDetected')}</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Building size={12} />{t('sitePortal.siteSpecific')}</span>
                    <span>{t('sitePortal.added')} {new Date(item.created_at).toLocaleDateString(language)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('sitePortal.noSiteItems')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('sitePortal.noSiteItemsDescription')}</p>
            <button type="button" onClick={() => setShowAddForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#003842] text-white rounded-lg hover:bg-[#003842]/90">
              <Plus size={20} />{t('sitePortal.addFirstItem')}
            </button>
          </div>
        )}
      </div>

      {/* Global Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('sitePortal.globalItemsCount', { count: filteredGlobalItems.length })}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Globe size={16} />{t('sitePortal.sharedAllSites')}
          </span>
        </div>
        {filteredGlobalItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGlobalItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{item.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">{item.category}</span>
                        {item.price && <span className="text-sm font-medium text-gray-900 dark:text-white">€{item.price.toFixed(2)}</span>}
                      </div>
                    </div>
                    <button type="button" onClick={() => handleCopyToSite(item)} className="flex items-center gap-1 px-3 py-1 bg-[#003842] text-white text-sm rounded-lg hover:bg-[#003842]/90" title={t('sitePortal.copyToSite')}>
                      <Copy size={14} />{t('accessPoints.copy')}
                    </button>
                  </div>
                  {item.description && <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{item.description}</p>}
                  {item.allergens && item.allergens.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.allergens.map(allergen => (
                        <span key={allergen} className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">{allergen}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#42b8ac] mb-4">
                      <Check size={16} /><span className="text-sm font-medium">{t('kioskPortal.noMajorAllergens')}</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Globe size={12} />{t('sitePortal.globalItem')}</span>
                    <span>{t('sitePortal.availableAllSites')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('sitePortal.noGlobalItems')}</h3>
            <p className="text-gray-600 dark:text-gray-300">{t('sitePortal.noGlobalItemsDescription')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
