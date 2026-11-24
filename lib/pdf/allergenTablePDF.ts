import { JURISDICTIONS, publishedDate } from '@/lib/location-jurisdiction'
import { categorySections } from '@/lib/item-category-tree'
import { menuItemSourceLines } from './menuItemSource'
// lib/pdf/allergenTablePDF.ts
// FSAI-style allergen table PDF:
//   • 14 allergen columns with tick marks (✓ / (✓)) — no sub-type columns
//   • Allergen warning detail listed under each item name in the first column
//   • Compliant with EU Regulation No. 1169/2011 (FIC Regulation)

import jsPDF from 'jspdf'
import autoTable, { type CellInput } from 'jspdf-autotable'
import { ALLERGENS } from '@/lib/allergens'
import { evaluateAllergen, hasIncompleteSubtypeAssessment } from '@/lib/allergen-assessment'
import {
  getAllergenSeverity,
  GLUTEN_TYPES,
  TREE_NUT_TYPES,
  type GlutenType,
  type TreeNutType,
  type AllergenId,
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
  /** When 'base64', returns the raw base64 PDF string instead of triggering a browser download.
   *  When 'bloburl', returns a blob: URL string for inline viewing. */
  outputMode?: 'download' | 'base64' | 'bloburl'
}

// ---------- helpers ----------------------------------------------------------

type GuideLevel = AllergenLevel | 'incomplete'

function getLevel(item: MenuItem, allergenId: string): GuideLevel {
  const assessment = evaluateAllergen(item.allergen_warnings, { allergen: allergenId as AllergenId }, item)
  return assessment.status === 'warning' ? assessment.level : assessment.status === 'clear' ? 'none' : 'incomplete'
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

function sortItemsByName(a: MenuItem, b: MenuItem): number {
  const normalize = (text: string | undefined) =>
    (text || '').toString().split('\n')[0].trim().toLowerCase()
  const aName = normalize(a.name)
  const bName = normalize(b.name)
  return aName.localeCompare(bName) || (a.name || '').toString().localeCompare((b.name || '').toString())
}

function getIngredientLines(item: MenuItem): string[] {
  const ingredientNames = Array.isArray((item as any).ingredient_names)
    ? ((item as any).ingredient_names as string[])
        .map(name => String(name || '').trim())
        .filter(Boolean)
    : []

  if (ingredientNames.length === 0) return []

  const joined = ingredientNames.join(', ')
  return [`Ingredients: ${joined}`]
}

function getHeaderTextColor(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 165 ? [17, 24, 39] : [255, 255, 255]
}

interface WarningLine {
  text: string
  prefix?: string
}

function buildWarningLines(item: MenuItem): WarningLine[] {
  const contains: string[] = []
  const mayContain: string[] = []
  const incomplete: string[] = []

  ALLERGENS.forEach(allergen => {
    const level = getLevel(item, allergen.id)
    if (level === 'none') return
    if (level === 'incomplete') {
      incomplete.push(allergen.name)
      return
    }

    if ((allergen.id === 'nuts' || allergen.id === 'cereals_gluten') &&
      hasIncompleteSubtypeAssessment(item.allergen_warnings, allergen.id, item)) {
      incomplete.push(allergen.name)
    }
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

  const lines: WarningLine[] = []
  if (contains.length) lines.push({ prefix: 'Contains: ', text: contains.join(', ') })
  if (mayContain.length) lines.push({ prefix: 'May contain: ', text: mayContain.join(', ') })
  if (incomplete.length) {
    const detail = incomplete.length === ALLERGENS.length ? '' : ` (${incomplete.join(', ')})`
    lines.push({ text: `Incomplete allergen information${detail}. Check with staff.` })
  }
  return lines
}

/**
 * Light cell fill colour for allergen indicator cells.
 */
function cellFill(level: GuideLevel): [number, number, number] | null {
  switch (level) {
    case 'contains':
    case 'not_suitable':
      return [254, 202, 202] // red-200
    case 'incomplete':
      return [243, 244, 246]
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

/**
 * Solid warning-triangle glyph for "contains" cells — visually distinct
 * (shape + weight, not just colour) from the "may contain" checkmark so the
 * two remain distinguishable when printed in black & white.
 */
function drawWarningTriangle(
  doc: jsPDF,
  cellX: number, cellY: number, cellW: number, cellH: number
): void {
  const cx = cellX + cellW / 2
  const cy = cellY + cellH / 2
  const s = 1.5
  doc.setFillColor(153, 27, 27)
  doc.setDrawColor(153, 27, 27)
  doc.triangle(
    cx, cy - s * 0.8,
    cx - s * 0.9, cy + s * 0.6,
    cx + s * 0.9, cy + s * 0.6,
    'F'
  )
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.4)
  doc.line(cx, cy - s * 0.1, cx, cy + s * 0.15)
  doc.setFillColor(255, 255, 255)
  doc.circle(cx, cy + s * 0.4, 0.2, 'F')
}

// ---------- main export ------------------------------------------------------

export async function generateAllergenTablePDF(options: PDFOptions): Promise<string | void> {
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
    doc.setCharSpace(0)
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

    if (business.location) {
      const { name, jurisdiction, publishedAt } = business.location
      doc.setFontSize(9)
      doc.text(`${name} - ${JURISDICTIONS[jurisdiction]}`, pageWidth / 2, currentY, { align: 'center' })
      currentY += 5
      if (publishedAt) {
        doc.text(`Published ${publishedDate(publishedAt)}`, pageWidth / 2, currentY, { align: 'center' })
        currentY += 5
      }
    }

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

    // ── Ensure content clears the business logo (max 28 mm tall at y=8) ──────
    currentY = Math.max(currentY, 8 + 28 + 6) // 6 mm breathing room below logo

    // ── Column widths ─────────────────────────────────────────────────────────
    const margins          = 14
    const availableWidth   = pageWidth - margins
    const nameColWidth     = 65
    const allergenColWidth = (availableWidth - nameColWidth) / ALLERGENS.length

    // ── Table headers (col 0 label set per section) ─────────────────────────
    const allergenHeaders = ALLERGENS.map(a => a.shortName || a.name)

    const nameCellPadding = { top: 2.5, bottom: 3.5, left: 3, right: 3 }
    const nameFontSize = 9
    const nameLineHeight = 4.2

    interface NameCellSegment {
      text: string
      font: 'normal' | 'bold' | 'italic'
      size: number
    }

    function layoutNameCell(item: MenuItem): NameCellSegment[][] {
      const width = nameColWidth - nameCellPadding.left - nameCellPadding.right
      const lines: NameCellSegment[][] = []
      function appendText(text: string, font: NameCellSegment['font'], size: number) {
        doc.setFont('helvetica', font)
        doc.setFontSize(size)
        const wrapped: string[] = doc.splitTextToSize(text, width)
        for (const line of wrapped) lines.push([{ text: line, font, size }])
      }

      appendText(item.name, 'normal', nameFontSize)
      for (const text of getIngredientLines(item)) appendText(text, 'italic', 7)
      for (const { text, prefix } of buildWarningLines(item)) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        const prefixWidth = prefix ? doc.getTextWidth(prefix) : 0
        doc.setFont('helvetica', 'bold')
        // Match the first line's available width to the normal-weight prefix.
        const wrapped: string[] = doc.splitTextToSize(text, width, { textIndent: prefixWidth })
        wrapped.forEach((line, index) => {
          const segments: NameCellSegment[] = []
          if (index === 0 && prefix) segments.push({ text: prefix, font: 'normal', size: 7 })
          if (line) segments.push({ text: line, font: 'bold', size: 7 })
          lines.push(segments)
        })
      }
      return lines
    }

    // ── Helper: render one section table ─────────────────────────────────────
    const renderSection = (
      sectionItems: MenuItem[],
      sectionTitle: string,
      startY: number,
      subNote?: string,
      col0Label = 'Item / Ingredient'
    ): number => {
      if (sectionItems.length === 0) return startY

      // Section heading
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...primaryRgb)
      doc.text(sectionTitle, 7, startY)
      startY += 5

      if (subNote) {
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100, 100, 100)
        doc.text(subNote, 7, startY, { maxWidth: pageWidth - 14 })
        startY += 5
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
      }

      const layoutByRow = new Map<unknown, { lines: NameCellSegment[][]; levels: GuideLevel[] }>()
      const tableData = sectionItems.map((item, index) => {
        const lines = layoutNameCell(item)
        const levels = ALLERGENS.map(allergen => getLevel(item, allergen.id))
        // AutoTable paginates the line indices. A split row keeps its original
        // raw row and receives only the indices that belong on that page.
        const row: CellInput[] = [{
          content: lines.map((_, line) => String(line)).join('\n'),
          styles: { fillColor: index % 2 === 0 ? [249, 250, 251] : 255 },
        }, ...levels.map<CellInput>(level => ({
          content: '',
          styles: { fillColor: cellFill(level) ?? false },
        }))]
        layoutByRow.set(row, { lines, levels })
        return row
      })

      let nameLineIndices: string[] = []
      const previousLineHeight = doc.getLineHeightFactor()
      doc.setLineHeightFactor(nameLineHeight * doc.internal.scaleFactor / nameFontSize)

      autoTable(doc, {
        head: [[col0Label, ...allergenHeaders.map(() => '')]],
        body: tableData,
        startY,
        theme: 'grid',
        rowPageBreak: 'avoid',
        pageBreak: 'auto',
        margin: { left: 7, right: 7, bottom: 28 },
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
          valign: 'middle',
          fontSize: 9,
          minCellHeight: 30,
          cellPadding: 1,
        },
        columnStyles: {
          0: {
            cellWidth: nameColWidth,
            fontStyle: 'normal',
            fontSize: nameFontSize,
            overflow: lines => lines,
            cellPadding: nameCellPadding,
          },
          ...Object.fromEntries(
            ALLERGENS.map((_, i) => [
              i + 1,
              { cellWidth: allergenColWidth },
            ])
          ),
        },
        didParseCell: ({ section, column, cell }) => {
          if (section !== 'head' || column.index === 0) return
          const color = hexToRgb(ALLERGENS[column.index - 1].bgColor)
          cell.styles.fillColor = color
          cell.styles.textColor = getHeaderTextColor(color)
        },
        willDrawCell: ({ section, column, cell }) => {
          if (section !== 'body' || column.index !== 0) return
          nameLineIndices = cell.text
          cell.text = []
        },
        didDrawCell: ({ section, column, row, cell }) => {
          if (section === 'head' && column.index > 0) {
            doc.saveGraphicsState()
            doc.setFontSize(8)
            doc.text(allergenHeaders[column.index - 1], cell.x + cell.width / 2 + 1, cell.y + cell.height - 2, { angle: 90 })
            doc.restoreGraphicsState()
          }

          if (section !== 'body') return
          if (column.index === 0) {
            cell.text = nameLineIndices
            const lines = layoutByRow.get(row.raw)?.lines
            if (!lines) return

            doc.saveGraphicsState()
            let y = cell.y + nameCellPadding.top + nameLineHeight * 0.75
            for (const index of nameLineIndices) {
              let x = cell.x + nameCellPadding.left
              for (const { text, font, size } of lines[Number(index)]) {
                doc.setFont('helvetica', font)
                doc.setFontSize(size)
                doc.setTextColor(font === 'italic' ? 55 : 0, font === 'italic' ? 65 : 0, font === 'italic' ? 81 : 0)
                doc.text(text, x, y)
                x += doc.getTextWidth(text)
              }
              y += nameLineHeight
            }
            doc.restoreGraphicsState()
          } else {
            const level = layoutByRow.get(row.raw)?.levels[column.index - 1]
            if (!level || level === 'none') return
            const { x, y, width, height } = cell
            // Show the indicators alongside every page fragment of a split row.
            if (level === 'incomplete') {
              doc.text('?', x + width / 2, y + height / 2, { align: 'center', baseline: 'middle' })
            } else if (getAllergenSeverity(level) === 'high') {
              drawWarningTriangle(doc, x, y, width, height)
            } else {
              drawCheckmark(doc, x, y, width, height, false)
            }
          }
        },
      })
      doc.setLineHeightFactor(previousLineHeight)

      return (doc as any).lastAutoTable?.finalY ?? startY
    }

    // ── Split items into sections ─────────────────────────────────────────────
    const menuSectionItems = items.filter(i => (i as any).itemType !== 'ingredient').map(item => {
      const source = menuItemSourceLines(item)
      return source.length ? { ...item, name: [item.name, ...source].join('\n') } : item
    }).sort(sortItemsByName)
    const ingredientItems   = items.filter(i => (i as any).itemType === 'ingredient').sort(sortItemsByName)

    // ── Expand ingredients per product variant (including repeated suppliers) ──
    const expandedIngredientItems: MenuItem[] = ingredientItems
      .flatMap(item => {
        const supplierList: string[] = (item as any).suppliers ?? []
        const supplierProfiles: Record<string, {
          supplier_name?: string
          brand?: string
          allergen_warnings?: any
        }> = (item as any).supplier_profiles || {}
        const profileEntries = Object.entries(supplierProfiles)

        if (profileEntries.length > 0) {
          return profileEntries.map(([profileKey, profile]) => {
            const supplier = String(profile.supplier_name || profileKey).trim()
            const brand = String(profile.brand || '').trim()
            return {
              ...item,
              allergen_warnings: profile.allergen_warnings || item.allergen_warnings,
              name: `${item.name}\nSupplier: ${supplier}${brand ? `\nBrand: ${brand}` : ''}`,
            }
          })
        }

        // Backwards compatibility for ingredients saved before variant profiles.
        if (supplierList.length === 0) return [item]
        return supplierList.map(supplier => ({
          ...item,
          name: `${item.name}\nSupplier: ${supplier}`,
        }))
      })
      .sort(sortItemsByName)

    // ── Render Menu Items section (categories first) ──────────────────────────
    const FIC_NOTE = 'Where multiple suppliers exist, the most conservative allergen declaration is shown. Replace printed guides when a new version is published.'
    let finalY = currentY
    if (menuSectionItems.length > 0) {
      // Top-level "Menu Items" heading — centred
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...primaryRgb)
      doc.text('Menu Items', pageWidth / 2, finalY, { align: 'center' })
      finalY += 8
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)

      const menuSections = categorySections(menuSectionItems)
      for (let i = 0; i < menuSections.length; i++) {
        const section = menuSections[i]
        if (i > 0) { doc.addPage(); finalY = 12 }
        finalY = renderSection(section.items.sort(sortItemsByName), section.title, finalY, undefined, 'Item')
      }
      if (ingredientItems.length > 0) {
        doc.addPage()
        currentY = 12
        finalY = currentY
      }
    }

    // ── Render Ingredients section (categories after menu items) ─────────────
    if (ingredientItems.length > 0) {
      // Top-level "Ingredients" heading — centred
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...primaryRgb)
      doc.text('Ingredients', pageWidth / 2, finalY, { align: 'center' })
      finalY += 10
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)

      const ingredientSections = categorySections(expandedIngredientItems)
      for (let i = 0; i < ingredientSections.length; i++) {
        const section = ingredientSections[i]
        if (i > 0) { doc.addPage(); finalY = 12 }
        finalY = renderSection(section.items.sort(sortItemsByName), section.title, finalY, undefined, 'Ingredient')
      }
    }

    // ── If no split (legacy call without itemType), render everything together ─
    if (menuSectionItems.length === items.length) {
      // Already rendered above — nothing extra to do
    } else if (menuSectionItems.length === 0 && ingredientItems.length === 0) {
      finalY = renderSection(items, 'Items', currentY)
    }

    // ── Footer on every page (page numbers, legend, AllyJen logo, timestamp) ──
    const generatedDate = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
    await drawPageFooters(doc, allyjenLogoDataUrl, generatedDate, showLegend, FIC_NOTE, 'right')

    const fileName = `${business.name.replace(/[^a-z0-9]/gi, '_')}_allergen_guide.pdf`

    if (options.outputMode === 'base64') {
      // Return raw base64 string (no data-URI prefix) for server-side email attachment
      return doc.output('datauristring').split(',')[1]
    }

    if (options.outputMode === 'bloburl') {
      // Return a blob: URL for inline browser viewing
      return URL.createObjectURL(doc.output('blob'))
    }

    doc.save(fileName)
  } catch (error: any) {
    console.error('❌ PDF generation failed:', error)
    throw error
  }
}
