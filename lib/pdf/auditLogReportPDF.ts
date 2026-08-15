// lib/pdf/auditLogReportPDF.ts - Generate PDF report of the ingredient/menu item audit trail

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { hexToRgb, fetchLogoAsDataUrl, fetchAllyJenLogoDataUrl, getImageDimensions, fitDimensions, drawPageFooters } from './pdfBranding'

interface AuditLogEntry {
  entity_type: 'ingredient' | 'menu_item'
  entity_name: string
  action: 'created' | 'updated' | 'deleted'
  changes: { label: string; from: string; to: string }[]
  changed_by_email: string | null
  changed_by_name: string | null
  created_at: string
}

interface AuditLogReportOptions {
  business: {
    id: string
    name: string
    settings?: { primaryColor?: string | null; logoUrl?: string | null } | null
  }
  entries: AuditLogEntry[]
}

export async function generateAuditLogReportPDF(options: AuditLogReportOptions) {
  const { business, entries } = options

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
  doc.text('Audit Trail Report', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleDateString()}  •  Total Entries: ${entries.length}`, pageWidth / 2, y, { align: 'center' })
  y += 10

  if (entries.length === 0) {
    doc.setFontSize(11)
    doc.setTextColor(120, 120, 120)
    doc.text('No edits have been recorded yet.', pageWidth / 2, y + 10, { align: 'center' })
  } else {
    const tableData = entries.map((entry) => [
      new Date(entry.created_at).toLocaleString(),
      entry.entity_type === 'ingredient' ? 'Ingredient' : 'Menu Item',
      entry.entity_name || 'N/A',
      entry.action.charAt(0).toUpperCase() + entry.action.slice(1),
      entry.changes.length > 0
        ? entry.changes.map((c) => `${c.label}: ${c.from} -> ${c.to}`).join('\n')
        : '-',
      entry.changed_by_name
        ? `${entry.changed_by_name}${entry.changed_by_email ? `\n${entry.changed_by_email}` : ''}`
        : entry.changed_by_email || 'Unknown',
    ])

    autoTable(doc, {
      head: [['Date', 'Type', 'Item', 'Action', 'Changes', 'Changed By']],
      body: tableData,
      startY: y,
      margin: { bottom: 22 },
      styles: { fontSize: 7.5, cellPadding: 3, valign: 'top' },
      headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 18 },
        2: { cellWidth: 28 },
        3: { cellWidth: 16 },
        4: { cellWidth: 72 },
        5: { cellWidth: 30 },
      },
    })
  }

  const generatedDate = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
  await drawPageFooters(doc, allyjenLogoDataUrl, generatedDate, false)

  const fileName = `${business.name.replace(/[^a-zA-Z0-9]/g, '_')}_Audit_Trail_Report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
