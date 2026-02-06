import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import { Space_Grotesk } from 'next/font/google'
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "Thinking-Box",
  description: "Create Beautiful Web-Apps",
}

const space = Space_Grotesk({
  subsets:['latin']
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark antialiased ${space.className}`}>
      <body className={``}>
        <Suspense fallback={<div></div>}>
          {children}
          <Toaster/>
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}
