import './globals.css'
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
})

const serif = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: ['500', '600', '700'],
})

export const metadata = {
  title: 'WorkOffice — Plateforme premium de gestion de coworking',
  description: 'Gérez vos centres, entreprises domiciliées, salles de réunion, courriers et facturation depuis une plateforme SaaS unique.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
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
