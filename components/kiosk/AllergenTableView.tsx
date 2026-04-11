// components/kiosk/AllergenTableView.tsx
'use client'

import React from 'react'
import { Check, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { ALLERGENS, getAllergensForItem, type AllergenInfo } from '@/lib/allergens'
import { AllergenWarnings, getAllergenLevelText, getAllergenSeverity, formatSubtypes, GLUTEN_TYPES, TREE_NUT_TYPES, type GlutenType, type TreeNutType, type AllergenLevel } from '@/types/allergen'
import type { MenuItem } from '@/lib/hooks/useOfflineKioskData'

interface AllergenTableViewProps {
  items: MenuItem[]
  compact?: boolean
  showLegend?: boolean
}

const AllergenTableView: React.FC<AllergenTableViewProps> = ({ 
  items, 
  compact = false,
  showLegend = true 
}) => {
  // Expand ingredients with multiple suppliers into separate rows
  const expandedItems = items.flatMap(item => {
    const isIngredient = (item as any).combined_allergens && Array.isArray((item as any).combined_allergens)
    const suppliers = (item as any).suppliers || []
    
    // If it's an ingredient with multiple suppliers, create separate rows
    if (isIngredient && suppliers.length > 1) {
      return suppliers.map((supplier: string) => ({
        ...item,
        displayName: `${item.name} (${supplier})`,
        supplier: supplier
      }))
    } else {
      // Single row for menu items or ingredients with single/no supplier
      const supplierText = suppliers.length === 1 ? ` (${suppliers[0]})` : ''
      return [{
        ...item,
        displayName: isIngredient ? `${item.name}${supplierText}` : item.name,
        supplier: suppliers.length === 1 ? suppliers[0] : null
      }]
    }
  })
  // Get cell content for an allergen
  const getCellContent = (item: MenuItem, allergen: AllergenInfo) => {
    // Check new allergen_warnings system first
    if (item.allergen_warnings) {
      const warnings = item.allergen_warnings
      let level: string = 'none'
      let subtypes: string[] | undefined
      
      // Map allergen ID to warning key
      if (allergen.id === 'cereals_gluten') {
        level = warnings.cereals_gluten || 'none'
        subtypes = warnings.cereals_gluten_types
      } else if (allergen.id === 'nuts') {
        level = warnings.nuts || 'none'
        subtypes = warnings.nuts_types
      } else {
        level = (warnings as any)[allergen.id] || 'none'
      }

      if (level === 'none') return null

      const severity = getAllergenSeverity(level as any)
      const displayText = level === 'contains' ? 'Yes' : level === 'may_contain' ? 'May' : level === 'cross_contamination' ? 'Trace' : level.replace(/_/g, ' ')
      
      return {
        level,
        severity,
        displayText,
        hasSubtypes: !!subtypes && subtypes.length > 0
      }
    }
    
    // Fallback to legacy boolean system
    if ((item as any)[allergen.id] === true) {
      return {
        level: 'contains',
        severity: 'high',
        displayText: 'Yes',
        hasSubtypes: false
      }
    }
    
    return null
  }

  // Get cell content for a specific gluten or nut subtype
  const getSubtypeCellContent = (item: MenuItem, subtypeKey: GlutenType | TreeNutType, isGluten: boolean) => {
    if (item.allergen_warnings) {
      const warnings = item.allergen_warnings
      let level: AllergenLevel = 'none'
      
      if (isGluten && warnings.cereals_gluten_levels) {
        level = warnings.cereals_gluten_levels[subtypeKey as GlutenType] || 'none'
      } else if (!isGluten && warnings.nuts_levels) {
        level = warnings.nuts_levels[subtypeKey as TreeNutType] || 'none'
      }
      
      // If no specific level, check legacy contains flags
      if (level === 'none') {
        if (isGluten && (item as any).contains_cereals_gluten) {
          level = 'contains'
        } else if (!isGluten && (item as any).contains_nuts) {
          level = 'contains'
        }
      }

      if (level === 'none') return null

      const severity = getAllergenSeverity(level)
      const displayText = level === 'contains' ? 'Yes' : level.replace(/_/g, ' ')
      
      return {
        level,
        severity,
        displayText
      }
    }
    
    // Fallback to legacy boolean system
    if (isGluten && (item as any).contains_cereals_gluten) {
      return {
        level: 'contains',
        severity: 'high',
        displayText: 'Yes'
      }
    } else if (!isGluten && (item as any).contains_nuts) {
      return {
        level: 'contains',
        severity: 'high',
        displayText: 'Yes'
      }
    }
    
    return null
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm text-xs">
        <thead>
          <tr className="bg-[#003842]">
            <th className="text-left p-2 text-white font-semibold border border-gray-300 sticky left-0 bg-[#003842] z-10 min-w-[120px]">
              Item Name
            </th>
            {ALLERGENS.map(allergen => {
              const Icon = allergen.icon
              
              // For gluten, add subtype columns after main column
              if (allergen.id === 'cereals_gluten') {
                return (
                  <React.Fragment key={allergen.id}>
                    <th 
                      className="text-center p-1 text-white text-xs font-semibold border border-gray-300 min-w-[60px]"
                      title={allergen.name}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        {typeof Icon === 'function' ? React.createElement(Icon, { className: 'h-3 w-3' }) : Icon}
                        {!compact && <span className="text-[9px] leading-tight">{allergen.shortName || allergen.name}</span>}
                      </div>
                    </th>
                    {/* Gluten subtype columns */}
                    {GLUTEN_TYPES.map(glutenType => (
                      <th 
                        key={`${allergen.id}-${glutenType.key}`}
                        className="text-center p-1 text-white text-xs font-semibold border border-gray-300 min-w-[50px] bg-[#f59e0b] bg-opacity-80"
                        title={glutenType.name}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          {typeof Icon === 'function' ? React.createElement(Icon, { className: 'h-2.5 w-2.5' }) : Icon}
                          <span className="text-[8px] leading-tight">{glutenType.name}</span>
                        </div>
                      </th>
                    ))}
                  </React.Fragment>
                )
              }
              
              // For tree nuts, add subtype columns after main column
              if (allergen.id === 'nuts') {
                return (
                  <React.Fragment key={allergen.id}>
                    <th 
                      className="text-center p-1 text-white text-xs font-semibold border border-gray-300 min-w-[60px]"
                      title={allergen.name}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        {typeof Icon === 'function' ? React.createElement(Icon, { className: 'h-3 w-3' }) : Icon}
                        {!compact && <span className="text-[9px] leading-tight">{allergen.shortName || allergen.name}</span>}
                      </div>
                    </th>
                    {/* Tree nut subtype columns */}
                    {TREE_NUT_TYPES.map(nutType => (
                      <th 
                        key={`${allergen.id}-${nutType.key}`}
                        className="text-center p-1 text-white text-xs font-semibold border border-gray-300 min-w-[50px] bg-[#b45309] bg-opacity-80"
                        title={nutType.name}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          {typeof Icon === 'function' ? React.createElement(Icon, { className: 'h-2.5 w-2.5' }) : Icon}
                          <span className="text-[8px] leading-tight">{nutType.name}</span>
                        </div>
                      </th>
                    ))}
                  </React.Fragment>
                )
              }
              
              // For other allergens, just show the main column
              return (
                <th 
                  key={allergen.id} 
                  className="text-center p-1 text-white text-xs font-semibold border border-gray-300 min-w-[60px]"
                  title={allergen.name}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    {typeof Icon === 'function' ? React.createElement(Icon, { className: 'h-3 w-3' }) : Icon}
                    {!compact && <span className="text-[9px] leading-tight">{allergen.shortName || allergen.name}</span>}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {expandedItems.map((item, index) => (
            <tr 
              key={`${item.id}-${item.supplier || 'default'}`} 
              className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
            >
              <td className="p-2 border border-gray-300 font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                <div>
                  <div className="font-semibold text-sm">{item.displayName}</div>
                  {!compact && item.category && (
                    <div className="text-xs text-gray-500 mt-0.5">{item.category}</div>
                  )}
                  {!compact && item.supplier && (
                    <div className="text-xs text-blue-600 mt-0.5">
                      <span className="font-medium">Supplier:</span> {item.supplier}
                    </div>
                  )}
                </div>
              </td>
              {ALLERGENS.map(allergen => {
                const content = getCellContent(item, allergen)
                
                const renderCell = (key: string, cellContent: any, bgClass?: string) => {
                  if (!cellContent) {
                    return (
                      <td 
                        key={key} 
                        className={`text-center p-1 border border-gray-300 ${bgClass || ''}`}
                      >
                        <span className="text-gray-300 text-lg">—</span>
                      </td>
                    )
                  }

                  // Color coding based on allergen level - each level has distinct color
                  let bgColor = ''
                  let textColor = ''
                  let icon = null

                  switch (cellContent.level) {
                    case 'contains':
                      bgColor = 'bg-red-200'
                      textColor = 'text-red-800'
                      icon = <Check className="h-3 w-3" />
                      break
                    case 'may_contain':
                      bgColor = 'bg-orange-200'
                      textColor = 'text-orange-800'
                      icon = <AlertCircle className="h-3 w-3" />
                      break
                    case 'not_suitable':
                      bgColor = 'bg-violet-200'
                      textColor = 'text-violet-800'
                      icon = <AlertTriangle className="h-3 w-3" />
                      break
                    case 'traces':
                      bgColor = 'bg-cyan-200'
                      textColor = 'text-cyan-800'
                      icon = <Info className="h-3 w-3" />
                      break
                    case 'cross_contamination':
                      bgColor = 'bg-amber-200'
                      textColor = 'text-amber-800'
                      icon = <AlertTriangle className="h-3 w-3" />
                      break
                    default:
                      bgColor = 'bg-gray-100'
                      textColor = 'text-gray-800'
                      icon = <Info className="h-3 w-3" />
                  }

                  return (
                    <td 
                      key={key}
                      className={`text-center p-1 border border-gray-300 ${bgColor}`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={textColor}>{icon}</span>
                        {!compact && (
                          <span className={`text-[9px] leading-tight font-medium ${textColor}`}>
                            {cellContent.displayText}
                          </span>
                        )}
                      </div>
                    </td>
                  )
                }

                // For gluten, render main column + subtype columns
                if (allergen.id === 'cereals_gluten') {
                  return (
                    <React.Fragment key={allergen.id}>
                      {renderCell(allergen.id, content)}
                      {GLUTEN_TYPES.map(glutenType => {
                        const subtypeContent = getSubtypeCellContent(item, glutenType.key, true)
                        return renderCell(`${allergen.id}-${glutenType.key}`, subtypeContent)
                      })}
                    </React.Fragment>
                  )
                }

                // For tree nuts, render main column + subtype columns
                if (allergen.id === 'nuts') {
                  return (
                    <React.Fragment key={allergen.id}>
                      {renderCell(allergen.id, content)}
                      {TREE_NUT_TYPES.map(nutType => {
                        const subtypeContent = getSubtypeCellContent(item, nutType.key, false)
                        return renderCell(`${allergen.id}-${nutType.key}`, subtypeContent)
                      })}
                    </React.Fragment>
                  )
                }

                // For other allergens, just render the main column
                return renderCell(allergen.id, content)
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {showLegend && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Legend:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-200 rounded flex items-center justify-center">
                <Check className="h-4 w-4 text-red-800" />
              </div>
              <span className="text-gray-700">Contains</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-200 rounded flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-orange-800" />
              </div>
              <span className="text-gray-700">May Contain</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-violet-200 rounded flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-violet-800" />
              </div>
              <span className="text-gray-700">Not Suitable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-cyan-200 rounded flex items-center justify-center">
                <Info className="h-4 w-4 text-cyan-800" />
              </div>
              <span className="text-gray-700">Traces</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-200 rounded flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-800" />
              </div>
              <span className="text-gray-700">Cross Contamination</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-xl">—</span>
              <span className="text-gray-700">Not present</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-600 italic">
            Note: For items with specific sub-types (e.g., wheat, almonds), the cell will show which specific allergen is present.
          </p>
        </div>
      )}
    </div>
  )
}

export default AllergenTableView
