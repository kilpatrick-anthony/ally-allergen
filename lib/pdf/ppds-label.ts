import jsPDF from 'jspdf'
import type { LabelTextRun } from '@/lib/ppds'

export interface PpdsPrintLabel {
  foodName: string
  ingredients: LabelTextRun[]
  precaution: string
  areaCm2: number
  widthMm: number
  heightMm: number
}

export function makePpdsLabelPdf(label: PpdsPrintLabel) {
  const { widthMm, heightMm, areaCm2 } = label
  const doc = new jsPDF({
    unit: 'mm',
    format: [widthMm, heightMm],
    orientation: widthMm > heightMm ? 'landscape' : 'portrait',
    putOnlyUsedFonts: true,
  })
  doc.viewerPreferences({ PrintScaling: 'None' })
  const inset = 1.7
  const fontSize = areaCm2 < 80 ? 7 : 8
  const minimumXHeight = areaCm2 < 80 ? 0.9 : 1.2
  // AFM x-height for regular Helvetica is 523/1000 em; bold is taller.
  // Use a 0.5 em lower bound to leave margin for standard-font substitution.
  const xHeight = fontSize * 25.4 / 72 * 0.5
  if (xHeight < minimumXHeight) throw new Error('The label does not meet the minimum x-height.')
  if (widthMm * heightMm > areaCm2 * 100) throw new Error('The label is larger than the package surface you entered.')

  let y = inset
  const sections = [
    { size: fontSize + 1.5, runs: [{ text: label.foodName, bold: true }] },
    { size: fontSize, runs: [{ text: 'Ingredients: ', bold: true }, ...label.ingredients] },
    ...(label.precaution ? [{ size: fontSize, runs: [{ text: label.precaution, bold: false }] }] : []),
  ]

  for (const { size, runs } of sections) {
    doc.setFontSize(size)
    const em = size * 25.4 / 72
    const lineHeight = em * 1.3
    // Keep words whole even when a change of emphasis occurs inside parentheses.
    const words: LabelTextRun[][] = [[]]
    for (const run of runs) {
      for (const chunk of run.text.split(/( +)/).filter(Boolean)) {
        if (/^ +$/.test(chunk)) {
          if (words[words.length - 1].length) words.push([])
        } else {
          words[words.length - 1].push({ text: chunk, bold: run.bold })
        }
      }
    }

    let x = inset
    for (const word of words.filter(word => word.length)) {
      const widths = word.map(run => {
        doc.setFont('helvetica', run.bold ? 'bold' : 'normal')
        return doc.getTextWidth(run.text)
      })
      const width = widths.reduce((total, part) => total + part, 0)
      const right = widthMm - inset
      if (inset + width > right) throw new Error('A word is too wide for this label. Choose a wider label or send the product for review.')
      const space = x > inset ? doc.getTextWidth(' ') : 0
      if (x + space + width > right) {
        x = inset
        y += lineHeight
      } else {
        x += space
      }

      if (y + em * 1.05 > heightMm - inset) {
        throw new Error('The declaration overflows this label. Choose a larger label or send the product for review.')
      }
      word.forEach((run, index) => {
        doc.setFont('helvetica', run.bold ? 'bold' : 'normal')
        doc.text(run.text, x, y + em * 0.82)
        x += widths[index]
      })
    }
    y += lineHeight + 0.25
  }
  return { doc, xHeight, minimumXHeight }
}
