import './globals.css'
import BottomNav from '../components/BottomNav'
import { MusicProvider } from '../contexts/MusicContext'
import PersistentMusicUI from '../components/PersistentMusicUI'

export const metadata = {
  title: 'Daily Walk — Your daily devotion, together.',
  description: 'A spiritual accountability app for Christians.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-warm-outer min-h-screen flex justify-center items-start">
        <MusicProvider>
          <div className="relative w-full max-w-[420px] min-h-screen bg-warm-bg flex flex-col shadow-2xl">
            <main className="flex-1 overflow-y-auto pb-24">
              {children}
            </main>
            {/* PersistentMusicUI renders MiniPlayer + conditionally hides BottomNav on /read */}
            <PersistentMusicUI />
            <BottomNav />
          </div>
        </MusicProvider>
      </body>
    </html>
  )
}