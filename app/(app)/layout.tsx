import Shell from "@/components/Shell";
import { AuthGate } from "@/components/AuthProvider";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell><AuthGate>{children}</AuthGate></Shell>;
}
