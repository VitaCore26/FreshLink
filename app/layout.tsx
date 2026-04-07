import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import './globals.css'

// Inter is universally available on Vercel — no flash on deploy
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: 'FreshLink Pro — Distribution Fruits & Légumes',
  description: 'Gestion commerciale, logistique et suivi de distribution pour fruits et légumes au Maroc. 13 rôles utilisateurs, dashboard temps réel, BL imprimables.',
  keywords: ['freshlink', 'distribution', 'fruits', 'légumes', 'gestion commerciale', 'logistique', 'maroc', 'prévendeur'],
  authors: [{ name: 'Jawad' }],
  robots: { index: false, follow: false },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_MA',
    title: 'FreshLink Pro — Distribution Fruits & Légumes',
    description: 'Plateforme de gestion commerciale et logistique pour distributeurs de fruits et légumes.',
    siteName: 'FreshLink Pro',
  },
  twitter: {
    card: 'summary',
    title: 'FreshLink Pro',
    description: 'Gestion commerciale & logistique fruits et légumes.',
  },
  applicationName: 'FreshLink Pro',
  appleWebApp: {
    capable: true,
    title: 'FreshLink Pro',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
