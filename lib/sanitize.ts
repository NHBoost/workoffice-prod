import sanitizeHtml from 'sanitize-html'

/**
 * Sanitize du HTML user-genere avant rendu via dangerouslySetInnerHTML
 * ou stockage en BDD. Strict pour les emails marketing :
 *
 * - Strip <script>, <iframe>, <object>, <embed>, <link>, <style>, <meta>
 * - Strip TOUS les event handlers inline (onclick, onerror, onload, etc.)
 * - Bloque les URLs javascript: et data: (sauf data:image)
 * - Force rel="noopener noreferrer" sur les liens externes
 *
 * Fonctionne en Node ET dans le navigateur (pure JS, pas de jsdom).
 */
export function sanitizeEmailHTML(html: string): string {
  if (!html) return ''
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 's',
      'ul', 'ol', 'li',
      'a',
      'img',
      'blockquote',
      'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'pre', 'code',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      '*': ['style', 'class', 'align', 'colspan', 'rowspan'],
    },
    // URLs autorisees : http, https, mailto, tel — bloque javascript:, vbscript:, file:
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'], // permet les images base64 embarquees
    },
    // Style inline : whitelist stricte (couleurs et tailles seulement)
    allowedStyles: {
      '*': {
        color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
        'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
        'font-size': [/^\d+(?:px|em|rem|%)$/],
        'font-weight': [/^(normal|bold|\d{3})$/],
        'text-align': [/^(left|right|center|justify)$/],
        margin: [/^\d+(?:px|em|rem|%)(\s+\d+(?:px|em|rem|%)){0,3}$/],
        padding: [/^\d+(?:px|em|rem|%)(\s+\d+(?:px|em|rem|%)){0,3}$/],
      },
    },
    // Force rel="noopener noreferrer" pour eviter reverse tabnabbing
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
    },
  })
}
