// lib/pdf/allergenTablePDF.ts
// FSAI-style allergen table PDF:
//   • 14 allergen columns with tick marks (✓ / (✓)) — no sub-type columns
//   • Allergen warning detail listed under each item name in the first column
//   • Compliant with EU Regulation No. 1169/2011 (FIC Regulation)

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ALLERGENS } from '@/lib/allergens'
import {
  getAllergenSeverity,
  GLUTEN_TYPES,
  TREE_NUT_TYPES,
  type GlutenType,
  type TreeNutType,
  type AllergenLevel,
} from '@/types/allergen'
import type { Business, MenuItem } from '@/lib/hooks/useOfflineKioskData'

interface PDFOptions {
  business: Business
  items: MenuItem[]
  title?: string
  includeDescription?: boolean
  showLegend?: boolean
}

// ---------- helpers ----------------------------------------------------------

/** Returns the AllergenLevel for a given allergen on a menu item. */
function getLevel(item: MenuItem, allergenId: string): AllergenLevel {
  if (item.allergen_warnings) {
    return ((item.allergen_warnings as any)[allergenId] as AllergenLevel) || 'none'
  }
  // Legacy boolean fallback
  if ((item as any)[allergenId] === true) return 'contains'
  return 'none'
}

/**
 * Builds an array of subtype name strings for a gluten or nut allergen,
 * e.g. ["Wheat", "Oats"] or ["Almonds", "Walnuts"].
 */
function getSubtypeNames(item: MenuItem, allergenId: string): string[] {
  if (!item.allergen_warnings) return []
  const w = item.allergen_warnings

  if (allergenId === 'cereals_gluten') {
    const types: GlutenType[] = w.cereals_gluten_types || []
    return types.map(k => GLUTEN_TYPES.find(g => g.key === k)?.name || k)
  }
  if (allergenId === 'nuts') {
    const types: TreeNutType[] = w.nuts_types || []
    return types.map(k => TREE_NUT_TYPES.find(n => n.key === k)?.name || k)
  }
  return []
}

/**
 * Builds the allergen detail lines that appear beneath the item name:
 *   Contains: Gluten (Wheat, Oats), Milk
 *   May contain: Nuts (Almonds), Sesame
 */
function buildWarningLines(item: MenuItem): string[] {
  const contains: string[] = []
  const mayContain: string[] = []

  ALLERGENS.forEach(allergen => {
    const level = getLevel(item, allergen.id)
    if (level === 'none') return

    const subtypes = getSubtypeNames(item, allergen.id)
    const label =
      subtypes.length > 0
        ? `${allergen.name} (${subtypes.join(', ')})`
        : allergen.name

    if (getAllergenSeverity(level) === 'high') {
      contains.push(label)
    } else {
      mayContain.push(label)
    }
  })

  const lines: string[] = []
  if (contains.length > 0)    lines.push(`Contains: ${contains.join(', ')}`)
  if (mayContain.length > 0)  lines.push(`May contain: ${mayContain.join(', ')}`)
  return lines
}

/**
 * Returns the tick symbol for the allergen cell:
 *   ✓   — contains / not_suitable (high severity)
 *   (✓) — may_contain / traces / cross_contamination
 *   ""  — not present
 */
function tickMark(level: AllergenLevel): string {
  if (level === 'none') return ''
  return getAllergenSeverity(level) === 'high' ? '\u2713' : '(\u2713)'
}

/**
 * Light cell fill colour — tinted so the tick remains readable.
 */
function cellFill(level: AllergenLevel): [number, number, number] | null {
  switch (level) {
    case 'contains':
    case 'not_suitable':
      return [254, 202, 202] // red-200
    case 'may_contain':
    case 'traces':
    case 'cross_contamination':
      return [254, 240, 138] // yellow-200
    default:
      return null
  }
}

// ---------- main export ------------------------------------------------------

export async function generateAllergenTablePDF(options: PDFOptions): Promise<void> {
  const { business, items, title, showLegend = true } = options

  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth  = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let currentY = 15

    // ── Header ──────────────────────────────────────────────────────────────
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 56, 66)
    doc.text(business.name, pageWidth / 2, currentY, { align: 'center' })
    currentY += 8

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(title || 'Allergen Information', pageWidth / 2, currentY, { align: 'center' })
    currentY += 6

    if (business.address || business.phone) {
      doc.setFontSize(8)
      const info = [
        business.address,
        business.phone && `Tel: ${business.phone}`,
        business.website,
      ]
        .filter(Boolean)
        .join(' \u2022 ')
      doc.text(info, pageWidth / 2, currentY, { align: 'center' })
      currentY += 8
    }

    // ── EU Regulation notice ─────────────────────────────────────────────────
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(
      'Allergen information declared in accordance with EU Regulation No. 1169/2011 (FIC Regulation). ' +
        'Where multiple suppliers exist, the most conservative (worst-case) declaration is shown.',
      pageWidth / 2,
      currentY,
      { align: 'center', maxWidth: pageWidth - 20 }
    )
    currentY += 8
    doc.setTextColor(0, 0, 0)

    // ── Table headers ─────────────────────────────────────────────────────────
    const headers = ['Menu Item / Ingredient', ...ALLERGENS.map(a => a.shortName || a.name)]

    // ── Table body ────────────────────────────────────────────────────────────
    const tableData = items.map(item => {
      const warningLines = buildWarningLines(item)
      const nameCell =
        warningLines.length > 0
          ? `${item.name}\n${warningLines.join('\n')}`
          : item.name

      const row: string[] = [nameCell]
      ALLERGENS.forEach(allergen => {
        row.push(tickMark(getLevel(item, allergen.id)))
      })
      return row
    })

    // ── Column widths ─────────────────────────────────────────────────────────
    const margins          = 14
    const availableWidth   = pageWidth - margins
    const nameColWidth     = 55
    const allergenColWidth = (availableWidth - nameColWidth) / ALLERGENS.length

    // ── Render table ──────────────────────────────────────────────────────────
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: currentY,
      theme: 'grid',
      margin: { left: 7, right: 7 },
      styles: {
        fontSize: 7,
        cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.3,
        lineColor: [180, 180, 180],
      },
      headStyles: {
        fillColor: [0, 56, 66],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'bottom',
        fontSize: 6.5,
        minCellHeight: 28,
        cellPadding: 1,
      },
      columnStyles: {
        0: {
          halign: 'left',
          cellWidth: nameColWidth,
          fontStyle: 'normal',
          fontSize: 7,
        },
        ...Object.fromEntries(
          ALLERGENS.map((_, i) => [
            i + 1,
            { cellWidth: allergenColWidth, fontSize: 9, fontStyle: 'bold' },
          ])
        ),
      },
      // Rotate header text vertically — FSAI column-header style
      didDrawCell: data => {
        if (data.section === 'head' && data.column.index > 0) {
          const cell = data.cell
          const text  = headers[data.column.index]

          doc.setFillColor(0, 56, 66)
          doc.rect(cell.x, cell.y, cell.width, cell.height, 'F')

          doc.setTextColor(255, 255, 255)
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'bold')

          doc.saveGraphicsState()
          doc.text(text, cell.x + cell.width / 2 + 1, cell.y + cell.height - 2, {
            angle: 90,
            align: 'left',
          })
          doc.restoreGraphicsState()
        }
      },
      // Colour-code allergen cells; zebra-stripe name column
      didParseCell: data => {
        if (data.section === 'body' && data.column.index > 0) {
          const level = getLevel(items[data.row.index], ALLERGENS[data.column.index - 1].id)
          const fill  = cellFill(level)
          if (fill) {
            data.cell.styles.fillColor  = fill
            data.cell.styles.textColor =
              getAllergenSeverity(level) === 'high' ? [153, 27, 27] : [133, 77, 14]
          }
        }
        if (data.section === 'body' && data.column.index === 0) {
          data.cell.styles.fillColor =
            data.row.index % 2 === 0 ? [249, 250, 251] : [255, 255, 255]
        }
      },
    })

    // ── Legend ────────────────────────────────────────────────────────────────
    if (showLegend) {
      const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50
      if (finalY + 28 < pageHeight) {
        let ly = finalY + 8

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 56, 66)
        doc.text('Legend', 7, ly)
        ly += 5

        const legendItems: { fill: [number,number,number]; symbol: string; text: string }[] = [
          { fill: [254, 202, 202], symbol: '\u2713',     text: 'Contains (high severity)' },
          { fill: [254, 240, 138], symbol: '(\u2713)',   text: 'May contain / Traces / Cross-contamination' },
          { fill: [255, 255, 255], symbol: '',           text: 'Not present' },
        ]

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)

        const colW = (pageWidth - 14) / legendItems.length
        legendItems.forEach((item, i) => {
          const x = 7 + i * colW
          doc.setFillColor(...item.fill)
          doc.setDrawColor(180, 180, 180)
          doc.rect(x, ly - 3.5, 6, 5, 'FD')
          if (item.symbol) {
            doc.setTextColor(item.fill[0] < 200 ? 153 : 133, 27, 14)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'bold')
            doc.text(item.symbol, x + 1.5, ly)
          }
          doc.setTextColor(60, 60, 60)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.text(item.text, x + 9, ly)
        })

        ly += 8
        doc.setFontSize(6.5)
        doc.setTextColor(120, 120, 120)
        doc.text(
          'Sub-type details (e.g. specific grains or tree nuts) are listed under each item name in the first column. ' +
            'Always inform staff of any allergy before ordering.',
          pageWidth / 2,
          ly,
          { align: 'center', maxWidth: pageWidth - 20 }
        )
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    )

    const fileName = `${business.name.replace(/[^a-z0-9]/gi, '_')}_allergen_guide.pdf`
    doc.save(fileName)
  } catch (error: any) {
    console.error('❌ PDF generation failed:', error)
    throw error
  }
}
