// lib/pdf/menuItemsReportPDF.ts - Generate PDF report for menu items list

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { hexToRgb, fetchLogoAsDataUrl, fetchAllyJenLogoDataUrl, getImageDimensions, fitDimensions, drawPageFooters } from './pdfBranding'

interface MenuItemsReportOptions {
  business: {
    id: string
    name: string
    settings?: { primaryColor?: string | null; logoUrl?: string | null } | null
  }
  menuItems: any[]
}

export async function generateMenuItemsReportPDF(options: MenuItemsReportOptions) {
  const { business, menuItems } = options

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
  doc.text('Menu Items Report', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleDateString()}  •  Total Menu Items: ${menuItems.length}`, pageWidth / 2, y, { align: 'center' })
  y += 10

  const tableData = menuItems.map(item => [
    item.name || 'N/A',
    item.description || 'N/A',
    item.is_active ? 'Active' : 'Inactive',
  ])

  autoTable(doc, {
    head: [['Name', 'Description', 'Status']],
    body: tableData,
    startY: y,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 110 },
      2: { cellWidth: 30 },
    },
  })

  const generatedDate = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
  await drawPageFooters(doc, allyjenLogoDataUrl, generatedDate)

  const fileName = `${business.name.replace(/[^a-zA-Z0-9]/g, '_')}_Menu_Items_Report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}