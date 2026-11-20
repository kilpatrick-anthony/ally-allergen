import jsPDF from 'jspdf'
import { locationAllergenGuidance, publishedDate, type Jurisdiction } from '@/lib/location-jurisdiction'
import { specificAllergens } from '@/lib/ppds'
import { getAllergenLevelText, type AllergenWarnings } from '@/types/allergen'

export function downloadAllergenSign(options: {
  site: string; jurisdiction: Jurisdiction; displayLocation: string; url: string; qr: HTMLCanvasElement
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const center = 105
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(32)
  doc.text('Food allergen information', center, 30, { align: 'center' })
  doc.setFontSize(19)
  doc.text(options.site, center, 45, { align: 'center', maxWidth: 170 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(15)
  doc.text(locationAllergenGuidance(options.jurisdiction).sign, center, 65, { align: 'center', maxWidth: 160 })
  doc.setFont('helvetica', 'bold')
  doc.text(options.displayLocation, center, 91, { align: 'center', maxWidth: 160 })
  doc.addImage(options.qr, 'PNG', 55, 114, 100, 100)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(options.url, center, 232, { align: 'center', maxWidth: 170 })
  doc.save('allergen-guide-sign.pdf')
}

export function downloadDeliverySlip(options: {
  site: string; item: string; warnings: AllergenWarnings; publishedAt: string; orderReference: string;
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a6' })
  const allergens = specificAllergens(options.warnings)
  const contains = allergens.filter(allergen => allergen.level === 'contains').map(allergen => allergen.name)
  const cautions = allergens.filter(allergen => allergen.level !== 'contains')
    .map(allergen => getAllergenLevelText(allergen.level, allergen.name))
  const blocks: { text: string; size: number; bold?: boolean }[] = [
    { text: 'Delivery allergen information', size: 15, bold: true },
    { text: options.item, size: 14, bold: true },
    { text: options.site, size: 11 },
    ...(options.orderReference ? [{ text: `Order ${options.orderReference}`, size: 11 }] : []),
    { text: contains.length ? `Contains: ${contains.join(', ')}` : 'No declarable allergens identified in the published recipe.', size: 11, bold: true },
    ...(cautions.length ? [{ text: cautions.join('. ') + '.', size: 10 }] : []),
    { text: `Guide published ${publishedDate(options.publishedAt)}. Confirm against the actual item and any substitutions before packing.`, size: 9 },
  ]
  let y = 12
  for (const { text, size, bold } of blocks) {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(text, 89)
    const lineHeight = size * 25.4 / 72 * 1.15
    if (y + lines.length * lineHeight > 140) {
      throw new Error('The allergen information will not fit on this slip. Use the full written guide and clearly identify the item.')
    }
    doc.text(lines, 8, y)
    y += lines.length * lineHeight + 3
  }
  doc.save('delivery-allergen-slip.pdf')
}
