import type { Metadata } from 'next'
import { getDictionary } from '@/lib/dictionaries'

export async function generateMetadata({ params: { lang } }: { params: { lang: string } }): Promise<Metadata> {
  const dict = await getDictionary(lang);
  return {
    title: dict.metadata.title,
    description: dict.metadata.description,
  }
}

export default function LangRootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { lang: string }
}) {
  return (
    <html lang={params.lang} className="dark">
      <body className="font-body antialiased bg-background">{children}</body>
    </html>
  )
}
