import { PDFDocument } from 'pdf-lib'

export const QR_SIGN_TEMPLATE_URL = '/Template%20-%20QR.pdf'

/** Overlay the QR on the supplied artwork without rasterizing its text or logo. */
export async function createQrSignPDF(template: ArrayBuffer, qrPng: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(template)
  const page = pdf.getPage(0)
  const image = await pdf.embedPng(qrPng)

  // Measured on Template - QR.pdf (595.5 × 842.25 points): the white circle
  // is centred at (297.75, 391.275) from the top, with a 241.991-point radius.
  // The entire 310-point square, including its QR quiet zone, fits inside it.
  const crop = page.getCropBox()
  const scale = crop.width / 595.5
  const size = 310 * scale
  page.drawImage(image, {
    x: crop.x + 297.75 * scale - size / 2,
    y: crop.y + crop.height - 391.275 * scale - size / 2,
    width: size,
    height: size,
  })

  return pdf.save()
}
