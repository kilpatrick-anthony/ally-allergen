import jsPDF from 'jspdf'

export function makeLooseFoodAllergenLabelPdf({ foodName, contains, precautions }: {
  foodName: string
  contains: string[]
  precautions: string[]
}) {
  const width = 80
  const margin = 4
  const doc = new jsPDF({ unit: 'mm', format: [width, 35], orientation: 'landscape' })
  doc.viewerPreferences({ PrintScaling: 'None' })

  const blocks = [
    { text: foodName, size: 13, bold: true },
    { text: contains.length ? `Contains ${contains.join(', ')}` : 'No declarable allergens recorded', size: 12, bold: true },
    ...precautions.map(text => ({ text, size: 11, bold: false })),
    { text: 'For food served loose or prepared to order', size: 10, bold: false },
  ].map(block => {
    doc.setFont('helvetica', block.bold ? 'bold' : 'normal')
    doc.setFontSize(block.size)
    const lines: string[] = doc.splitTextToSize(block.text, width - margin * 2)
    const lineHeight = block.size * 25.4 / 72 * doc.getLineHeightFactor()
    return { ...block, lines, lineHeight, height: lines.length * lineHeight + 2 }
  })

  const height = Math.max(35, Math.ceil(margin * 2 + blocks.reduce((sum, block) => sum + block.height, 0)))
  doc.addPage([width, height], width > height ? 'landscape' : 'portrait')
  doc.deletePage(1)
  let y = margin
  for (const block of blocks) {
    doc.setFont('helvetica', block.bold ? 'bold' : 'normal')
    doc.setFontSize(block.size)
    doc.text(block.lines, margin, y + block.lineHeight * 0.8)
    y += block.height
  }
  return doc
}
