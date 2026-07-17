import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import { ThemeProvider, noFlashThemeScript } from "@/components/ThemeProvider";
import { ToastContainer } from "react-toastify";
import { Navbar } from "@/components/Navbar";
import { AiChatWidget } from "@/components/AiChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Notion Clone",
  description: "AI powered collaborative workspace for teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <AiChatWidget />
          <ToastContainer position="top-right" theme="colored" />
        </ThemeProvider>
      </body>
    </html>
  );
}
