// components/admin/AllergenWarningSelector.tsx
'use client';

import { useState } from 'react';
import { 
  AlertCircle, Info, AlertTriangle, ChevronDown, ChevronUp,
  Wheat, Shell, Egg, Fish, Sprout, Milk, TreeDeciduous, 
  Carrot, Droplet, Sparkles, Flame, Flower2, Nut, CircleDot,
  Bean, Salad, Sun, Circle, Beaker, Snail
} from 'lucide-react';
import { Card } from '@/app/components/layout/Card';
import { Badge } from '@/app/components/ui/Badge';
import type { AllergenWarnings, AllergenLevel, AllergenId, GlutenType, TreeNutType } from '@/types/allergen';
import { 
  ALLERGEN_LIST, 
  GLUTEN_TYPES,
  TREE_NUT_TYPES,
  getAllergenLevelText, 
  getAllergenSeverity,
  formatSubtypes
} from '@/types/allergen';

interface AllergenWarningSelectorProps {
  value: AllergenWarnings;
  onChange: (warnings: AllergenWarnings) => void;
  disabled?: boolean;
}

const ALLERGEN_LEVEL_OPTIONS: { value: AllergenLevel; label: string; description: string }[] = [
  {
    value: 'none',
    label: 'Not Present',
    description: 'This allergen is not present in the product'
  },
  {
    value: 'contains',
    label: 'Contains',
    description: 'Product definitely contains this allergen'
  },
  {
    value: 'may_contain',
    label: 'May Contain',
    description: 'Product may contain this allergen'
  },
  {
    value: 'traces',
    label: 'May Contain Traces',
    description: 'Product may contain traces of this allergen'
  },
  {
    value: 'not_suitable',
    label: 'Not Suitable',
    description: 'Not suitable for those with this allergy'
  },
  {
    value: 'cross_contamination',
    label: 'Cross-Contamination Risk',
    description: 'Made in facility that handles this allergen'
  }
];

export default function AllergenWarningSelector({ 
  value, 
  onChange, 
  disabled = false 
}: AllergenWarningSelectorProps) {
  const [expandedAllergen, setExpandedAllergen] = useState<AllergenId | null>(null);
  const [showSubtypes, setShowSubtypes] = useState<{ cereals_gluten?: boolean; nuts?: boolean }>({});

  const handleLevelChange = (allergenId: AllergenId, level: AllergenLevel) => {
    const newValue = {
      ...value,
      [allergenId]: level
    };
    
    // If setting to 'none', clear subtypes
    if (level === 'none') {
      if (allergenId === 'cereals_gluten') {
        delete newValue.cereals_gluten_types;
      } else if (allergenId === 'nuts') {
        delete newValue.nuts_types;
      }
      setShowSubtypes(prev => ({ ...prev, [allergenId]: false }));
    } else {
      // If setting to non-none and has subtypes, show subtype selector
      const allergen = ALLERGEN_LIST.find(a => a.id === allergenId);
      if (allergen && 'hasSubtypes' in allergen && allergen.hasSubtypes) {
        setShowSubtypes(prev => ({ ...prev, [allergenId]: true }));
      }
    }
    
    onChange(newValue);
  };

  const handleSubtypeLevelChange = (
    allergenId: 'cereals_gluten' | 'nuts',
    subtype: GlutenType | TreeNutType,
    level: AllergenLevel
  ) => {
    const levelsKey = allergenId === 'cereals_gluten' ? 'cereals_gluten_levels' : 'nuts_levels';
    const currentLevels = value[levelsKey] || {};
    
    const newLevels = {
      ...currentLevels,
      [subtype]: level
    };
    
    // Remove if set to none
    if (level === 'none') {
      delete newLevels[subtype as keyof typeof newLevels];
    }
    
    // Update main allergen level to highest severity across all subtypes
    const subtypeLevels = Object.values(newLevels).filter(l => l !== 'none');
    let mainLevel: AllergenLevel = 'none';
    
    if (subtypeLevels.length > 0) {
      // Priority: contains > not_suitable > may_contain > traces > cross_contamination > none
      if (subtypeLevels.includes('contains')) mainLevel = 'contains';
      else if (subtypeLevels.includes('not_suitable')) mainLevel = 'not_suitable';
      else if (subtypeLevels.includes('may_contain')) mainLevel = 'may_contain';
      else if (subtypeLevels.includes('traces')) mainLevel = 'traces';
      else if (subtypeLevels.includes('cross_contamination')) mainLevel = 'cross_contamination';
    }
    
    onChange({
      ...value,
      [allergenId]: mainLevel,
      [levelsKey]: Object.keys(newLevels).length > 0 ? newLevels : undefined
    });
  };

  const handleSetAllSubtypesToMainLevel = (allergenId: 'cereals_gluten' | 'nuts') => {
    const mainLevel = value[allergenId] || 'none';
    if (mainLevel === 'none') return;
    
    const levelsKey = allergenId === 'cereals_gluten' ? 'cereals_gluten_levels' : 'nuts_levels';
    const allTypes = allergenId === 'cereals_gluten' 
      ? GLUTEN_TYPES.map(g => g.key)
      : TREE_NUT_TYPES.map(n => n.key);
    
    const newLevels = allTypes.reduce((acc, type) => {
      acc[type as keyof typeof acc] = mainLevel;
      return acc;
    }, {} as any);
    
    onChange({
      ...value,
      [levelsKey]: newLevels
    });
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Wheat, Shell, Egg, Fish, Nut, Sprout, Milk, TreeDeciduous,
      Carrot, Droplet, Sparkles, Flame, Flower2,
      Bean, Salad, Sun, Circle, Beaker, Snail
    };
    return icons[iconName] || Info;
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low' | 'none') => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-300 text-red-800';
      case 'medium': return 'bg-amber-50 border-amber-300 text-amber-800';
      case 'low': return 'bg-blue-50 border-blue-300 text-blue-800';
      case 'none': return 'bg-gray-50 border-gray-300 text-gray-600';
    }
  };

  const getSeverityIcon = (severity: 'high' | 'medium' | 'low' | 'none') => {
    switch (severity) {
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <Info className="h-4 w-4" />;
      case 'none': return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900">
          <p className="font-semibold mb-1">Select warning level for each allergen</p>
          <p><strong>Contains</strong> = Present | <strong>May Contain</strong> = Possible | <strong>Traces</strong> = Small amounts | <strong>Not Suitable</strong> = Cannot guarantee safety | <strong>Cross-Contamination</strong> = Shared facility</p>
        </div>
      </div>

      <div className="space-y-3">
        {ALLERGEN_LIST.map((allergen) => {
          const currentLevel = value[allergen.id] || 'none';
          const severity = getAllergenSeverity(currentLevel);
          const showSubtypes = 'hasSubtypes' in allergen && allergen.hasSubtypes && currentLevel !== 'none';
          const IconComponent = getIconComponent(allergen.icon);
          const darkerColor = allergen.color.replace(/\d+/g, (match) => Math.max(0, parseInt(match) - 20).toString());

          return (
            <div 
              key={allergen.id} 
              className="border-2 border-gray-200 rounded-lg p-4 transition-all bg-white hover:shadow-lg hover:border-gray-300 group cursor-pointer"
              style={{
                '--allergen-color': allergen.color,
                '--allergen-color-dark': darkerColor
              } as React.CSSProperties}
            >
              <div className="flex items-center gap-4">
                {/* Allergen Icon & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="flex items-center justify-center w-10 h-10 rounded-lg transition-all group-hover:scale-110 group-hover:shadow-lg"
                    style={{ 
                      backgroundColor: allergen.color,
                    }}
                  >
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: allergen.color }}
                      >
                        {allergen.number}
                      </span>
                      <h4 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">{allergen.name}</h4>
                    </div>
                  </div>
                </div>

                {/* Warning Level Selector */}
                <div className="flex-shrink-0 w-64">
                  <select
                    value={currentLevel}
                    onChange={(e) => handleLevelChange(allergen.id, e.target.value as AllergenLevel)}
                    disabled={disabled}
                    className={`w-full border-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      severity === 'high' ? 'border-red-300 bg-red-50 text-red-900' :
                      severity === 'medium' ? 'border-amber-300 bg-amber-50 text-amber-900' :
                      severity === 'low' ? 'border-blue-300 bg-blue-50 text-blue-900' :
                      'border-gray-300 bg-white text-gray-700'
                    } focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent`}
                  >
                    {ALLERGEN_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subtypes Section */}
              {showSubtypes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-semibold text-gray-900">
                      Specify risk level for each {allergen.id === 'cereals_gluten' ? 'grain' : 'nut'}:
                    </h5>
                    <button
                      type="button"
                      onClick={() => handleSetAllSubtypesToMainLevel(allergen.id as 'cereals_gluten' | 'nuts')}
                      className="text-xs text-[#42b8ac] hover:underline font-medium"
                    >
                      Set All to {ALLERGEN_LEVEL_OPTIONS.find(o => o.value === currentLevel)?.label}
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {allergen.id === 'cereals_gluten' && GLUTEN_TYPES.map((glutenType) => {
                      const subtypeLevel = value.cereals_gluten_levels?.[glutenType.key] || 'none';
                      const subtypeSeverity = getAllergenSeverity(subtypeLevel);
                      
                      return (
                        <div key={glutenType.key} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">
                            {glutenType.name}
                          </span>
                          <select
                            value={subtypeLevel}
                            onChange={(e) => handleSubtypeLevelChange('cereals_gluten', glutenType.key, e.target.value as AllergenLevel)}
                            disabled={disabled}
                            className={`flex-1 border-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                              subtypeSeverity === 'high' ? 'border-red-300 bg-red-50 text-red-900' :
                              subtypeSeverity === 'medium' ? 'border-amber-300 bg-amber-50 text-amber-900' :
                              subtypeSeverity === 'low' ? 'border-blue-300 bg-blue-50 text-blue-900' :
                              'border-gray-300 bg-white text-gray-700'
                            } focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent`}
                          >
                            {ALLERGEN_LEVEL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                    
                    {allergen.id === 'nuts' && TREE_NUT_TYPES.map((nutType) => {
                      const subtypeLevel = value.nuts_levels?.[nutType.key] || 'none';
                      const subtypeSeverity = getAllergenSeverity(subtypeLevel);
                      
                      return (
                        <div key={nutType.key} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">
                            {nutType.name}
                          </span>
                          <select
                            value={subtypeLevel}
                            onChange={(e) => handleSubtypeLevelChange('nuts', nutType.key, e.target.value as AllergenLevel)}
                            disabled={disabled}
                            className={`flex-1 border-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                              subtypeSeverity === 'high' ? 'border-red-300 bg-red-50 text-red-900' :
                              subtypeSeverity === 'medium' ? 'border-amber-300 bg-amber-50 text-amber-900' :
                              subtypeSeverity === 'low' ? 'border-blue-300 bg-blue-50 text-blue-900' :
                              'border-gray-300 bg-white text-gray-700'
                            } focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent`}
                          >
                            {ALLERGEN_LEVEL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                  
                  <p className="mt-3 text-xs text-gray-600 bg-gray-50 rounded p-2">
                    <Info className="h-3 w-3 inline mr-1" />
                    The main allergen level above shows the highest severity across all {allergen.id === 'cereals_gluten' ? 'grains' : 'nuts'}.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="bg-gray-50">
        <h4 className="font-semibold text-gray-900 mb-3">Allergen Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {ALLERGEN_LIST.map((allergen) => {
            const level = value[allergen.id] || 'none';
            if (level === 'none') return null;
            
            const severity = getAllergenSeverity(level);
            
            // Get subtype details if applicable
            let subtypeDisplay: React.ReactNode = null;
            if (allergen.id === 'cereals_gluten' && value.cereals_gluten_levels) {
              const subtypes = Object.entries(value.cereals_gluten_levels)
                .filter(([_, lvl]) => lvl !== 'none')
                .map(([type, lvl]) => {
                  const name = GLUTEN_TYPES.find(g => g.key === type)?.name || type;
                  const option = ALLERGEN_LEVEL_OPTIONS.find(o => o.value === lvl);
                  return `${name}: ${option?.label}`;
                });
              if (subtypes.length > 0) {
                subtypeDisplay = subtypes.join(' • ');
              }
            } else if (allergen.id === 'nuts' && value.nuts_levels) {
              const subtypes = Object.entries(value.nuts_levels)
                .filter(([_, lvl]) => lvl !== 'none')
                .map(([type, lvl]) => {
                  const name = TREE_NUT_TYPES.find(n => n.key === type)?.name || type;
                  const option = ALLERGEN_LEVEL_OPTIONS.find(o => o.value === lvl);
                  return `${name}: ${option?.label}`;
                });
              if (subtypes.length > 0) {
                subtypeDisplay = subtypes.join(' • ');
              }
            }
            
            const IconComponent = getIconComponent(allergen.icon);
            
            return (
              <div
                key={allergen.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg border-2 transition-all hover:shadow-md"
                style={{
                  borderColor: allergen.color,
                  backgroundColor: `${allergen.color}15`
                }}
              >
                <div 
                  className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: allergen.color }}
                >
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block text-gray-900">
                    {allergen.number}. {allergen.name}
                  </span>
                  {!subtypeDisplay && (
                    <span className="text-xs block mt-0.5 opacity-80">
                      {ALLERGEN_LEVEL_OPTIONS.find(o => o.value === level)?.label}
                    </span>
                  )}
                  {subtypeDisplay && (
                    <span className="text-xs block mt-1 opacity-90 leading-relaxed">
                      {subtypeDisplay}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {Object.values(value).every(v => v === 'none' || !v) && (
            <p className="text-gray-500 italic col-span-full">
              No allergen warnings set
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
