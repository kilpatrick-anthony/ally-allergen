// components/kiosk/KioskMenu.tsx - Updated version
'use client';

import { useState } from 'react';
import { 
  Filter, Search, Globe, Building,
  AlertTriangle, Check, X, Info
} from 'lucide-react';

interface AllergenItem {
  id: string;
  name: string;
  description: string;
  allergens: string[];
  category: string;
  site_id: string | null;
  is_global: boolean;
  visibility: 'global' | 'site-specific';
}

interface Site {
  id: string;
  name: string;
  slug: string;
}

interface KioskMenuProps {
  items: AllergenItem[];
  site: Site;
  showSiteBadge?: boolean;
}

const allergenOptions = [
  'Gluten', 'Crustaceans', 'Eggs', 'Fish', 'Peanuts',
  'Soybeans', 'Milk', 'Nuts', 'Celery', 'Mustard',
  'Sesame', 'Sulphites', 'Lupin', 'Molluscs'
];

export default function KioskMenu({ 
  items, 
  site, 
  showSiteBadge = false 
}: KioskMenuProps) {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Extract unique categories from items
  const categories = ['all', ...Array.from(new Set(items.map(item => item.category)))];

  // Filter items based on selections
  const filteredItems = items.filter(item => {
    // Filter by category
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    
    // Filter by search
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by allergens (show items that DON'T contain selected allergens)
    if (selectedAllergens.length > 0) {
      const hasSelectedAllergen = selectedAllergens.some(allergen => 
        item.allergens.includes(allergen)
      );
      if (hasSelectedAllergen) return false;
    }
    
    return true;
  });

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const clearFilters = () => {
    setSelectedAllergens([]);
    setSearchQuery('');
    setSelectedCategory('all');
  };

  // Group items by category for display
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, AllergenItem[]>);

  return (
    <div className="space-y-8">
      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Filter Menu</h3>
            <p className="text-gray-600">Select allergens to filter out</p>
          </div>
          
          {showSiteBadge && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
              <Building size={18} />
              <span className="font-medium">{site.name}</span>
            </div>
          )}
        </div>

        {/* Allergen Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-700" />
            <h4 className="font-semibold text-gray-900">Filter by Allergens</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {allergenOptions.map(allergen => (
              <button
                key={allergen}
                onClick={() => toggleAllergen(allergen)}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${selectedAllergens.includes(allergen) ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
              >
                {selectedAllergens.includes(allergen) ? (
                  <X size={16} />
                ) : (
                  <Check size={16} />
                )}
                {allergen}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Category Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Items
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(selectedAllergens.length > 0 || searchQuery || selectedCategory !== 'all') && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Active filters:</span>
                {selectedAllergens.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedAllergens.map(allergen => (
                      <span
                        key={allergen}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full"
                      >
                        No {allergen}
                        <button
                          onClick={() => toggleAllergen(allergen)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Menu Items</h3>
          <p className="text-gray-600">
            Showing {filteredItems.length} of {items.length} items
            {selectedAllergens.length > 0 && ` (filtered for ${selectedAllergens.length} allergens)`}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredItems.length === 0 ? 'No items match your filters' : ''}
        </div>
      </div>

      {/* Menu Items */}
      {Object.keys(groupedItems).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className="space-y-4">
              <h4 className="text-xl font-bold text-gray-900 border-b pb-2">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryItems.map(item => (
                  <div 
                    key={item.id} 
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      {/* Item Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h5 className="font-semibold text-gray-900 text-lg mb-1">
                            {item.name}
                          </h5>
                          {/* Item Type Badge */}
                          <div className="flex items-center gap-2">
                            {item.visibility === 'site-specific' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                <Building size={12} />
                                Site Special
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                <Globe size={12} />
                                Available at all locations
                              </span>
                            )}
                            {item.site_id && !item.is_global && (
                              <span className="text-xs text-gray-500">
                                Only at this location
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4">
                        {item.description}
                      </p>

                      {/* Allergens */}
                      {item.allergens.length > 0 ? (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={16} className="text-amber-500" />
                            <span className="text-sm font-medium text-gray-700">
                              Contains:
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.allergens.map(allergen => (
                              <span
                                key={allergen}
                                className={`px-2 py-1 text-xs font-medium rounded ${selectedAllergens.includes(allergen) ? 'bg-red-100 text-red-700 line-through' : 'bg-amber-100 text-amber-700'}`}
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
                            No major allergens
                          </span>
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Info size={12} />
                            {item.allergens.length === 0 
                              ? 'Suitable for most diets' 
                              : 'Check allergens before ordering'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <Filter className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No items match your filters
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Try adjusting your allergen filters or search terms to see more menu items.
          </p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <X size={20} />
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}