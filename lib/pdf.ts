import { PDFDocument } from 'pdf-lib'

/**
 * Render HTML → PDF via Puppeteer + @sparticuz/chromium.
 *
 * Strategie cross-env :
 *  - En production Vercel (serverless) : utilise @sparticuz/chromium qui
 *    embarque un Chromium minimaliste compatible avec les Lambda
 *  - En local : utilise le Chrome installe sur la machine
 *
 * Renvoie un Buffer PDF (pas une URL/un fichier).
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

  let browser
  if (isProd) {
    // Production : Chromium serverless via @sparticuz/chromium
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = await import('puppeteer-core')
    browser = await puppeteer.default.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  } else {
    // Local : Chrome installe sur la machine
    const puppeteer = await import('puppeteer-core')
    // Tentative auto-detection (Mac/Linux/Windows)
    const candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ]
    const fs = await import('node:fs')
    const executablePath = candidates.find(p => {
      try { return fs.existsSync(p) } catch { return false }
    })
    if (!executablePath) {
      throw new Error('Chrome introuvable en local. Installe Chrome ou definis CHROME_PATH.')
    }
    browser = await puppeteer.default.launch({
      executablePath: process.env.CHROME_PATH || executablePath,
      headless: true,
      args: ['--no-sandbox'],
    })
  }

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

/**
 * Concatene plusieurs Buffer PDF en 1 seul (utilise pdf-lib, pas Puppeteer).
 *
 * Usage :
 *   const contratPdf = await renderHtmlToPdf(contratHtml)
 *   const cgvPdf     = await renderHtmlToPdf(cgvHtml)
 *   const rgpdPdf    = await renderHtmlToPdf(rgpdHtml)
 *   const fullPdf    = await mergePdfs([contratPdf, cgvPdf, rgpdPdf])
 */
export async function mergePdfs(pdfs: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create()
  for (const pdfBuf of pdfs) {
    const src = await PDFDocument.load(pdfBuf)
    const pages = await merged.copyPages(src, src.getPageIndices())
    pages.forEach(p => merged.addPage(p))
  }
  const out = await merged.save()
  return Buffer.from(out)
}
