import type jsPDF from 'jspdf'
import type { LabelTextRun } from '@/lib/ppds'

type PositionedRun = LabelTextRun & { x: number }

export function wrapLabelText(doc: jsPDF, runs: LabelTextRun[], maxWidth: number) {
  // Keep each word together when an allergen changes the font inside it.
  const words: LabelTextRun[][] = [[]]
  for (const run of runs) {
    for (const chunk of run.text.split(/( +)/).filter(Boolean)) {
      const word = words[words.length - 1]
      if (/^ +$/.test(chunk)) {
        if (word.length) words.push([])
      } else {
        word.push({ text: chunk, bold: run.bold })
      }
    }
  }
  const lines: PositionedRun[][] = []
  let x = 0
  for (const word of words.filter(word => word.length)) {
    const widths = word.map(run => {
      doc.setFont('helvetica', run.bold ? 'bold' : 'normal')
      return doc.getTextWidth(run.text)
    })
    const width = widths.reduce((sum, part) => sum + part, 0)
    if (width > maxWidth) throw new Error('A word is too wide for this label. Choose a wider label or send the product for review.')
    const space = x > 0 ? doc.getTextWidth(' ') : 0
    if (!lines.length || x + space + width > maxWidth) {
      lines.push([])
      x = 0
    } else {
      x += space
    }
    word.forEach((run, index) => {
      lines[lines.length - 1].push({ ...run, x })
      x += widths[index]
    })
  }
  return lines
}

export function drawLabelTextLine(doc: jsPDF, line: PositionedRun[], left: number, baseline: number) {
  for (const run of line) {
    doc.setFont('helvetica', run.bold ? 'bold' : 'normal')
    doc.text(run.text, left + run.x, baseline)
  }
}
