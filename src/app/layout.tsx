import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "İTÜ DF Ar.Gör Portalı",
  description: "İTÜ Denizcilik Fakültesi Araştırma Görevlisi Yönetim Sistemi — görev dağıtımı, puan takibi, sınav gözetmenliği ve haftalık program yönetimi (GMİM & DUİM).",
  keywords: ["İTÜ", "Denizcilik Fakültesi", "GMİM", "DUİM", "Araştırma Görevlisi", "Yönetim Sistemi"],
  authors: [{ name: "İTÜ Denizcilik Fakültesi" }],
  openGraph: {
    title: "İTÜ DF Ar.Gör Portalı",
    description: "İTÜ Denizcilik Fakültesi Araştırma Görevlisi Yönetim Sistemi",
    siteName: "İTÜ DF Ar.Gör Portalı",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "İTÜ DF Ar.Gör Portalı",
    description: "İTÜ Denizcilik Fakültesi Araştırma Görevlisi Yönetim Sistemi",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
