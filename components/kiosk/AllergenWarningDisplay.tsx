// components/kiosk/AllergenWarningDisplay.tsx
'use client';

import { AlertCircle, AlertTriangle, Info, Wheat, Shell, Egg, Fish, Nut, Sprout, Milk, Leaf, Carrot, Circle, Beaker, TreeDeciduous, Flower2, Bean, Salad, Sun, Snail } from 'lucide-react';
import type { AllergenWarnings } from '@/types/allergen';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { 
  ALLERGEN_LIST, 
  getAllergenSeverity,
} from '@/types/allergen';

// Helper to get icon component
const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    Wheat, Shell, Egg, Fish, Nut, Sprout, Milk, TreeDeciduous,
    Carrot, Leaf, Circle, Beaker, Flower2,
    Bean, Salad, Sun, Snail
  };
  return icons[iconName] || Circle;
};

interface AllergenWarningDisplayProps {
  warnings: AllergenWarnings;
  compact?: boolean;
  showNone?: boolean;
}

export default function AllergenWarningDisplay({ 
  warnings, 
  compact = false,
  showNone = false 
}: AllergenWarningDisplayProps) {
  const { t } = useTranslation();
  const allergenName = (id: string, fallback: string) => {
    const translated = t(`allergenNames.${id}`);
    return translated === `allergenNames.${id}` ? fallback : translated;
  };
  const localizedSubtypes = (id: 'cereals_gluten' | 'nuts', values?: string[]) => {
    if (!values?.length) return allergenName(id, id === 'nuts' ? 'Tree Nuts' : 'Gluten').toLowerCase();
    return values.map(value => {
      const translated = t(`allergenSubtypes.${value}`);
      return translated === `allergenSubtypes.${value}` ? value : translated;
    }).join(', ').toLowerCase();
  };
  const levelText = (level: string, name: string) => t(`allergenLevelText.${level}`, { allergen: name });
  // Filter to only allergens with warnings
  const activeWarnings = ALLERGEN_LIST.filter(allergen => {
    const level = warnings[allergen.id];
    return level && level !== 'none';
  });

  if (activeWarnings.length === 0 && !showNone) {
    return null;
  }

  if (activeWarnings.length === 0 && showNone) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
        <Info className="h-4 w-4" />
        <span className="text-sm font-medium">{t('noAllergensDetected')}</span>
      </div>
    );
  }

  // Group by severity
  const byLevel = {
    high: activeWarnings.filter(a => getAllergenSeverity(warnings[a.id]) === 'high'),
    medium: activeWarnings.filter(a => getAllergenSeverity(warnings[a.id]) === 'medium'),
    low: activeWarnings.filter(a => getAllergenSeverity(warnings[a.id]) === 'low')
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {byLevel.high.length > 0 && byLevel.high.map(allergen => {
          const IconComponent = getIconComponent(allergen.icon);
          const displayName = allergen.id === 'cereals_gluten' 
            ? localizedSubtypes('cereals_gluten', warnings.cereals_gluten_types)
            : allergen.id === 'nuts'
            ? localizedSubtypes('nuts', warnings.nuts_types)
            : allergenName(allergen.id, allergen.name);
          
          return (
            <div
              key={allergen.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
              style={{
                backgroundColor: `${allergen.color}15`,
                color: allergen.color,
                borderColor: `${allergen.color}40`
              }}
            >
              <IconComponent className="h-3.5 w-3.5" style={{ color: allergen.color }} />
              <span className="font-semibold capitalize">{displayName}</span>
            </div>
          );
        })}
        {byLevel.medium.length > 0 && byLevel.medium.map(allergen => {
          const IconComponent = getIconComponent(allergen.icon);
          const displayName = allergen.id === 'cereals_gluten' 
            ? localizedSubtypes('cereals_gluten', warnings.cereals_gluten_types)
            : allergen.id === 'nuts'
            ? localizedSubtypes('nuts', warnings.nuts_types)
            : allergenName(allergen.id, allergen.name);
          
          return (
            <div
              key={allergen.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
              style={{
                backgroundColor: `${allergen.color}15`,
                color: allergen.color,
                borderColor: `${allergen.color}40`
              }}
            >
              <IconComponent className="h-3.5 w-3.5" style={{ color: allergen.color }} />
              <span className="font-medium capitalize">{displayName}</span>
            </div>
          );
        })}
        {byLevel.low.length > 0 && byLevel.low.map(allergen => {
          const IconComponent = getIconComponent(allergen.icon);
          const displayName = allergen.id === 'cereals_gluten' 
            ? localizedSubtypes('cereals_gluten', warnings.cereals_gluten_types)
            : allergen.id === 'nuts'
            ? localizedSubtypes('nuts', warnings.nuts_types)
            : allergenName(allergen.id, allergen.name);
          
          return (
            <div
              key={allergen.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
              style={{
                backgroundColor: `${allergen.color}15`,
                color: allergen.color,
                borderColor: `${allergen.color}40`
              }}
            >
              <IconComponent className="h-3.5 w-3.5" style={{ color: allergen.color }} />
              <span className="capitalize">{displayName}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* High severity warnings */}
      {byLevel.high.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-red-900 mb-2">{t('containsAllergens')}</h4>
              <ul className="space-y-1">
                {byLevel.high.map(allergen => {
                  const displayName = allergen.id === 'cereals_gluten' 
                    ? localizedSubtypes('cereals_gluten', warnings.cereals_gluten_types)
                    : allergen.id === 'nuts'
                    ? localizedSubtypes('nuts', warnings.nuts_types)
                    : allergenName(allergen.id, allergen.name).toLowerCase();
                  
                  return (
                    <li key={allergen.id} className="text-sm text-red-800">
                      <span className="font-semibold">{allergen.number}. {allergenName(allergen.id, allergen.name)}:</span>{' '}
                      {levelText(warnings[allergen.id], displayName)}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Medium severity warnings */}
      {byLevel.medium.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 mb-2">{t('allergenWarnings')}</h4>
              <ul className="space-y-1">
                {byLevel.medium.map(allergen => {
                  const displayName = allergen.id === 'cereals_gluten' 
                    ? localizedSubtypes('cereals_gluten', warnings.cereals_gluten_types)
                    : allergen.id === 'nuts'
                    ? localizedSubtypes('nuts', warnings.nuts_types)
                    : allergenName(allergen.id, allergen.name).toLowerCase();
                  
                  return (
                    <li key={allergen.id} className="text-sm text-amber-800">
                      <span className="font-semibold">{allergen.number}. {allergenName(allergen.id, allergen.name)}:</span>{' '}
                      {levelText(warnings[allergen.id], displayName)}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Low severity warnings */}
      {byLevel.low.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-blue-900 mb-2">{t('advisoryInformation')}</h4>
              <ul className="space-y-1">
                {byLevel.low.map(allergen => {
                  const displayName = allergen.id === 'cereals_gluten' 
                    ? localizedSubtypes('cereals_gluten', warnings.cereals_gluten_types)
                    : allergen.id === 'nuts'
                    ? localizedSubtypes('nuts', warnings.nuts_types)
                    : allergenName(allergen.id, allergen.name).toLowerCase();
                  
                  return (
                    <li key={allergen.id} className="text-sm text-blue-800">
                      <span className="font-semibold">{allergen.number}. {allergenName(allergen.id, allergen.name)}:</span>{' '}
                      {levelText(warnings[allergen.id], displayName)}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
