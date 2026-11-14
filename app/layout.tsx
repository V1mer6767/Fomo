import "./globals.css";
import type { Metadata } from "next";
import type { Viewport } from "next";
import AuthProvider from "@/components/AuthProvider";
export const metadata: Metadata = { title: "Trade Info", description: "News → Asset → Impact market intelligence",
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" }, appleWebApp: { capable: true, title: "Trade Info", statusBarStyle: "black" } };
export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" data-theme="dark" suppressHydrationWarning><body><AuthProvider>{children}</AuthProvider></body></html>);
}
