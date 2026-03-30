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
import { hexToRgb, fetchLogoAsDataUrl, fetchAllyJenLogoDataUrl, getImageDimensions, fitDimensions, drawPageFooters } from './pdfBranding'

interface PDFOptions {
  business: Business & {
    settings?: {
      primaryColor?: string | null
      logoUrl?: string | null
      address?: { street?: string; city?: string; postalCode?: string; country?: string; phone?: string } | null
    } | null
  }
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
 * Builds an array of subtype name strings for a gluten or nut allergen.
 * Supports the current format (cereals_gluten_levels / nuts_levels objects)
 * as well as the legacy format (cereals_gluten_types / nuts_types arrays).
 */
function getSubtypeNames(item: MenuItem, allergenId: string): string[] {
  if (!item.allergen_warnings) return []
  const w = item.allergen_warnings as any

  if (allergenId === 'cereals_gluten') {
    // Current format: { wheat: 'contains', oats: 'traces', ... }
    if (w.cereals_gluten_levels && typeof w.cereals_gluten_levels === 'object') {
      return Object.entries(w.cereals_gluten_levels as Record<string, string>)
        .filter(([, lvl]) => lvl && lvl !== 'none')
        .map(([key]) => GLUTEN_TYPES.find(g => g.key === key)?.name || key)
    }
    // Legacy format: array of type keys
    const types: GlutenType[] = w.cereals_gluten_types || []
    return types.map(k => GLUTEN_TYPES.find(g => g.key === k)?.name || k)
  }
  if (allergenId === 'nuts') {
    // Current format: { almonds: 'contains', cashews: 'may_contain', ... }
    if (w.nuts_levels && typeof w.nuts_levels === 'object') {
      return Object.entries(w.nuts_levels as Record<string, string>)
        .filter(([, lvl]) => lvl && lvl !== 'none')
        .map(([key]) => TREE_NUT_TYPES.find(n => n.key === key)?.name || key)
    }
    // Legacy format: array of type keys
    const types: TreeNutType[] = w.nuts_types || []
    return types.map(k => TREE_NUT_TYPES.find(n => n.key === k)?.name || k)
  }
  return []
}

/**
 * Builds the allergen detail lines that appear beneath the item name.
 * Allergen names are wrapped in ** to signal bold rendering via didParseCell.
 *   Contains: **Gluten (Wheat, Oats)**, **Milk**
 *   May contain: **Nuts (Almonds)**, **Sesame**
 * (The ** markers are stripped when the cell is rendered; bold is applied via fontStyle)
 *
 * Actually — jsPDF/autoTable doesn't support inline bold. Instead we store the
 * plain text lines and apply bold to the entire warning sub-line via willDrawCell.
 * We prefix warning lines with a special invisible marker so didParseCell can
 * detect them and set fontStyle = 'bold'.
 */
const WARN_PREFIX = '\u200B' // zero-width space used as a marker

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
  if (contains.length > 0)   lines.push(`${WARN_PREFIX}Contains: ${contains.join(', ')}`)
  if (mayContain.length > 0) lines.push(`${WARN_PREFIX}May contain: ${mayContain.join(', ')}`)
  return lines
}

/**
 * Light cell fill colour for allergen indicator cells.
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

/**
 * Draw a vector checkmark inside an allergen indicator cell.
 * The tick is always the same fixed size (2.2 mm) regardless of cell size.
 * @param high – true for solid red (contains), false for amber (may contain)
 */
function drawCheckmark(
  doc: jsPDF,
  cellX: number, cellY: number, cellW: number, cellH: number,
  high: boolean
): void {
  const cx = cellX + cellW / 2
  const cy = cellY + cellH / 2
  const s  = 1.1  // fixed half-size in mm — always the same
  const color: [number, number, number] = high ? [153, 27, 27] : [133, 77, 14]
  doc.setDrawColor(...color)
  doc.setLineWidth(0.55)
  // Short left stroke (downward)
  doc.line(cx - s, cy + s * 0.05, cx - s * 0.1, cy + s * 0.9)
  // Long right stroke (upward)
  doc.line(cx - s * 0.1, cy + s * 0.9, cx + s, cy - s * 0.5)
}

/** Draw parentheses around a checkmark to indicate a "may contain" level. */
function drawParentheses(
  doc: jsPDF,
  cellX: number, cellY: number, cellW: number, cellH: number
): void {
  const cx = cellX + cellW / 2
  const cy = cellY + cellH / 2
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(133, 77, 14)
  doc.text('(', cx - 2.6, cy + 0.6)
  doc.text(')', cx + 1.6, cy + 0.6)
}

// ---------- main export ------------------------------------------------------

export async function generateAllergenTablePDF(options: PDFOptions): Promise<void> {
  const { business, items, title, showLegend = true } = options

  try {
    // ── Branding ────────────────────────────────────────────────────────────
    const primaryRgb = hexToRgb(business.settings?.primaryColor ?? business.primary_color)
    const rawLogoUrl = business.settings?.logoUrl ?? business.logo_url
    const [logoDataUrl, allyjenLogoDataUrl] = await Promise.all([
      rawLogoUrl ? fetchLogoAsDataUrl(rawLogoUrl) : Promise.resolve(null),
      fetchAllyJenLogoDataUrl(),
    ])

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth  = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let currentY = 12

    // ── Business logo — top left, aspect-ratio preserved ─────────────────────
    if (logoDataUrl) {
      try {
        const { w: nw, h: nh } = await getImageDimensions(logoDataUrl)
        const { w, h } = fitDimensions(nw, nh, 80, 28)
        doc.addImage(logoDataUrl, 'auto', 10, 8, w, h)
      } catch { /* ignore bad image */ }
    }

    // ── AllyJen logo — top right, aspect-ratio preserved ─────────────────────
    if (allyjenLogoDataUrl) {
      try {
        const { w: nw, h: nh } = await getImageDimensions(allyjenLogoDataUrl)
        const { w, h } = fitDimensions(nw, nh, 30, 10)
        doc.addImage(allyjenLogoDataUrl, 'PNG', pageWidth - w - 10, currentY - h / 2, w, h)
      } catch { /* ignore */ }
    }

    // ── Header ──────────────────────────────────────────────────────────────
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryRgb)
    doc.text(business.name, pageWidth / 2, currentY, { align: 'center' })
    currentY += 8

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(title || 'Allergen Information', pageWidth / 2, currentY, { align: 'center' })
    currentY += 6

    const addr = business.settings?.address
    const contactInfo = [
      addr?.street || business.address,
      addr?.city,
      (addr?.phone || business.phone) ? `Tel: ${addr?.phone || business.phone}` : null,
      business.website,
    ].filter(Boolean).join(' \u2022 ')
    if (contactInfo) {
      doc.setFontSize(8)
      doc.text(contactInfo, pageWidth / 2, currentY, { align: 'center' })
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

    // ── Build tick map and table body ─────────────────────────────────────────
    // Allergen cells contain no text — ticks are drawn as vector graphics in didDrawCell.
    const tickMap = new Map<string, AllergenLevel>()
    const tableData = items.map((item, rowIndex) => {
      const warningLines = buildWarningLines(item)
      const nameCell =
        warningLines.length > 0
          ? `${item.name}\n${warningLines.join('\n')}`
          : item.name

      const row: string[] = [nameCell]
      ALLERGENS.forEach((allergen, colOffset) => {
        const level = getLevel(item, allergen.id)
        if (level !== 'none') tickMap.set(`${rowIndex}-${colOffset + 1}`, level)
        row.push('') // content rendered as vector tick in didDrawCell
      })
      return row
    })

    // ── Column widths ─────────────────────────────────────────────────────────
    const margins          = 14
    const availableWidth   = pageWidth - margins
    const nameColWidth     = 65
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
        fillColor: primaryRgb,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'bottom',
        fontSize: 8,
        minCellHeight: 30,
        cellPadding: 1,
      },
      columnStyles: {
        0: {
          halign: 'left',
          cellWidth: nameColWidth,
          fontStyle: 'normal',
          fontSize: 7,
          cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
        },
        ...Object.fromEntries(
          ALLERGENS.map((_, i) => [
            i + 1,
            { cellWidth: allergenColWidth },
          ])
        ),
      },
      // Rotate header text vertically; draw vector checkmarks in body allergen cells
      didDrawCell: data => {
        if (data.section === 'head' && data.column.index === 0) {
          // Re-draw col 0 header centred both horizontally and vertically
          const cell = data.cell
          doc.setFillColor(...primaryRgb)
          doc.rect(cell.x, cell.y, cell.width, cell.height, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          const headerText = headers[0]
          const wrapped = doc.splitTextToSize(headerText, cell.width - 4)
          const totalTextH = wrapped.length * 4.5
          let ty = cell.y + (cell.height - totalTextH) / 2 + 3.5
          for (const line of wrapped) {
            doc.text(line, cell.x + cell.width / 2, ty, { align: 'center' })
            ty += 4.5
          }
        }

        if (data.section === 'head' && data.column.index > 0) {
          const cell = data.cell
          const text  = headers[data.column.index]

          doc.setFillColor(...primaryRgb)
          doc.rect(cell.x, cell.y, cell.width, cell.height, 'F')

          doc.setTextColor(255, 255, 255)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')

          doc.saveGraphicsState()
          doc.text(text, cell.x + cell.width / 2 + 1, cell.y + cell.height - 2, {
            angle: 90,
            align: 'left',
          })
          doc.restoreGraphicsState()
        }

        // Draw vector checkmarks for body allergen cells
        if (data.section === 'body' && data.column.index > 0) {
          const key = `${data.row.index}-${data.column.index}`
          const level = tickMap.get(key)
          if (level) {
            const { x, y, width, height } = data.cell
            const high = getAllergenSeverity(level) === 'high'
            drawCheckmark(doc, x, y, width, height, high)
          }
        }

        // Redraw name column cells that contain warning lines — prevents double-draw jumble
        if (data.section === 'body' && data.column.index === 0) {
          const rawLines = (tableData[data.row.index]?.[0] as string || '').split('\n')
          const markLines = rawLines.filter(l => l.startsWith(WARN_PREFIX))
          if (markLines.length === 0) return

          const cell = data.cell
          const padTop  = 2.5
          const padLeft = 3
          const padRight = 3
          const textWidth = cell.width - padLeft - padRight
          const lineH = 3.8

          // Erase autoTable's rendered text by filling cell interior (preserve border)
          const bgColor: [number, number, number] = data.row.index % 2 === 0 ? [249, 250, 251] : [255, 255, 255]
          doc.setFillColor(...bgColor)
          doc.rect(cell.x + 0.16, cell.y + 0.16, cell.width - 0.32, cell.height - 0.32, 'F')

          let drawY = cell.y + padTop + lineH * 0.75

          // Draw item name in normal font
          const nameLines = rawLines.filter(l => !l.startsWith(WARN_PREFIX))
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(0, 0, 0)
          for (const line of nameLines) {
            const wrapped = doc.splitTextToSize(line, textWidth)
            for (const wl of wrapped) {
              doc.text(wl, cell.x + padLeft, drawY)
              drawY += lineH
            }
          }

          // Draw warning lines in bold, same size as name
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(60, 60, 60)
          for (const line of markLines) {
            const text = line.replace(WARN_PREFIX, '')
            const wrapped = doc.splitTextToSize(text, textWidth)
            for (const wl of wrapped) {
              doc.text(wl, cell.x + padLeft, drawY)
              drawY += lineH
            }
          }

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(0, 0, 0)
        }
      },
      // Colour-code allergen cells; zebra-stripe name column; pre-size col 0 rows
      didParseCell: data => {
        if (data.section === 'body' && data.column.index > 0) {
          const level = getLevel(items[data.row.index], ALLERGENS[data.column.index - 1].id)
          const fill  = cellFill(level)
          if (fill) {
            data.cell.styles.fillColor = fill
          }
        }
        if (data.section === 'body' && data.column.index === 0) {
          data.cell.styles.fillColor =
            data.row.index % 2 === 0 ? [249, 250, 251] : [255, 255, 255]

          // Pre-calculate the exact cell height our custom didDrawCell will need.
          // This ensures autoTable (a) allocates sufficient row height so no lines
          // are clipped, and (b) starts a new page if the row won't fit — preventing
          // text from overflowing outside the cell onto the page footer.
          const rawLines = (tableData[data.row.index]?.[0] as string || '').split('\n')
          const textWidth = nameColWidth - 6 // padLeft(3) + padRight(3)
          const lineH     = 3.8
          const padTop    = 2.5
          const padBottom = 3.5 // extra bottom breathing room

          let totalLines = 0
          for (const line of rawLines) {
            const cleaned = line.replace(WARN_PREFIX, '')
            const wrapped = (data.doc as jsPDF).splitTextToSize(cleaned, textWidth)
            totalLines += Math.max(1, wrapped.length)
          }

          data.cell.styles.minCellHeight = padTop + padBottom + totalLines * lineH
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
        doc.setTextColor(...primaryRgb)
        doc.text('Legend', 7, ly)
        ly += 5

        const legendItems: { fill: [number, number, number]; high: boolean | null; text: string }[] = [
          { fill: [254, 202, 202], high: true,  text: 'Contains (high severity)' },
          { fill: [254, 240, 138], high: false, text: 'May contain / Traces / Cross-contamination' },
          { fill: [255, 255, 255], high: null,  text: 'Not present' },
        ]

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)

        const colW = (pageWidth - 14) / legendItems.length
        legendItems.forEach((item, i) => {
          const x = 7 + i * colW
          doc.setFillColor(...item.fill)
          doc.setDrawColor(180, 180, 180)
          doc.rect(x, ly - 3.5, 6, 5, 'FD')
          if (item.high !== null) {
            drawCheckmark(doc, x, ly - 3.5, 6, 5, item.high)
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

    // ── Footer on every page (page numbers, AllyJen logo, timestamp) ─────────
    const generatedDate = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
    await drawPageFooters(doc, allyjenLogoDataUrl, generatedDate)

    const fileName = `${business.name.replace(/[^a-z0-9]/gi, '_')}_allergen_guide.pdf`
    doc.save(fileName)
  } catch (error: any) {
    console.error('❌ PDF generation failed:', error)
    throw error
  }
}
