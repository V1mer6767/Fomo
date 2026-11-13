import "./globals.css";
import type { Metadata } from "next";
import Shell from "@/components/Shell";
export const metadata: Metadata = { title: "FOMO Trading Intelligence", description: "News → Asset → Impact market intelligence" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" data-theme="dark" suppressHydrationWarning><body><Shell>{children}</Shell></body></html>);
}
