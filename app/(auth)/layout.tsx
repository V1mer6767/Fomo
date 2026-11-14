import Link from "next/link";
import { TrendingUp } from "lucide-react";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-info/30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[460px] w-[460px] rounded-full bg-pink/20 blur-[130px]" />
      <div className="relative w-full max-w-md fade-in">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-info to-pink shadow-[0_8px_26px_-6px_rgba(168,85,247,.9)]"><TrendingUp size={22} className="text-white" /></span>
          <span className="text-2xl font-bold tracking-tight">Trade <span className="grad-text">Info</span></span>
        </Link>
        <div className="card card-ai p-6 sm:p-8">{children}</div>
        <p className="mt-5 text-center text-[11px] text-mute">Informational only — not investment advice.</p>
      </div>
    </div>
  );
}
