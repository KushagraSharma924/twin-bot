import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./supabase-theme.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TwinBot - Your AI Digital Twin",
  description: "Your personal AI digital twin assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body 
        className={`${inter.variable} font-sans antialiased bg-[#1c1c1c] text-white`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
