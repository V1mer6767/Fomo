import "./globals.css";
import type { Metadata } from "next";
import type { Viewport } from "next";
import Shell from "@/components/Shell";
export const metadata: Metadata = { title: "FOMO Trading Intelligence", description: "News → Asset → Impact market intelligence",
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" }, appleWebApp: { capable: true, title: "FOMO", statusBarStyle: "black" } };
export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" data-theme="dark" suppressHydrationWarning><body><Shell>{children}</Shell></body></html>);
}
