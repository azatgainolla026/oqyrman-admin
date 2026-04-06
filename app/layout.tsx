import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AntdProvider from "@/components/AntdProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oqyrman Admin",
  description: "Oqyrman Library Platform Admin Panel",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-color-mode="light"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[#f5f5f5]">
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
