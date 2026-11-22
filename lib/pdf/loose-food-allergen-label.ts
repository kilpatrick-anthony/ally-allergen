import jsPDF from 'jspdf'
import type { LabelTextRun } from '@/lib/ppds'
import { drawLabelTextLine, wrapLabelText } from '@/lib/pdf/label-text'

export function makeLooseFoodAllergenLabelPdf({ foodName, contains, precautions, ingredients }: {
  foodName: string
  contains: string[]
  precautions: string[]
  ingredients?: LabelTextRun[]
}) {
  const width = 80
  const margin = 4
  const doc = new jsPDF({ unit: 'mm', format: [width, 35], orientation: 'landscape' })
  doc.viewerPreferences({ PrintScaling: 'None' })

  const blocks: ({ text: string; size: number; bold: boolean } | { runs: LabelTextRun[]; size: number })[] = [
    { text: foodName, size: 13, bold: true },
    ingredients
      ? { runs: [{ text: 'Ingredients: ', bold: true }, ...ingredients], size: 11 }
      : { text: contains.length ? `Contains ${contains.join(', ')}` : 'No declarable allergens recorded', size: 12, bold: true },
    ...precautions.map(text => ({ text, size: 11, bold: false })),
    { text: 'For food served loose or prepared to order', size: 10, bold: false },
  ]
  const laidOut = blocks.map(block => {
    doc.setFontSize(block.size)
    const lineHeight = block.size * 25.4 / 72 * doc.getLineHeightFactor()
    if ('runs' in block) {
      const lines = wrapLabelText(doc, block.runs, width - margin * 2)
      return {
        height: lines.length * lineHeight + 2,
        draw: (y: number) => {
          doc.setFontSize(block.size)
          lines.forEach((line, index) => drawLabelTextLine(doc, line, margin, y + lineHeight * (index + 0.8)))
        },
      }
    }
    doc.setFont('helvetica', block.bold ? 'bold' : 'normal')
    const lines: string[] = doc.splitTextToSize(block.text, width - margin * 2)
    return {
      height: lines.length * lineHeight + 2,
      draw: (y: number) => {
        doc.setFont('helvetica', block.bold ? 'bold' : 'normal')
        doc.setFontSize(block.size)
        doc.text(lines, margin, y + lineHeight * 0.8)
      },
    }
  })

  const height = Math.max(35, Math.ceil(margin * 2 + laidOut.reduce((sum, block) => sum + block.height, 0)))
  doc.addPage([width, height], width > height ? 'landscape' : 'portrait')
  doc.deletePage(1)
  let y = margin
  for (const block of laidOut) {
    block.draw(y)
    y += block.height
  }
  return doc
}
