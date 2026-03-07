// lib/pdf/allergenTablePDF.ts - Generate PDF with allergen table format

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ALLERGENS } from '@/lib/allergens'
import { AllergenWarnings, getAllergenLevelText, getAllergenSeverity, GLUTEN_TYPES, TREE_NUT_TYPES, type GlutenType, type TreeNutType, type AllergenLevel } from '@/types/allergen'
import type { Business, MenuItem } from '@/lib/hooks/useOfflineKioskData'

interface PDFOptions {
  business: Business
  items: MenuItem[]
  title?: string
  includeDescription?: boolean
  showLegend?: boolean
}

// Get cell content for PDF
function getCellContent(item: MenuItem, allergenId: string): string {
  // Check new allergen_warnings system first
  if (item.allergen_warnings) {
    const warnings = item.allergen_warnings
    let level: string = 'none'
    let subtypes: string[] | undefined
    
    if (allergenId === 'cereals_gluten') {
      level = warnings.cereals_gluten || 'none'
      subtypes = warnings.cereals_gluten_types
    } else if (allergenId === 'nuts') {
      level = warnings.nuts || 'none'
      subtypes = warnings.nuts_types
    } else {
      level = (warnings as any)[allergenId] || 'none'
    }

    if (level === 'none') return ''

    // Return empty string - color indicates the level
    return ''
  }
  
  // Check for ingredient combined_allergens array
  if ((item as any).combined_allergens && Array.isArray((item as any).combined_allergens)) {
    const combinedAllergens = (item as any).combined_allergens as string[]
    
    // Map allergen names to IDs for checking
    const allergenNameMap: { [key: string]: string } = {
      'gluten': 'cereals_gluten',
      'wheat': 'cereals_gluten',
      'barley': 'cereals_gluten',
      'oats': 'cereals_gluten',
      'rye': 'cereals_gluten',
      'crustaceans': 'crustaceans',
      'shellfish': 'crustaceans',
      'eggs': 'eggs',
      'fish': 'fish',
      'peanuts': 'peanuts',
      'nuts': 'nuts',
      'almonds': 'nuts',
      'walnuts': 'nuts',
      'cashews': 'nuts',
      'pistachios': 'nuts',
      'milk': 'milk',
      'dairy': 'milk',
      'soy': 'soybeans',
      'soya': 'soybeans',
      'celery': 'celery',
      'mustard': 'mustard',
      'sesame': 'sesame',
      'sulphites': 'sulphites',
      'sulfites': 'sulphites',
      'lupin': 'lupin',
      'molluscs': 'molluscs',
      'mollusks': 'molluscs'
    }
    
    // Check if any of the combined allergens match this allergen ID
    const hasAllergen = combinedAllergens.some(allergenName => {
      const normalizedName = allergenName.toLowerCase().trim()
      return allergenNameMap[normalizedName] === allergenId
    })
    
    if (hasAllergen) {
      return ''
    }
    return ''
  }
  
  // Fallback to legacy boolean system
  if ((item as any)[allergenId] === true) {
    return ''
  }
  
  return ''
}

// Get cell content for a specific gluten or nut subtype
function getSubtypeCellContent(item: MenuItem, subtypeKey: GlutenType | TreeNutType, isGluten: boolean): string {
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
        return ''
      } else if (!isGluten && (item as any).contains_nuts) {
        return ''
      }
    }

    if (level === 'none') return ''
    
    // Return empty string - color indicates the level
    return ''
  }
  
  // Fallback to legacy boolean system
  if (isGluten && (item as any).contains_cereals_gluten) {
    return ''
  } else if (!isGluten && (item as any).contains_nuts) {
    return ''
  }
  
  return ''
}

// Get cell background color based on allergen level
function getCellColor(item: MenuItem, allergenId: string): [number, number, number] | null {
  if (item.allergen_warnings) {
    const warnings = item.allergen_warnings
    let level: string = 'none'
    
    if (allergenId === 'cereals_gluten') {
      level = warnings.cereals_gluten || 'none'
    } else if (allergenId === 'nuts') {
      level = warnings.nuts || 'none'
    } else {
      level = (warnings as any)[allergenId] || 'none'
    }

    if (level === 'none') return null

    // Return RGB colors - each level has distinct color (lighter shades)
    switch (level) {
      case 'contains': return [252, 165, 165] // red-300
      case 'may_contain': return [253, 186, 116] // orange-300
      case 'not_suitable': return [196, 181, 253] // violet-300
      case 'traces': return [103, 232, 249] // cyan-300
      case 'cross_contamination': return [245, 158, 11] // amber-500
      default: return null
    }
  }
  
  // Check for ingredient combined_allergens array
  if ((item as any).combined_allergens && Array.isArray((item as any).combined_allergens)) {
    const combinedAllergens = (item as any).combined_allergens as string[]
    
    // Map allergen names to IDs for checking
    const allergenNameMap: { [key: string]: string } = {
      'gluten': 'cereals_gluten',
      'wheat': 'cereals_gluten',
      'barley': 'cereals_gluten',
      'oats': 'cereals_gluten',
      'rye': 'cereals_gluten',
      'crustaceans': 'crustaceans',
      'shellfish': 'crustaceans',
      'eggs': 'eggs',
      'fish': 'fish',
      'peanuts': 'peanuts',
      'nuts': 'nuts',
      'almonds': 'nuts',
      'walnuts': 'nuts',
      'cashews': 'nuts',
      'pistachios': 'nuts',
      'milk': 'milk',
      'dairy': 'milk',
      'soy': 'soybeans',
      'soya': 'soybeans',
      'celery': 'celery',
      'mustard': 'mustard',
      'sesame': 'sesame',
      'sulphites': 'sulphites',
      'sulfites': 'sulphites',
      'lupin': 'lupin',
      'molluscs': 'molluscs',
      'mollusks': 'molluscs'
    }
    
    // Check if any of the combined allergens match this allergen ID
    const hasAllergen = combinedAllergens.some(allergenName => {
      const normalizedName = allergenName.toLowerCase().trim()
      return allergenNameMap[normalizedName] === allergenId
    })
    
    if (hasAllergen) {
      return [220, 38, 38] // red-600 for contains
    }
    return null
  }
  
  // Fallback to legacy - red if present
  if ((item as any)[allergenId] === true) {
    return [220, 38, 38] // red-600
  }
  
  return null
}

// Get cell background color for subtype
function getSubtypeCellColor(item: MenuItem, subtypeKey: GlutenType | TreeNutType, isGluten: boolean): [number, number, number] | null {
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
        return [220, 38, 38] // red-600
      } else if (!isGluten && (item as any).contains_nuts) {
        return [220, 38, 38] // red-600
      }
    }

    if (level === 'none') return null

    // Return RGB colors - each level has distinct color (lighter shades)
    switch (level) {
      case 'contains': return [252, 165, 165] // red-300
      case 'may_contain': return [253, 186, 116] // orange-300
      case 'not_suitable': return [196, 181, 253] // violet-300
      case 'traces': return [103, 232, 249] // cyan-300
      case 'cross_contamination': return [245, 158, 11] // amber-500
      default: return null
    }
  }
  
  // Fallback to legacy
  if (isGluten && (item as any).contains_cereals_gluten) {
    return [220, 38, 38] // red-600
  } else if (!isGluten && (item as any).contains_nuts) {
    return [220, 38, 38] // red-600
  }
  
  return null
}

export async function generateAllergenTablePDF(options: PDFOptions): Promise<void> {
  const { business, items, title, includeDescription = false, showLegend = true } = options
  
  console.log('🖨️ Starting PDF generation for', business.name, 'with', items.length, 'items')
  
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let currentY = 15

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(business.name, pageWidth / 2, currentY, { align: 'center' })
  currentY += 10

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  const pdfTitle = title || 'Allergen Information'
  doc.text(pdfTitle, pageWidth / 2, currentY, { align: 'center' })
  currentY += 8

  if (business.address || business.phone) {
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    let contactInfo = []
    if (business.address) contactInfo.push(business.address)
    if (business.phone) contactInfo.push(`Tel: ${business.phone}`)
    if (business.website) contactInfo.push(business.website)
    doc.text(contactInfo.join(' • '), pageWidth / 2, currentY, { align: 'center' })
    currentY += 10
  }

  doc.setTextColor(0, 0, 0)

  // Prepare table headers with subtypes - using full names (will be rotated vertically)
  const headers: string[] = ['Item']
  const headerColors: ([number, number, number] | null)[] = [null] // Item column has no special color
  
  ALLERGENS.forEach(allergen => {
    headers.push(allergen.name)
    headerColors.push(null) // Main allergen columns
    
    // Add subtype columns for gluten
    if (allergen.id === 'cereals_gluten') {
      GLUTEN_TYPES.forEach(glutenType => {
        headers.push(glutenType.name)
        headerColors.push([245, 158, 11]) // Orange tint for gluten subtypes
      })
    }
    
    // Add subtype columns for tree nuts
    if (allergen.id === 'nuts') {
      TREE_NUT_TYPES.forEach(nutType => {
        headers.push(nutType.name)
        headerColors.push([180, 83, 9]) // Brown tint for nut subtypes
      })
    }
  })

  const tableData = items.flatMap(item => {
    const isIngredient = (item as any).combined_allergens && Array.isArray((item as any).combined_allergens)
    const suppliers = (item as any).suppliers || []
    
    // If it's an ingredient with multiple suppliers, create separate rows
    if (isIngredient && suppliers.length > 1) {
      return suppliers.map((supplier: string) => {
        const itemName = `${item.name} (${supplier})`
        const row: string[] = [itemName]
        
        ALLERGENS.forEach(allergen => {
          const content = getCellContent(item, allergen.id)
          row.push(content)
          
          // Add subtype data for gluten
          if (allergen.id === 'cereals_gluten') {
            GLUTEN_TYPES.forEach(glutenType => {
              const subtypeContent = getSubtypeCellContent(item, glutenType.key, true)
              row.push(subtypeContent)
            })
          }
          
          // Add subtype data for tree nuts
          if (allergen.id === 'nuts') {
            TREE_NUT_TYPES.forEach(nutType => {
              const subtypeContent = getSubtypeCellContent(item, nutType.key, false)
              row.push(subtypeContent)
            })
          }
        })
        
        return row
      })
    } else {
      // Single row for menu items or ingredients with single/no supplier
      const supplierText = suppliers.length === 1 ? ` (${suppliers[0]})` : ''
      const itemName = isIngredient ? `${item.name}${supplierText} (Ingredient)` : item.name
      const row: string[] = [itemName]
      
      ALLERGENS.forEach(allergen => {
        const content = getCellContent(item, allergen.id)
        row.push(content)
        
        // Add subtype data for gluten
        if (allergen.id === 'cereals_gluten') {
          GLUTEN_TYPES.forEach(glutenType => {
            const subtypeContent = getSubtypeCellContent(item, glutenType.key, true)
            row.push(subtypeContent)
          })
        }
        
        // Add subtype data for tree nuts
        if (allergen.id === 'nuts') {
          TREE_NUT_TYPES.forEach(nutType => {
            const subtypeContent = getSubtypeCellContent(item, nutType.key, false)
            row.push(subtypeContent)
          })
        }
      })
      
      return [row]
    }
  })

  // Calculate column widths - ensure borders are visible
  const itemColumnWidth = 35
  const totalAllergenColumns = ALLERGENS.length + GLUTEN_TYPES.length + TREE_NUT_TYPES.length
  const availableWidth = pageWidth - 20 // Account for margins
  const allergenColumnWidth = Math.max(12, (availableWidth - itemColumnWidth) / totalAllergenColumns)
  const tableWidth = itemColumnWidth + (totalAllergenColumns * allergenColumnWidth)

  // Generate table
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: currentY,
    theme: 'grid',
    tableWidth: 'auto', // Let table determine width
    margin: { left: (pageWidth - tableWidth) / 2 }, // Center the table horizontally
    styles: {
      fontSize: 5, // Smaller font
      cellPadding: 1, // Less padding
      overflow: 'linebreak',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.3, // Even thicker borders
      lineColor: [150, 150, 150] // Darker gray borders
    },
    headStyles: {
      fillColor: [0, 56, 66], // #003842
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'bottom',
      fontSize: 6, // Smaller header font
      minCellHeight: 25, // Reduced height for vertical text
      cellPadding: 1
    },
    columnStyles: {
      0: { 
        halign: 'left', 
        cellWidth: itemColumnWidth,
        fontStyle: 'bold',
        fontSize: 6 // Slightly larger for item names
      },
      // All allergen columns: equal width
      ...Object.fromEntries(
        headers.slice(1).map((_, index) => [
          index + 1,
          { cellWidth: allergenColumnWidth }
        ])
      )
    },
    didDrawCell: (data) => {
      // Draw vertical text in header cells (except item column)
      if (data.section === 'head' && data.column.index > 0) {
        const cell = data.cell
        const text = headers[data.column.index]
        
        // Clear the default text (it's already drawn horizontally by autoTable)
        // We'll redraw it vertically
        const fillColor = Array.isArray(cell.styles.fillColor) 
          ? cell.styles.fillColor 
          : [cell.styles.fillColor as number, cell.styles.fillColor as number, cell.styles.fillColor as number]
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
        doc.rect(cell.x, cell.y, cell.width, cell.height, 'F')
        
        // Set text properties
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(6) // Match header font size
        doc.setFont('helvetica', 'bold')
        
        // Calculate position for vertical text (centered in cell)
        const textX = cell.x + cell.width / 2 + 1
        const textY = cell.y + cell.height - 2
        
        // Rotate and draw text vertically
        doc.saveGraphicsState()
        doc.text(text, textX, textY, {
          angle: 90,
          align: 'left'
        })
        doc.restoreGraphicsState()
      }
    },
    didParseCell: (data) => {
      // Color code subtype header cells
      if (data.section === 'head' && data.column.index > 0) {
        const color = headerColors[data.column.index]
        if (color) {
          data.cell.styles.fillColor = color
          data.cell.styles.textColor = [255, 255, 255]
        }
      }
      
      // Color code allergen cells based on severity
      if (data.section === 'body' && data.column.index > 0) {
        const itemIndex = data.row.index
        const item = items[itemIndex]
        
        // Map column index to allergen/subtype
        let colIndex = 0
        for (let i = 0; i < ALLERGENS.length; i++) {
          const allergen = ALLERGENS[i]
          colIndex++ // Main allergen column
          
          if (colIndex === data.column.index) {
            const color = getCellColor(item, allergen.id)
            if (color) {
              data.cell.styles.fillColor = color
            }
            break
          }
          
          // Check gluten subtypes
          if (allergen.id === 'cereals_gluten') {
            for (let j = 0; j < GLUTEN_TYPES.length; j++) {
              colIndex++
              if (colIndex === data.column.index) {
                const color = getSubtypeCellColor(item, GLUTEN_TYPES[j].key, true)
                if (color) {
                  data.cell.styles.fillColor = color
                }
                break
              }
            }
          }
          
          // Check nut subtypes
          if (allergen.id === 'nuts') {
            for (let j = 0; j < TREE_NUT_TYPES.length; j++) {
              colIndex++
              if (colIndex === data.column.index) {
                const color = getSubtypeCellColor(item, TREE_NUT_TYPES[j].key, false)
                if (color) {
                  data.cell.styles.fillColor = color
                }
                break
              }
            }
          }
        }
      }
    },
    // margin: { left: 10, right: 10 }, // Removed duplicate margin property
  })

  // Add legend if requested
  if (showLegend) {
    const finalY = (doc as any).lastAutoTable.finalY || currentY + 50
    
    if (finalY + 30 < pageHeight) {
      currentY = finalY + 10
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Legend:', pageWidth / 2, currentY, { align: 'center' })
      currentY += 6
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      
      // Center the legend horizontally
      const legendWidth = 250 // Approximate width of legend content
      const legendStartX = (pageWidth - legendWidth) / 2
      
      // Calculate even spacing for 6 items
      const itemSpacing = legendWidth / 5 // 5 gaps between 6 items = 50px each
      
      const legendItems = [
        { color: [252, 165, 165], text: 'Contains', x: legendStartX },
        { color: [253, 186, 116], text: 'May Contain', x: legendStartX + itemSpacing },
        { color: [196, 181, 253], text: 'Not Suitable', x: legendStartX + (itemSpacing * 2) },
        { color: [103, 232, 249], text: 'Traces', x: legendStartX + (itemSpacing * 3) },
        { color: [245, 158, 11], text: 'Cross Contamination', x: legendStartX + (itemSpacing * 4) },
        { color: [255, 255, 255], text: 'Not present', x: legendStartX + (itemSpacing * 5) }
      ]
      
      legendItems.forEach(item => {
        // Draw color box
        doc.setFillColor(item.color[0], item.color[1], item.color[2])
        doc.setDrawColor(200, 200, 200)
        doc.rect(item.x, currentY - 3, 5, 5, 'FD')
        
        // Draw text
        doc.text(item.text, item.x + 7, currentY)
      })
      
      currentY += 10
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.text('Note: Gluten and tree nut columns include specific sub-types. Always inform staff of severe allergies.', pageWidth / 2, currentY, { align: 'center' })
    }
  }

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  const footerText = `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
  doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' })

  // Save the PDF
  const fileName = `${business.name.replace(/[^a-z0-9]/gi, '_')}_allergen_guide.pdf`
  console.log('💾 Saving PDF as:', fileName)
  doc.save(fileName)
  console.log('✅ PDF generation completed successfully')
    // End of try block
  } catch (error: any) {
    console.error('❌ PDF generation failed:', error)
    throw error
  }
}
