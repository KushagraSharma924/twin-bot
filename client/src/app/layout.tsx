import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
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
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#202123] text-white`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
