import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";
import { PageTitle } from "@/components/PageTitle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "NhàHợp | Không gian sống chung phù hợp",
    template: "%s | NhàHợp",
  },
  description: "Nền tảng tìm kiếm, kết nối và quản lý không gian sống chung phù hợp tại Việt Nam.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
        <AuthProvider>
          <PageTitle />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
