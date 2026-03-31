// lib/pdf/siteOverviewReportPDF.ts - Generate PDF report for site overview

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { hexToRgb, fetchLogoAsDataUrl, fetchAllyJenLogoDataUrl, getImageDimensions, fitDimensions, drawPageFooters } from './pdfBranding'

interface SiteOverviewReportOptions {
  business: {
    id: string
    name: string
    settings?: { primaryColor?: string | null; logoUrl?: string | null } | null
  }
  sites: any[]
  menuItems: any[]
  ingredients: any[]
}

export async function generateSiteOverviewReportPDF(options: SiteOverviewReportOptions) {
  const { business, sites, menuItems, ingredients } = options

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
  doc.text('Site Overview Report', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y); y += 6
  doc.text(`Sites: ${sites.length}   Menu Items: ${menuItems.length}   Ingredients: ${ingredients.length}`, 20, y)
  y += 10

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primaryRgb)
  doc.text('Sites Summary', 20, y)
  y += 8

  const sitesData = sites.map(site => [
    site.name || 'N/A',
    menuItems.filter(item => item.site_id === site.id || item.site_id === null).length,
    ingredients.length
  ])

  autoTable(doc, {
    head: [['Site Name', 'Menu Items', 'Ingredients']],
    body: sitesData,
    startY: y,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 10, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  y = (doc as any).lastAutoTable.finalY + 14

  const categoryStats = menuItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorised'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primaryRgb)
  doc.text('Menu Items by Category', 20, y)
  y += 8

  autoTable(doc, {
    head: [['Category', 'Count']],
    body: Object.entries(categoryStats).map(([cat, cnt]) => [cat, (cnt as number).toString()]),
    startY: y,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 10, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  y = (doc as any).lastAutoTable.finalY + 14

  const statusStats = ingredients.reduce((acc, item) => {
    const status = item.status || 'Unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primaryRgb)
  doc.text('Ingredients by Status', 20, y)
  y += 8

  autoTable(doc, {
    head: [['Status', 'Count']],
    body: Object.entries(statusStats).map(([st, cnt]) => [st, (cnt as number).toString()]),
    startY: y,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 10, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  const generatedDate = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
  await drawPageFooters(doc, allyjenLogoDataUrl, generatedDate)

  const fileName = `${business.name.replace(/[^a-zA-Z0-9]/g, '_')}_Site_Overview_Report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}