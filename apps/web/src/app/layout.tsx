import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SkillSwap — Learn by teaching. Grow together.",
  description:
    "SkillSwap connects you with peers who have the skills you want — and want the skills you have. Schedule sessions, chat in real time, and level up through mutual exchange.",
};

import { Providers } from "@/components/providers";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "rgba(16, 15, 24, 0.9)",
                color: "#f1f5f9",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(16px)",
                borderRadius: "16px",
                fontSize: "14px",
              },
              success: {
                iconTheme: { primary: "#22C55E", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#fff" },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
