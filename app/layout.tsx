import './globals.css'
// Polices auto-hebergees (paquets npm @fontsource) : aucun telechargement
// depuis Google Fonts pendant le build, qui echouait parfois sur Vercel.
// Les variables --font-sans / --font-mono / --font-serif sont dans globals.css.
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/playfair-display'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'Prestigia Business Center — Plateforme de gestion',
  description: 'Gérez vos centres, entreprises domiciliées, salles de réunion, courriers et facturation depuis une plateforme SaaS unique.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen bg-bg text-text" suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgb(var(--surface))',
                color: 'rgb(var(--text))',
                border: '1px solid rgb(var(--border))',
                boxShadow: '0 10px 15px -3px rgb(15 23 42 / 0.10), 0 4px 6px -4px rgb(15 23 42 / 0.08)',
                borderRadius: '12px',
                fontSize: '14px',
                padding: '12px 16px',
              },
              success: { iconTheme: { primary: '#10B981', secondary: 'white' } },
              error: { iconTheme: { primary: '#EF4444', secondary: 'white' } },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
