import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Corevia Technologies — Employee Management System",
    template: "%s · Corevia EMS",
  },
  description:
    "Internal employee management system for Corevia Technologies. Track staff, attendance, tasks, leaves, salary and announcements.",
  applicationName: "Corevia EMS",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface-subtle text-ink-800 antialiased">{children}</body>
    </html>
  );
}
