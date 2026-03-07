// components/admin/SiteAllergenGuide.tsx - DEVELOPMENT MODE
'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Filter, Globe, Building, 
  Eye, EyeOff, Edit, Trash2, Check,
  Copy, ArrowUpDown, Search, Tag,
  AlertCircle, Shield, ChevronDown, Euro,
  RefreshCw
} from 'lucide-react';

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
  const [items, setItems] = useState<MenuItem[]>([]);
  const [globalItems, setGlobalItems] = useState<MenuItem[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
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

  const allergenOptions = [
    'Gluten', 'Crustaceans', 'Eggs', 'Fish', 'Peanuts',
    'Soybeans', 'Milk', 'Nuts', 'Celery', 'Mustard',
    'Sesame', 'Sulphites', 'Lupin', 'Molluscs'
  ];

  const categories = [
    { id: 'all', name: 'All Items' },
    { id: 'main', name: 'Main Dishes' },
    { id: 'starters', name: 'Starters' },
    { id: 'desserts', name: 'Desserts' },
    { id: 'drinks', name: 'Drinks' },
    { id: 'sides', name: 'Sides' },
    { id: 'specials', name: 'Special Items' }
  ];

  // Mock data for development
  const mockSite: Site = {
    id: siteId,
    name: 'Oakberry Dublin City Centre',
    slug: 'oakberry-dublin-city-centre',
    city: 'Dublin'
  };

  const mockGlobalItems: MenuItem[] = [
    {
      id: 'global-1',
      name: 'Classic Açai Bowl',
      description: 'Our signature açai bowl with mixed berries and granola',
      price: 8.50,
      category: 'main',
      site_id: null,
      is_global: true,
      visibility: 'global',
      created_at: new Date().toISOString(),
      allergens: ['Nuts', 'Gluten']
    },
    {
      id: 'global-2',
      name: 'Green Smoothie',
      description: 'Kale, spinach, banana, and apple juice',
      price: 6.50,
      category: 'drinks',
      site_id: null,
      is_global: true,
      visibility: 'global',
      created_at: new Date().toISOString(),
      allergens: []
    },
    {
      id: 'global-3',
      name: 'Vegan Protein Bowl',
      description: 'Plant-based protein with quinoa and roasted vegetables',
      price: 9.50,
      category: 'main',
      site_id: null,
      is_global: true,
      visibility: 'global',
      created_at: new Date().toISOString(),
      allergens: ['Soy']
    },
    {
      id: 'global-4',
      name: 'Chia Pudding',
      description: 'Coconut milk chia pudding with fresh berries',
      price: 5.50,
      category: 'desserts',
      site_id: null,
      is_global: true,
      visibility: 'global',
      created_at: new Date().toISOString(),
      allergens: []
    }
  ];

  const mockSiteItems: MenuItem[] = [
    {
      id: 'site-1',
      name: 'Dublin Special Burger',
      description: 'Local beef burger with Irish cheddar and special sauce',
      price: 12.99,
      category: 'main',
      site_id: siteId,
      is_global: false,
      visibility: 'site-specific',
      created_at: new Date().toISOString(),
      allergens: ['Gluten', 'Milk', 'Eggs']
    },
    {
      id: 'site-2',
      name: 'Irish Apple Crumble',
      description: 'Traditional Irish apple crumble with vanilla ice cream',
      price: 6.99,
      category: 'desserts',
      site_id: siteId,
      is_global: false,
      visibility: 'site-specific',
      created_at: new Date().toISOString(),
      allergens: ['Gluten', 'Milk']
    }
  ];

  useEffect(() => {
    if (siteId) {
      loadMockData();
    }
  }, [siteId]);

  function loadMockData() {
    setLoading(true);
    setTimeout(() => {
      setSite(mockSite);
      setGlobalItems(mockGlobalItems);
      setItems(mockSiteItems);
      setLoading(false);
    }, 500); // Simulate network delay
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!site) {
      alert('No site selected (Development Mode)');
      return;
    }

    try {
      // Create new item locally
      const newItem: MenuItem = {
        id: `mock-item-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        price: formData.price ? parseFloat(formData.price) : null,
        category: formData.category,
        site_id: formData.make_global ? null : site.id,
        is_global: formData.make_global,
        visibility: formData.make_global ? 'global' : 'site-specific',
        created_at: new Date().toISOString(),
        allergens: [] // No allergens for new items
      };

      if (formData.make_global) {
        setGlobalItems([...globalItems, newItem]);
      } else {
        setItems([...items, newItem]);
      }

      console.log('Menu item created (Development Mode):', newItem);
      
      resetForm();
      alert('✅ Menu item created successfully! (Development Mode)');
    } catch (error) {
      console.error('Error saving item (Development Mode):', error);
      alert('Error saving item. Please try again.');
    }
  };

  const handleCopyToSite = async (item: MenuItem) => {
    if (!site) {
      alert('No site selected (Development Mode)');
      return;
    }

    if (!confirm(`Copy "${item.name}" to ${site.name}? (Development Mode)`)) {
      return;
    }

    try {
      // Copy the item locally
      const copiedItem: MenuItem = {
        ...item,
        id: `mock-copy-${Date.now()}`,
        name: `${item.name} (${site.city})`,
        site_id: site.id,
        is_global: false,
        visibility: 'site-specific',
        created_at: new Date().toISOString()
      };

      setItems([...items, copiedItem]);
      alert('✅ Item copied successfully! (Development Mode)');
    } catch (error) {
      console.error('Error copying item (Development Mode):', error);
      alert('Error copying item. Please try again.');
    }
  };

  const handleDelete = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"? (Development Mode)\nThis action cannot be undone.`)) {
      return;
    }

    try {
      // Delete from site items
      const updatedSiteItems = items.filter(item => item.id !== itemId);
      setItems(updatedSiteItems);

      // Also check if it exists in global items
      const updatedGlobalItems = globalItems.filter(item => item.id !== itemId);
      setGlobalItems(updatedGlobalItems);
      
      alert('✅ Item deleted! (Development Mode)');
    } catch (error) {
      console.error('Error deleting item (Development Mode):', error);
      alert('Error deleting item. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'main',
      make_global: false
    });
    setShowAddForm(false);
  };

  // Filter items based on category and search
  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredGlobalItems = globalItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <div className="ml-4">
          <span className="text-gray-600">Loading site data...</span>
          <div className="text-sm text-yellow-600 flex items-center mt-1">
            <AlertCircle className="h-4 w-4 mr-1" />
            Development Mode
          </div>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Site Not Found</h3>
        <p className="text-gray-600">The requested site could not be loaded.</p>
        <div className="mt-2 text-sm text-yellow-600 flex items-center justify-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          Development Mode - Using Mock Data
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Allergen Guide: {site.name}
          </h2>
          <p className="text-gray-600">
            Manage site-specific menu items and allergen information
          </p>
          <div className="mt-2 flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <AlertCircle className="h-3 w-3 mr-1" />
              Development Mode
            </span>
            <span className="text-sm text-gray-500">Using mock menu item data</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMockData}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw size={16} />
            Reload Data
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus size={20} />
            Add Site-Specific Item
          </button>
        </div>
      </div>

      {/* Development Mode Notice */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Development Mode Active</h3>
            <p className="text-sm text-yellow-700 mt-1">
              This page is using mock menu item data. All CRUD operations (Create, Read, Update, Delete) are performed locally.
              Data will reset on page refresh. Connect to Supabase to use real menu items.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${selectedCategory === category.id ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Add New Menu Item
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                Development Mode
              </span>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Dublin Special Burger"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {categories.filter(c => c.id !== 'all').map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (€)
                </label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="12.99"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Describe the dish, ingredients, etc."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="make_global"
                  checked={formData.make_global}
                  onChange={(e) => setFormData({ ...formData, make_global: e.target.checked })}
                  className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                />
                <label htmlFor="make_global" className="ml-2 text-sm text-gray-700">
                  Make this item available to all sites (global)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Menu Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Site-Specific Items */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Site-Specific Items ({filteredItems.length})
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Building size={16} />
              Only visible at {site.name}
            </span>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              Mock Data
            </span>
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg mb-1">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          {item.category}
                        </span>
                        {item.price && (
                          <span className="text-sm font-medium text-gray-900">
                            €{item.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {item.description}
                    </p>
                  )}

                  {item.allergens && item.allergens.length > 0 ? (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={16} className="text-red-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Contains:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.allergens.map(allergen => (
                          <span
                            key={allergen}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded"
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 mb-4">
                      <Check size={16} />
                      <span className="text-sm font-medium">
                        No major allergens detected
                      </span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Building size={12} />
                        Site-specific item
                      </span>
                      <span>
                        Added {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Site-Specific Items Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Add menu items that are unique to this location
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus size={20} />
              Add Your First Item
            </button>
          </div>
        )}
      </div>

      {/* Global Items Available for Copying */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Global Items Available ({filteredGlobalItems.length})
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Globe size={16} />
              Shared across all sites
            </span>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              Mock Data
            </span>
          </div>
        </div>

        {filteredGlobalItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGlobalItems.map(item => (
              <div 
                key={item.id} 
                className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg mb-1">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {item.category}
                        </span>
                        {item.price && (
                          <span className="text-sm font-medium text-gray-900">
                            €{item.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyToSite(item)}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      title="Copy to this site"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {item.description}
                    </p>
                  )}

                  {item.allergens && item.allergens.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.allergens.map(allergen => (
                        <span
                          key={allergen}
                          className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 mb-4">
                      <Check size={16} />
                      <span className="text-sm font-medium">
                        No major allergens
                      </span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Globe size={12} />
                        Global item
                      </span>
                      <span>
                        {item.is_global ? 'Available to all sites' : 'From main menu'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Global Items Available
            </h3>
            <p className="text-gray-600">
              Global items will appear here. Create global items or mark existing ones as global.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}