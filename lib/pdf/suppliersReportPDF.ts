// lib/pdf/suppliersReportPDF.ts - Generate PDF report for suppliers directory

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { hexToRgb, fetchLogoAsDataUrl, fetchAllyJenLogoDataUrl, getImageDimensions, fitDimensions, drawPageFooters } from './pdfBranding'

interface SuppliersReportOptions {
  business: {
    id: string
    name: string
    settings?: { primaryColor?: string | null; logoUrl?: string | null } | null
  }
  suppliers: any[]
}

export async function generateSuppliersReportPDF(options: SuppliersReportOptions) {
  const { business, suppliers } = options

  const primaryRgb = hexToRgb(business.settings?.primaryColor)
  const [logoDataUrl, allyjenLogoDataUrl] = await Promise.all([
    business.settings?.logoUrl ? fetchLogoAsDataUrl(business.settings.logoUrl) : Promise.resolve(null),
    fetchAllyJenLogoDataUrl(),
  ])

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 12

  if (logoDataUrl) {
    try {
      const { w: nw, h: nh } = await getImageDimensions(logoDataUrl)
      const { w, h } = fitDimensions(nw, nh, 80, 28)
      doc.addImage(logoDataUrl, 'auto', 10, 8, w, h)
    } catch { /* ignore */ }
  }

  // AllyJen logo — top right
  if (allyjenLogoDataUrl) {
    try {
      const { w: nw, h: nh } = await getImageDimensions(allyjenLogoDataUrl)
      const { w, h } = fitDimensions(nw, nh, 28, 10)
      doc.addImage(allyjenLogoDataUrl, 'PNG', pageWidth - w - 10, y - h / 2, w, h)
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
  doc.text('Suppliers Directory', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleDateString()}  •  Total Suppliers: ${suppliers.length}`, pageWidth / 2, y, { align: 'center' })
  y += 10

  const tableData = suppliers.map(supplier => [
    supplier.name || 'N/A',
    supplier.contact || 'N/A',
    supplier.phone || 'N/A',
    supplier.email || 'N/A',
    supplier.website || 'N/A',
    supplier.ingredient_count || 0,
    supplier.notes || 'N/A'
  ])

  autoTable(doc, {
    head: [['Name', 'Contact', 'Phone', 'Email', 'Website', 'Ingredients', 'Notes']],
    body: tableData,
    startY: y,
    margin: { left: 10, right: 10 },
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 35 },
      4: { cellWidth: 28 },
      5: { cellWidth: 18 },
      6: { cellWidth: 23 },
    },
  })

  const generatedDate = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
  await drawPageFooters(doc, allyjenLogoDataUrl, generatedDate)

  const fileName = `${business.name.replace(/[^a-zA-Z0-9]/g, '_')}_Suppliers_Directory_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}