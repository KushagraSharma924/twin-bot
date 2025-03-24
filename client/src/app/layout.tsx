import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TwinBot - AI-Powered Digital Twin",
  description: "Automate your workflow with TwinBot, your AI-powered digital twin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#202123] text-white`}
      >
        {children}
      </body>
    </html>
  );
}
