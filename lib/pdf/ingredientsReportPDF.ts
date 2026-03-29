// lib/pdf/ingredientsReportPDF.ts - Generate PDF report for ingredients list

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { hexToRgb, fetchLogoAsDataUrl, fetchAllyJenLogoDataUrl, getImageDimensions, fitDimensions, drawPageFooters } from './pdfBranding'

interface IngredientsReportOptions {
  business: {
    id: string
    name: string
    settings?: { primaryColor?: string | null; logoUrl?: string | null } | null
  }
  ingredients: any[]
}

export async function generateIngredientsReportPDF(options: IngredientsReportOptions) {
  const { business, ingredients } = options

  const primaryRgb = hexToRgb(business.settings?.primaryColor)
  const [logoDataUrl, allyjenLogoDataUrl] = await Promise.all([
    business.settings?.logoUrl ? fetchLogoAsDataUrl(business.settings.logoUrl) : Promise.resolve(null),
    fetchAllyJenLogoDataUrl(),
  ])

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 25

  if (logoDataUrl) {
    try {
      const { w: nw, h: nh } = await getImageDimensions(logoDataUrl)
      const { w, h } = fitDimensions(nw, nh, 40, 14)
      doc.addImage(logoDataUrl, 'auto', 10, y - 10, w, h)
    } catch { /* ignore */ }
    y = 42
  }

  // AllyJen logo — top right
  if (allyjenLogoDataUrl) {
    try {
      const { w: nw, h: nh } = await getImageDimensions(allyjenLogoDataUrl)
      const { w, h } = fitDimensions(nw, nh, 28, 10)
      doc.addImage(allyjenLogoDataUrl, 'PNG', pageWidth - w - 10, 12, w, h)
    } catch { /* ignore */ }
  }

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primaryRgb)
  doc.text(business.name, pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('Ingredients Report', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y)
  y += 6
  doc.text(`Total Ingredients: ${ingredients.length}`, 20, y)
  y += 10

  const tableData = ingredients.map(ingredient => [
    ingredient.name || 'N/A',
    ingredient.description || 'N/A',
    ingredient.category || 'N/A',
    ingredient.status || 'N/A',
    ingredient.compliance || 'N/A',
    ingredient.suppliers?.length || 0
  ])

  autoTable(doc, {
    head: [['Name', 'Description', 'Category', 'Status', 'Compliance', 'Suppliers']],
    body: tableData,
    startY: y,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 },
    },
  })

  const generatedDate = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
  await drawPageFooters(doc, allyjenLogoDataUrl, generatedDate)

  const fileName = `${business.name.replace(/[^a-zA-Z0-9]/g, '_')}_Ingredients_Report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}